import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { fmtDate, type RangeKey } from "@/lib/series";
import {
  TONE_BG,
  TONE_TEXT,
  arrow,
  fmtValue,
  signals,
  type IndicatorSignal,
  type SignalTone,
} from "@/lib/signals";

const ZONES: { tone: SignalTone; label: string; note: string }[] = [
  { tone: "positive", label: "Positive", note: "Adding to the composite" },
  { tone: "neutral", label: "Neutral", note: "Little net movement" },
  { tone: "negative", label: "Negative", note: "Subtracting from the composite" },
];

function SignalRow({ s }: { s: IndicatorSignal }) {
  const [open, setOpen] = useState(false);
  return (
    <Link
      to="/indicator/$id"
      params={{ id: s.id }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      className="block border-b border-border/70 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-surface-pale"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-[13px] leading-snug text-navy">{s.name}</span>
        <span className={`tabular shrink-0 font-mono text-xs ${TONE_TEXT[s.tone]}`}>
          {arrow(s.changePct)} {Math.abs(s.changePct).toFixed(1)}%
        </span>
      </div>
      <div
        className={`grid overflow-hidden transition-all duration-300 ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">
          <p className="tabular pt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-blue-dark/80">
            Latest {fmtValue(s.latest, s.unit)}
            {s.unit && s.unit !== "per cent" && s.unit !== "per cent (y/y)"
              ? ` ${s.unit}`
              : ""}{" "}
            · Prev {fmtValue(s.previous, s.unit)} · {s.updated ? fmtDate(s.updated) : "—"}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function DriversPanel({ range }: { range: RangeKey }) {
  const all = useMemo(() => signals(range), [range]);

  return (
    <section id="drivers" className="scroll-mt-24">
      <p className="eyebrow">Key drivers</p>
      <h2 className="mt-2 text-xl font-semibold tracking-[-0.01em] text-navy">
        What is driving the nowcast?
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm text-blue-dark">
        Every indicator in the composite, grouped by the direction of its move over the selected
        window. Hover a row for its latest reading.
      </p>

      <div className="mt-5 grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
        {ZONES.map((z) => {
          const items = all
            .filter((s) => s.tone === z.tone)
            .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
          return (
            <div key={z.tone} className="bg-card">
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                <span className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${TONE_BG[z.tone]}`} />
                  <span className="eyebrow">{z.label}</span>
                </span>
                <span className="tabular font-mono text-[11px] text-muted-foreground">
                  {items.length}
                </span>
              </div>
              {items.length ? (
                items.map((s) => <SignalRow key={s.id} s={s} />)
              ) : (
                <p className="px-3 py-4 text-[12px] text-muted-foreground">{z.note}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
