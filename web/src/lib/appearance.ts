export type Appearance = "dark" | "light";
const KEY = "motivefx_theme";
const EVENT = "motivefx:appearance-changed";
export function readAppearance(): Appearance {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch { /* Restricted storage must not break the application. */ }
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
export function applyAppearance(theme: Appearance, persist = false) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.colorTheme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f6f7fb" : "#0c0f17");
  if (persist) { try { localStorage.setItem(KEY, theme); } catch { /* Use in-memory appearance. */ } }
  window.dispatchEvent(new Event(EVENT));
}
export function initializeAppearance() { applyAppearance(readAppearance()); }
export function appearanceSnapshot(): Appearance {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.colorTheme === "light" ? "light" : "dark";
}
export function subscribeAppearance(callback: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) applyAppearance(readAppearance()); };
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", storage);
  return () => { window.removeEventListener(EVENT, callback); window.removeEventListener("storage", storage); };
}
