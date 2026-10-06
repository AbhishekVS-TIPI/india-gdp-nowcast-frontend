import { SECTORS } from "@/lib/sectors";
import { yearOnYear, fmtYearOnYear } from "@/lib/series";
import { SECTOR_STATUS, USUAL_BAND, describe, latest, fmtMonth } from "@/lib/signals";

const TONE = {
  "Stronger than usual": "text-trend-up",
  "About usual": "text-blue-dark",
  "Weaker than usual": "text-trend-down",
} as const;

/** One tile per sector: is its data pointing to stronger or weaker growth than usual? */
export function SectorTiles() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {SECTORS.map((sector) => {
        const status = SECTOR_STATUS.find((s) => s.key === sector.key)!;
        if (sector.context) {
          const cpi = yearOnYear("cpi_combined_urban_rural");
          const reading = latest("cpi_combined_urban_rural");
          return (
            <div key={sector.key} className="rounded-xl border border-dashed border-border p-4">
              <p className="text-sm font-semibold text-navy">{sector.label}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Background, not a growth signal
              </p>
              <p className="mt-3 text-sm text-navy">
                Consumer inflation {cpi ? fmtYearOnYear(cpi) : "—"}
                {reading ? (
                  <span className="text-muted-foreground"> · {fmtMonth(reading.month)}</span>
                ) : null}
              </p>
              {reading ? (
                <p className="mt-1 text-xs text-blue-dark">
                  {reading.value > USUAL_BAND
                    ? "Higher than usual"
                    : reading.value < -USUAL_BAND
                      ? "Lower than usual"
                      : "Around its usual pace"}
                </p>
              ) : null}
            </div>
          );
        }
        const word = status.value == null ? null : describe(status.value);
        const delta =
          status.value != null && status.previous != null ? status.value - status.previous : null;
        return (
          <div key={sector.key} className="rounded-xl border border-border p-4">
            <p className="text-sm font-semibold text-navy">{sector.label}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{sector.blurb}</p>
            <p
              className={`mt-3 text-sm font-medium ${word ? TONE[word] : "text-muted-foreground"}`}
            >
              {word ?? "No recent data"}
              {delta != null && Math.abs(delta) > 0.15 ? (
                <span className="ml-1 font-normal text-blue-dark">
                  {delta > 0 ? "· improving" : "· softening"}
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {status.current} of {status.total} indicators current
            </p>
          </div>
        );
      })}
    </div>
  );
}
