import { Link } from "@tanstack/react-router";
import { sectorLabel, sectorOf } from "@/lib/sectors";
import { INDICATOR_BY_ID, fmtYearOnYear, yearOnYear } from "@/lib/series";
import { describe, fmtMonth, signalMovers, type SignalMover } from "@/lib/signals";

const N = 6;

function Column({ title, items }: { title: string; items: SignalMover[] }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-3 divide-y divide-border">
        {items.map((m) => {
          const yoy = yearOnYear(m.id);
          const sector = sectorOf(m.id);
          return (
            <li key={m.id} className="py-2.5">
              <Link to="/indicator/$id" params={{ id: m.id }} className="block hover:underline">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-navy">
                    {INDICATOR_BY_ID[m.id]?.name ?? m.id}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-navy">
                    {yoy ? `${fmtYearOnYear(yoy)} y/y` : "—"}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {sector ? `${sectorLabel(sector)} · ` : ""}
                  {describe(m.now).toLowerCase()} in {fmtMonth(m.month)}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Growth indicators whose reading improved or deteriorated most over three months. */
export function SignalMovers() {
  const all = signalMovers();
  const up = all.filter((m) => m.change > 0).slice(0, N);
  const down = all
    .filter((m) => m.change < 0)
    .slice(-N)
    .reverse();
  return (
    <div>
      <div className="grid gap-8 sm:grid-cols-2">
        <Column title="Speeding up" items={up} />
        <Column title="Slowing down" items={down} />
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        Ranked by how much each reading moved against its own normal over the last three months.
        Figures on the right are the change from a year earlier: growth for levels, percentage
        points for rates. Balances that swing between surplus and deficit show "—".
      </p>
    </div>
  );
}
