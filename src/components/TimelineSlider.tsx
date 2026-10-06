import { useCallback } from "react";

/**
 * Two-handle slider over an ordered list of labels (here, quarters). `value`
 * is the [start, end] index pair, inclusive. The handles can't come closer
 * than `minGap` steps, so the chart never collapses to a single point.
 */
export function TimelineSlider({
  labels,
  value,
  onChange,
  minGap = 3,
}: {
  labels: string[];
  value: [number, number];
  onChange: (next: [number, number]) => void;
  minGap?: number;
}) {
  const max = labels.length - 1;
  const [start, end] = value;
  const pct = (i: number) => (max > 0 ? (i / max) * 100 : 0);

  const setStart = useCallback(
    (i: number) => onChange([Math.min(i, end - minGap), end]),
    [end, minGap, onChange],
  );
  const setEnd = useCallback(
    (i: number) => onChange([start, Math.max(i, start + minGap)]),
    [start, minGap, onChange],
  );

  return (
    <div>
      <div className="dual-range" aria-label="Timeline">
        <div className="dual-range-track" />
        <div
          className="dual-range-fill"
          style={{ left: `${pct(start)}%`, width: `${pct(end) - pct(start)}%` }}
        />
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={start}
          onChange={(e) => setStart(Number(e.target.value))}
          aria-label="Start quarter"
          aria-valuetext={labels[start]}
        />
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={end}
          onChange={(e) => setEnd(Number(e.target.value))}
          aria-label="End quarter"
          aria-valuetext={labels[end]}
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[11px] text-muted-foreground">
        <span>{labels[start]}</span>
        <span>{labels[end]}</span>
      </div>
    </div>
  );
}
