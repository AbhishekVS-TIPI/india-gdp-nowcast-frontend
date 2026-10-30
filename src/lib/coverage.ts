/**
 * What the headline reads, from nowcast.json `coverage`: ten sections of
 * indicators, each marked `core` (the headline reads it) or `monitor` (tracked,
 * weight 0), and the gaps in what is held. Without that field (older exports)
 * every series with a non-zero weight counts as read.
 */
import {
  DRIVERS,
  NOWCAST,
  SIGN_SOURCES,
  hasWeight,
  type CoverageGap,
  type CoverageIndicator,
} from "@/lib/nowcast";
import { SECTION_SECTOR } from "@/lib/sectors";
import { INDICATOR_BY_ID } from "@/lib/series";

export const COVERAGE = NOWCAST?.coverage ?? null;
export const COVERAGE_SECTIONS = COVERAGE?.sections ?? [];
export const COVERAGE_GAPS = [...(COVERAGE?.gaps ?? [])].sort((a, b) => a.priority - b.priority);

const BY_ID = new Map<string, { indicator: CoverageIndicator; section: string }>(
  COVERAGE_SECTIONS.flatMap((s) =>
    s.indicators.map((i) => [i.id, { indicator: i, section: s.section }] as const),
  ),
);

/** The coverage entry for a series, or null if the export does not list it. */
export function coverageOf(id: string): CoverageIndicator | null {
  return BY_ID.get(id)?.indicator ?? null;
}

/** Monthly-or-finer series in the database that are not on the shortlist (the export lists them by name). */
export const NOT_SHORTLISTED = COVERAGE?.notShortlisted ?? [];
const NOT_SHORTLISTED_NAME = new Map(NOT_SHORTLISTED.map((n) => [n.id, n.name]));

/**
 * A series' display name: this site's indicator register first, then the export's coverage
 * (which can name a series the register does not have yet), then the bare id.
 */
export function indicatorName(id: string): string {
  return INDICATOR_BY_ID[id]?.name ?? coverageOf(id)?.name ?? NOT_SHORTLISTED_NAME.get(id) ?? id;
}

/** True if the headline reads this series. A series the export does not list falls back to its weight. */
export function isRead(id: string): boolean {
  const c = coverageOf(id);
  return c ? c.role === "core" : hasWeight(id);
}

export const READ_COUNT = COVERAGE_SECTIONS.reduce(
  (n, s) => n + s.indicators.filter((i) => i.role === "core").length,
  0,
);
export const TRACKED_COUNT = COVERAGE_SECTIONS.reduce((n, s) => n + s.indicators.length, 0);

/** Core indicators carrying no weight (an overfit guard dropped them as near-copies). */
export function readWithoutWeight(): CoverageIndicator[] {
  return COVERAGE_SECTIONS.flatMap((s) => s.indicators).filter(
    (i) => i.role === "core" && !hasWeight(i.id),
  );
}

/** Sections of the model in which the headline reads no indicator at all (all of their series are monitored). */
export const UNREAD_SECTIONS: string[] = COVERAGE_SECTIONS.filter(
  (s) => !s.indicators.some((i) => i.role === "core"),
).map((s) => s.section);

/** Series in `drivers` that `coverage` accounts for neither in a section nor as not shortlisted (none, when the export is whole). */
export const UNACCOUNTED_COUNT = DRIVERS.filter(
  (d) => !BY_ID.has(d.id) && !NOT_SHORTLISTED_NAME.has(d.id),
).length;

export type UnmappedSection = {
  section: string;
  /** Indicators the headline reads in this section. */
  read: number;
  /** Indicators tracked here. */
  tracked: number;
  monitored: CoverageIndicator[];
  gaps: CoverageGap[];
};

/**
 * Sections of the model with no counterpart among this site's sectors (see
 * SECTION_SECTOR, matched on the section's `key`), so the sector tiles would otherwise
 * hide them. A section whose key the crosswalk does not know about, or that has none,
 * is treated the same way, so a new section shows up here rather than disappearing.
 */
export const UNMAPPED_SECTIONS: UnmappedSection[] = COVERAGE_SECTIONS.filter(
  (s) => (SECTION_SECTOR[s.key ?? ""] ?? null) === null,
).map((s) => ({
  section: s.section,
  read: s.indicators.filter((i) => i.role === "core").length,
  tracked: s.indicators.length,
  monitored: s.indicators.filter((i) => i.role !== "core"),
  // A gap names its section by key; one without a key falls back to the display name.
  gaps: COVERAGE_GAPS.filter((g) =>
    g.sectionKey != null && s.key != null ? g.sectionKey === s.key : g.section === s.section,
  ),
}));

const join = (xs: string[]) =>
  xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/**
 * Where each series' direction (which way a rise reads for growth) comes from, from the
 * export's `signSource` counts and names; null for exports that carry no direction.
 */
export function directionNote(): string | null {
  const n = SIGN_SOURCES;
  const parts: string[] = [];
  if (n["weight"])
    parts.push(
      `For the ${n["weight"]} series the headline weights, it is the sign of that weight.`,
    );
  if (n["economic"]) {
    const names = DRIVERS.filter((d) => d.signSource === "economic").map((d) =>
      indicatorName(d.id),
    );
    parts.push(`For ${n["economic"]} (${join(names)}), it is an economic judgement.`);
  }
  if (n["correlation"])
    parts.push(
      `For the other ${n["correlation"]}, it is the sign of the series' correlation with GDP growth before COVID. That shows how they moved together, not what causes what.`,
    );
  return parts.length
    ? `Each series has a direction: whether a rise in it points to faster or slower growth. ${parts.join(" ")}`
    : null;
}
