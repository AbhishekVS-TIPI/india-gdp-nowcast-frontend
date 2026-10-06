import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DRIVERS } from "@/lib/nowcast";
import { SECTORS, sectorOf } from "@/lib/sectors";
import { INDICATOR_BY_ID } from "@/lib/series";
import { SIGNAL_IDS, SIGNAL_MONTHS, fmtMonth, signed } from "@/lib/signals";

const MONTHS = 24;
const TOP = 20;

/** Cell colour: green/red for growth signals, blue/grey for prices (context only). */
function tint(v: number | null, context: boolean): string {
  if (v == null) return "transparent";
  const strength = Math.round(Math.min(Math.abs(v) / 2, 1) * 75 + 8);
  const colour = context
    ? v >= 0
      ? "var(--chart-1)"
      : "var(--muted-foreground)"
    : v >= 0
      ? "var(--trend-up)"
      : "var(--trend-down)";
  return `color-mix(in oklab, ${colour} ${strength}%, var(--card))`;
}

/**
 * Indicators (rows, grouped by sector) by month (columns): how far each reading
 * sits from its own normal. Shows when a slowdown started and how far it spread.
 */
export function Heatmap() {
  const [topOnly, setTopOnly] = useState(false);
  const months = SIGNAL_MONTHS.slice(-MONTHS);
  const offset = SIGNAL_MONTHS.length - months.length;
  const rank = useMemo(() => new Map(DRIVERS.map((d, i) => [d.id, i])), []);
  const influential = useMemo(() => new Set(DRIVERS.slice(0, TOP).map((d) => d.id)), []);

  const groups = SECTORS.map((s) => ({
    sector: s,
    ids: SIGNAL_IDS.filter(
      (id) => sectorOf(id) === s.key && (!topOnly || influential.has(id)),
    ).sort((a, b) => (rank.get(a) ?? 999) - (rank.get(b) ?? 999)),
  })).filter((g) => g.ids.length);

  const cols = `minmax(9rem, 15rem) repeat(${months.length}, minmax(0, 1fr))`;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: tint(-2, false) }}
          />
          weaker than usual
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: tint(2, false) }}
          />
          stronger than usual
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-navy">
          <input type="checkbox" checked={topOnly} onChange={(e) => setTopOnly(e.target.checked)} />
          Only the {TOP} most influential indicators
        </label>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid gap-px" style={{ gridTemplateColumns: cols }}>
            <span />
            {months.map((m, i) => (
              <span key={m} className="pb-1 text-center font-mono text-[9px] text-muted-foreground">
                {i % 3 === 0 ? fmtMonth(m).replace(" 20", " ’") : ""}
              </span>
            ))}
          </div>
          {groups.map((g) => (
            <div key={g.sector.key} className="mt-3">
              <p className="mb-1 text-[11px] font-semibold text-navy">
                {g.sector.label}
                {g.sector.context ? (
                  <span className="font-normal text-muted-foreground"> · background</span>
                ) : null}
              </p>
              {g.ids.map((id) => {
                const z = signed(id);
                const name = INDICATOR_BY_ID[id]?.name ?? id;
                return (
                  <div key={id} className="grid gap-px" style={{ gridTemplateColumns: cols }}>
                    <Link
                      to="/indicator/$id"
                      params={{ id }}
                      className="truncate pr-2 text-[11px] leading-5 text-blue-dark hover:underline"
                    >
                      {name}
                    </Link>
                    {months.map((m, i) => {
                      const v = z[offset + i] ?? null;
                      return (
                        <span
                          key={m}
                          className="h-5"
                          style={{ background: tint(v, !!g.sector.context) }}
                          title={
                            v == null
                              ? `${name} · ${fmtMonth(m)} · no reading`
                              : `${name} · ${fmtMonth(m)} · ${Math.abs(v).toFixed(1)} sd ${v >= 0 ? "above" : "below"} usual`
                          }
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Each cell is that month's growth reading against the indicator's own long-run average, in
        standard deviations (the scale the model uses). Readings are flipped where the model links a
        rise to slower GDP growth, so green always means stronger. Prices are shown in blue (above
        usual) and grey (below) as background. Blank cells have no reading yet.
      </p>
    </div>
  );
}
