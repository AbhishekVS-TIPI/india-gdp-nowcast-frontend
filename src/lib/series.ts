import indicatorsRaw from "@/data/indicators.json";

export type Indicator = {
  id: string;
  code: string | null;
  name: string;
  category: string;
  frequency: string;
  source: string | null;
  sourceName: string | null;
  baseYear: string | null;
  availableFrom: string | null;
  remarks: string | null;
  notes: string | null;
  releaseDay: string | null;
  releaseLag: string | null;
  releaseLagDays: number | null;
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
  { key: "MAX", days: Infinity },
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
const seriesModules = import.meta.glob(["../data/series/*.json", "!../data/series/*.table.json"], {
  eager: true,
}) as Record<string, { default: Row[] }>;

const toPoints = (rows: Row[]): Point[] =>
  rows.map((r) => ({ t: Date.parse(`${r.d}T00:00:00Z`), v: r.v }));

export const REAL: Record<string, Point[]> = Object.fromEntries(
  Object.entries(seriesModules).map(([path, mod]) => {
    const id = path
      .split("/")
      .pop()!
      .replace(/\.json$/, "");
    return [id, toPoints(mod.default)];
  }),
);

/**
 * Per-base-year raw table, for the indicators whose base years get rescaled
 * ("spliced") into one continuous line for the chart. Only these indicators
 * have a `<id>.table.json` file (see export_frontend.py). Only the detail page
 * needs them, so they are loaded on demand instead of being bundled into
 * every page.
 */
export type TableRow = { d: string; spliced: number | null } & Record<string, number | null>;
export type IndicatorTable = { baseYears: string[]; rows: TableRow[] };

const tableLoaders = import.meta.glob("../data/series/*.table.json", {
  import: "default",
}) as Record<string, () => Promise<IndicatorTable>>;

/**
 * The full per-base-year breakdown for an indicator with more than one base
 * year, or null for a single-base indicator (its plain series IS the table).
 */
export async function loadTable(id: string): Promise<IndicatorTable | null> {
  const load = tableLoaders[`../data/series/${id}.table.json`];
  return load ? load() : null;
}

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

export function sliceRange(series: Point[], range: RangeKey): Point[] {
  const days = RANGES.find((r) => r.key === range)!.days;
  const from = TODAY - days * DAY;
  return series.filter((p) => p.t >= from);
}

/**
 * "1Y" for any indicator that actually has data in the last year (the
 * normal case, and the same default this always used), but widening to 5Y
 * then MAX for one that doesn't. TODAY is anchored to the most recent
 * observation across every indicator (see above) -- for a series whose own
 * last release is much older (e.g. a source that went stale years ago), a
 * fixed "1Y" default would show an empty chart and a "—" summary even
 * though real data exists, just further back. Never narrows below "1Y":
 * a fresh series should still open on its usual year of context, not the
 * shortest window that happens to have two points.
 */
export function defaultRange(id: string): RangeKey {
  const series = getSeries(id);
  const candidates = RANGES.filter((r) => r.key === "1Y" || r.key === "5Y" || r.key === "MAX");
  for (const r of candidates) {
    if (sliceRange(series, r.key).length >= 2) return r.key;
  }
  return "MAX";
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

/** Indian digit grouping (1,23,456), 0 dp for large values, 2 dp otherwise. */
export function fmtNum(v: number, unit?: string | null): string {
  const dp = Math.abs(v) >= 1000 ? 0 : 2;
  const s = v.toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return unit === "%" ? `${s}%` : s;
}

/** Latest and previous observation, for the current / previous / delta columns. */
export function latestPair(id: string): { current: Point; previous: Point } | null {
  const s = getSeries(id);
  if (s.length < 2) return null;
  return { current: s[s.length - 1]!, previous: s[s.length - 2]! };
}

const DAY_MS = 86_400_000;

export type YearOnYear = { value: number; kind: "pct" | "pp"; at: number };

/**
 * Change from the same period a year earlier: percentage-point change for
 * rates (unit "%"), % growth for everything else. Null when there is no
 * observation about a year back, or when the series touches zero or below in
 * the comparison (balances and net flows, where a % change means nothing).
 */
export function yearOnYear(id: string): YearOnYear | null {
  const s = getSeries(id);
  const last = s[s.length - 1];
  if (!last) return null;
  const target = last.t - 365 * DAY_MS;
  let prior: Point | undefined;
  for (const p of s) {
    if (
      Math.abs(p.t - target) <= 20 * DAY_MS &&
      (!prior || Math.abs(p.t - target) < Math.abs(prior.t - target))
    ) {
      prior = p;
    }
  }
  if (!prior) return null;
  if (UNITS[id] === "%") return { value: last.v - prior.v, kind: "pp", at: last.t };
  if (prior.v <= 0 || last.v <= 0) return null;
  return { value: (last.v / prior.v - 1) * 100, kind: "pct", at: last.t };
}

export function fmtYearOnYear(y: YearOnYear): string {
  const sign = y.value >= 0 ? "+" : "−";
  return y.kind === "pp"
    ? `${sign}${Math.abs(y.value).toFixed(2)} pp`
    : `${sign}${Math.abs(y.value).toFixed(1)}%`;
}

export const INDICATOR_BY_ID: Record<string, Indicator> = Object.fromEntries(
  indicators.map((i) => [i.id, i]),
);

const endOfMonth = (t: number, addMonths: number) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + addMonths + 1, 0);
};

/**
 * When the period after an indicator's latest reading should be published:
 * the end of that next period plus the indicator's typical release lag.
 * Monthly and quarterly dates are period starts in the data.
 */
export function nextRelease(id: string): { period: number; due: number } | null {
  const ind = INDICATOR_BY_ID[id];
  const last = lastUpdated(id);
  if (!ind || last == null || ind.releaseLagDays == null) return null;
  const step: Record<string, (t: number) => number> = {
    Daily: (t) => t + DAY_MS,
    Weekly: (t) => t + 7 * DAY_MS,
    Fortnightly: (t) => t + 14 * DAY_MS,
    Monthly: (t) => endOfMonth(t, 1),
    Quarterly: (t) => endOfMonth(t, 5),
  };
  const next = step[ind.frequency];
  if (!next) return null;
  const period = next(last);
  return { period, due: period + ind.releaseLagDays * DAY_MS };
}
