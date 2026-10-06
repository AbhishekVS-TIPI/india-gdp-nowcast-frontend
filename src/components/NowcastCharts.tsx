import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TimelineSlider } from "@/components/TimelineSlider";
import { TOOLTIP_STYLE, axisTick } from "@/lib/chart";
import { NOWCAST, NOWCAST_ROWS, ciFor } from "@/lib/nowcast";

const pctTick = (v: number) => `${v.toFixed(0)}%`;
const QUARTERS_PER_YEAR = 4;

/** Quarters that have a model estimate: the span the nowcast trend can show. */
const TREND_ROWS = NOWCAST_ROWS.filter((r) => r.estimate != null);

/**
 * Home page chart: the nowcast trend only (no released GDP), with a timeline
 * slider so a viewer can focus on a period. Opens on the last ten years.
 */
export function NowcastTrendChart() {
  const last = TREND_ROWS.length - 1;
  const [[start, end], setWindow] = useState<[number, number]>([
    Math.max(0, last - 10 * QUARTERS_PER_YEAR),
    last,
  ]);
  const labels = useMemo(() => TREND_ROWS.map((r) => r.label), []);
  const data = useMemo(() => TREND_ROWS.slice(start, end + 1), [start, end]);
  const headline = NOWCAST?.nowcast ?? null;
  const headlineRow = headline ? data.find((r) => r.quarterStart === headline.quarterStart) : null;

  const presets = [
    { label: "5Y", from: Math.max(0, last - 5 * QUARTERS_PER_YEAR) },
    { label: "10Y", from: Math.max(0, last - 10 * QUARTERS_PER_YEAR) },
    { label: "All", from: 0 },
  ];

  return (
    <div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-blue-lighter)" stopOpacity="0.9" />
                <stop offset="100%" stopColor="var(--color-blue-lighter)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={axisTick(10)}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              width={48}
              tickFormatter={pctTick}
              tick={axisTick()}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine y={0} stroke="var(--color-border)" />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v) => [`${Number(v).toFixed(2)}%`, "Nowcast"]}
            />
            <Area
              type="monotone"
              dataKey="estimate"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              fill="url(#trendFill)"
              isAnimationActive={false}
            />
            {headlineRow ? (
              <ReferenceDot
                x={headlineRow.label}
                y={headlineRow.estimate ?? 0}
                r={5}
                fill="var(--color-navy)"
                stroke="var(--color-card)"
                strokeWidth={2}
              />
            ) : null}
          </AreaChart>
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
        Model nowcast of GDP growth (y/y), by quarter. The dark dot is the current quarter's
        estimate. Drag the handles to focus on a period.
      </p>
    </div>
  );
}

/** Trends page chart: released GDP against the model estimate, with the 90% whisker. */
export function NowcastVsActualChart() {
  const headline = NOWCAST?.nowcast ?? null;
  const ci90 = ciFor(0.9);

  const data = useMemo(
    () =>
      NOWCAST_ROWS.map((r) => {
        const isHeadline = headline != null && r.quarterStart === headline.quarterStart;
        return {
          ...r,
          nowcastPoint: isHeadline ? headline.pointEstimate : undefined,
          ci90Range:
            isHeadline && ci90
              ? ([headline.pointEstimate - ci90.lower, ci90.upper - headline.pointEstimate] as [
                  number,
                  number,
                ])
              : undefined,
        };
      }),
    [headline, ci90],
  );

  const names: Record<string, string> = {
    actual: "Actual GDP",
    estimate: "Model estimate",
    nowcastPoint: "Nowcast",
  };

  return (
    <div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={axisTick(10)}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              width={48}
              tickFormatter={pctTick}
              tick={axisTick()}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine y={0} stroke="var(--color-border)" />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v, name) =>
                v == null
                  ? ["—", names[name as string] ?? name]
                  : [`${Number(v).toFixed(2)}%`, names[name as string] ?? name]
              }
            />
            <Line
              type="linear"
              dataKey="actual"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="estimate"
              stroke="var(--color-muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="nowcastPoint"
              stroke="var(--color-navy)"
              strokeWidth={0}
              dot={{ r: 4 }}
              isAnimationActive={false}
            >
              <ErrorBar dataKey="ci90Range" width={6} strokeWidth={2} stroke="var(--color-navy)" />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
        Solid: released GDP · Dashed: model estimate (in-sample fit) · Dot and whisker: this
        quarter's nowcast and its 90% interval
      </p>
    </div>
  );
}

/** Predictive distribution for the current quarter, with the 90% band shaded. */
export function DensityChart() {
  const headline = NOWCAST?.nowcast ?? null;
  const ci90 = ciFor(0.9);
  const domain = useMemo<[number, number]>(() => {
    if (!headline) return [0, 0];
    const xs = headline.pdf.map((p) => p.x);
    return [Math.min(...xs), Math.max(...xs)];
  }, [headline]);

  if (!headline) return null;

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={headline.pdf} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="pdfFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-blue-lighter)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="var(--color-blue-lighter)" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="x"
            type="number"
            domain={domain}
            tickFormatter={pctTick}
            tick={axisTick(10)}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          {ci90 ? (
            <ReferenceArea
              x1={ci90.lower}
              x2={ci90.upper}
              fill="var(--color-chart-1)"
              fillOpacity={0.12}
            />
          ) : null}
          <ReferenceLine x={headline.pointEstimate} stroke="var(--color-chart-1)" strokeWidth={2} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(v) => `${Number(v).toFixed(1)}% y/y`}
            formatter={(v) => [Number(v).toExponential(2), "density"]}
          />
          <Area
            type="monotone"
            dataKey="y"
            stroke="var(--color-chart-1)"
            strokeWidth={1.5}
            fill="url(#pdfFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
