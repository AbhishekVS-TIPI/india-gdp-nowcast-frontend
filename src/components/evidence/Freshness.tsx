import { Link } from "@tanstack/react-router";
import { NOWCAST, WEIGHT } from "@/lib/nowcast";
import { sectorLabel, sectorOf } from "@/lib/sectors";
import { fmtDate, indicators, lastUpdated, nextRelease } from "@/lib/series";

const DAY_MS = 86_400_000;

/** How old each indicator's latest reading is, and when the next one is due. */
export function Freshness() {
  const asOf = Date.parse(`${NOWCAST?.dataAsOf ?? NOWCAST?.generatedAt.slice(0, 10)}T00:00:00Z`);
  const rows = indicators
    .filter((i) => i.id !== "gdp_est_const")
    .map((i) => {
      const last = lastUpdated(i.id);
      const next = nextRelease(i.id);
      return { ind: i, last, next, overdue: next != null && next.due <= asOf };
    })
    .sort((a, b) => (a.next?.due ?? Infinity) - (b.next?.due ?? Infinity));
  const overdue = rows.filter((r) => r.overdue).length;

  return (
    <div>
      <p className="text-sm text-navy">
        As of the data refresh on {fmtDate(asOf)}, {overdue} of {rows.length} indicators have a
        newer figure that should already be out but is not yet in our data.
      </p>
      <div className="mt-4 max-h-[420px] overflow-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead className="sticky top-0 bg-muted/95 backdrop-blur">
            <tr className="font-mono text-[11px] uppercase tracking-wider text-blue-dark">
              <th className="px-3 py-2 text-left font-normal">Indicator</th>
              <th className="px-3 py-2 text-left font-normal">Latest reading</th>
              <th className="px-3 py-2 text-right font-normal">Age</th>
              <th className="px-3 py-2 text-right font-normal">Next due</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ ind, last, next, overdue: late }) => {
              const sector = sectorOf(ind.id);
              return (
                <tr key={ind.id} className="border-t border-border/60">
                  <td className="px-3 py-2">
                    <Link
                      to="/indicator/$id"
                      params={{ id: ind.id }}
                      className="text-navy hover:underline"
                    >
                      {ind.name}
                    </Link>
                    <span className="block text-[10px] text-muted-foreground">
                      {sector ? sectorLabel(sector) : ind.category} · {ind.frequency}
                      {ind.id in WEIGHT ? " · in the model" : ""}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-navy">
                    {last ? fmtDate(last) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-blue-dark">
                    {last ? `${Math.max(0, Math.round((asOf - last) / DAY_MS))}d` : "—"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono text-xs ${late ? "text-trend-down" : "text-blue-dark"}`}
                  >
                    {next ? `${late ? "overdue · " : ""}${fmtDate(next.due)}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        "Next due" is the end of the next reporting period plus the indicator's typical release lag.
        Overdue means the source has probably published it and our data has not caught up.
      </p>
    </div>
  );
}
