import { Link } from "@tanstack/react-router";
import {
  COVERAGE_GAPS,
  COVERAGE_SECTIONS,
  NOT_SHORTLISTED,
  READ_COUNT,
  TRACKED_COUNT,
  UNACCOUNTED_COUNT,
  readWithoutWeight,
} from "@/lib/coverage";
import { hasWeight, type CoverageIndicator } from "@/lib/nowcast";
import { INDICATOR_BY_ID } from "@/lib/series";

type Kind = "arx" | "read" | "unweighted" | "monitor";

function kindOf(i: CoverageIndicator): Kind {
  if (i.role !== "core") return "monitor";
  if (!hasWeight(i.id)) return "unweighted";
  return i.inArx ? "arx" : "read";
}

const DOT: Record<Kind, string> = {
  // read by the regression (and often the factor model too): filled, with a ring
  arx: "bg-primary ring-2 ring-navy ring-offset-1",
  // read by the factor model only: filled
  read: "bg-primary",
  // read, but the overfit guard gave it no weight: faded fill
  unweighted: "bg-primary/35",
  // tracked only: hollow
  monitor: "border border-blue-medium bg-transparent",
};

const KIND_TEXT: Record<Kind, string> = {
  arx: "read by the regression and the factor model",
  read: "read by the factor model",
  unweighted: "read, but given no weight",
  monitor: "monitored only; it does not move the estimate",
};

function Dot({ i }: { i: CoverageIndicator }) {
  const kind = kindOf(i);
  const inArxOnly = i.inArx && !i.inDfm;
  const text = `${i.name}: ${
    kind === "arx" && inArxOnly ? "read by the regression" : KIND_TEXT[kind]
  }${i.note ? ` (${i.note})` : ""}`;
  const dot = <span aria-hidden className={`block h-3 w-3 rounded-full ${DOT[kind]}`} />;
  const known = INDICATOR_BY_ID[i.id];
  return (
    <li title={text} className="flex">
      {known ? (
        <Link to="/indicator/$id" params={{ id: i.id }} aria-label={text} className="p-0.5">
          {dot}
        </Link>
      ) : (
        <span role="img" aria-label={text} className="p-0.5">
          {dot}
        </span>
      )}
    </li>
  );
}

/**
 * Every tracked indicator as a dot, by the model's ten sections. Filled dots are the
 * ones the headline reads, hollow dots are only monitored, and a section with no
 * filled dot says so (Services and Agriculture today).
 */
export function CoverageMap() {
  if (!COVERAGE_SECTIONS.length) return null;
  const unweighted = readWithoutWeight().length;
  return (
    <div>
      <p className="text-sm leading-relaxed text-navy">
        The headline reads <span className="font-mono">{READ_COUNT}</span> of the{" "}
        <span className="font-mono">{TRACKED_COUNT}</span> indicators grouped here. The others are
        monitored: they appear on the site, but they do not move the estimate.
        {UNACCOUNTED_COUNT > 0
          ? ` A further ${UNACCOUNTED_COUNT} monitored series are not assigned to any section.`
          : ""}
      </p>
      {NOT_SHORTLISTED.length ? (
        <details className="mt-2 text-xs text-blue-dark">
          <summary className="cursor-pointer text-navy">
            {NOT_SHORTLISTED.length} more monitored series are in the database but not on the
            shortlist
          </summary>
          <ul className="mt-2 list-disc space-y-0.5 pl-4">
            {NOT_SHORTLISTED.map((n) => (
              <li key={n.id}>{n.name}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <ul className="mt-4 divide-y divide-border">
        {COVERAGE_SECTIONS.map((s) => {
          const read = s.indicators.filter((i) => i.role === "core").length;
          return (
            <li key={s.section} className="py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-sm font-medium text-navy">{s.section}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {read === 0 ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-trend-down">
                      no indicator read
                    </span>
                  ) : (
                    `reads ${read} of ${s.indicators.length}`
                  )}
                </span>
              </div>
              <ul className="mt-2 flex flex-wrap gap-1">
                {s.indicators.map((i) => (
                  <Dot key={i.id} i={i} />
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-muted-foreground">
        {(["arx", "read", ...(unweighted ? ["unweighted"] : []), "monitor"] as Kind[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span aria-hidden className={`block h-3 w-3 rounded-full ${DOT[k]}`} />
            {k === "arx"
              ? "Read by the regression (ring)"
              : k === "read"
                ? "Read by the factor model"
                : k === "unweighted"
                  ? "Read, no weight"
                  : "Monitored only"}
          </span>
        ))}
      </div>
    </div>
  );
}

/** What is missing from the data, why it matters, where it could come from, most urgent first. */
export function GapsList() {
  if (!COVERAGE_GAPS.length) return null;
  return (
    <ul className="space-y-3">
      {COVERAGE_GAPS.map((g) => (
        <li key={`${g.section}-${g.missing}`} className="rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-sm font-semibold text-navy">{g.section}</p>
            <span className="font-mono text-[11px] text-muted-foreground">
              priority {g.priority}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-navy">Missing: {g.missing}.</p>
          <p className="mt-1 text-xs leading-relaxed text-blue-dark">{g.why}.</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Possible source: {g.candidateSource}
          </p>
        </li>
      ))}
    </ul>
  );
}
