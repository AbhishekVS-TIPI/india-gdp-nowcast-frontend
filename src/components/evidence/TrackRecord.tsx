import { NOWCAST, trackSummary } from "@/lib/nowcast";

const fmt = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);
const miss = (est: number | null, official: number | null) =>
  est == null || official == null ? null : est - official;
/** Signed to one decimal, without a "−0.0". */
const signed1 = (v: number) => {
  const r = Math.round(v * 10) / 10;
  return r === 0 ? "0.0" : `${r > 0 ? "+" : "−"}${Math.abs(r).toFixed(1)}`;
};

/** The estimate made the day before each official release, against the figure itself. */
export function TrackRecordTable() {
  const rows = [...(NOWCAST?.trackRecord ?? [])].reverse();
  const summary = trackSummary(8);
  if (!rows.length) return null;
  return (
    <div>
      {summary ? (
        <p className="text-sm leading-relaxed text-navy">
          Over the last {summary.quarters} quarters the model missed the official figure by{" "}
          <span className="font-mono">{summary.modelMiss.toFixed(2)} pp</span> on average. Assuming
          growth simply repeats last quarter's rate missed by{" "}
          <span className="font-mono">{summary.naiveMiss.toFixed(2)} pp</span>
          {summary.modelMiss > summary.naiveMiss
            ? ", so the model does not yet beat that simple rule."
            : ", so the model beats that simple rule."}
        </p>
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border font-mono text-[11px] uppercase tracking-wider text-blue-dark">
              <th className="py-2 text-left font-normal">Quarter</th>
              <th className="py-2 text-right font-normal">Our estimate</th>
              <th className="py-2 text-right font-normal">Official</th>
              <th className="py-2 text-right font-normal">Miss</th>
              <th className="py-2 text-right font-normal">Same-as-last-quarter miss</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {rows.map((r) => {
              const m = miss(r.estimate, r.official);
              const n = miss(r.naive, r.official);
              return (
                <tr key={r.quarterStart} className="border-b border-border/60">
                  <td className="py-2 font-sans text-sm text-navy">{r.label}</td>
                  <td className="py-2 text-right text-navy">{fmt(r.estimate)}</td>
                  <td className="py-2 text-right text-navy">{fmt(r.official)}</td>
                  <td className="py-2 text-right text-blue-dark">{m == null ? "—" : signed1(m)}</td>
                  <td className="py-2 text-right text-muted-foreground">
                    {n == null ? "—" : signed1(n)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Each estimate is refitted using only data released before that quarter's official figure
        (pseudo-real-time: today's revised data, not the figures as first published). "—" means the
        model had no estimate for that quarter at the time.
      </p>
    </div>
  );
}
