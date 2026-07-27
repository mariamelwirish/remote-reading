// Dark/light mode: stored in localStorage, applied via html[data-theme].
const KEY = 'rr-theme-mode';

export function getStoredMode() {
  const s = localStorage.getItem(KEY);
  if (s === 'light' || s === 'dark') return s;
  // Fall back to the OS preference the first time.
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyMode(mode) {
  document.documentElement.dataset.theme = mode;
  try { localStorage.setItem(KEY, mode); } catch { /* private mode — ignore */ }
}
