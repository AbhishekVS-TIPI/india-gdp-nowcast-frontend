import { NOWCAST, type ModelMember } from "@/lib/nowcast";

const pct2 = (v: number) => `${v.toFixed(2)}%`;
const share = (w: number) => `${Math.round(w * 100)}%`;

const FAMILY: Record<string, string> = {
  bridge: "Regression (ARX)",
  dfm: "Dynamic factor model",
};

/** "0.5 × 8.45 + 0.5 × 7.51 = 7.98", from the export's own numbers; null if any member has no nowcast. */
function combination(members: ModelMember[]): string | null {
  const headline = NOWCAST?.nowcast?.pointEstimate;
  if (headline == null || !members.length || members.some((m) => m.nowcast == null)) return null;
  return `${members.map((m) => `${m.weight} × ${m.nowcast!.toFixed(2)}`).join(" + ")} = ${headline.toFixed(2)}`;
}

/** How far apart the members are, in pp, when there are exactly two. */
function memberSpread(members: ModelMember[]): number | null {
  const v = members.map((m) => m.nowcast).filter((x): x is number => x != null);
  return v.length === 2 ? Math.abs(v[0]! - v[1]!) : null;
}

/** The models averaged into the headline: what each reads, what each says, and how they combine. */
export function MemberCards() {
  const members = NOWCAST?.model.members ?? [];
  if (!members.length) return null;
  const formula = combination(members);
  const spread = memberSpread(members);
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {members.map((m) => (
          <div key={m.id} className="rounded-xl border border-border p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-navy">{m.name}</p>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                weight {share(m.weight)}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {FAMILY[m.family] ?? m.family}
              {m.nFactors != null ? ` · ${m.nFactors} factors` : ""}
            </p>
            <p className="mt-3 font-mono text-2xl font-semibold text-navy">
              {m.nowcast != null ? pct2(m.nowcast) : "—"}
              <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                its own estimate
              </span>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-blue-dark">{m.description}</p>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              {m.indicators.length} indicators
              {m.rSquared != null ? ` · R² ${m.rSquared.toFixed(2)}` : ""}
              {m.cvRSquared != null ? ` · cross-validated ${m.cvRSquared.toFixed(2)}` : ""}
            </p>
            <details className="mt-2 text-xs text-blue-dark">
              <summary className="cursor-pointer text-navy">Indicators it reads</summary>
              <ul className="mt-2 list-disc space-y-0.5 pl-4">
                {m.indicators.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </details>
          </div>
        ))}
      </div>
      {formula ? (
        <p className="mt-4 text-sm leading-relaxed text-navy">
          The headline is their weighted average: <span className="font-mono">{formula}</span>
          {spread != null
            ? `. The two models are ${spread.toFixed(1)} pp apart, and the headline sits between them`
            : ""}
          .
        </p>
      ) : null}
    </div>
  );
}
