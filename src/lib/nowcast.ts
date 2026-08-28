/**
 * The GDP nowcast, exported by the india-gdp-nowcast pipeline
 * (`india-gdp-nowcast export-frontend`) as src/data/nowcast.json.
 *
 * It is a simple model on purpose: one composite factor built from the other
 * six indicators, regressed against GDP with ordinary least squares. See
 * `model.description` and `caveats` below (surfaced verbatim on the
 * methodology page) for exactly what it does and does not account for.
 */

export type NowcastHistoryPoint = {
  quarterStart: string;
  label: string;
  /** Released GDP y/y growth, or null if this quarter hasn't been published yet. */
  actual: number | null;
  /** In-sample model fit, only present for quarters used to train the regression. */
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
};

export type NowcastModel = {
  description: string;
  trainingQuarters: number;
  trainingStart: string;
  trainingEnd: string;
  rSquared: number;
  residualStdDev: number;
  intercept: number;
  slope: number;
};

export type NowcastData = {
  generatedAt: string;
  unit: string;
  model: NowcastModel;
  history: NowcastHistoryPoint[];
  nowcast: NowcastHeadline | null;
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
