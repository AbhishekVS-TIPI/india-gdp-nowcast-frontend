import { createFileRoute, Link } from "@tanstack/react-router";
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
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TrendAnalysis } from "@/components/TrendAnalysis";
import { ciFor, NOWCAST } from "@/lib/nowcast";
import { fmtDate, getSeries, indicators, type RangeKey } from "@/lib/series";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "India GDP Pulse — High-Frequency Indicator Dashboard" },
      {
        name: "description",
        content:
          "Track the high-frequency indicators behind India's GDP -- real data from MoSPI, RBI and the Labour Bureau -- alongside a simple, transparent GDP growth nowcast with its confidence interval.",
      },
      { property: "og:title", content: "India GDP Pulse — High-Frequency Indicator Dashboard" },
      {
        property: "og:description",
        content:
          "Real indicator data behind India's GDP from MoSPI, RBI and the Labour Bureau, plus a simple GDP nowcast model with uncertainty shown.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [range] = useState<RangeKey>("1Y");

  const headline = NOWCAST?.nowcast ?? null;
  const model = NOWCAST?.model ?? null;
  const ci90 = ciFor(0.9);
  const ci68 = ciFor(0.68);

  type ChartRow = {
    label: string;
    actual: number | null;
    modelEstimate: number | null;
    nowcastPoint?: number;
    ci90Range?: [number, number];
  };

  const chartData = useMemo<ChartRow[]>(() => {
    const history = NOWCAST?.history ?? [];
    return history.map((h) => {
      const isHeadline = headline != null && h.quarterStart === headline.quarterStart;
      const row: ChartRow = {
        label: h.label,
        actual: h.actual,
        modelEstimate: h.fitted ?? h.projected,
      };
      if (isHeadline && headline && ci90) {
        row.nowcastPoint = headline.pointEstimate;
        row.ci90Range = [
          headline.pointEstimate - ci90.lower,
          ci90.upper - headline.pointEstimate,
        ];
      }
      return row;
    });
  }, [headline, ci90]);

  const pdfDomain = useMemo<[number, number]>(() => {
    if (!headline) return [0, 0];
    const xs = headline.pdf.map((p) => p.x);
    return [Math.min(...xs), Math.max(...xs)];
  }, [headline]);

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
                Nowcast GDP growth (y/y) — {headline ? headline.label : "—"}
              </p>
              {headline ? (
                <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                  <span className="font-mono text-4xl font-semibold text-navy">
                    {headline.pointEstimate >= 0 ? "+" : ""}
                    {headline.pointEstimate.toFixed(2)}%
                  </span>
                  {ci90 ? (
                    <span className="font-mono text-sm text-muted-foreground">
                      90% CI [{ci90.lower.toFixed(1)}%, {ci90.upper.toFixed(1)}%]
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 font-mono text-2xl font-semibold text-muted-foreground">
                  Model in development
                </p>
              )}
              {headline ? (
                <p className="mt-3 max-w-md text-xs leading-relaxed text-muted-foreground">
                  Based on {headline.indicatorsReporting.length} of{" "}
                  {headline.indicatorsTotal} indicators reporting for this quarter so far
                  {headline.indicatorsReporting.length
                    ? `: ${headline.indicatorsReporting.join(", ")}`
                    : ""}
                  . Narrows as more report.
                </p>
              ) : null}
            </div>
          </div>

          {headline ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_260px]">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      width={48}
                      tickFormatter={(v: number) => `${v.toFixed(0)}%`}
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
                      formatter={(v, name) => {
                        if (v == null) return ["—", name];
                        const label =
                          name === "actual"
                            ? "Actual"
                            : name === "modelEstimate"
                              ? "Model estimate"
                              : name === "nowcastPoint"
                                ? "Nowcast"
                                : String(name);
                        return [`${Number(v).toFixed(2)}%`, label];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="var(--color-chart-1)"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="modelEstimate"
                      stroke="var(--color-muted-foreground)"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      dataKey="nowcastPoint"
                      stroke="var(--color-navy, #1e293b)"
                      strokeWidth={0}
                      dot={{ r: 4 }}
                      isAnimationActive={false}
                    >
                      <ErrorBar
                        dataKey="ci90Range"
                        width={6}
                        strokeWidth={2}
                        stroke="var(--color-navy, #1e293b)"
                      />
                    </Line>
                  </ComposedChart>
                </ResponsiveContainer>
                <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
                  Solid: released GDP · Dashed: model estimate (in-sample fit and, for the last
                  two bars, out-of-sample) · Whisker: 90% interval on the current nowcast
                </p>
              </div>

              <div className="h-[280px] w-full">
                <p className="text-center text-[11px] uppercase tracking-wider text-muted-foreground">
                  Probability density — {headline.label}
                </p>
                <ResponsiveContainer width="100%" height="90%">
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
                      domain={pdfDomain}
                      tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                      tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
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
                    <ReferenceLine
                      x={headline.pointEstimate}
                      stroke="var(--color-chart-1)"
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelFormatter={(v) => `${Number(v).toFixed(1)}% y/y`}
                      formatter={(v) => [Number(v).toExponential(2), "density"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="y"
                      stroke="var(--color-chart-1)"
                      strokeWidth={1.5}
                      fill="url(#pdfFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex h-[220px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 text-center">
              <p className="text-sm text-blue-dark">
                The GDP nowcast model is still being built.
              </p>
              <p className="max-w-md text-xs text-muted-foreground">
                The indicator data below is real and live. This chart will show the nowcast
                once the model is ready.
              </p>
            </div>
          )}

          {model ? (
            <details className="mt-6 rounded-lg border border-border/70 bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
              <summary className="cursor-pointer font-mono uppercase tracking-wider">
                Model notes ({model.trainingQuarters} training quarters, R² {model.rSquared.toFixed(2)})
              </summary>
              <ul className="mt-3 list-disc space-y-2 pl-4">
                {NOWCAST?.caveats.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </details>
          ) : null}
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
