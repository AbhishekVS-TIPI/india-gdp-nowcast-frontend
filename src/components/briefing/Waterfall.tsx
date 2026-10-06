import { Link } from "@tanstack/react-router";
import { SECTOR_CONTRIBUTIONS } from "@/lib/attribution";
import { DRIVERS, NOWCAST } from "@/lib/nowcast";
import { INDICATOR_BY_ID } from "@/lib/series";

type Step = {
  label: string;
  detail?: string;
  from: number;
  to: number;
  kind: "base" | "step" | "total";
};

const pp = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)} pp`;

/**
 * From the long-run average to this quarter's estimate: what each sector's
 * reported data adds or subtracts (via its weight in the model), and what the
 * model carries forward from earlier months for data not yet in.
 */
export function Waterfall() {
  const d = NOWCAST?.decomposition;
  if (!d) return null;

  const bySector = SECTOR_CONTRIBUTIONS;

  const steps: Step[] = [
    { label: "Long-run average growth", from: 0, to: d.baseline, kind: "base" },
  ];
  let level = d.baseline;
  for (const s of bySector) {
    steps.push({
      label: s.label,
      detail: s.reported ? `${s.reported} of ${s.members} reported` : "awaited",
      from: level,
      to: level + s.total,
      kind: "step",
    });
    level += s.total;
  }
  steps.push({
    label: "Momentum from earlier months",
    detail: "the model's carry-forward for data not yet in",
    from: level,
    to: level + d.carriedForward,
    kind: "step",
  });
  steps.push({ label: "This quarter's estimate", from: 0, to: d.nowcast, kind: "total" });

  // The axis starts near the smallest running total, not zero, so sub-point
  // contributions stay visible next to a ~7% baseline.
  const points = steps.flatMap((s) => (s.kind === "step" ? [s.from, s.to] : [s.to]));
  const lo = Math.floor(Math.min(...points) - 0.5);
  const hi = Math.ceil(Math.max(...points) + 0.5);
  const x = (v: number) => ((Math.max(v, lo) - lo) / (hi - lo)) * 100;

  const individual = DRIVERS.filter((x) => x.contribution != null).sort(
    (a, b) => b.contribution! - a.contribution!,
  );
  const ups = individual.filter((x) => x.contribution! > 0).slice(0, 3);
  const downs = individual
    .filter((x) => x.contribution! < 0)
    .slice(-3)
    .reverse();

  return (
    <div>
      <ul className="space-y-1.5">
        {steps.map((s) => {
          const left = x(Math.min(s.from, s.to));
          const width = Math.max(x(Math.max(s.from, s.to)) - left, s.from === s.to ? 0 : 0.6);
          const delta = s.to - s.from;
          const colour =
            s.kind === "base"
              ? "bg-blue-light"
              : s.kind === "total"
                ? "bg-navy"
                : delta >= 0
                  ? "bg-trend-up"
                  : "bg-trend-down";
          return (
            <li
              key={s.label}
              className="grid grid-cols-[minmax(0,10rem)_1fr_5rem] items-center gap-3 sm:grid-cols-[minmax(0,15rem)_1fr_5.5rem]"
            >
              <span className="min-w-0 text-xs leading-tight text-navy">
                <span className={s.kind === "step" ? "" : "font-semibold"}>{s.label}</span>
                {s.detail ? (
                  <span className="block text-[10px] text-muted-foreground">{s.detail}</span>
                ) : null}
              </span>
              <span className="relative h-5 rounded-sm bg-muted/40">
                <span
                  className={`absolute top-0.5 bottom-0.5 rounded-sm ${colour}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </span>
              <span
                className={`text-right font-mono text-xs ${
                  s.kind !== "step"
                    ? "font-semibold text-navy"
                    : delta >= 0
                      ? "text-trend-up"
                      : "text-trend-down"
                }`}
              >
                {s.kind === "step" ? (s.from === s.to ? "—" : pp(delta)) : `${s.to.toFixed(1)}%`}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Axis runs from {lo}% to {hi}%. Contributions are each reported indicator's reading this
        quarter times its weight in the model.
      </p>

      {ups.length || downs.length ? (
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          {[
            { title: "Pushing the estimate up", items: ups },
            { title: "Pulling it down", items: downs },
          ].map((col) => (
            <div key={col.title}>
              <p className="eyebrow">{col.title}</p>
              <ul className="mt-2 space-y-1.5">
                {col.items.map((m) => (
                  <li key={m.id}>
                    <Link
                      to="/indicator/$id"
                      params={{ id: m.id }}
                      className="flex items-baseline justify-between gap-3 text-sm text-navy hover:underline"
                    >
                      <span className="min-w-0 truncate">
                        {INDICATOR_BY_ID[m.id]?.name ?? m.id}
                      </span>
                      <span
                        className={`shrink-0 font-mono text-xs ${m.contribution! >= 0 ? "text-trend-up" : "text-trend-down"}`}
                      >
                        {pp(m.contribution!)}
                      </span>
                    </Link>
                  </li>
                ))}
                {!col.items.length ? (
                  <li className="text-xs text-muted-foreground">None yet</li>
                ) : null}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
