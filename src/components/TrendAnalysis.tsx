import { useMemo } from "react";
import {
  change,
  contributions,
  fmtDate,
  getNowcast,
  sliceRange,
  type RangeKey,
} from "@/lib/series";

const LABEL: Record<RangeKey, string> = {
  "1M": "the past month",
  "3M": "the past three months",
  "6M": "the past six months",
  "1Y": "the past year",
  "5Y": "the past five years",
  MAX: "the full history",
};

export function TrendAnalysis({ range }: { range: RangeKey }) {
  const text = useMemo(() => {
    const s = sliceRange(getNowcast(), range);
    if (s.length < 2) return null;

    const first = s[0]!;
    const last = s[s.length - 1]!;
    const pct = change(s);
    const up = pct >= 0;
    const dir = up ? "↑ risen" : "↓ eased";

    // Momentum: last ~30 observations vs the preceding stretch.
    const tail = s.slice(-30);
    const prior = s.slice(0, -30);
    const tailAvg = tail.reduce((a, p) => a + p.v, 0) / tail.length;
    const priorAvg = prior.length
      ? prior.reduce((a, p) => a + p.v, 0) / prior.length
      : tailAvg;
    const momentum = tailAvg - priorAvg;
    const momentumWord =
      Math.abs(momentum) < 0.05
        ? "broadly flat against"
        : momentum > 0
          ? "running above"
          : "running below";

    const c = contributions(range);
    const top = c.slice(0, 2);
    const bottom = c.slice(-2).reverse();

    return {
      headline: `The nowcast has ${dir} from ${first.v.toFixed(2)}% to ${last.v.toFixed(
        2,
      )}% over ${LABEL[range]}, a ${up ? "↑" : "↓"} ${Math.abs(pct).toFixed(
        1,
      )}% move between ${fmtDate(first.t)} and ${fmtDate(last.t)}.`,
      momentum: `Recent momentum is ${momentumWord} the earlier part of the window — the latest readings average ${tailAvg.toFixed(
        2,
      )}% versus ${priorAvg.toFixed(2)}% before that.`,
      top,
      bottom,
    };
  }, [range]);

  if (!text) return null;

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-5">
      <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Trend Analysis
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-navy">{text.headline}</p>
      <p className="mt-2 text-sm leading-relaxed text-blue-dark">{text.momentum}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Pulling the composite up
          </p>
          <ul className="mt-2 space-y-1">
            {text.top.map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-navy">{c.name}</span>
                <span className="shrink-0 font-mono text-xs text-trend-up">
                  ↑ +{Math.abs(c.change).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Weighing it down
          </p>
          <ul className="mt-2 space-y-1">
            {text.bottom.map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-navy">{c.name}</span>
                <span className="shrink-0 font-mono text-xs text-trend-down">
                  ↓ −{Math.abs(c.change).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
