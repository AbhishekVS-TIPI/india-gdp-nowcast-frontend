import { Link } from "@tanstack/react-router";
import { DRIVERS, NOWCAST } from "@/lib/nowcast";
import { INDICATOR_BY_ID, fmtDate, nextRelease } from "@/lib/series";

const DAY_MS = 86_400_000;
/** Indicators whose next figure was due longer ago than this are treated as discontinued. */
const DISCONTINUED_AFTER_DAYS = 180;
const INFLUENTIAL = 20;

const month = (t: number) =>
  new Date(t).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * The official GDP date, then the next figures due from the model's most
 * influential indicators. Figures already due but missing from our data are
 * counted rather than listed, with a pointer to the freshness table.
 */
export function ComingUp({ limit = 5 }: { limit?: number }) {
  const asOf = Date.parse(`${NOWCAST?.dataAsOf ?? NOWCAST?.generatedAt.slice(0, 10)}T00:00:00Z`);
  const gdp = NOWCAST?.nowcast?.nextOfficialRelease;
  const releases = DRIVERS.slice(0, INFLUENTIAL)
    .map((d) => ({ id: d.id, next: nextRelease(d.id) }))
    .filter(
      (x): x is { id: string; next: { period: number; due: number } } =>
        x.next != null && asOf - x.next.due < DISCONTINUED_AFTER_DAYS * DAY_MS,
    );
  const upcoming = releases
    .filter((x) => x.next.due > asOf)
    .sort((a, b) => a.next.due - b.next.due)
    .slice(0, limit);
  const overdue = releases.filter((x) => x.next.due <= asOf).length;

  return (
    <div>
      <ul className="divide-y divide-border">
        {gdp ? (
          <li className="py-2.5">
            <p className="text-sm font-semibold text-navy">
              Official GDP for {NOWCAST?.nowcast?.label}
            </p>
            <p className="font-mono text-xs text-blue-dark">
              expected around {fmtDate(Date.parse(`${gdp}T00:00:00Z`))}
            </p>
          </li>
        ) : null}
        {upcoming.map(({ id, next }) => (
          <li key={id} className="py-2.5">
            <Link to="/indicator/$id" params={{ id }} className="text-sm text-navy hover:underline">
              {INDICATOR_BY_ID[id]?.name ?? id}
            </Link>
            <p className="font-mono text-xs text-blue-dark">
              {month(next.period)} figure · due around {fmtDate(next.due)}
            </p>
          </li>
        ))}
      </ul>
      {overdue ? (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          {overdue} of the {INFLUENTIAL} most influential indicators have a newer figure that should
          already be out but is not yet in our data.{" "}
          <Link to="/trends" hash="freshness" className="underline underline-offset-2">
            See data freshness
          </Link>
        </p>
      ) : null}
    </div>
  );
}
