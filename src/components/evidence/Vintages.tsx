import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TOOLTIP_STYLE, axisTick } from "@/lib/chart";
import { NOWCAST } from "@/lib/nowcast";
import { SECTORS, sectorOf } from "@/lib/sectors";
import { indicatorName } from "@/lib/coverage";
import { fmtDate } from "@/lib/series";

const day = (iso: string) => fmtDate(Date.parse(`${iso}T00:00:00Z`));
const pp = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)} pp`;

/** This quarter's estimate week by week since the last GDP release, and what moved it. */
export function Vintages() {
  const vintages = (NOWCAST?.vintages ?? []).filter((v) => v.estimate != null);
  if (vintages.length < 2) {
    return <p className="text-sm text-muted-foreground">Not enough weekly estimates yet.</p>;
  }
  const data = vintages.map((v) => ({
    label: day(v.asOf),
    estimate: v.estimate,
    band: v.lower90 != null && v.upper90 != null ? [v.lower90, v.upper90] : null,
  }));
  // An empty band would otherwise pull the axis down to 0 and flatten the line.
  const levels = data.flatMap((d) => [d.estimate!, ...(d.band ?? [])]);
  const yDomain: [number, number] = [
    Math.floor(Math.min(...levels) - 0.5),
    Math.ceil(Math.max(...levels) + 0.5),
  ];
  // Early weeks have no range: it is measured only from earlier estimates made close to a release.
  const firstRanged = data.findIndex((d) => d.band != null);
  const unranged = firstRanged < 0 ? data.length : firstRanged;
  const gapsInside = data.slice(Math.max(firstRanged, 0)).some((d) => d.band == null);

  const steps = vintages.slice(1).map((v, i) => {
    const prev = vintages[i]!;
    const delta = v.estimate! - prev.estimate!;
    const ids = new Set([...Object.keys(v.contributions), ...Object.keys(prev.contributions)]);
    const bySector = SECTORS.map((s) => ({
      label: s.label,
      change: [...ids]
        .filter((id) => sectorOf(id) === s.key)
        .reduce((a, id) => a + (v.contributions[id] ?? 0) - (prev.contributions[id] ?? 0), 0),
    }))
      .filter((s) => Math.abs(s.change) >= 0.005)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    const explained = bySector.reduce((a, s) => a + s.change, 0);
    return {
      asOf: v.asOf,
      delta,
      bySector: bySector.slice(0, 3),
      rest: delta - explained,
      released: v.released,
    };
  });

  return (
    <div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
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
                    : ["not measured yet", "Likely range"]
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
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {unranged > 0 || gapsInside ? (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {unranged === data.length
            ? "No likely range is drawn: it is measured from how far earlier estimates made close to a release were from the first print, and the release is not yet near."
            : `The shaded range starts in the week to ${data[firstRanged]!.label}. Before that none is drawn: it is measured from how far earlier estimates made close to a release were from the first print.`}
        </p>
      ) : null}
      <ul className="mt-4 divide-y divide-border">
        {steps.map((s) => (
          <li key={s.asOf} className="py-2.5 text-xs leading-relaxed">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-navy">Week to {day(s.asOf)}</span>
              <span className={`font-mono ${s.delta >= 0 ? "text-trend-up" : "text-trend-down"}`}>
                {pp(s.delta)}
              </span>
            </div>
            <p className="mt-1 text-blue-dark">
              {s.bySector.map((b) => `${b.label} ${pp(b.change)}`).join(" · ")}
              {s.bySector.length ? " · " : ""}carry-forward and re-estimation {pp(s.rest)}
            </p>
            {s.released.length ? (
              <p className="mt-0.5 text-muted-foreground">
                New figures: {s.released.slice(0, 4).map(indicatorName).join(", ")}
                {s.released.length > 4 ? ` and ${s.released.length - 4} more` : ""}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
