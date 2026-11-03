// "Save" for places. Saved places live only in this browser (localStorage);
// nothing is sent anywhere.
const KEY = 'limitless-saved-places';

export function getSaved(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function setSaved(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable (private mode) */
  }
  document.dispatchEvent(new CustomEvent('saved-change', { detail: ids }));
}

function sync() {
  const saved = new Set(getSaved());
  document.querySelectorAll<HTMLButtonElement>('[data-save]').forEach((btn) => {
    const on = saved.has(btn.dataset.save!);
    btn.setAttribute('aria-pressed', String(on));
  });
}

export function initSaveButtons() {
  if ((window as any).__limitlessSaveInit) return;
  (window as any).__limitlessSaveInit = true;
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('[data-save]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const id = btn.dataset.save!;
    const saved = getSaved();
    setSaved(saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id]);
  });
  document.addEventListener('saved-change', sync);
  addEventListener('storage', (e) => e.key === KEY && sync());
  sync();
}
