import { IndicatorTable } from "@/components/IndicatorTable";
import { SiteFooter } from "@/components/SiteFooter";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  RANGES,
  UNITS,
  change,
  defaultRange,
  fmtDate,
  getSeries,
  getTable,
  hasRealData,
  indicators,
  sliceRange,
  type RangeKey,
} from "@/lib/series";

type ViewMode = "graph" | "table";

export const Route = createFileRoute("/indicator/$id")({
  loader: ({ params }) => {
    const indicator = indicators.find((i) => i.id === params.id);
    if (!indicator) throw notFound();
    return { indicator };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.indicator.name ?? "Indicator";
    const desc = `${name} — trend, frequency, source and release notes from the India GDP nowcast indicator set.`;
    return {
      meta: [
        { title: `${name} — India GDP Nowcast` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} — India GDP Nowcast` },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: IndicatorDetail,
});

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border py-4 last:border-0">
      <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm leading-relaxed break-words text-foreground">{children}</dd>
    </div>
  );
}

function IndicatorDetail() {
  const { indicator } = Route.useLoaderData();
  const [range, setRange] = useState<RangeKey>(() => defaultRange(indicator.id));
  const [view, setView] = useState<ViewMode>("graph");
  useEffect(() => setRange(defaultRange(indicator.id)), [indicator.id]);
  const series = useMemo(() => sliceRange(getSeries(indicator.id), range), [indicator.id, range]);
  const fullSeries = useMemo(() => getSeries(indicator.id), [indicator.id]);
  const table = useMemo(() => getTable(indicator.id), [indicator.id]);
  const ch = change(series);
  const last = series[series.length - 1];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <Link to="/" className="font-mono text-xs text-muted-foreground hover:text-foreground">
          ← All indicators
        </Link>

        <h1 className="mt-4 text-2xl font-semibold leading-snug tracking-tight text-navy">
          {indicator.name}
        </h1>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-blue-dark">
          {indicator.category} · {indicator.frequency}
          {UNITS[indicator.id] ? ` · ${UNITS[indicator.id]}` : ""}
        </p>
        <p className="mt-3 inline-block rounded-md border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {hasRealData(indicator.id) ? "Actual source data" : "Placeholder series"}
        </p>

        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-3xl font-semibold text-navy">
                {last ? last.v.toFixed(2) : "—"}
              </span>
              <span
                className={`font-mono text-sm ${ch >= 0 ? "text-trend-up" : "text-trend-down"}`}
              >
                {ch >= 0 ? "↑" : "↓"} {Math.abs(ch).toFixed(1)}% over {range}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {view === "graph" ? (
                <div className="flex gap-1 rounded-lg border border-border p-1">
                  {RANGES.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setRange(r.key)}
                      className={`rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
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
              <div className="flex gap-1 rounded-lg border border-border p-1">
                {(["graph", "table"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`rounded-md px-2.5 py-1 font-mono text-xs uppercase tracking-wide transition-colors ${
                      view === v
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {view === "graph" ? (
            <div className="mt-5 h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="indFill" x1="0" y1="0" x2="0" y2="1">
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
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelFormatter={(t) => fmtDate(Number(t))}
                    formatter={(v) => [Number(v).toFixed(2), indicator.name]}
                  />
                  <Area
                    type="linear"
                    dataKey="v"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    fill="url(#indFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-5">
              {table ? (
                <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  {table.baseYears.length} base years spliced -- every raw value shown alongside
                  the continuous ("spliced") series the graph plots. Full history, {table.rows.length}{" "}
                  rows.
                </p>
              ) : (
                <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                  Full history, {fullSeries.length} rows.
                </p>
              )}
              <IndicatorTable series={fullSeries} table={table} unit={UNITS[indicator.id] ?? null} />
            </div>
          )}
        </div>

        <dl className="mt-6 rounded-xl border border-border bg-card px-5 py-2">
          {indicator.code ? <Row label="Code">{indicator.code}</Row> : null}
          <Row label="Category">{indicator.category}</Row>
          <Row label="Frequency">{indicator.frequency}</Row>
          <Row label="Data available from">{indicator.availableFrom ?? "Not recorded"}</Row>
          <Row label="Source path">{indicator.sourceName ?? "Not recorded"}</Row>
          <Row label="Source link">
            {indicator.source ? (
              <a
                href={indicator.source}
                target="_blank"
                rel="noreferrer"
                className="text-chart-1 underline underline-offset-4"
              >
                {indicator.source}
              </a>
            ) : (
              "Not recorded"
            )}
          </Row>
          <Row label="Release day">{indicator.releaseDay ?? "Not recorded"}</Row>
          <Row label="Typical release lag">{indicator.releaseLag ?? "Not recorded"}</Row>
          <Row label="Remarks">{indicator.remarks ?? "—"}</Row>
          <Row label="Notes">{indicator.notes ?? "—"}</Row>
        </dl>
      </div>
      <SiteFooter />
    </main>
  );
}
