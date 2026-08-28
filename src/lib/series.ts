import indicatorsRaw from "@/data/indicators.json";

export type Indicator = {
  id: string;
  name: string;
  category: string;
  frequency: string;
  source: string | null;
  sourceName: string | null;
  availableFrom: string | null;
  remarks: string | null;
  notes: string | null;
  releaseDay: string | null;
  releaseLag: string | null;
  unit: string | null;
};

export const indicators = indicatorsRaw as Indicator[];

export const categories = Array.from(new Set(indicators.map((i) => i.category))).sort();

export type Point = { t: number; v: number };

export const RANGES = [
  { key: "1M", days: 30 },
  { key: "3M", days: 91 },
  { key: "6M", days: 182 },
  { key: "1Y", days: 365 },
  { key: "5Y", days: 1826 },
  { key: "MAX", days: 4380 },
] as const;

export type RangeKey = (typeof RANGES)[number]["key"];

const DAY = 86_400_000;

/**
 * Real data, exported from the India GDP nowcast pipeline
 * (india-gdp-nowcast: `india-gdp-nowcast export-frontend`) as one JSON file
 * per indicator under src/data/series/<id>.json. Loaded eagerly via Vite's
 * import.meta.glob so adding a new indicator's file here is enough -- no
 * import list to hand-maintain.
 */
type Row = { d: string; v: number };
const seriesModules = import.meta.glob("../data/series/*.json", { eager: true }) as Record<
  string,
  { default: Row[] }
>;

const toPoints = (rows: Row[]): Point[] =>
  rows.map((r) => ({ t: Date.parse(`${r.d}T00:00:00Z`), v: r.v }));

export const REAL: Record<string, Point[]> = Object.fromEntries(
  Object.entries(seriesModules).map(([path, mod]) => {
    const id = path.split("/").pop()!.replace(/\.json$/, "");
    return [id, toPoints(mod.default)];
  }),
);

export const UNITS: Record<string, string> = Object.fromEntries(
  indicators.filter((i) => i.unit).map((i) => [i.id, i.unit as string]),
);

export function hasRealData(id: string) {
  return id in REAL && REAL[id]!.length > 0;
}

/**
 * "Today", anchored to the most recent observation actually present across
 * every real series rather than a hardcoded date or the literal calendar
 * date -- indicators publish on very different lags (weekly forex vs.
 * quarterly GDP), so anchoring on wall-clock "now" would make every range
 * window look like it ends in a gap. Recomputes automatically on every data
 * refresh; nothing here needs updating when the export is re-run.
 */
export const TODAY: number = (() => {
  let max = 0;
  for (const points of Object.values(REAL)) {
    const last = points[points.length - 1];
    if (last && last.t > max) max = last.t;
  }
  return max || Date.now();
})();

/**
 * An indicator's series. Every indicator in indicators.json is expected to
 * have a matching file in src/data/series/ -- if one is added to the
 * metadata before its data file lands, this returns an empty series rather
 * than fabricating one, so a missing file shows as "no data" on the page,
 * never as a plausible-looking fake trend.
 */
export function getSeries(id: string): Point[] {
  return REAL[id] ?? [];
}

/**
 * Daily GDP nowcast. Not built yet -- the pipeline currently produces
 * validated indicator data only, no model output. Returns an empty series so
 * every consumer (the home page chart, TrendAnalysis) renders its "not yet
 * available" state rather than a number that doesn't exist.
 */
export function getNowcast(): Point[] {
  return [];
}

export function sliceRange(series: Point[], range: RangeKey): Point[] {
  const days = RANGES.find((r) => r.key === range)!.days;
  const from = TODAY - days * DAY;
  return series.filter((p) => p.t >= from);
}

export function change(series: Point[]) {
  if (series.length < 2) return 0;
  const a = series[0]!.v;
  const b = series[series.length - 1]!.v;
  return a === 0 ? 0 : ((b - a) / Math.abs(a)) * 100;
}

export function fmtDate(t: number) {
  return new Date(t).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Timestamp of the most recent observation for an indicator. */
export function lastUpdated(id: string): number | null {
  const s = getSeries(id);
  return s.length ? s[s.length - 1]!.t : null;
}

export type Contribution = { id: string; name: string; change: number };

/** Per-indicator % change over the selected range, sorted by magnitude. */
export function contributions(range: RangeKey): Contribution[] {
  return indicators
    .map((ind) => ({
      id: ind.id,
      name: ind.name,
      change: change(sliceRange(getSeries(ind.id), range)),
    }))
    .filter((c) => Number.isFinite(c.change) && getSeries(c.id).length > 0)
    .sort((a, b) => b.change - a.change);
}
