// "View mode": while browsing the live site, people who are signed in to the
// CMS on this browser see a small "Edit this page" button that opens the
// matching page in the editor. Everyone else sees nothing.
const PAGE_FILES: Record<string, string> = {
  '/': 'home',
  '/about/': 'about',
  '/for-businesses/': 'for-businesses',
  '/resources/': 'resources',
  '/donate/': 'donate',
  '/places/': 'places-page',
  '/events/': 'events-page',
  '/suggest/': 'forms',
  '/submit-event/': 'forms',
  '/contact/': 'forms',
  '/thank-you/': 'forms',
  '/subscribed/': 'forms',
  '/privacy/': 'privacy',
};

function editorRoute(path: string): string {
  const p = path.endsWith('/') ? path : `${path}/`;
  if (PAGE_FILES[p]) return `#/collections/pages/entries/${PAGE_FILES[p]}`;
  const entry = p.match(/^\/(events|places)\/([^/]+)\/$/);
  if (entry) return `#/collections/${entry[1]}/entries/${entry[2]}`;
  return '#/';
}

function signedIn(): boolean {
  try {
    return Boolean(JSON.parse(localStorage.getItem('decap-cms-user') ?? 'null')?.token);
  } catch {
    return false;
  }
}

export function start() {
  if (!signedIn()) return;
  try {
    if (sessionStorage.getItem('limitless-hide-edit') === '1') return;
  } catch {
    /* storage unavailable */
  }

  const bar = document.createElement('div');
  bar.className = 'cms-edit-bar';
  bar.innerHTML = `
    <a href="/admin/${editorRoute(location.pathname)}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
      Edit this page
    </a>
    <button type="button" aria-label="Hide the edit button">×</button>`;
  bar.querySelector('button')!.addEventListener('click', () => {
    bar.remove();
    try {
      sessionStorage.setItem('limitless-hide-edit', '1');
    } catch {
      /* storage unavailable */
    }
  });

  const style = document.createElement('style');
  style.textContent = `
    .cms-edit-bar { position: fixed; right: 16px; bottom: 16px; z-index: 100; display: flex; align-items: center;
      background: #11404e; border-radius: 999px; box-shadow: 0 4px 16px rgb(0 0 0 / 18%); font-family: var(--font-display); }
    .cms-edit-bar a { display: inline-flex; align-items: center; gap: 8px; color: #fff; text-decoration: none;
      padding: 10px 6px 10px 16px; font-size: 0.95rem; }
    .cms-edit-bar a:hover { text-decoration: underline; color: #fff; }
    .cms-edit-bar button { background: none; border: 0; color: #fff; font-size: 1.2rem; line-height: 1; cursor: pointer;
      padding: 10px 14px 10px 8px; }
    @media print { .cms-edit-bar { display: none; } }`;
  document.head.appendChild(style);
  document.body.appendChild(bar);
}
