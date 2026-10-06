/**
 * The GDP nowcast, exported by the india-gdp-nowcast pipeline
 * (`india-gdp-nowcast export-frontend`) as src/data/nowcast.json.
 *
 * The weekly refresh currently publishes the nowcast lab's standard dynamic
 * factor model as a demo (`python -m nowcast_lab.export_dfm`); the pipeline's
 * original bridge regression writes the same shape. `model.description` and
 * `caveats` say exactly what the current model does and does not account for.
 */

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

export type NowcastHeadline = {
  quarterStart: string;
  label: string;
  pointEstimate: number;
  standardError: number;
  confidenceIntervals: ConfidenceInterval[];
  pdf: { x: number; y: number }[];
  indicatorsReporting: string[];
  indicatorsTotal: number;
  /** Share of the model's total indicator weight already reporting (DFM only). */
  signalShare?: number;
  /** Expected date of the official GDP release for this quarter. */
  nextOfficialRelease?: string | null;
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
};

/** The standardised panel the model sees: standard deviations from each series' own normal. */
export type Signals = {
  months: string[];
  rows: { id: string; z: (number | null)[] }[];
};

export type Vintage = {
  asOf: string;
  estimate: number | null;
  lower90: number | null;
  upper90: number | null;
  signalShare: number;
  contributions: Record<string, number>;
  /** Indicators that published new figures since the previous vintage. */
  released: string[];
};

export type TrackRecordRow = {
  quarterStart: string;
  label: string;
  asOf: string;
  estimate: number | null;
  naive: number | null;
  official: number | null;
};

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
  if (!intervals) return null;
  return intervals.find((c) => Math.abs(c.level - level) < 1e-6) ?? null;
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

/** Below this share of the model's signal, the headline says "too early to call". */
export const TOO_EARLY_SIGNAL_SHARE = 0.25;

export function isTooEarly(): boolean {
  const share = NOWCAST?.nowcast?.signalShare;
  return share != null && share < TOO_EARLY_SIGNAL_SHARE;
}

export const DRIVERS: Driver[] = NOWCAST?.drivers ?? [];
export const WEIGHT: Record<string, number> = Object.fromEntries(
  DRIVERS.map((d) => [d.id, d.weight]),
);

/** Standard normal CDF (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7). */
function normalCdf(z: number): number {
  const t = 1 / (1 + (0.3275911 * Math.abs(z)) / Math.SQRT2);
  const poly =
    t *
    (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/** Probability that this quarter's growth comes in above `threshold`, under the model's normal error. */
export function probabilityAbove(threshold: number): number | null {
  const n = NOWCAST?.nowcast;
  if (!n || !n.standardError) return null;
  return 1 - normalCdf((threshold - n.pointEstimate) / n.standardError);
}

export type TrackSummary = { quarters: number; modelMiss: number; naiveMiss: number };

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
  };
}
