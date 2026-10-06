import { DensityChart } from "@/components/NowcastCharts";
import { NOWCAST, lastReleasedGdp, probabilityAbove } from "@/lib/nowcast";

/** Plain probability statements, with the full density underneath for analysts. */
export function Probabilities() {
  const n = NOWCAST?.nowcast;
  if (!n) return null;
  const last = lastReleasedGdp();
  const thresholds = [6, 7, 8];
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
  ];
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
      <ul className="space-y-3">
        {rows.map((r) =>
          r.p == null ? null : (
            <li key={r.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm text-navy">
                <span>{r.label}</span>
                <span className="font-mono">{Math.round(r.p * 100)}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${r.p * 100}%` }}
                />
              </div>
            </li>
          ),
        )}
        <li className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
          Chances come from the model's error spread around its central estimate of{" "}
          {n.pointEstimate.toFixed(1)}%. They ignore uncertainty in the factors themselves, so treat
          them as somewhat overconfident.
        </li>
      </ul>
      <div>
        <p className="text-center text-[11px] uppercase tracking-wider text-muted-foreground">
          Full distribution — {n.label}
        </p>
        <div className="mt-2">
          <DensityChart />
        </div>
      </div>
    </div>
  );
}
