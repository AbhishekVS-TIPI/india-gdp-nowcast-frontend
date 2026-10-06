import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { MoverLists } from "@/components/MoverLists";
import { NowcastTrendChart } from "@/components/NowcastCharts";
import { Pct } from "@/components/Pct";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Sparkline } from "@/components/Sparkline";
import { ciFor, lastReleasedGdp, NOWCAST } from "@/lib/nowcast";
import {
  TODAY,
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
  const ci90 = ciFor(0.9);
  const mv = useMemo(() => movers("1Y"), []);
  const featured = useMemo(() => mv.filter((m) => m.change > 0).slice(0, 4), [mv]);
  const lastActual = lastReleasedGdp();

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader
        subtitle={`${indicators.length} high-frequency indicators · updated ${fmtDate(TODAY)}`}
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

            <div className="mt-6">
              {headline ? (
                <NowcastTrendChart />
              ) : (
                <div className="flex h-[220px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 text-center">
                  <p className="text-sm text-blue-dark">
                    The GDP nowcast model is still being built.
                  </p>
                  <p className="max-w-md text-xs text-muted-foreground">
                    The indicator data is real and live. This chart will show the nowcast once the
                    model is ready.
                  </p>
                </div>
              )}
            </div>
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
                  {headline.indicatorsReporting.length && headline.indicatorsTotal <= 8
                    ? ` (${headline.indicatorsReporting.join(", ")})`
                    : ""}
                  ; the likely range narrows as more report.
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

        {featured.length ? (
          <section className="mt-10">
            <h2 className="eyebrow">Major movers · last 12 months</h2>
            <div className="mt-4 space-y-4">
              {featured.map((m) => {
                const ind = indicators.find((i) => i.id === m.id)!;
                const s = getSeries(m.id);
                const w = sliceRange(s, "1Y");
                const first = w[0]!;
                const last = w[w.length - 1]!;
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
                          {fmtNum(last.v, ind.unit)}
                        </span>
                        <Pct v={m.change} className="text-sm" />
                      </p>
                      <div className="mt-4 max-w-[260px]">
                        <Sparkline
                          data={sliceRange(s, defaultRange(m.id))}
                          positive={change(w) >= 0}
                          width={260}
                          height={56}
                        />
                      </div>
                    </div>
                    <div className="space-y-3 text-sm leading-relaxed">
                      <p className="eyebrow">Insights</p>
                      <p className="text-navy">
                        {m.name} has ↑ risen by {m.change.toFixed(1)}% over the past year, moving
                        from {fmtNum(first.v, ind.unit)} on {fmtDate(first.t)} to{" "}
                        {fmtNum(last.v, ind.unit)} on {fmtDate(last.t)}.
                      </p>
                      <p className="text-blue-dark">
                        Reported {ind.frequency.toLowerCase()}, this is one of the largest movers
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
