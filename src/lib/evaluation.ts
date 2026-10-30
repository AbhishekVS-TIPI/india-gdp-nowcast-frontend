/**
 * Reading nowcast.json `evaluation`: how the headline's earlier estimates did
 * against a benchmark (AR(1)), by horizon (days before the release) and sample.
 * Pure functions over the exported shape, so they can be checked without the
 * data files.
 */
import type { Evaluation, EvaluationCell } from "@/lib/nowcast";

export type Verdict = "better" | "worse" | "unclear";

/**
 * `ratioToAr1` below 1 means closer than the benchmark, but a result counts as
 * better only if the whole interval is below 1 (`ratioHigh < 1`), and as worse
 * only if it is wholly above (`ratioLow > 1`). An interval that spans 1 shows
 * nothing.
 */
export function verdict(c: EvaluationCell): Verdict {
  if (c.ratioHigh < 1) return "better";
  if (c.ratioLow > 1) return "worse";
  return "unclear";
}

/** The benchmark's name as the export gives it ("AR(1)"); older exports did not say. */
export function benchmarkName(
  ev?: Evaluation | null,
  row?: { naiveModel?: string | null },
): string {
  return row?.naiveModel ?? ev?.naiveModel ?? "AR(1)";
}

export function verdictLabel(v: Verdict, bench: string): string {
  return v === "better"
    ? `Closer than ${bench}`
    : v === "worse"
      ? `Further than ${bench}`
      : "Not clearly different";
}

/** The samples in the order they read best, with the names the export gives them. */
export const SAMPLE_ORDER = ["selection", "confirmation", "ordinary", "exCovid"] as const;
export const SAMPLE_LABEL: Record<string, string> = {
  selection: "Selection sample",
  confirmation: "Confirmation sample",
  ordinary: "Ordinary quarters",
  exCovid: "Excluding COVID",
};

/** "a week before", for prose. Exports that predate the field made the estimate the day before. */
export function whenBefore(days: number | null | undefined): string {
  if (days == null || days === 1) return "the day before";
  if (days === 7) return "a week before";
  return `${days} days before`;
}

const fix = (v: number, d = 2) => v.toFixed(d);
const cap = (t: string) => `${t[0]!.toUpperCase()}${t.slice(1)}`;

export type EvaluationRow = {
  horizon: number;
  sample: string;
  label: string;
  cell: EvaluationCell;
  verdict: Verdict;
};

/** Every horizon (nearest the release first) by every sample the export carries. */
export function evaluationRows(ev: Evaluation | null | undefined): EvaluationRow[] {
  if (!ev?.horizons) return [];
  return Object.keys(ev.horizons)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
    .flatMap((horizon) => {
      const bySample = ev.horizons[String(horizon)] ?? {};
      const keys = [
        ...SAMPLE_ORDER.filter((k) => k in bySample),
        ...Object.keys(bySample).filter((k) => !(SAMPLE_ORDER as readonly string[]).includes(k)),
      ];
      return keys.flatMap((sample) => {
        const cell = bySample[sample];
        return cell
          ? [
              {
                horizon,
                sample,
                label: SAMPLE_LABEL[sample] ?? sample,
                cell,
                verdict: verdict(cell),
              },
            ]
          : [];
      });
    });
}

const claim = (v: Verdict) =>
  v === "better"
    ? "closer than the benchmark"
    : v === "worse"
      ? "further from the outcome than the benchmark"
      : "not clearly different from the benchmark";

/** The horizon a summary should lead with: `days` if the export has it, else the nearest to the release. */
function pickHorizon(rows: EvaluationRow[], days: number | null | undefined): number | null {
  if (!rows.length) return null;
  return days != null && rows.some((r) => r.horizon === days)
    ? days
    : Math.min(...rows.map((r) => r.horizon));
}

/**
 * The result in plain sentences, from the horizon that matches the track record
 * table (`days` before the release) or else the nearest one. Written from the
 * numbers, so it says "better" only when the whole interval is below 1.
 */
export function evaluationSentences(
  ev: Evaluation | null | undefined,
  days: number | null | undefined,
): string[] {
  const rows = evaluationRows(ev);
  const horizon = pickHorizon(rows, days);
  if (horizon == null) return [];
  const bench = benchmarkName(ev);
  const at = (sample: string) => rows.find((r) => r.horizon === horizon && r.sample === sample);
  const when = whenBefore(horizon);
  const out: string[] = [];

  const ordinary = at("ordinary");
  if (ordinary) {
    const c = ordinary.cell;
    out.push(
      `In ordinary quarters, estimates made ${when} the release were off by ${fix(c.rmse)} pp on average. The ${bench} benchmark was off by ${fix(c.ar1Rmse)} pp. That is a ratio of ${fix(c.ratioToAr1)} (range ${fix(c.ratioLow)} to ${fix(c.ratioHigh)}): ${claim(ordinary.verdict)}.`,
    );
  }
  const confirmation = at("confirmation");
  if (confirmation) {
    const c = confirmation.cell;
    out.push(
      `On the ${c.n} confirmation quarters the ratio was ${fix(c.ratioToAr1)} (${fix(c.ratioLow)} to ${fix(c.ratioHigh)}). ${
        confirmation.verdict === "better"
          ? "The whole range is below 1, so it holds up."
          : confirmation.verdict === "worse"
            ? "The whole range is above 1, so it is worse than the benchmark."
            : "The range includes 1, so we cannot say it is better."
      }`,
    );
  }
  if (!out.length) {
    const first = rows.find((r) => r.horizon === horizon) ?? rows[0]!;
    out.push(
      `${first.label}: estimates made ${whenBefore(first.horizon)} the release had errors ${fix(first.cell.ratioToAr1)} times the ${bench} benchmark's (range ${fix(first.cell.ratioLow)} to ${fix(first.cell.ratioHigh)}): ${claim(first.verdict)}.`,
    );
  }
  return out;
}

/**
 * The other horizons in one line each, so a result at one distance from the release is never
 * read as the result at all of them (the number on screen is made at a particular distance).
 */
export function otherHorizonSentences(
  ev: Evaluation | null | undefined,
  days: number | null | undefined,
): string[] {
  const rows = evaluationRows(ev);
  const primary = pickHorizon(rows, days);
  return rows
    .filter((r) => r.sample === "ordinary" && r.horizon !== primary)
    .map(
      (r) =>
        `${cap(whenBefore(r.horizon))} the release, the ordinary-quarter ratio is ${fix(r.cell.ratioToAr1)} (range ${fix(r.cell.ratioLow)} to ${fix(r.cell.ratioHigh)}): ${claim(r.verdict)}.`,
    );
}

/** The track-record headline sentence: how far the estimates were from the outcome, against the benchmark. */
export function trackLine(t: {
  quarters: number;
  modelMiss: number;
  naiveMiss: number;
  daysBefore: number | null;
  backtest: boolean;
  naiveModel?: string | null;
}): string {
  const model = fix(t.modelMiss, 1);
  const naive = fix(t.naiveMiss, 1);
  return t.backtest
    ? `Over the last ${t.quarters} quarters of the backtest, our estimate made ${whenBefore(t.daysBefore)} each release missed the first print by ${model} pp on average. The ${t.naiveModel ?? "AR(1)"} benchmark missed by ${naive} pp.`
    : `Over the last ${t.quarters} quarters, our estimate made ${whenBefore(t.daysBefore)} each release missed the official figure by ${model} pp on average. The ${t.naiveModel ?? "AR(1)"} benchmark missed by ${naive} pp.`;
}

const short = (v: Verdict) =>
  v === "better" ? "closer" : v === "worse" ? "further" : "not clearly different";

/** One line for a footer: the ordinary-quarter result at the distance the current estimate is made from. */
export function evaluationBrief(
  ev: Evaluation | null | undefined,
  days: number | null | undefined,
): string | null {
  const rows = evaluationRows(ev).filter((r) => r.sample === "ordinary");
  if (!rows.length) return null;
  const row = (days != null && rows.find((r) => r.horizon === days)) || rows[0]!;
  const c = row.cell;
  return `Across the whole backtest, estimates made ${row.horizon} days before a release had errors ${fix(c.ratioToAr1)} times the ${benchmarkName(ev)} benchmark's (range ${fix(c.ratioLow)} to ${fix(c.ratioHigh)}): ${short(row.verdict)}.`;
}

const QUARTERS = ["Jan-Mar", "Apr-Jun", "Jul-Sep", "Oct-Dec"];

/** "2012-10-01" -> "Oct-Dec 2012": the first day of a quarter, as the export gives it, as the site writes it. */
export function quarterLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return Number.isFinite(y) && Number.isFinite(m)
    ? `${QUARTERS[Math.floor((m! - 1) / 3)]} ${y}`
    : iso;
}
