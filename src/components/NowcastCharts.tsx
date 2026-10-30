import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TimelineSlider } from "@/components/TimelineSlider";
import { TOOLTIP_STYLE, axisTick } from "@/lib/chart";
import { NOWCAST, NOWCAST_ROWS, ciFor, stressRange } from "@/lib/nowcast";

const pctTick = (v: number) => `${v.toFixed(0)}%`;

/** Released GDP against the model's in-sample fit, with this quarter's estimate and 90% range. */
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

  // The window the reader picked: the chart zooms to it, and the scale follows what is in view.
  const last = data.length - 1;
  const [window, setWindow] = useState<[number, number]>([0, last]);
  const from = Math.min(window[0], last);
  const to = Math.min(window[1], last);
  const shown = data.slice(from, to + 1);
  const zoomed = from > 0 || to < last;

  return (
    <div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={shown} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
        Solid: official GDP growth · Dashed: the model's fit to past quarters ·{" "}
        {ci90
          ? "Dot and whisker: this quarter's estimate and its 90% range"
          : "Dot: this quarter's estimate (no likely range yet)"}
      </p>
      {data.length > 8 ? (
        <div className="mx-auto mt-4 max-w-xl">
          <TimelineSlider
            labels={data.map((r) => r.label)}
            value={[from, to]}
            onChange={setWindow}
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Drag the handles to choose the start and end quarter.</span>
            {zoomed ? (
              <button
                type="button"
                onClick={() => setWindow([0, last])}
                className="font-mono uppercase tracking-wider text-primary underline underline-offset-2"
              >
                Show all
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Predictive distribution for the current quarter, with the 90% band shaded and, when the
 * export has one, the wider tail-risk range lighter underneath. Draws nothing without a density.
 */
export function DensityChart() {
  const headline = NOWCAST?.nowcast ?? null;
  const ci90 = ciFor(0.9);
  const stress = stressRange();
  const pdf = headline?.pdf;
  const domain = useMemo<[number, number]>(() => {
    const xs = [...(pdf ?? []).map((p) => p.x), ...(stress ? [stress.lower, stress.upper] : [])];
    return xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 0];
  }, [pdf, stress]);

  if (!headline || !pdf || pdf.length < 2) return null;

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={pdf} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
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
          {stress ? (
            <ReferenceArea
              x1={stress.lower}
              x2={stress.upper}
              fill="var(--color-chart-1)"
              fillOpacity={0.05}
            />
          ) : null}
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
