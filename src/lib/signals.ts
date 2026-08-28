import {
  UNITS,
  change,
  getSeries,
  indicators,
  lastUpdated,
  sliceRange,
  type RangeKey,
} from "@/lib/series";

export type SignalTone = "positive" | "neutral" | "negative";

export type IndicatorSignal = {
  id: string;
  name: string;
  category: string;
  frequency: string;
  source: string | null;
  sourceName: string | null;
  unit: string | null;
  latest: number | null;
  previous: number | null;
  changePct: number;
  updated: number | null;
  tone: SignalTone;
};

const NEUTRAL_BAND = 0.75;

export function toneOf(changePct: number): SignalTone {
  if (Math.abs(changePct) < NEUTRAL_BAND) return "neutral";
  return changePct > 0 ? "positive" : "negative";
}

export const TONE_LABEL: Record<SignalTone, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

export const TONE_TEXT: Record<SignalTone, string> = {
  positive: "text-signal-positive",
  neutral: "text-signal-neutral",
  negative: "text-signal-negative",
};

export const TONE_BG: Record<SignalTone, string> = {
  positive: "bg-signal-positive",
  neutral: "bg-signal-neutral",
  negative: "bg-signal-negative",
};

export function arrow(changePct: number) {
  if (Math.abs(changePct) < 0.05) return "→";
  return changePct > 0 ? "↑" : "↓";
}

export function signals(range: RangeKey): IndicatorSignal[] {
  return indicators.map((ind) => {
    const full = getSeries(ind.id);
    const s = sliceRange(full, range);
    const ch = change(s);
    const latest = full.length ? full[full.length - 1]!.v : null;
    const previous = full.length > 1 ? full[full.length - 2]!.v : null;
    return {
      id: ind.id,
      name: ind.name,
      category: ind.category,
      frequency: ind.frequency,
      source: ind.source,
      sourceName: ind.sourceName,
      unit: UNITS[ind.id] ?? null,
      latest,
      previous,
      changePct: ch,
      updated: lastUpdated(ind.id),
      tone: toneOf(ch),
    };
  });
}

/** Category groups built only from categories that actually exist in the data. */
export function categoryGroups(range: RangeKey) {
  const all = signals(range);
  const map = new Map<string, IndicatorSignal[]>();
  for (const s of all) {
    const arr = map.get(s.category) ?? [];
    arr.push(s);
    map.set(s.category, arr);
  }
  return Array.from(map.entries()).map(([category, items]) => {
    const avg = items.reduce((a, s) => a + s.changePct, 0) / items.length;
    const tone = toneOf(avg);
    const status =
      tone === "positive"
        ? avg > 4
          ? "Strong"
          : "Improving"
        : tone === "neutral"
          ? "Stable"
          : avg < -4
            ? "Weak"
            : "Weakening";
    return { category, items, avg, tone, status };
  });
}

export function fmtValue(v: number | null, unit: string | null) {
  if (v == null) return "—";
  const abs = Math.abs(v);
  const digits = abs >= 1000 ? 0 : abs >= 100 ? 1 : 2;
  const num = v.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  if (!unit) return num;
  if (unit === "per cent" || unit === "per cent (y/y)") return `${num}%`;
  return num;
}
