import { RANGES, type RangeKey } from "@/lib/series";

export function RangeSwitch({
  value,
  onChange,
}: {
  value: RangeKey;
  onChange: (r: RangeKey) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
      {RANGES.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => onChange(r.key)}
          className={`rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
            value === r.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          {r.key}
        </button>
      ))}
    </div>
  );
}
