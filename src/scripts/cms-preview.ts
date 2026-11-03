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
let currentScope = '';

function fillItem(node: Element, item: any, index: number) {
  const within = (sel: string) => [node, ...node.querySelectorAll(sel)].filter((n) => n.matches(sel));
  within('[data-cms-field]').forEach((el) => {
    const v = get(item, el.getAttribute('data-cms-field')!);
    el.textContent = v == null ? '' : String(v);
  });
  within('[data-cms-field-icon]').forEach((el) => (el.innerHTML = icon(get(item, el.getAttribute('data-cms-field-icon')!))));
  within('[data-cms-field-src]').forEach((el) => {
    el.setAttribute('src', get(item, el.getAttribute('data-cms-field-src')!) || '');
    el.removeAttribute('srcset');
  });
  within('[data-cms-field-alt]').forEach((el) => el.setAttribute('alt', get(item, el.getAttribute('data-cms-field-alt')!) || ''));
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
  currentScope = scope;
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

// ---- click to edit ------------------------------------------------------
// Work out which CMS field an element in the page comes from, as
// { scope, path } with a dotted path like "hero.title" or "items.2.text".
type EditTarget = { scope: string; path: string; el: Element };

const split = (key: string | null) => {
  const i = (key ?? '').indexOf(':');
  return i < 0 ? null : { scope: key!.slice(0, i), path: key!.slice(i + 1) };
};

// Derived page elements and the field that drives them.
function computedField(name: string): string | null {
  const d = currentData;
  switch (name) {
    case 'event-eyebrow':
      return 'recurring';
    case 'event-when':
    case 'event-when-icon':
      return d.date || !d.recurring ? 'date' : 'recurring';
    case 'event-where':
    case 'event-where-row':
    case 'event-maps':
      return d.location || !d.city ? 'location' : 'city';
    case 'event-has-date':
      return 'date';
    case 'place-cat-icon':
    case 'place-cat-label':
      return 'category';
    case 'place-where':
      return d.multiLocation ? 'multiLocation' : 'city';
    case 'place-maps':
      return 'address';
    case 'place-tel':
      return 'phone';
    case 'place-verified':
    case 'place-verified-row':
      return 'verified';
    default:
      return null;
  }
}

const FIELD_ATTRS = ['data-cms-field', 'data-cms-field-icon', 'data-cms-field-href'];
const DIRECT_ATTRS = ['data-cms', 'data-cms-md', 'data-cms-mdi', 'data-cms-md-entry'];

function editTarget(start: EventTarget | null): EditTarget | null {
  let el = start instanceof Element ? start : null;
  while (el && el !== document.body) {
    const item = el.hasAttribute('data-cms-item') || FIELD_ATTRS.some((a) => el!.hasAttribute(a)) ? el.closest('[data-cms-item]') : null;
    const list = item?.parentElement?.closest('[data-cms-list]');
    if (item && list) {
      const key = split(list.getAttribute('data-cms-list'));
      if (!key) return null;
      // Accommodation tags are one multi-select field in the CMS.
      if (key.scope === 'entry') return { ...key, el: list };
      const index = Array.from(list.querySelectorAll(':scope > [data-cms-item]')).indexOf(item);
      const attr = FIELD_ATTRS.find((a) => el!.hasAttribute(a));
      const sub = attr ? el.getAttribute(attr) : null;
      return { scope: key.scope, path: `${key.path}.${index}${sub && sub !== '.' ? `.${sub}` : ''}`, el };
    }
    for (const a of DIRECT_ATTRS) {
      if (el.hasAttribute(a)) {
        const key = split(el.getAttribute(a));
        if (key) return { ...key, el };
      }
    }
    if (el.hasAttribute('data-cms-attr')) {
      const key = split(el.getAttribute('data-cms-attr')!.split('|')[1]);
      if (key) return { ...key, el };
    }
    if (el.hasAttribute('data-cms-compute')) {
      const path = computedField(el.getAttribute('data-cms-compute')!);
      if (path) return { scope: 'entry', path, el };
    }
    for (const a of ['data-cms-list', 'data-cms-show', 'data-cms-hide']) {
      if (el.hasAttribute(a)) {
        const key = split(el.getAttribute(a));
        if (key) return { ...key, el };
      }
    }
    el = el.parentElement;
  }
  return null;
}

function setupClickToEdit() {
  const box = document.createElement('div');
  box.className = 'cms-hover';
  box.hidden = true;
  box.innerHTML = '<span>✎ Edit</span>';
  document.body.appendChild(box);

  const show = (t: EditTarget | null) => {
    // Only text that belongs to what's open in the editor can be clicked.
    if (!t || t.scope !== currentScope) {
      box.hidden = true;
      document.documentElement.classList.remove('cms-can-edit');
      return;
    }
    const r = t.el.getBoundingClientRect();
    Object.assign(box.style, {
      top: `${r.top + scrollY - 6}px`,
      left: `${r.left + scrollX - 6}px`,
      width: `${r.width + 12}px`,
      height: `${r.height + 12}px`,
    });
    box.hidden = false;
    document.documentElement.classList.add('cms-can-edit');
  };

  document.addEventListener('mouseover', (e) => show(editTarget(e.target)));
  document.addEventListener('mouseleave', () => show(null));
  addEventListener('scroll', () => (box.hidden = true), { passive: true });

  document.addEventListener(
    'click',
    (e) => {
      const t = editTarget(e.target);
      if (!t || t.scope !== currentScope) return;
      e.preventDefault();
      window.parent.postMessage({ type: 'limitless-cms:focus', scope: t.scope, path: t.path }, location.origin);
    },
    true,
  );
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
      0%, 40% { outline: calc(2px * var(--cms-ui, 1)) solid #6b8753; outline-offset: 4px; }
      100% { outline: calc(2px * var(--cms-ui, 1)) solid transparent; outline-offset: 4px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .cms-changed { animation: none; outline: calc(2px * var(--cms-ui, 1)) solid #6b8753; outline-offset: 4px; }
    }
    .cms-preview a, .cms-preview button { cursor: default; }
    .cms-preview h1[data-cms]:empty::before { content: 'Add a name'; opacity: 0.35; }
    .cms-hover { position: absolute; z-index: 2147483000; pointer-events: none;
      border: calc(2px * var(--cms-ui, 1)) dashed #6b8753; border-radius: 8px; }
    .cms-hover span { position: absolute; left: -2px; bottom: 100%; background: #11404e; color: #fff;
      font: 600 calc(12px * var(--cms-ui, 1)) / 1 system-ui, sans-serif;
      padding: calc(5px * var(--cms-ui, 1)) calc(8px * var(--cms-ui, 1));
      border-radius: 6px 6px 6px 0; white-space: nowrap; }
    .cms-can-edit, .cms-can-edit * { cursor: pointer !important; }
  `;
  document.head.appendChild(style);
  setupClickToEdit();

  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin) return;
    const msg = e.data;
    if (msg?.type === 'limitless-cms:update') {
      // The editor shrinks the page to fit; keep the editing UI readable.
      if (msg.scale) document.documentElement.style.setProperty('--cms-ui', String(1 / msg.scale));
      apply(msg.scope, msg.data ?? {});
    }
  });
  window.parent.postMessage({ type: 'limitless-cms:ready' }, location.origin);
}
