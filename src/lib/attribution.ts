import { MODEL_DRIVERS } from "@/lib/nowcast";
import { SECTORS, sectorOf, type SectorKey } from "@/lib/sectors";

export type SectorContribution = {
  key: SectorKey;
  label: string;
  /** pp from this sector's reported indicators. */
  total: number;
  reported: number;
  /** Indicators in this sector that carry weight in the headline. */
  members: number;
};

/** This quarter's reported contributions summed by sector, largest effect first. */
export const SECTOR_CONTRIBUTIONS: SectorContribution[] = SECTORS.map((s) => {
  // Only series with a weight can move the headline; the ones it merely monitors are not members.
  const members = MODEL_DRIVERS.filter((d) => sectorOf(d.id) === s.key);
  const reported = members.filter((d) => d.contribution != null);
  return {
    key: s.key,
    label: s.label,
    total: reported.reduce((a, d) => a + d.contribution!, 0),
    reported: reported.length,
    members: members.length,
  };
})
  .filter((s) => s.members > 0)
  .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
