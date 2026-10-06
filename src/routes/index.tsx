import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
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
import { MoverLists } from "@/components/MoverLists";
import { Sparkline } from "@/components/Sparkline";
import { ciFor, NOWCAST } from "@/lib/nowcast";
import {
  change,
  defaultRange,
  fmtDate,
  fmtNum,
  getSeries,
  indicators,
  movers,
  sliceRange,
} from "@/lib/series";

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
  const headline = NOWCAST?.nowcast ?? null;
  const model = NOWCAST?.model ?? null;
  const mv = useMemo(() => movers("1Y"), []);
  const featured = useMemo(() => mv.filter((m) => m.change > 0).slice(0, 4), [mv]);
  const lastActual = [...(NOWCAST?.history ?? [])].reverse().find((h) => h.actual != null) ?? null;
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
        row.ci90Range = [headline.pointEstimate - ci90.lower, ci90.upper - headline.pointEstimate];
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
        <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <p className="eyebrow">
              Nowcast GDP growth (y/y){headline ? ` · ${headline.label}` : ""}
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
              <div className="mt-6">
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={chartData}
                      margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                    >
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
                        type="linear"
                        dataKey="actual"
                        stroke="var(--color-chart-1)"
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                      />
                      <Line
                        type="linear"
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
                </div>
                <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
                  Solid: released GDP · Dashed: model estimate (in-sample fit and, for the last two
                  bars, out-of-sample) · Whisker: 90% interval on the current nowcast
                </p>
              </div>
            ) : (
              <div className="mt-6 flex h-[220px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 text-center">
                <p className="text-sm text-blue-dark">
                  The GDP nowcast model is still being built.
                </p>
                <p className="max-w-md text-xs text-muted-foreground">
                  The indicator data is real and live. This chart will show the nowcast once the
                  model is ready.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <p className="eyebrow">Insights</p>
            {headline ? (
              <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-navy">
                <p>
                  The nowcast for {headline.label} reads{" "}
                  <span className="font-mono">
                    {headline.pointEstimate >= 0 ? "+" : ""}
                    {headline.pointEstimate.toFixed(2)}%
                  </span>{" "}
                  year-on-year
                  {lastActual
                    ? `, against ${lastActual.actual!.toFixed(1)}% released for ${lastActual.label}`
                    : ""}
                  .
                </p>
                <p className="text-blue-dark">
                  {headline.indicatorsReporting.length} of {headline.indicatorsTotal} model
                  indicators have reported for this quarter so far
                  {headline.indicatorsReporting.length
                    ? ` (${headline.indicatorsReporting.join(", ")})`
                    : ""}
                  , so the interval is wide and narrows as more report.
                </p>
              </div>
            ) : null}
            <div className="mt-6">
              <MoverLists items={mv} />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                to="/trends"
                className="rounded-md bg-primary px-4 py-2 font-mono text-xs text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Explore trends →
              </Link>
              <Link
                to="/indicators"
                className="rounded-md border border-border px-4 py-2 font-mono text-xs text-navy transition-colors hover:bg-accent/60"
              >
                All indicators
              </Link>
            </div>
          </section>
        </div>

        {headline ? (
          <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-center">
              <div>
                <p className="eyebrow">Probability density · {headline.label}</p>
                <p className="mt-3 text-sm leading-relaxed text-blue-dark">
                  The model's predictive distribution for this quarter. The shaded band is the 90%
                  interval; the line marks the point estimate
                  {ci68
                    ? `; the 68% interval is [${ci68.lower.toFixed(1)}%, ${ci68.upper.toFixed(1)}%]`
                    : ""}
                  .
                </p>
              </div>
              <div className="w-full">
                <div className="mt-2 h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={headline.pdf}
                      margin={{ top: 12, right: 8, left: 8, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="pdfFill" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor="var(--color-blue-lighter)"
                            stopOpacity="0.9"
                          />
                          <stop
                            offset="100%"
                            stopColor="var(--color-blue-lighter)"
                            stopOpacity="0.1"
                          />
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
            </div>
            {model ? (
              <details className="mt-6 rounded-lg border border-border/70 bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
                <summary className="cursor-pointer font-mono uppercase tracking-wider">
                  Model notes ({model.trainingQuarters} training quarters, R²{" "}
                  {model.rSquared.toFixed(2)})
                </summary>
                <ul className="mt-3 list-disc space-y-2 pl-4">
                  {NOWCAST?.caveats.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        ) : null}

        {featured.length ? (
          <section className="mt-10">
            <h2 className="eyebrow">Major movers · last 12 months</h2>
            <div className="mt-4 space-y-4">
              {featured.map((m) => {
                const full = indicators.find((i) => i.id === m.id)!;
                const s = getSeries(m.id);
                const w = sliceRange(s, "1Y");
                const first = w[0]!;
                const last = w[w.length - 1]!;
                const trend = sliceRange(s, defaultRange(m.id));
                return (
                  <Link
                    key={m.id}
                    to="/indicator/$id"
                    params={{ id: m.id }}
                    className="grid gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-accent/40 sm:grid-cols-[1fr_1.2fr] sm:p-6"
                  >
                    <div>
                      <p className="eyebrow">{m.category}</p>
                      <p className="mt-2 text-lg font-semibold text-navy">{m.name}</p>
                      <p className="mt-3 flex items-baseline gap-3">
                        <span className="font-mono text-3xl font-semibold text-navy">
                          {fmtNum(last.v, full.unit)}
                        </span>
                        <span className="font-mono text-sm text-trend-up">
                          ↑ +{m.change.toFixed(1)}%
                        </span>
                      </p>
                      <div className="mt-4 max-w-[260px]">
                        <Sparkline data={trend} positive={change(w) >= 0} width={260} height={56} />
                      </div>
                    </div>
                    <div className="space-y-3 text-sm leading-relaxed">
                      <p className="eyebrow">Insights</p>
                      <p className="text-navy">
                        {m.name} has ↑ risen by {m.change.toFixed(1)}% over the past year, moving
                        from {fmtNum(first.v, full.unit)} on {fmtDate(first.t)} to{" "}
                        {fmtNum(last.v, full.unit)} on {fmtDate(last.t)}.
                      </p>
                      <p className="text-blue-dark">
                        Reported {full.frequency.toLowerCase()}, this is one of the largest movers
                        among the {indicators.length} indicators over the last twelve months.
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
      <SiteFooter />
    </main>
  );
}
