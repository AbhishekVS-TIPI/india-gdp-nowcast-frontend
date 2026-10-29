import { Link } from "@tanstack/react-router";
import { UNREAD_SECTIONS, isRead } from "@/lib/coverage";
import { DRIVERS, NOWCAST } from "@/lib/nowcast";

const pct1 = (v: number) => `${v.toFixed(1)}%`;
/** "A or B", and "A; B; or C" for three or more, since section names can contain "and" and commas. */
const either = (xs: string[]) =>
  xs.length < 2
    ? xs.join("")
    : xs.length === 2
      ? `${xs[0]} or ${xs[1]}`
      : `${xs.slice(0, -1).join("; ")}; or ${xs[xs.length - 1]}`;

/**
 * The headline averages models that read different data, and reads only some of the
 * indicators this site tracks. Says so plainly, with the parts of the economy nothing
 * in the headline reads.
 */
export function HowItsMade() {
  const members = NOWCAST?.model.members ?? [];
  if (!members.length) return null;
  const read = DRIVERS.filter((d) => isRead(d.id)).length;
  const uncovered = UNREAD_SECTIONS;
  return (
    <div>
      <p className="text-sm leading-relaxed text-navy">
        The headline is the average of {members.length} models that read different data.
      </p>
      <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
        {members.map((m) => (
          <li key={m.id} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <span className="min-w-0 text-sm text-navy">
              {m.name}
              <span className="block text-[11px] text-muted-foreground">
                reads {m.indicators.length} indicators · weight {Math.round(m.weight * 100)}%
              </span>
            </span>
            <span className="shrink-0 font-mono text-sm text-navy">
              {m.nowcast != null ? pct1(m.nowcast) : "—"}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-navy">
        Between them they read {read} of the {DRIVERS.length} indicators this site tracks; the other{" "}
        {DRIVERS.length - read} are monitored and do not move the estimate.
        {uncovered.length ? ` Nothing in the headline reads ${either(uncovered)}.` : ""}
      </p>
      <Link
        to="/methodology"
        hash="data-and-model"
        className="mt-4 inline-block font-mono text-xs text-primary underline underline-offset-2"
      >
        See what is read and what is missing →
      </Link>
    </div>
  );
}
