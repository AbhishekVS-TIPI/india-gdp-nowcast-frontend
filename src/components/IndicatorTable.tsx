import { fmtDate, type Point } from "@/lib/series";
import type { IndicatorTable as IndicatorTableData } from "@/lib/series";

/**
 * Full-history data table for one indicator -- always shows every available
 * date, independent of whatever range the Graph view has selected, so a
 * reviewer can see the complete record rather than a windowed chart.
 *
 * Two shapes:
 *  - single-base indicator: `series` is its plain level series (raw IS the
 *    spliced value, since there's nothing to rescale).
 *  - multi-base indicator: `table` carries one column per declared base
 *    year plus the spliced column, straight from `<id>.table.json`.
 */
export function IndicatorTable({
  series,
  table,
  unit,
}: {
  series: Point[];
  table: IndicatorTableData | null;
  unit: string | null;
}) {
  if (table) {
    return (
      <div className="max-h-[520px] overflow-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
            <tr>
              <th className="border-b border-border px-3 py-2 text-left font-mono text-[11px] uppercase tracking-wider text-blue-dark">
                Date
              </th>
              {table.baseYears.map((by) => (
                <th
                  key={by}
                  className="border-b border-border px-3 py-2 text-right font-mono text-[11px] uppercase tracking-wider text-blue-dark"
                >
                  Base {by}
                  <span className="block font-normal normal-case text-muted-foreground">raw</span>
                </th>
              ))}
              <th className="border-b border-l border-border bg-accent/40 px-3 py-2 text-right font-mono text-[11px] uppercase tracking-wider text-blue-dark">
                Spliced
                <span className="block font-normal normal-case text-muted-foreground">
                  {unit ?? "continuous"}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.d} className="odd:bg-card even:bg-muted/20">
                <td className="whitespace-nowrap border-b border-border px-3 py-1.5 font-mono text-xs text-foreground">
                  {row.d}
                </td>
                {table.baseYears.map((by) => (
                  <td
                    key={by}
                    className="border-b border-border px-3 py-1.5 text-right font-mono text-xs tabular-nums text-foreground"
                  >
                    {row[by] === null || row[by] === undefined ? "—" : row[by]!.toFixed(4)}
                  </td>
                ))}
                <td className="border-b border-l border-border bg-accent/20 px-3 py-1.5 text-right font-mono text-xs tabular-nums font-medium text-foreground">
                  {row.spliced === null ? "—" : row.spliced.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="max-h-[520px] overflow-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
          <tr>
            <th className="border-b border-border px-3 py-2 text-left font-mono text-[11px] uppercase tracking-wider text-blue-dark">
              Date
            </th>
            <th className="border-b border-border px-3 py-2 text-right font-mono text-[11px] uppercase tracking-wider text-blue-dark">
              Value{unit ? ` (${unit})` : ""}
            </th>
          </tr>
        </thead>
        <tbody>
          {series.map((p) => (
            <tr key={p.t} className="odd:bg-card even:bg-muted/20">
              <td className="whitespace-nowrap border-b border-border px-3 py-1.5 font-mono text-xs text-foreground">
                {fmtDate(p.t)}
              </td>
              <td className="border-b border-border px-3 py-1.5 text-right font-mono text-xs tabular-nums text-foreground">
                {p.v.toFixed(4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
