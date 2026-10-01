import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { appearanceSnapshot, applyAppearance, subscribeAppearance } from "../lib/appearance";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeAppearance, appearanceSnapshot, () => "dark" as const);
  const next = theme === "dark" ? "light" : "dark";
  return <button type="button" className="theme-toggle" onClick={() => applyAppearance(next, true)}
    aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
    {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    <span className="theme-toggle-label">{theme === "dark" ? "Day" : "Night"}</span>
  </button>;
}

/** Remove the near-black matte from the existing purple brand raster, without
 * changing its RGB artwork. The page surface is visible through the alpha mask.
 * This is a rendering filter, not a replacement logo or a blend-mode illusion. */
export function ThemeBrandAssets() {
  return <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute", pointerEvents: "none" }}>
    <defs><filter id="motive-brand-transparent" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
      <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 5 0 -0.5" />
    </filter></defs>
  </svg>;
}
