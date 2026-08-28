import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sparkline } from "@/components/Sparkline";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  RANGES,
  categories,
  change,
  fmtDate,
  getSeries,
  lastUpdated,
  indicators,
  sliceRange,
  type RangeKey,
} from "@/lib/series";

export const Route = createFileRoute("/indicators")({
  head: () => ({
    meta: [
      { title: "Indicators — India GDP Nowcast" },
      {
        name: "description",
        content:
          "Browse every high-frequency indicator feeding India's GDP nowcast, with sparkline trends, categories and period filters.",
      },
      { property: "og:title", content: "Indicators — India GDP Nowcast" },
      {
        property: "og:description",
        content:
          "Sparkline trends and category filters for the high-frequency indicators behind India's GDP nowcast.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IndicatorsPage,
});

const RANKS = [
  { key: "all", label: "All indicators", n: 0, dir: "top" },
  { key: "top3", label: "Top 3 performing", n: 3, dir: "top" },
  { key: "top5", label: "Top 5 performing", n: 5, dir: "top" },
  { key: "top10", label: "Top 10 performing", n: 10, dir: "top" },
  { key: "bottom3", label: "Bottom 3 performing", n: 3, dir: "bottom" },
  { key: "bottom5", label: "Bottom 5 performing", n: 5, dir: "bottom" },
] as const;

type RankKey = (typeof RANKS)[number]["key"];

function IndicatorsPage() {
  const [range, setRange] = useState<RangeKey>("1Y");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [rank, setRank] = useState<RankKey>("all");

  const list = useMemo(() => {
    const base = indicators.filter(
      (i) =>
        (cat === "All" || i.category === cat) &&
        i.name.toLowerCase().includes(query.trim().toLowerCase()),
    );
    if (rank === "all") return base;

    const scored = base
      .map((i) => ({ i, ch: change(sliceRange(getSeries(i.id), range)) }))
      .sort((a, b) => b.ch - a.ch);
    const opt = RANKS.find((r) => r.key === rank)!;
    const picked = opt.dir === "top" ? scored.slice(0, opt.n) : scored.slice(-opt.n).reverse();
    return picked.map((s) => s.i);
  }, [query, cat, rank, range]);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader subtitle={`${indicators.length} high-frequency indicators`} />

      <div className="mx-auto max-w-6xl px-5 py-8">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-mono text-sm uppercase tracking-[0.18em] text-muted-foreground">
              Indicator trends · {list.length}
            </h2>
            <div className="flex flex-wrap gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search indicators…"
                className="h-9 w-56 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="All">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={rank}
                onChange={(e) => setRank(e.target.value as RankKey)}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {RANKS.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
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
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
            <div className="hidden items-center gap-4 border-b border-border bg-muted/60 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-blue-dark sm:flex">
              <span className="min-w-0 flex-1">Indicator name</span>
              <span className="w-28 shrink-0">Frequency</span>
              <span className="w-28 shrink-0">Last updated</span>
              <span className="w-[180px] shrink-0">Trend</span>
              <span className="w-20 shrink-0 text-right">Change</span>
            </div>
          <ul className="divide-y divide-border">

            {list.map((ind) => {
              const s = sliceRange(getSeries(ind.id), range);
              const ch = change(s);
              const lu = lastUpdated(ind.id);
              const up = ch >= 0;
              return (
                <li key={ind.id}>
                  <Link
                    to="/indicator/$id"
                    params={{ id: ind.id }}
                    className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-accent/60 sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-snug text-navy">
                        {ind.name}
                      </p>
                      <p className="mt-1.5 truncate font-mono text-[11px] uppercase tracking-wider text-blue-dark">
                        {ind.category}
                      </p>
                      <p className="mt-1.5 font-mono text-[11px] text-muted-foreground sm:hidden">
                        {ind.frequency} · updated {lu ? fmtDate(lu) : "—"}
                      </p>
                    </div>
                    <span className="hidden w-28 shrink-0 font-mono text-[11px] uppercase tracking-wider text-blue-dark sm:block">
                      {ind.frequency}
                    </span>
                    <span className="hidden w-28 shrink-0 font-mono text-[11px] text-muted-foreground sm:block">
                      {lu ? fmtDate(lu) : "—"}
                    </span>
                    <Sparkline data={s} positive={up} />
                    <span
                      className={`w-20 shrink-0 text-right font-mono text-sm ${up ? "text-trend-up" : "text-trend-down"}`}
                    >
                      {up ? "↑ +" : "↓ −"}
                      {Math.abs(ch).toFixed(1)}%
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
