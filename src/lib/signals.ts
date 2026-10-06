/**
 * Readings "relative to normal", from the standardised panel the DFM itself sees
 * (nowcast.json `signals`): each value is how many standard deviations an
 * indicator's growth sits from its own long-run average.
 *
 * "Signed" readings point the same way for every indicator: positive means "this
 * points to stronger GDP growth", using the sign of the indicator's weight in the
 * model (so a rise in unemployment or market volatility counts as weaker).
 * Prices are context, not growth signals, so they are left unsigned and out of
 * the breadth and sector counts.
 */
import { NOWCAST, WEIGHT } from "@/lib/nowcast";
import { SECTORS, isContext, sectorOf, type SectorKey } from "@/lib/sectors";

export const SIGNAL_MONTHS: string[] = NOWCAST?.signals?.months ?? [];
const RAW: Record<string, (number | null)[]> = Object.fromEntries(
  (NOWCAST?.signals?.rows ?? []).map((r) => [r.id, r.z]),
);
export const SIGNAL_IDS: string[] = Object.keys(RAW);

/** A reading this many months older than the panel's last month counts as stale. */
const STALE_AFTER_MONTHS = 4;
/** |signed reading| below this is "about usual". */
export const USUAL_BAND = 0.3;

const sign = (id: string) => (isContext(id) ? 1 : Math.sign(WEIGHT[id] ?? 1) || 1);

/** Signed readings for one indicator, aligned to SIGNAL_MONTHS. */
export function signed(id: string): (number | null)[] {
  const s = sign(id);
  return (RAW[id] ?? []).map((z) => (z == null ? null : z * s));
}

export type Latest = { value: number; monthIndex: number; month: string };

/** Most recent non-stale signed reading, `offset` months before the latest one. */
export function latest(id: string, offset = 0): Latest | null {
  const z = signed(id);
  for (let i = z.length - 1; i >= 0; i--) {
    if (z[i] == null) continue;
    if (z.length - 1 - i > STALE_AFTER_MONTHS) return null;
    const j = i - offset;
    const v = j >= 0 ? z[j] : null;
    return v == null ? null : { value: v, monthIndex: j, month: SIGNAL_MONTHS[j]! };
  }
  return null;
}

export function describe(v: number): "Stronger than usual" | "About usual" | "Weaker than usual" {
  if (v > USUAL_BAND) return "Stronger than usual";
  if (v < -USUAL_BAND) return "Weaker than usual";
  return "About usual";
}

export function fmtMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
};

export type SectorStatus = {
  key: SectorKey;
  /** Median signed reading of the sector's current indicators. */
  value: number | null;
  /** The same three months earlier, for the direction arrow. */
  previous: number | null;
  current: number;
  total: number;
};

export function sectorStatus(key: SectorKey): SectorStatus {
  const ids = SIGNAL_IDS.filter((id) => sectorOf(id) === key);
  const now = ids.map((id) => latest(id)?.value).filter((v): v is number => v != null);
  const before = ids.map((id) => latest(id, 3)?.value).filter((v): v is number => v != null);
  return {
    key,
    value: now.length ? median(now) : null,
    previous: before.length ? median(before) : null,
    current: now.length,
    total: ids.length,
  };
}

export const SECTOR_STATUS: SectorStatus[] = SECTORS.map((s) => sectorStatus(s.key));

export type BreadthPoint = { month: string; share: number; covered: number };

/**
 * Share of growth indicators (prices excluded) pointing to stronger-than-usual
 * growth, by month. Months where fewer than half the indicators have a reading
 * are dropped, so the ragged edge doesn't swing the line.
 */
export const BREADTH: BreadthPoint[] = (() => {
  const ids = SIGNAL_IDS.filter((id) => !isContext(id));
  const rows = ids.map(signed);
  return SIGNAL_MONTHS.map((month, i) => {
    const vals = rows.map((r) => r[i]).filter((v): v is number => v != null);
    return {
      month,
      share: vals.filter((v) => v > 0).length / (vals.length || 1),
      covered: vals.length,
    };
  }).filter((p) => p.covered >= ids.length / 2);
})();

export type SignalMover = { id: string; now: number; change: number; month: string };

/** Growth indicators whose reading moved most over the last three months. */
export function signalMovers(): SignalMover[] {
  return SIGNAL_IDS.filter((id) => !isContext(id))
    .map((id) => {
      const now = latest(id);
      const before = latest(id, 3);
      return now && before
        ? { id, now: now.value, change: now.value - before.value, month: now.month }
        : null;
    })
    .filter((m): m is SignalMover => m != null)
    .sort((a, b) => b.change - a.change);
}
