import {
  benchmarkName,
  evaluationRows,
  NARROW,
  evaluationSentences,
  otherHorizonSentences,
  quarterLabel,
  trackLine,
  verdictLabel,
  whenBefore,
} from "@/lib/evaluation";
import { NOWCAST, NOWCAST_ROWS, trackSummary, type TrackRecordRow } from "@/lib/nowcast";
import { Link } from "@tanstack/react-router";

const fmt = (v: number | null | undefined) => (v == null ? "—" : `${v.toFixed(1)}%`);
const miss = (est: number | null, official: number | null) =>
  est == null || official == null ? null : est - official;
/** Signed to one decimal, without a "−0.0". */
const signed1 = (v: number) => {
  const r = Math.round(v * 10) / 10;
  return r === 0 ? "0.0" : `${r > 0 ? "+" : "−"}${Math.abs(r).toFixed(1)}`;
};

const TONE = {
  better: "text-trend-up",
  narrow: "text-trend-up",
  unclear: "text-blue-dark",
  worse: "text-trend-down",
} as const;

/** Today's figure for a quarter: the export's `latest`, or the bar chart's own figure for exports without it. */
function latestOf(r: TrackRecordRow): number | null {
  return r.latest ?? NOWCAST_ROWS.find((x) => x.quarterStart === r.quarterStart)?.actual ?? null;
}

/** The estimate made shortly before each official release, against the figure itself. */
export function TrackRecordTable() {
  const rows = [...(NOWCAST?.trackRecord ?? [])].reverse();
  const summary = trackSummary(8);
  if (!rows.length) return null;
  const backtest = rows.some((r) => r.basis === "backtest");
  const bench = benchmarkName(NOWCAST?.evaluation, rows[0]);
  const when = whenBefore(rows[0]!.daysBeforeRelease);
  // A backtest is scored against the first print; the bar chart shows each quarter's latest figure.
  const withLatest = rows.map((r) => ({ r, latest: latestOf(r) }));
  const showLatest = backtest && withLatest.some((x) => x.latest != null);
  // Before the February 2026 rebasing the two are on different price bases (`sameBase: false`).
  const rebased = rows.filter((r) => r.sameBase === false);
  const sameBase = rows.filter((r) => r.sameBase === true);
  const absRev = (xs: TrackRecordRow[]) =>
    xs.flatMap((r) => {
      const l = latestOf(r);
      const v = r.revision ?? (l != null && r.official != null ? l - r.official : null);
      return v == null ? [] : [Math.abs(v)];
    });
  const rebasedRev = absRev(rebased);
  const sameRev = absRev(sameBase);
  const range = (xs: number[]) =>
    Math.min(...xs).toFixed(2) === Math.max(...xs).toFixed(2)
      ? `${Math.max(...xs).toFixed(2)} pp`
      : `${Math.min(...xs).toFixed(2)} to ${Math.max(...xs).toFixed(2)} pp`;
  return (
    <div>
      {summary ? (
        backtest ? (
          <p className="text-sm leading-relaxed text-navy">
            <span className="mr-2 rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-blue-dark">
              Backtest
            </span>
            {trackLine(summary)}
            {NOWCAST?.evaluation
              ? " The tests below check whether that gap is more than luck."
              : ""}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-navy">
            Over the last {summary.quarters} quarters the model missed the official figure by{" "}
            <span className="font-mono">{summary.modelMiss.toFixed(2)} pp</span> on average.
            Assuming growth simply repeats last quarter's rate missed by{" "}
            <span className="font-mono">{summary.naiveMiss.toFixed(2)} pp</span>
            {summary.modelMiss > summary.naiveMiss
              ? ", so the model does not yet beat that simple rule."
              : ", so the model beats that simple rule."}
          </p>
        )
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table
          className={`w-full border-collapse text-sm ${showLatest ? "min-w-[640px]" : "min-w-[520px]"}`}
        >
          <thead>
            <tr className="border-b border-border font-mono text-[11px] uppercase tracking-wider text-blue-dark">
              <th className="py-2 text-left font-normal">Quarter</th>
              <th className="py-2 text-right font-normal">Our estimate</th>
              <th className="py-2 text-right font-normal">
                {backtest ? "First print" : "Official"}
              </th>
              <th className="py-2 text-right font-normal">Miss</th>
              <th className="py-2 text-right font-normal">
                {backtest ? `${bench} benchmark miss` : "Same-as-last-quarter miss"}
              </th>
              {showLatest ? <th className="py-2 text-right font-normal">Latest figure</th> : null}
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {withLatest.map(({ r, latest }) => {
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
                  {showLatest ? (
                    <td className="py-2 text-right text-muted-foreground">
                      {fmt(latest)}
                      {r.sameBase === false ? (
                        <span
                          title="On a different price base from the first print"
                          className="text-blue-dark"
                        >
                          {" "}
                          †
                        </span>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {backtest ? (
        <div className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
          <p>
            This is a backtest, not what we published at the time. Each estimate was made {when} the
            first print, using only data released before it, but with today's revised values for the
            indicators. Miss is our estimate minus the first print. A dash means the model had no
            estimate for that quarter.
          </p>
          {showLatest ? (
            <p>
              The latest figure is the one the bar chart above shows.
              {rebased.length && rebasedRev.length
                ? ` † For ${rebased.length} of these quarters the first print and the latest figure use different price bases, because GDP was rebased in February 2026. The gap between the two columns, up to ${Math.max(...rebasedRev).toFixed(1)} pp, comes from the rebasing and some revision. It is not a model miss.`
                : ""}
              {sameBase.length && sameRev.length
                ? ` The ${sameBase.length} most recent quarters are on the same base and differ by ${range(sameRev)}. That is revision alone.`
                : ""}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Each estimate uses only data released before that quarter's official figure, but with
          today's revised values. A dash means the model had no estimate for that quarter.
        </p>
      )}
    </div>
  );
}

/** Ratio of the headline's error to the benchmark's, by distance from the release and sample. */
export function EvaluationTable() {
  const ev = NOWCAST?.evaluation;
  const rows = evaluationRows(ev);
  if (!rows.length) return null;
  const bench = benchmarkName(ev);
  const days = NOWCAST?.headline?.horizonDays ?? NOWCAST?.trackRecord?.at(-1)?.daysBeforeRelease;
  const sentences = [...evaluationSentences(ev, days), ...otherHorizonSentences(ev, days)];
  const samples = Object.entries(ev?.samples ?? {});
  return (
    <div>
      <p className="eyebrow">Against the {bench} benchmark</p>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-navy">
        {NOWCAST?.headline?.horizonDays != null ? (
          <p>
            The current estimate is {NOWCAST.headline.horizonDays} days from the release, so that
            horizon comes first.
          </p>
        ) : null}
        {sentences.map((t) => (
          <p key={t}>{t}</p>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border font-mono text-[11px] uppercase tracking-wider text-blue-dark">
              <th className="py-2 text-left font-normal">Made</th>
              <th className="py-2 text-left font-normal">Sample</th>
              <th className="py-2 text-right font-normal">Quarters</th>
              <th className="py-2 text-right font-normal">Error</th>
              <th className="py-2 text-right font-normal">{bench} error</th>
              <th className="py-2 text-right font-normal">Ratio (interval)</th>
              <th className="py-2 text-right font-normal">Result</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {rows.map((r, i) => (
              <tr
                key={`${r.horizon}-${r.sample}`}
                className={`border-b border-border/60 ${i > 0 && rows[i - 1]!.horizon !== r.horizon ? "border-t-2 border-t-border" : ""}`}
              >
                <td className="py-2 font-sans text-sm text-navy">
                  {i === 0 || rows[i - 1]!.horizon !== r.horizon ? `${r.horizon} days before` : ""}
                </td>
                <td className="py-2 font-sans text-sm text-navy">{r.label}</td>
                <td className="py-2 text-right text-blue-dark">{r.cell.n}</td>
                <td className="py-2 text-right text-navy">{r.cell.rmse.toFixed(2)} pp</td>
                <td className="py-2 text-right text-muted-foreground">
                  {r.cell.ar1Rmse.toFixed(2)} pp
                </td>
                <td className="py-2 text-right text-navy">
                  {r.cell.ratioToAr1.toFixed(2)} ({r.cell.ratioLow.toFixed(2)} to{" "}
                  {r.cell.ratioHigh.toFixed(2)})
                </td>
                <td className={`py-2 text-right font-sans text-xs ${TONE[r.verdict]}`}>
                  {verdictLabel(r.verdict, bench)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Error is the root-mean-square miss against the first print. A ratio below 1 means closer
        than the {bench} benchmark, but we call it better only when the whole range is below 1, and
        only narrowly better when its top end is within {NARROW} of 1. If the range includes 1,
        there is no clear difference. The{" "}
        <Link to="/methodology" className="underline underline-offset-2">
          methodology
        </Link>{" "}
        explains how this is calculated.
      </p>
      {samples.length ? (
        <details className="mt-2 text-xs text-blue-dark">
          <summary className="cursor-pointer text-navy">What the samples are</summary>
          <dl className="mt-2 space-y-2">
            {samples.map(([key, sample]) => (
              <div key={key}>
                <dt className="font-medium text-navy">
                  {rows.find((r) => r.sample === key)?.label ?? key}{" "}
                  <span className="font-mono text-[11px] font-normal text-muted-foreground">
                    {quarterLabel(sample.firstQuarter)} to {quarterLabel(sample.lastQuarter)} ·{" "}
                    {sample.quarters} quarters
                  </span>
                </dt>
                <dd className="leading-relaxed">{sample.definition}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </div>
  );
}
