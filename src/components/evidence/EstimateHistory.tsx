import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TOOLTIP_STYLE, axisTick } from "@/lib/chart";
import { indicatorName } from "@/lib/coverage";
import { DRIVERS, NOWCAST } from "@/lib/nowcast";
import { SECTORS, sectorOf } from "@/lib/sectors";
import { fmtDate } from "@/lib/series";

/** A weekly move smaller than this is not worth calling out; a run of estimates inside it has settled. */
const MOVE = 0.2;

const day = (iso: string) => fmtDate(Date.parse(`${iso}T00:00:00Z`));
const pp = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)} pp`;
const pct = (v: number) => `${v.toFixed(1)}%`;
const weeks = (n: number) => `${n} ${n === 1 ? "week" : "weeks"}`;
const span = (xs: number[]) => Math.max(...xs) - Math.min(...xs);

/**
 * One sentence on whether the estimate has settled. It is worked out from the weekly estimates
 * themselves, so it can never disagree with the chart, and quotes no number typed by hand.
 */
function reading(estimates: number[]): string {
  const n = estimates.length;
  if (n < 3) return "Too few weekly runs yet to say whether the estimate has settled.";
  let from: number | null = null;
  for (let i = 0; i <= n - 3; i++) {
    if (span(estimates.slice(i)) <= MOVE + 1e-9) {
      from = i;
      break;
    }
  }
  if (from == null) {
    const recent = estimates.slice(-5);
    return `Still moving: the estimate has shifted ${span(recent).toFixed(1)} pp over the past ${weeks(recent.length - 1)}.`;
  }
  const held = estimates.slice(from);
  const range = `${pct(Math.min(...held))} to ${pct(Math.max(...held))}`;
  return from === 0
    ? `The estimate has stayed between ${range} since the first run of the quarter.`
    : `The estimate has stayed between ${range} for the past ${weeks(held.length - 1)}.`;
}

/** This quarter's estimate week by week since the last GDP release, and what moved it. */
export function EstimateHistory() {
  const runs = (NOWCAST?.vintages ?? []).filter((v) => v.estimate != null);
  const [picked, setPicked] = useState<number | null>(null);
  if (runs.length < 2) {
    return <p className="text-sm text-muted-foreground">Not enough weekly estimates yet.</p>;
  }
  const at = Math.min(picked ?? runs.length - 1, runs.length - 1);
  const data = runs.map((v) => ({
    label: day(v.asOf),
    estimate: v.estimate!,
    band: v.lower90 != null && v.upper90 != null ? [v.lower90, v.upper90] : null,
  }));
  // A missing range would pull the axis to 0 and flatten the line, so the axis comes from what is drawn.
  const levels = data.flatMap((d) => [d.estimate, ...(d.band ?? [])]);
  const yDomain: [number, number] = [
    Math.floor(Math.min(...levels) - 0.5),
    Math.ceil(Math.max(...levels) + 0.5),
  ];
  const firstRanged = data.findIndex((d) => d.band != null);

  const ids = DRIVERS.map((d) => d.id);
  const sinceStart = new Set(runs.slice(0, at).flatMap((v) => v.released));
  const thisWeek = new Set(runs[at]!.released);
  const state = (id: string) =>
    thisWeek.has(id) ? "new" : sinceStart.has(id) ? "earlier" : "not yet";

  const run = runs[at]!;
  const prev = at > 0 ? runs[at - 1]! : null;
  const delta = prev ? run.estimate! - prev.estimate! : null;
  const moved = prev
    ? SECTORS.map((s) => {
        const keys = new Set([
          ...Object.keys(run.contributions),
          ...Object.keys(prev.contributions),
        ]);
        const change = [...keys]
          .filter((id) => sectorOf(id) === s.key)
          .reduce((a, id) => a + (run.contributions[id] ?? 0) - (prev.contributions[id] ?? 0), 0);
        return { label: s.label, change };
      })
        .filter((s) => Math.abs(s.change) >= 0.005)
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 3)
    : [];

  return (
    <div>
      <p className="text-xs text-muted-foreground">
        The estimate is rebuilt every week as new figures arrive. Pick a week on the chart or the
        slider to see what changed.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-navy">
        {reading(runs.map((v) => v.estimate!))}
      </p>
      <div className="mt-4 h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
            onClick={(s) => {
              const i = s?.activeTooltipIndex;
              if (typeof i === "number") setPicked(i);
            }}
          >
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={axisTick(10)} axisLine={false} tickLine={false} />
            <YAxis
              domain={yDomain}
              width={44}
              tickFormatter={(v: number) => `${v}%`}
              tick={axisTick()}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v, name) =>
                name === "band"
                  ? Array.isArray(v)
                    ? [`${Number(v[0]).toFixed(1)}% to ${Number(v[1]).toFixed(1)}%`, "Likely range"]
                    : ["none yet", "Likely range"]
                  : [`${Number(v).toFixed(2)}%`, "Estimate"]
              }
            />
            <Area
              dataKey="band"
              stroke="none"
              fill="var(--color-blue-lighter)"
              fillOpacity={0.7}
              isAnimationActive={false}
            />
            <Line
              dataKey="estimate"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
            <ReferenceDot
              x={data[at]!.label}
              y={data[at]!.estimate}
              r={6}
              fill="var(--color-primary)"
              stroke="var(--color-card)"
              strokeWidth={2}
              isFront
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {firstRanged !== 0 ? (
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {firstRanged < 0
            ? "No likely range is drawn yet. It can only be measured once the release is near."
            : `The shaded range starts in the week to ${data[firstRanged]!.label}. It can only be measured once the release is near.`}
        </p>
      ) : null}

      <div className="mt-5 rounded-xl border border-border/70 bg-muted/20 p-4">
        <label className="flex items-center gap-3 text-xs text-blue-dark">
          <span className="shrink-0 font-mono uppercase tracking-wider">Week</span>
          <input
            type="range"
            min={0}
            max={runs.length - 1}
            step={1}
            value={at}
            onChange={(e) => setPicked(Number(e.target.value))}
            aria-label="Week to show"
            aria-valuetext={`Week to ${day(run.asOf)}`}
            className="min-w-0 flex-1"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-navy">Week to {day(run.asOf)}</p>
          <p className="font-mono text-sm text-navy">
            {pct(run.estimate!)}
            {delta != null ? (
              <span className={`ml-2 text-xs ${delta >= 0 ? "text-trend-up" : "text-trend-down"}`}>
                {pp(delta)}
              </span>
            ) : null}
          </p>
        </div>
        {prev ? (
          <p className="mt-1 text-xs leading-relaxed text-blue-dark">
            {moved.length
              ? `${moved.map((m) => `${m.label} ${pp(m.change)}`).join(", ")}.`
              : "No sector moved the estimate by a visible amount."}
          </p>
        ) : (
          <p className="mt-1 text-xs leading-relaxed text-blue-dark">
            The first run of the quarter.
          </p>
        )}
        <div
          className="mt-3 flex flex-wrap gap-[3px]"
          role="img"
          aria-label={`${ids.filter((id) => state(id) === "new").length} indicators published this week, ${ids.filter((id) => state(id) === "earlier").length} earlier in the quarter, ${ids.filter((id) => state(id) === "not yet").length} not yet`}
        >
          {ids.map((id) => {
            const s = state(id);
            return (
              <span
                key={id}
                title={`${indicatorName(id)}: ${s === "new" ? "published this week" : s === "earlier" ? "published earlier this quarter" : "not published yet this quarter"}`}
                className={`h-3 w-3 rounded-[2px] ${
                  s === "new"
                    ? "bg-primary"
                    : s === "earlier"
                      ? "bg-blue-light"
                      : "border border-border bg-transparent"
                }`}
              />
            );
          })}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-primary" /> this week
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-blue-light" /> earlier
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-[2px] border border-border" /> not yet
          </span>
          <span>One square per indicator. Hover for its name.</span>
        </p>
      </div>
    </div>
  );
}
