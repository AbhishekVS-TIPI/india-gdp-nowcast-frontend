/** Shared recharts styling, so every chart reads as one system. */
export const TOOLTIP_STYLE = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
} as const;

export const axisTick = (size = 11) => ({ fontSize: size, fill: "var(--color-muted-foreground)" });
