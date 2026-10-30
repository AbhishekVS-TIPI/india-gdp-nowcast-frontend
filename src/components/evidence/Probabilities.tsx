import { DensityChart } from "@/components/NowcastCharts";
import {
  NOWCAST,
  ciFor,
  isHeadlineExport,
  lastReleasedGdp,
  oddsFromDensity,
  probabilityAbove,
  rangeNote,
  stressRange,
} from "@/lib/nowcast";

/** A probability as a whole percent, but never a flat 0% or 100%: the density has finite tails and is not a certainty. */
const percent = (p: number) =>
  p >= 0.995 ? ">99%" : p <= 0.005 ? "<1%" : `${Math.round(p * 100)}%`;

/** Plain probability statements, with the full density underneath for analysts. */
export function Probabilities() {
  const n = NOWCAST?.nowcast;
  if (!n) return null;
  // No range was evaluated at this distance from the release: say so instead of an empty chart or odds.
  if (n.rangeAvailable === false) {
    return (
      <p className="text-sm leading-relaxed text-navy">
        {rangeNote() ?? "No range has been evaluated at this distance from the release."} The
        chances of growth above a given level, and the full distribution, appear once there is one.
      </p>
    );
  }
  const last = lastReleasedGdp();
  // Whole-number levels either side of the estimate, so the rows stay relevant as it moves.
  const mid = Math.round(n.pointEstimate);
  const thresholds = [mid - 1, mid, mid + 1];
  const rows = [
    ...thresholds.map((t) => ({ label: `Growth above ${t}%`, p: probabilityAbove(t) })),
    ...(last?.actual != null
      ? [
          {
            label: `Faster than ${last.label} (${last.actual.toFixed(1)}%)`,
            p: probabilityAbove(last.actual),
          },
        ]
      : []),
  ].filter((r): r is { label: string; p: number } => r.p != null);
  if (!rows.length) return <p className="text-sm text-muted-foreground">No probabilities yet.</p>;
  const stress = stressRange();
  const hasDensity = oddsFromDensity();
  const centre = `${n.pointEstimate.toFixed(1)}%`;
  const note = !hasDensity
    ? `These chances assume normally distributed errors${n.standardError != null ? ` with a spread of ${n.standardError.toFixed(1)} pp` : ""} around the central estimate of ${centre}.`
    : isHeadlineExport()
      ? `The chances come from how far the headline's earlier estimates were from the first print, applied to today's estimate of ${centre}${ciFor(0.9) ? ". The likely ranges come from the same errors" : ""}. The COVID quarters are left out, so this is for ordinary conditions${stress ? ". The tail-risk range allows for a bigger miss" : ""}.`
      : `Chances come from the model's error spread around its central estimate of ${centre}. They ignore uncertainty in the factors themselves, so treat them as somewhat overconfident.`;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm text-navy">
              <span>{r.label}</span>
              <span className="font-mono">{percent(r.p)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${r.p * 100}%` }} />
            </div>
          </li>
        ))}
        <li className="pt-1 text-[11px] leading-relaxed text-muted-foreground">{note}</li>
      </ul>
      {n.pdf.length > 1 ? (
        <div>
          <p className="text-center text-[11px] uppercase tracking-wider text-muted-foreground">
            Full distribution · {n.label}
          </p>
          <div className="mt-2">
            <DensityChart />
          </div>
          {ciFor(0.9) || stress ? (
            <p className="mt-1 text-center text-[11px] text-muted-foreground">
              {ciFor(0.9) ? "Shaded: 90% range" : ""}
              {ciFor(0.9) && stress ? " · " : ""}
              {stress ? "Lighter: tail-risk range" : ""}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
