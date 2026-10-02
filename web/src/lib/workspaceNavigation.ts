let cancelPrevious: (() => void) | undefined;
/** Wait for actual React content, not an arbitrary 80 ms render assumption. */
export function revealWorkspaceSection(selector: string): void {
  cancelPrevious?.();
  let observer: MutationObserver | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cleanup = () => { observer?.disconnect(); if (timer) clearTimeout(timer); cancelPrevious = undefined; };
  const reveal = () => {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) return false;
    cleanup();
    element.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "-1");
    element.focus({ preventScroll: true });
    return true;
  };
  if (reveal()) return;
  observer = new MutationObserver(reveal);
  observer.observe(document.getElementById("root") ?? document.body, { childList: true, subtree: true });
  timer = setTimeout(cleanup, 10_000);
  cancelPrevious = cleanup;
}
