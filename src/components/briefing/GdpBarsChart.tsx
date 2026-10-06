import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ErrorBar,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TimelineSlider } from "@/components/TimelineSlider";
import { TOOLTIP_STYLE, axisTick } from "@/lib/chart";
import { NOWCAST, NOWCAST_ROWS, ciFor, isTooEarly } from "@/lib/nowcast";

const QUARTERS_PER_YEAR = 4;

type Row = { label: string; value: number; nowcast: boolean; range?: [number, number] };

/**
 * Official GDP growth as grey bars, with this quarter's estimate highlighted and
 * its likely range as a whisker. Opens on the last four years; the slider and
 * presets reach back to 2005.
 */
export function GdpBarsChart() {
  const headline = NOWCAST?.nowcast ?? null;
  const ci90 = ciFor(0.9);
  const rows = useMemo<Row[]>(
    () =>
      NOWCAST_ROWS.flatMap((r): Row[] => {
        if (r.actual != null) return [{ label: r.label, value: r.actual, nowcast: false }];
        if (headline && r.quarterStart === headline.quarterStart) {
          const p = headline.pointEstimate;
          return [
            {
              label: r.label,
              value: p,
              nowcast: true,
              ...(ci90 ? { range: [p - ci90.lower, ci90.upper - p] as [number, number] } : {}),
            },
          ];
        }
        return [];
      }),
    [headline, ci90],
  );
  const last = rows.length - 1;
  const [[start, end], setWindow] = useState<[number, number]>([
    Math.max(0, last - 4 * QUARTERS_PER_YEAR),
    last,
  ]);
  const data = rows.slice(start, end + 1);
  const labels = useMemo(() => rows.map((r) => r.label), [rows]);
  const tooEarly = isTooEarly();
  const presets = [
    { label: "4Y", from: Math.max(0, last - 4 * QUARTERS_PER_YEAR) },
    { label: "10Y", from: Math.max(0, last - 10 * QUARTERS_PER_YEAR) },
    { label: "All", from: 0 },
  ];

  return (
    <div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={axisTick(10)}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              width={44}
              tickFormatter={(v: number) => `${v}%`}
              tick={axisTick()}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine y={0} stroke="var(--color-border)" />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: "var(--color-accent)", opacity: 0.4 }}
              formatter={(v, _n, item) => {
                const row = item.payload as Row;
                return [
                  `${Number(v).toFixed(1)}%`,
                  row.nowcast
                    ? tooEarly
                      ? "Provisional estimate"
                      : "Our estimate"
                    : "Official GDP growth",
                ];
              }}
            />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {data.map((r) => (
                <Cell
                  key={r.label}
                  fill={r.nowcast ? "var(--color-chart-1)" : "var(--color-blue-light)"}
                  fillOpacity={r.nowcast && tooEarly ? 0.5 : 1}
                  stroke={r.nowcast ? "var(--color-chart-1)" : "none"}
                  strokeDasharray={r.nowcast && tooEarly ? "3 2" : undefined}
                />
              ))}
              <ErrorBar dataKey="range" width={8} strokeWidth={2} stroke="var(--color-navy)" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="min-w-[220px] flex-1">
          <TimelineSlider labels={labels} value={[start, end]} onChange={setWindow} />
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setWindow([p.from, last])}
              className={`rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
                start === p.from && end === last
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Light bars: official GDP growth (year on year). Dark bar: our estimate for the current
        quarter, with the line showing where growth is likely to fall.
      </p>
    </div>
  );
}
