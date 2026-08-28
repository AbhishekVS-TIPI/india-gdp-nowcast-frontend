import type { Point } from "@/lib/series";

export function Sparkline({
  data,
  width = 180,
  height = 36,
  positive = true,
}: {
  data: Point[];
  width?: number;
  height?: number;
  positive?: boolean;
}) {
  if (data.length < 2) return <svg width={width} height={height} />;
  const vals = data.map((d) => d.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((d, i) => [i * step, height - ((d.v - min) / span) * (height - 4) - 2]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]!.toFixed(1)},${p[1]!.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const stroke = positive ? "var(--color-trend-up)" : "var(--color-trend-down)";
  const gid = `sg-${positive ? "p" : "n"}`;
  const last = pts[pts.length - 1]!;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2" fill={stroke} />
    </svg>
  );
}
