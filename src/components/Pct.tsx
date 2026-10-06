/** Signed % change with an arrow, coloured by direction. */
export function Pct({ v, className = "" }: { v: number; className?: string }) {
  const up = v >= 0;
  return (
    <span className={`font-mono ${up ? "text-trend-up" : "text-trend-down"} ${className}`}>
      {up ? "↑ +" : "↓ −"}
      {Math.abs(v).toFixed(1)}%
    </span>
  );
}
