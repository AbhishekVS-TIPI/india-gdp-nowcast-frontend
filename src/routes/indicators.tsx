import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sparkline } from "@/components/Sparkline";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { RangeSwitch } from "@/components/RangeSwitch";
import {
  categories,
  change,
  defaultRange,
  fmtNum,
  getSeries,
  indicators,
  latestPair,
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

function signed(v: number, unit: string | null) {
  const s = fmtNum(Math.abs(v), unit === "%" ? null : unit);
  const pp = unit === "%" ? "pp" : "";
  return `${v >= 0 ? "+" : "−"}${s}${pp}`;
}

function Pct({ v, className = "" }: { v: number; className?: string }) {
  const up = v >= 0;
  return (
    <span className={`font-mono ${up ? "text-trend-up" : "text-trend-down"} ${className}`}>
      {up ? "↑ +" : "↓ −"}
      {Math.abs(v).toFixed(1)}%
    </span>
  );
}

function IndicatorsPage() {
  const [range, setRange] = useState<RangeKey>("1Y");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .map((cat) => {
        const rows = indicators
          .filter((i) => i.category === cat && i.name.toLowerCase().includes(q))
          .map((ind) => {
            const s = sliceRange(getSeries(ind.id), range);
            return { ind, ch: change(s), active: s.length >= 2 };
          });
        const act = rows.filter((r) => r.active);
        const avg = act.length ? act.reduce((a, r) => a + r.ch, 0) / act.length : 0;
        return { cat, rows, avg };
      })
      .filter((g) => g.rows.length > 0);
  }, [query, range]);

  const searching = query.trim().length > 0;
  const toggle = (cat: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader subtitle={`${indicators.length} high-frequency indicators`} />

      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="eyebrow">Indicator categories · {groups.length}</h2>
          <div className="flex flex-wrap gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search indicators…"
              className="h-10 w-56 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <RangeSwitch value={range} onChange={setRange} />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {groups.map((g) => {
            const isOpen = searching || open.has(g.cat);
            return (
              <section
                key={g.cat}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <button
                  type="button"
                  onClick={() => toggle(g.cat)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/40"
                >
                  <span className="text-[10px] text-blue-dark">{isOpen ? "▾" : "▸"}</span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-navy">
                    {g.cat}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-blue-dark">
                    {g.rows.length} indicator{g.rows.length === 1 ? "" : "s"}
                  </span>
                  <Pct v={g.avg} className="w-20 text-right text-sm" />
                </button>

                {isOpen ? (
                  <div className="border-t border-border">
                    <div className="hidden items-center gap-4 bg-muted/60 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-blue-dark md:flex">
                      <span className="min-w-0 flex-1">Indicator name</span>
                      <span className="w-28 text-right">Current</span>
                      <span className="w-28 text-right">Previous</span>
                      <span className="w-24 text-right">Delta</span>
                      <span className="w-[140px]">Trend · {range}</span>
                      <span className="w-20 text-right">Change</span>
                    </div>
                    <ul className="divide-y divide-border">
                      {g.rows.map(({ ind, ch }) => {
                        const pair = latestPair(ind.id);
                        const delta = pair ? pair.current.v - pair.previous.v : 0;
                        const trend = sliceRange(getSeries(ind.id), defaultRange(ind.id));
                        return (
                          <li key={ind.id}>
                            <Link
                              to="/indicator/$id"
                              params={{ id: ind.id }}
                              className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 transition-colors hover:bg-accent/60 md:flex-nowrap"
                            >
                              <span className="min-w-0 flex-1 basis-full text-sm text-navy md:basis-0">
                                {ind.name}
                                <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                                  {ind.frequency}
                                </span>
                              </span>
                              <span className="w-28 text-right font-mono text-sm text-navy">
                                {pair ? fmtNum(pair.current.v, ind.unit) : "—"}
                              </span>
                              <span className="hidden w-28 text-right font-mono text-sm text-blue-dark md:block">
                                {pair ? fmtNum(pair.previous.v, ind.unit) : "—"}
                              </span>
                              <span
                                className={`hidden w-24 text-right font-mono text-xs md:block ${
                                  delta >= 0 ? "text-trend-up" : "text-trend-down"
                                }`}
                              >
                                {pair
                                  ? `${delta >= 0 ? "↑ " : "↓ "}${signed(delta, ind.unit)}`
                                  : "—"}
                              </span>
                              <span className="hidden w-[140px] md:block">
                                <Sparkline
                                  data={trend}
                                  width={140}
                                  height={32}
                                  positive={ch >= 0}
                                />
                              </span>
                              <Pct v={ch} className="w-20 text-right text-sm" />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </section>
            );
          })}
          {groups.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No indicators match “{query}”.
            </p>
          ) : null}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
