import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MoverLists } from "@/components/MoverLists";
import { RangeSwitch } from "@/components/RangeSwitch";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ciFor, NOWCAST } from "@/lib/nowcast";
import { TODAY, fmtDate, indicators, movers, type RangeKey } from "@/lib/series";

export const Route = createFileRoute("/trends")({
  head: () => ({
    meta: [
      { title: "Trends & Heat Map — India GDP Nowcast" },
      {
        name: "description",
        content:
          "A heat map of every indicator's change over the selected period, plus the biggest movers behind India's GDP nowcast.",
      },
      { property: "og:title", content: "Trends & Heat Map — India GDP Nowcast" },
      {
        property: "og:description",
        content: "Which high-frequency indicators are rising and falling, at a glance.",
      },
    ],
  }),
  component: TrendsPage,
});

const PERIOD: Record<RangeKey, string> = {
  "1M": "the past month",
  "3M": "the past three months",
  "6M": "the past six months",
  "1Y": "the past year",
  "5Y": "the past five years",
  MAX: "the full history",
};

/** Cell tint: trend colour mixed in proportion to |change| relative to `scale`. */
function tint(ch: number, scale: number): string {
  const strength = Math.min(1, Math.abs(ch) / scale);
  const colour = ch >= 0 ? "var(--trend-up)" : "var(--trend-down)";
  return `color-mix(in oklab, ${colour} ${Math.round(8 + strength * 62)}%, var(--card))`;
}

function TrendsPage() {
  const [range, setRange] = useState<RangeKey>("1Y");
  const headline = NOWCAST?.nowcast ?? null;
  const ci90 = ciFor(0.9);

  const items = useMemo(() => movers(range), [range]);
  const stale = indicators.length - items.length;

  // Clip the colour scale at the 90th-percentile |change| so one extreme
  // series doesn't wash out every other cell.
  const scale = useMemo(() => {
    const abs = items.map((m) => Math.abs(m.change)).sort((a, b) => a - b);
    return abs.length ? Math.max(abs[Math.floor(abs.length * 0.9)] ?? 1, 1) : 1;
  }, [items]);

  const rising = items.filter((m) => m.change > 0).length;
  const falling = items.filter((m) => m.change < 0).length;
  const bars = useMemo(
    () => [...items.slice(0, 8), ...items.slice(-8)].filter((m, i, a) => a.indexOf(m) === i),
    [items],
  );
  const barMax = Math.max(1, ...bars.map((m) => Math.abs(m.change)));

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader subtitle={`${indicators.length} high-frequency indicators`} />

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div>
            <p className="eyebrow">
              Nowcast GDP growth (y/y){headline ? ` · ${headline.label}` : ""}
            </p>
            {headline ? (
              <p className="mt-2 flex flex-wrap items-baseline gap-3">
                <span className="font-mono text-4xl font-semibold text-navy">
                  {headline.pointEstimate >= 0 ? "+" : ""}
                  {headline.pointEstimate.toFixed(2)}%
                </span>
                {ci90 ? (
                  <span className="font-mono text-sm text-muted-foreground">
                    90% CI [{ci90.lower.toFixed(1)}%, {ci90.upper.toFixed(1)}%]
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="mt-2 font-mono text-2xl font-semibold text-muted-foreground">
                Model in development
              </p>
            )}
          </div>
          <RangeSwitch value={range} onChange={setRange} />
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="eyebrow">
              Indicator heat map · {items.length} indicators · {range}
            </h2>
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="text-trend-down">▼ −{scale.toFixed(0)}%</span>
              <span
                className="h-2 w-28 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, var(--trend-down), var(--card), var(--trend-up))",
                }}
              />
              <span className="text-trend-up">▲ +{scale.toFixed(0)}%</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {items.map((m) => (
              <Link
                key={m.id}
                to="/indicator/$id"
                params={{ id: m.id }}
                title={`${m.name} · ${m.category} · ${m.change >= 0 ? "+" : "−"}${Math.abs(m.change).toFixed(1)}% over ${range}`}
                className="flex min-h-[72px] flex-col justify-between rounded-lg p-2.5 text-navy transition-transform hover:-translate-y-0.5"
                style={{ background: tint(m.change, scale) }}
              >
                <span className="line-clamp-2 text-[11px] font-medium leading-tight">{m.name}</span>
                <span className="mt-2 font-mono text-xs font-semibold">
                  {m.change >= 0 ? "+" : "−"}
                  {Math.abs(m.change).toFixed(1)}%
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Hover a cell for details. Colour intensity scales with the size of the change over the
            selected period; red is a decline, green a gain.
            {stale > 0
              ? ` ${stale} indicator${stale === 1 ? " has" : "s have"} no usable reading (nothing in this window, or the series crosses zero) and ${stale === 1 ? "is" : "are"} left out.`
              : ""}
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="eyebrow">Trend analysis</h2>
          <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-navy">
            <p>
              Over {PERIOD[range]}, {rising} of {items.length} indicators with data rose and{" "}
              {falling} fell.
            </p>
            {headline ? (
              <p className="text-blue-dark">
                The headline nowcast for {headline.label} is{" "}
                {headline.pointEstimate >= 0 ? "+" : ""}
                {headline.pointEstimate.toFixed(2)}% y/y, produced by the quarterly model from{" "}
                {headline.indicatorsReporting.length} of {headline.indicatorsTotal} reporting
                indicators. The movers below are descriptive and are not model weights.
              </p>
            ) : null}
          </div>
          <div className="mt-6">
            <MoverLists items={items} n={4} />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="eyebrow">Biggest movers · {range}</h2>
          <ul className="mt-5 space-y-2">
            {bars.map((m) => {
              const pct = (Math.abs(m.change) / barMax) * 50;
              const up = m.change >= 0;
              return (
                <li
                  key={m.id}
                  className="grid grid-cols-[minmax(0,9rem)_1fr_4rem] items-center gap-3 sm:grid-cols-[minmax(0,14rem)_1fr_4.5rem]"
                >
                  <span className="truncate text-xs text-navy">{m.name}</span>
                  <span className="relative h-4 rounded-sm bg-muted/50">
                    <span
                      className={`absolute top-0 h-full rounded-sm ${up ? "bg-trend-up" : "bg-trend-down"}`}
                      style={
                        up ? { left: "50%", width: `${pct}%` } : { right: "50%", width: `${pct}%` }
                      }
                    />
                  </span>
                  <span
                    className={`text-right font-mono text-xs ${up ? "text-trend-up" : "text-trend-down"}`}
                  >
                    {up ? "+" : "−"}
                    {Math.abs(m.change).toFixed(1)}%
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Bar length is the % change in the indicator's level over the selected period (not a
            contribution to the nowcast). Latest data: {fmtDate(TODAY)}.
          </p>
        </section>

        <Link
          to="/indicators"
          className="inline-block rounded-md bg-primary px-4 py-2 font-mono text-xs text-primary-foreground transition-colors hover:bg-primary/90"
        >
          View all indicators →
        </Link>
      </div>
      <SiteFooter />
    </main>
  );
}
