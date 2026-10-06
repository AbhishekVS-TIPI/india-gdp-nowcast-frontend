import { DRIVERS } from "@/lib/nowcast";
import { SECTORS, sectorOf, type SectorKey } from "@/lib/sectors";

export type SectorContribution = {
  key: SectorKey;
  label: string;
  /** pp from this sector's reported indicators. */
  total: number;
  reported: number;
  members: number;
};

/** This quarter's reported contributions summed by sector, largest effect first. */
export const SECTOR_CONTRIBUTIONS: SectorContribution[] = SECTORS.map((s) => {
  const members = DRIVERS.filter((d) => sectorOf(d.id) === s.key);
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
