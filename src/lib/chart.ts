import { useSyncExternalStore } from "react";

/** Shared recharts styling, so every chart reads as one system. */
export const TOOLTIP_STYLE = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: "0.75rem",
} as const;

/** Axis text in rem, so it grows with the page on large displays. */
export const axisTick = (px = 11) => ({
  fontSize: `${px / 16}rem`,
  fill: "var(--color-muted-foreground)",
});

const COMPACT = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

/** Short axis label for large values (81.4L, 8.1Cr), so the labels fit the axis. */
export const compactTick = (v: number) =>
  Math.abs(v) >= 1000 ? COMPACT.format(v) : String(Number(v.toFixed(2)));

const subscribe = (notify: () => void) => {
  window.addEventListener("resize", notify);
  return () => window.removeEventListener("resize", notify);
};
const rootScale = () => parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1;

/**
 * The root font size relative to 16px. The site enlarges its type on large
 * displays, so the pixel numbers recharts needs (axis widths, margins, bar
 * caps) are multiplied by this to stay in proportion with the text.
 */
export const useRootScale = () => useSyncExternalStore(subscribe, rootScale, () => 1);
