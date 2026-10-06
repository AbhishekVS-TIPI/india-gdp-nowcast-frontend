import { NOWCAST } from "@/lib/nowcast";
import { fmtDate } from "@/lib/series";

/**
 * Shown while the nowcast export is frozen at a past date (nowcast.json
 * `frozenAsOf`): everything model-based reflects only figures released by then.
 */
export function FrozenNote() {
  const frozen = NOWCAST?.frozenAsOf;
  if (!frozen) return null;
  return (
    <p
      role="note"
      className="rounded-xl border border-dashed border-blue-light bg-muted/40 px-4 py-3 text-xs leading-relaxed text-blue-dark"
    >
      <span className="font-semibold text-navy">
        Snapshot as of {fmtDate(Date.parse(`${frozen}T00:00:00Z`))}.
      </span>{" "}
      The estimate and everything built on the model use only figures published by that date, while
      newer source data is being loaded. Live updates resume once it is in.
    </p>
  );
}
