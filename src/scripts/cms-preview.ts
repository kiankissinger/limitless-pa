// CMS live preview ("Edit mode").
//
// The CMS shows the real page inside its preview pane with ?cms-preview in
// the URL. This script then receives the editor's unsaved content via
// postMessage and writes it straight into the page, so editors see their
// changes in the real design as they type. Elements opt in with data-cms-*
// attributes (see the components and pages):
//
//   data-cms="scope:path"            text content
//   data-cms-md / -mdi / -md-entry   Markdown block / inline / listing body
//   data-cms-attr="attr|scope:path"  an attribute (e.g. placeholder, href)
//   data-cms-show / data-cms-hide    hidden unless / when the value is set
//   data-cms-list="scope:path"       repeating items ([data-cms-item]) with
//                                    data-cms-field*, -icon, -index, -href
//   data-cms-compute="name"          derived values for events and places
//
// "scope" is the CMS file name (home, about, site, …) or "entry" for the
// event or place being edited.
import { md, mdi, mdEntry } from '../lib/markdown';
import { icons } from '../data/icons';
import { accommodations, categoryById } from '../data/taxonomy';
import { dateLabel, timeRange } from '../lib/events';

type Data = Record<string, any>;

const hints: Record<string, string> = Object.fromEntries(accommodations.map((a) => [a.id, a.hint]));
const listTemplates = new WeakMap<Element, Element>();

const get = (obj: any, path: string) =>
  path === '.' ? obj : path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const isEmpty = (v: unknown) =>
  v == null || v === '' || v === false || (Array.isArray(v) && v.length === 0);
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const icon = (name: unknown) => icons[(name as keyof typeof icons) || 'check'] ?? icons.check;

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  const s = String(v);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// ---- change tracking (highlight + scroll to what's being edited) --------
let changed: Element[] = [];
let firstRun = true;

function setText(el: Element, text: string) {
  if (el.textContent !== text) {
    el.textContent = text;
    changed.push(el);
  }
}
function setHTML(el: Element, html: string) {
  if (el.innerHTML !== html) {
    el.innerHTML = html;
    changed.push(el);
  }
}
function setHidden(el: Element, hidden: boolean) {
  const h = el as HTMLElement;
  if (h.hidden !== hidden) {
    h.hidden = hidden;
    if (!hidden) changed.push(el);
  }
}
function setAttr(el: Element, name: string, value: string) {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

function each(attr: string, scope: string, fn: (el: Element, value: any) => void) {
  const prefix = `${scope}:`;
  document.querySelectorAll(`[${attr}]`).forEach((el) => {
    const key = el.getAttribute(attr)!;
    if (key.startsWith(prefix)) fn(el, get(currentData, key.slice(prefix.length)));
  });
}

let currentData: Data = {};

function fillItem(node: Element, item: any, index: number) {
  const within = (sel: string) => [node, ...node.querySelectorAll(sel)].filter((n) => n.matches(sel));
  within('[data-cms-field]').forEach((el) => {
    const v = get(item, el.getAttribute('data-cms-field')!);
    el.textContent = v == null ? '' : String(v);
  });
  within('[data-cms-field-icon]').forEach((el) => (el.innerHTML = icon(get(item, el.getAttribute('data-cms-field-icon')!))));
  within('[data-cms-field-index]').forEach((el) => (el.textContent = String(index + 1)));
  within('[data-cms-field-href]').forEach((el) => {
    const v = get(item, el.getAttribute('data-cms-field-href')!);
    el.setAttribute('href', v || '');
    (el as HTMLElement).hidden = !v;
  });
  within('[data-cms-field-compute="acc-hint"]').forEach((el) => {
    const hint = hints[String(item)] ?? '';
    el.textContent = hint;
    (el as HTMLElement).hidden = !hint;
  });
}

function applyLists(scope: string) {
  each('data-cms-list', scope, (list, value) => {
    const tpl = listTemplates.get(list);
    if (!tpl) return;
    const items: any[] = Array.isArray(value) ? value : [];
    const before = list.innerHTML;
    list.querySelectorAll(':scope > [data-cms-item]').forEach((n) => n.remove());
    items.forEach((item, i) => {
      const node = tpl.cloneNode(true) as Element;
      fillItem(node, item, i);
      list.appendChild(node);
    });
    if (list.innerHTML !== before) changed.push(list);
  });
}

function computeEntry(d: Data) {
  const ev = { ...d, date: toDate(d.date), endDate: toDate(d.endDate), startTime: d.startTime || undefined, endTime: d.endTime || undefined };
  const on = (name: string, fn: (el: HTMLElement) => void) =>
    document.querySelectorAll<HTMLElement>(`[data-cms-compute="${name}"]`).forEach(fn);

  // Events
  on('event-eyebrow', (el) => setHidden(el, !(d.recurring && !d.date)));
  on('event-when-icon', (el) => setHTML(el, icon(d.date ? 'calendar' : 'repeat')));
  on('event-when', (el) => {
    const label = dateLabel(ev as any, true) || 'Add a date, or describe how it repeats';
    const time = timeRange(ev as any);
    setHTML(el, esc(label) + (time ? `<br />${esc(time)}` : ''));
  });
  const where = [d.location, d.city].filter(Boolean).join(', ');
  on('event-where-row', (el) => setHidden(el, !where));
  on('event-where', (el) => setText(el, where));
  on('event-maps', (el) => {
    setHidden(el, !(d.location && where));
    el.querySelector('a')?.setAttribute('href', `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`);
  });
  on('event-has-date', (el) => setHidden(el, !d.date));

  // Places
  const cat = categoryById[d.category as keyof typeof categoryById] ?? categoryById.community;
  on('place-cat-icon', (el) => setHTML(el, icon(cat.icon)));
  on('place-cat-label', (el) => setText(el, cat.label));
  on('place-where', (el) =>
    setText(el, d.multiLocation ? 'Multiple locations across Pennsylvania' : [d.city, d.region].filter(Boolean).join(' · ')),
  );
  on('place-maps', (el) =>
    setAttr(el, 'href', `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${d.name ?? ''}, ${d.address ?? ''}`)}`),
  );
  on('place-tel', (el) => setAttr(el, 'href', `tel:${String(d.phone ?? '').replace(/[^\d+]/g, '')}`));
  const verifiedDate = toDate(d.verified);
  const verified = verifiedDate
    ? verifiedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    : '';
  on('place-verified', (el) => {
    setText(el, verified ? `Details checked ${verified}. ` : '');
    setHidden(el, !verified);
  });
  on('place-verified-row', (el) => setHidden(el, !(verified || d.source)));

  const title = d.title ?? d.name;
  if (title) document.title = `${title} | Limitless PA`;
}

function apply(scope: string, data: Data) {
  currentData = data;
  changed = [];
  each('data-cms', scope, (el, v) => setText(el, v == null ? '' : String(v)));
  each('data-cms-md', scope, (el, v) => setHTML(el, md(v)));
  each('data-cms-mdi', scope, (el, v) => setHTML(el, mdi(v)));
  each('data-cms-md-entry', scope, (el, v) => setHTML(el, mdEntry(v)));
  document.querySelectorAll('[data-cms-attr]').forEach((el) => {
    const [attr, key] = el.getAttribute('data-cms-attr')!.split('|');
    if (!key?.startsWith(`${scope}:`)) return;
    const v = get(data, key.slice(scope.length + 1));
    setAttr(el, attr, v == null ? '' : String(v));
  });
  each('data-cms-show', scope, (el, v) => setHidden(el, isEmpty(v)));
  each('data-cms-hide', scope, (el, v) => setHidden(el, !isEmpty(v)));
  applyLists(scope);
  if (scope === 'entry') computeEntry(data);

  if (firstRun) {
    firstRun = false; // the first update just loads the saved content
    return;
  }
  highlight(changed);
}

function highlight(els: Element[]) {
  const visible = els.filter((el) => !(el as HTMLElement).hidden && (el as HTMLElement).offsetParent !== null);
  if (!visible.length) return;
  visible.forEach((el) => {
    el.classList.remove('cms-changed');
    void (el as HTMLElement).offsetWidth; // restart the animation
    el.classList.add('cms-changed');
  });
  const target = visible[0] as HTMLElement;
  const r = target.getBoundingClientRect();
  if (r.top < 80 || r.bottom > innerHeight - 20) {
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
  }
}

export function start() {
  document.documentElement.classList.add('cms-preview');

  // Remember one item of each repeating list so new items can be added.
  document.querySelectorAll('[data-cms-list]').forEach((list) => {
    const tpl = list.querySelector<HTMLTemplateElement>(':scope > template[data-cms-item-template]');
    const first = tpl ? tpl.content.firstElementChild : list.querySelector(':scope > [data-cms-item]');
    if (first) listTemplates.set(list, first.cloneNode(true) as Element);
  });

  // Previews are for looking, not clicking away: keep links and forms inert.
  document.addEventListener(
    'click',
    (e) => {
      if ((e.target as Element).closest('a, button[type="submit"]')) e.preventDefault();
    },
    true,
  );
  document.addEventListener('submit', (e) => e.preventDefault(), true);

  const style = document.createElement('style');
  style.textContent = `
    .cms-changed { animation: cms-flash 1.6s ease-out; border-radius: 4px; }
    @keyframes cms-flash {
      0%, 40% { outline: 2px solid #6b8753; outline-offset: 4px; }
      100% { outline: 2px solid transparent; outline-offset: 4px; }
    }
    @media (prefers-reduced-motion: reduce) { .cms-changed { animation: none; outline: 2px solid #6b8753; outline-offset: 4px; } }
    .cms-preview a, .cms-preview button { cursor: default; }
    .cms-preview h1[data-cms]:empty::before { content: 'Add a name'; opacity: 0.35; }
  `;
  document.head.appendChild(style);

  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin) return;
    const msg = e.data;
    if (msg?.type === 'limitless-cms:update') apply(msg.scope, msg.data ?? {});
  });
  window.parent.postMessage({ type: 'limitless-cms:ready' }, location.origin);
}
