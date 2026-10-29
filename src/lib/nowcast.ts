/**
 * The GDP nowcast, exported by the india-gdp-nowcast pipeline as
 * src/data/nowcast.json.
 *
 * Two exporters write this shape. `nowcast_workbench.export_headline` writes the
 * Phase 0 headline (the equal-weight average of an ARX and a two-factor dynamic
 * factor model); its agreement with this site is docs/frontend_contract.md in the
 * pipeline repo. `nowcast_workbench.export_dfm` wrote the demo dynamic factor
 * model before it, and the original bridge regression writes the same base
 * shape. Every field this site needs is in all of them; the Phase 0 fields
 * (stress range, headline, members, evaluation, coverage, live record, method)
 * are optional, so the site works with either. `model.description` and `caveats`
 * say exactly what the current model does and does not account for.
 */

import { massAbove, normalCdf } from "@/lib/density";

export type NowcastHistoryPoint = {
  quarterStart: string;
  label: string;
  /** Released GDP y/y growth, or null if this quarter hasn't been published yet. */
  actual: number | null;
  /** In-sample model fit, only present for quarters used to train the model. */
  fitted: number | null;
  /** Out-of-sample model estimate for a quarter GDP hasn't been released for yet. */
  projected: number | null;
};

export type ConfidenceInterval = { level: number; lower: number; upper: number };

/** The 90% range with the COVID quarters left in the error history: allows for a miss like 2020's. */
export type StressInterval = { lower: number; upper: number };

export type NowcastHeadline = {
  quarterStart: string;
  label: string;
  pointEstimate: number;
  /**
   * Phase 0 headline: half the width of the 68% range, not a model standard error.
   * Null when no range was evaluated at this horizon.
   */
  standardError: number | null;
  /** Empty (with `rangeAvailable: false`) from about 45 days before the release. */
  confidenceIntervals: ConfidenceInterval[];
  /**
   * Density of the headline's earlier errors around the point (area 1), carried through a
   * map that fixes its percentiles at the ends of the ranges, so it agrees with them.
   * Empty when there is no range.
   */
  pdf: { x: number; y: number }[];
  indicatorsReporting: string[];
  indicatorsTotal: number;
  /**
   * Share of the open quarter's own information that is in. For the Phase 0 headline it
   * rises from about a third at 85 days before the release to near 1 at the print.
   */
  signalShare?: number;
  /** Expected date of the official GDP release for this quarter. */
  nextOfficialRelease?: string | null;
  /** Phase 0 headline only. */
  stressInterval90?: StressInterval | null;
  /** False when no range was evaluated at this horizon; `rangeNote` then says why. */
  rangeAvailable?: boolean;
  rangeNote?: string | null;
};

/** One of the models averaged into the Phase 0 headline. */
export type ModelMember = {
  id: string;
  name: string;
  /** "bridge" (ARX) or "dfm". */
  family: string;
  weight: number;
  nowcast: number | null;
  description: string;
  /** Names of the indicators this member reads. */
  indicators: string[];
  trainingQuarters?: number;
  rSquared?: number | null;
  cvRSquared?: number | null;
  nFactors?: number;
};

export type NowcastModel = {
  /** Display name, e.g. "Dynamic factor model (demo)". Absent in older exports. */
  name?: string;
  description: string;
  trainingQuarters: number;
  trainingStart: string;
  trainingEnd: string;
  rSquared: number;
  /** Leave-one-out cross-validated R², when the model reports it. */
  cvRSquared?: number;
  residualStdDev: number;
  /** Factor-model fields (DFM only). */
  nFactors?: number;
  factorSelection?: string;
  panelSeries?: number;
  panelStart?: string;
  /** Bridge-regression fields (bridge model only). */
  intercept?: number;
  slope?: number;
  /** Phase 0 headline: the models averaged, each with its own nowcast and fit. */
  members?: ModelMember[];
  /** "equal" for the Phase 0 headline. */
  weights?: string | Record<string, number>;
};

/** nowcast = baseline (long-run average) + reported contributions + carriedForward. */
export type Decomposition = {
  baseline: number;
  reported: number;
  carriedForward: number;
  nowcast: number;
};

export type Driver = {
  id: string;
  /** pp of GDP growth per one-standard-deviation move in this indicator. */
  weight: number;
  /** pp contributed to this quarter's nowcast, or null if it hasn't reported. */
  contribution: number | null;
  /** Phase 0 headline: which way a rise reads for growth, +1 or -1, for every series. */
  sign?: number;
  /**
   * Where the sign comes from: "weight" (the sign of its weight in the headline), "economic"
   * (a prior: the VIX, USD/INR, Brent and the Indian crude basket) or "correlation" (the sign
   * of its correlation with GDP growth through Oct 2019).
   */
  signSource?: "weight" | "economic" | "correlation" | string;
  /** That correlation: a description of co-movement, not a causal claim. */
  correlation?: number | null;
};

/** The standardised panel the model sees: standard deviations from each series' own normal. */
export type Signals = {
  months: string[];
  rows: { id: string; z: (number | null)[] }[];
};

export type Vintage = {
  asOf: string;
  estimate: number | null;
  /** Null in the weeks (60 or 85 days out) where no range was evaluated. */
  lower90: number | null;
  upper90: number | null;
  signalShare: number;
  contributions: Record<string, number>;
  /** Indicators that published new figures since the previous vintage. */
  released: string[];
  /** Days between this run and the release it nowcasts. */
  horizonDays?: number | null;
};

export type TrackRecordRow = {
  quarterStart: string;
  label: string;
  asOf: string;
  estimate: number | null;
  /** The benchmark's estimate: AR(1) for the Phase 0 headline. */
  naive: number | null;
  /** Names the benchmark in `naive`, e.g. "AR(1)". */
  naiveModel?: string | null;
  /** The first print of the quarter's GDP for the Phase 0 headline; absent basis = the latest figure. */
  official: number | null;
  /** Today's figure for the quarter (the bar chart's). */
  latest?: number | null;
  /** `latest` minus `official`. */
  revision?: number | null;
  /**
   * Whether `official` and `latest` are on the same price base. Before 2025-26 Q3 they are
   * not: the February 2026 rebasing moved growth by up to a point.
   */
  sameBase?: boolean | null;
  /** "backtest": refitted on data released before the print, but today's revised values. */
  basis?: "backtest" | "live" | string;
  daysBeforeRelease?: number | null;
};

/** A run the archive recorded at the time, scored once the first print is out. */
export type LiveRecordRow = {
  runId?: string;
  modelId: string;
  asOf: string;
  quarterStart: string;
  label: string;
  estimate: number | null;
  /** Null until the first print. */
  official: number | null;
  basis: "live" | string;
  /** "headline", "member" (the ARX, the DFM) or "benchmark" (AR(1), the four-quarter mean). */
  role?: "headline" | "member" | "benchmark" | string;
  /** The run's own name: the model's, or for a benchmark its key in `headline.benchmarks`. */
  name?: string | null;
};

/** The Phase 0 headline's own description of itself. */
export type HeadlineInfo = {
  id: string;
  /** Each member's nowcast, keyed by member id. */
  members: Record<string, number | null>;
  weights?: string | Record<string, number>;
  horizonDays?: number | null;
  daysToRelease?: number | null;
  runKind?: "live" | "frozen" | string;
  /** Labelled as the export writes them, e.g. "Baseline: AR(1)". */
  benchmarks?: Record<string, number | null>;
  note?: string | null;
};

/** Root-mean-square error of the headline against the AR(1) benchmark, over one sample. */
export type EvaluationCell = {
  n: number;
  rmse: number;
  ar1Rmse: number;
  /** Below 1 means closer than AR(1). */
  ratioToAr1: number;
  ratioLow: number;
  ratioHigh: number;
};

/** What a sample is: its definition and the quarters it covers. */
export type EvaluationSample = {
  definition: string;
  firstQuarter: string;
  lastQuarter: string;
  quarters: number;
};

export type Evaluation = {
  basis?: string;
  /** The benchmark the ratios are against, e.g. "AR(1)". */
  naiveModel?: string | null;
  samples?: Record<string, EvaluationSample>;
  /** Keyed by days before the release ("30", "7"), then by sample. */
  horizons: Record<string, Record<string, EvaluationCell | null | undefined>>;
};

export type CoverageIndicator = {
  id: string;
  name: string;
  /** "core": the headline reads it. "monitor": tracked, weight 0. */
  role: "core" | "monitor";
  frequency: string;
  lagDays: number | null;
  historyFrom: string | null;
  basis: string;
  inArx: boolean;
  inDfm: boolean;
  note: string;
};

export type CoverageSection = {
  /** A stable slug ("industry", "services", ...). Match on this, never on the display name. */
  key?: string;
  section: string;
  indicators: CoverageIndicator[];
};

export type CoverageGap = {
  section: string;
  missing: string;
  why: string;
  candidateSource: string;
  /** 1 is most urgent. */
  priority: number;
  /** The section's `key`, or "business-conditions" for a gap with no section yet. */
  sectionKey?: string;
};

export type Coverage = {
  sections: CoverageSection[];
  gaps: CoverageGap[];
  /** Monthly-or-finer series in the database that are not on the shortlist. */
  notShortlisted?: { id: string; name: string }[];
  note?: string;
};

export type MethodInfo = { version: string | number; document: string };

export type NowcastData = {
  generatedAt: string;
  /** Latest release date in the data the model saw. */
  dataAsOf?: string;
  /** Set when the export is deliberately frozen at a past date (only data released by then). */
  frozenAsOf?: string | null;
  unit: string;
  model: NowcastModel;
  history: NowcastHistoryPoint[];
  nowcast: NowcastHeadline | null;
  decomposition?: Decomposition | null;
  drivers?: Driver[];
  signals?: Signals;
  vintages?: Vintage[];
  trackRecord?: TrackRecordRow[];
  caveats: string[];
  /** Phase 0 headline fields; absent in older exports. */
  headline?: HeadlineInfo | null;
  evaluation?: Evaluation | null;
  coverage?: Coverage | null;
  liveRecord?: LiveRecordRow[];
  method?: MethodInfo | null;
};

// Loaded the same optional-file-safe way as the per-indicator series: if
// nowcast.json hasn't been exported yet, this is null and every consumer
// falls back to its "not available" state rather than crashing the build.
const nowcastModules = import.meta.glob("../data/nowcast.json", { eager: true }) as Record<
  string,
  { default: NowcastData }
>;

export const NOWCAST: NowcastData | null = Object.values(nowcastModules)[0]?.default ?? null;

export function ciFor(level: number): ConfidenceInterval | null {
  const intervals = NOWCAST?.nowcast?.confidenceIntervals;
  if (!intervals?.length) return null;
  return intervals.find((c) => Math.abs(c.level - level) < 1e-6) ?? null;
}

/**
 * The 90% range with COVID-size misses allowed for, when the export carries it. The export
 * writes it only when there is an ordinary range for it to widen; if one ever arrives without,
 * it is still not shown on its own.
 */
export function stressRange(): StressInterval | null {
  const n = NOWCAST?.nowcast;
  const s = n?.stressInterval90;
  if (n?.rangeAvailable === false) return null;
  return s && Number.isFinite(s.lower) && Number.isFinite(s.upper) ? s : null;
}

export type NowcastRow = {
  quarterStart: string;
  label: string;
  /** Released GDP y/y growth, or null if not yet published. */
  actual: number | null;
  /** Model estimate: in-sample fit, or the out-of-sample projection for the open quarter. */
  estimate: number | null;
};

/**
 * History for charting, from the model's training start. The export also
 * carries estimates for earlier quarters, but those predate both the released
 * GDP series and the fitted sample, so they are unvalidated backcasts.
 */
export const NOWCAST_ROWS: NowcastRow[] = (() => {
  if (!NOWCAST) return [];
  const from = NOWCAST.model.trainingStart;
  return NOWCAST.history
    .filter((h) => h.quarterStart >= from)
    .map((h) => ({
      quarterStart: h.quarterStart,
      label: h.label,
      actual: h.actual,
      estimate: h.fitted ?? h.projected,
    }));
})();

/** The latest quarter for which GDP has been released. */
export function lastReleasedGdp(): NowcastRow | null {
  return [...NOWCAST_ROWS].reverse().find((r) => r.actual != null) ?? null;
}

/** Below this share of the quarter's own information, the headline says "too early to call". */
export const TOO_EARLY_SIGNAL_SHARE = 0.25;

/** Why the headline holds back: little of the signal is in, or no likely range has been measured yet. */
export type EarlyReason = "signal" | "range";

/**
 * Whether the headline should say "too early to call", and why.
 *
 * `signalShare` is the share of the open quarter's own information that is in: about a
 * third at 85 days before the release, about 0.7 at 30 and near 1 at the print. That
 * would catch only the first weeks, and on a live headline it is already above 0.25 by
 * the time the page has a number it can stand behind, so the "signal" test below does
 * not fire in practice. What marks the early weeks is the missing range: it is measured
 * only from earlier estimates made 30 and 7 days before a release, so from about 45 days
 * out the export has none (`rangeAvailable: false`) and nothing says how far to trust the
 * number. The page promises that range everywhere else, so no range means "too early".
 */
export function earlyReason(): EarlyReason | null {
  const n = NOWCAST?.nowcast;
  if (!n) return null;
  if (n.signalShare != null && n.signalShare < TOO_EARLY_SIGNAL_SHARE) return "signal";
  if (rangeMissing()) return "range";
  return null;
}

/** True when this quarter's estimate has no ordinary 90% range to go with it. */
export function rangeMissing(): boolean {
  const n = NOWCAST?.nowcast;
  return !!n && (n.rangeAvailable === false || !ciFor(0.9));
}

/** The export's own sentence for why there is no range, when it says there is none. */
export function rangeNote(): string | null {
  const n = NOWCAST?.nowcast;
  return n?.rangeAvailable === false ? (n.rangeNote ?? null) : null;
}

export function isTooEarly(): boolean {
  return earlyReason() != null;
}

export const DRIVERS: Driver[] = NOWCAST?.drivers ?? [];
export const WEIGHT: Record<string, number> = Object.fromEntries(
  DRIVERS.map((d) => [d.id, d.weight]),
);

/**
 * Which way a rise in each series reads for growth, +1 or -1. The Phase 0 export gives
 * every series one, including the ones it only monitors (which have weight 0 and so no
 * sign of their own). Absent in older exports, where every series has a weight.
 */
export const SIGN: Record<string, number> = Object.fromEntries(
  DRIVERS.flatMap((d) => (d.sign === 1 || d.sign === -1 ? [[d.id, d.sign] as const] : [])),
);

/** How many series take their direction from each source: its weight, an economic prior, or its correlation with GDP. */
export const SIGN_SOURCES: Record<string, number> = DRIVERS.reduce<Record<string, number>>(
  (acc, d) => (d.signSource ? { ...acc, [d.signSource]: (acc[d.signSource] ?? 0) + 1 } : acc),
  {},
);

/**
 * Only series with a non-zero weight can move the headline. The Phase 0 export
 * lists every monitored series too, with weight 0 and no contribution, so "has a
 * driver row" no longer means "is in the model". Largest effect first.
 */
export const MODEL_DRIVERS: Driver[] = DRIVERS.filter((d) => d.weight !== 0).sort(
  (a, b) => Math.abs(b.weight) - Math.abs(a.weight),
);

export function hasWeight(id: string): boolean {
  return (WEIGHT[id] ?? 0) !== 0;
}

/**
 * Probability that this quarter's growth comes in above `threshold`. It integrates
 * the exported density (`nowcast.pdf`), the same one the likely ranges are cut
 * from, so these odds agree with the range drawn beside them. Only if the export
 * has no usable density does it fall back to a normal tail from `standardError`.
 */
export function probabilityAbove(threshold: number): number | null {
  const n = NOWCAST?.nowcast;
  if (!n || n.rangeAvailable === false) return null;
  const fromDensity = massAbove(n.pdf ?? [], threshold);
  if (fromDensity != null) return fromDensity;
  if (!n.standardError) return null;
  return 1 - normalCdf((threshold - n.pointEstimate) / n.standardError);
}

/** Whether `probabilityAbove` is read off the exported density, rather than a normal approximation. */
export function oddsFromDensity(): boolean {
  return massAbove(NOWCAST?.nowcast?.pdf ?? [], 0) != null;
}

/** True for an export of the Phase 0 headline (two members, empirical ranges), as opposed to the demo factor model. */
export function isHeadlineExport(): boolean {
  return NOWCAST?.headline != null || (NOWCAST?.model.members?.length ?? 0) > 0;
}

/** "Baseline: AR(1)" -> "AR(1) benchmark"; "Benchmark: mean of the last four quarters" -> "Mean of the last four quarters". */
export function benchmarkLabel(key: string): string {
  const text = key.includes(": ") ? key.slice(key.indexOf(": ") + 2) : key;
  const cap = text.charAt(0).toUpperCase() + text.slice(1);
  return /^AR\(1\)$/i.test(text.trim()) ? `${cap} benchmark` : cap;
}

/** What the headline is compared with, as the export gives it. */
export function benchmarks(): { label: string; value: number }[] {
  return Object.entries(NOWCAST?.headline?.benchmarks ?? {}).flatMap(([key, value]) =>
    value != null && Number.isFinite(value) ? [{ label: benchmarkLabel(key), value }] : [],
  );
}

export type TrackSummary = {
  quarters: number;
  modelMiss: number;
  naiveMiss: number;
  /** Days before the release the estimates were made, when the export says. */
  daysBefore: number | null;
  /** True for a backtest scored against the first print (Phase 0 headline). */
  backtest: boolean;
  /** The benchmark the second figure is for, when the export names it. */
  naiveModel: string | null;
};

/** Average absolute miss over the last `n` quarters where both estimates exist. */
export function trackSummary(n = 8): TrackSummary | null {
  const rows = (NOWCAST?.trackRecord ?? [])
    .filter((r) => r.estimate != null && r.naive != null && r.official != null)
    .slice(-n);
  if (!rows.length) return null;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    quarters: rows.length,
    modelMiss: mean(rows.map((r) => Math.abs(r.estimate! - r.official!))),
    naiveMiss: mean(rows.map((r) => Math.abs(r.naive! - r.official!))),
    daysBefore: rows[rows.length - 1]!.daysBeforeRelease ?? null,
    backtest: rows.some((r) => r.basis === "backtest"),
    naiveModel: rows[rows.length - 1]!.naiveModel ?? null,
  };
}
