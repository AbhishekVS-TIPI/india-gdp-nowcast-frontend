import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sparkline } from "@/components/Sparkline";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TrendAnalysis } from "@/components/TrendAnalysis";
import {
  RANGES,
  categories,
  change,
  fmtDate,
  getNowcast,
  getSeries,
  indicators,
  sliceRange,
  type RangeKey,
} from "@/lib/series";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "India GDP Pulse — High-Frequency Indicator Dashboard" },
      {
        name: "description",
        content:
          "Track the high-frequency indicators behind India's GDP -- real data from MoSPI, RBI and the Labour Bureau, with sparkline trends and detailed indicator notes. A daily GDP nowcast model is in development.",
      },
      { property: "og:title", content: "India GDP Pulse — High-Frequency Indicator Dashboard" },
      {
        property: "og:description",
        content:
          "Real indicator data behind India's GDP from MoSPI, RBI and the Labour Bureau, with sparklines and source notes.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [range, setRange] = useState<RangeKey>("1Y");

  const gdp = useMemo(() => sliceRange(getNowcast(), range), [range]);
  const hasNowcast = gdp.length > 0;
  const gdpChange = change(gdp);
  const latest = gdp[gdp.length - 1];
  const latestIndicatorUpdate = indicators.reduce<number | null>((max, ind) => {
    const s = getSeries(ind.id);
    const t = s.length ? s[s.length - 1]!.t : null;
    return t != null && (max == null || t > max) ? t : max;
  }, null);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader
        subtitle={`${indicators.length} high-frequency indicators · updated ${
          latestIndicatorUpdate ? fmtDate(latestIndicatorUpdate) : "—"
        }`}
      />


      <div className="mx-auto max-w-6xl px-5 py-8">
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Nowcast GDP growth (y/y)
              </p>
              {hasNowcast ? (
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="font-mono text-4xl font-semibold text-navy">
                    {latest ? latest.v.toFixed(2) : "—"}%
                  </span>
                  <span
                    className={`font-mono text-sm ${gdpChange >= 0 ? "text-trend-up" : "text-trend-down"}`}
                  >
                    {gdpChange >= 0 ? "↑" : "↓"} {Math.abs(gdpChange).toFixed(1)}% over {range}
                  </span>
                </div>
              ) : (
                <p className="mt-1 font-mono text-2xl font-semibold text-muted-foreground">
                  Model in development
                </p>
              )}
            </div>
            {hasNowcast ? (
              <div className="flex gap-1 rounded-lg border border-border p-1">
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setRange(r.key)}
                    className={`rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
                      range === r.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {r.key}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {hasNowcast ? (
            <div className="mt-6 h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={gdp} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gdpFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-blue-lighter)" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="var(--color-blue-lighter)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="t"
                    tickFormatter={(t: number) =>
                      new Date(t).toLocaleDateString("en-IN", {
                        month: "short",
                        year: "2-digit",
                        timeZone: "UTC",
                      })
                    }
                    minTickGap={48}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    width={56}
                    tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReferenceLine y={0} stroke="var(--color-border)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelFormatter={(t) => fmtDate(Number(t))}
                    formatter={(v) => [`${Number(v).toFixed(2)}%`, "Nowcast"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    fill="url(#gdpFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-6 flex h-[220px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 text-center">
              <p className="text-sm text-blue-dark">
                The GDP nowcast model is still being built.
              </p>
              <p className="max-w-md text-xs text-muted-foreground">
                The indicator data below is real and live. This chart will show the daily
                nowcast once the model is ready.
              </p>
            </div>
          )}
        </section>

        <TrendAnalysis range={range} />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            All {indicators.length} indicators run on real source data from MoSPI, RBI and the
            Labour Bureau.
          </p>
          <Link
            to="/indicators"
            className="rounded-md bg-primary px-4 py-2 font-mono text-xs text-primary-foreground transition-colors hover:bg-primary/90"
          >
            View all indicators →
          </Link>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
