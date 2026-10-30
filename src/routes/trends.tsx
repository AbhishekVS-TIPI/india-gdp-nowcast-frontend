import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/Card";
import { CollapsibleCard } from "@/components/CollapsibleCard";
import { Breadth } from "@/components/evidence/Breadth";
import { EstimateHistory } from "@/components/evidence/EstimateHistory";
import { Heatmap } from "@/components/evidence/Heatmap";
import { Probabilities } from "@/components/evidence/Probabilities";
import { SignalMovers } from "@/components/evidence/SignalMovers";
import { EvaluationTable, TrackRecordTable } from "@/components/evidence/TrackRecord";
import { NowcastVsActualChart } from "@/components/NowcastCharts";
import { FrozenNote } from "@/components/FrozenNote";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { NOWCAST, ciFor, stressRange } from "@/lib/nowcast";

export const Route = createFileRoute("/trends")({
  head: () => ({
    meta: [
      { title: "The Evidence | India GDP Pulse" },
      {
        name: "description",
        content:
          "Check the India GDP Pulse estimate: how earlier estimates compared with official figures, how this quarter's estimate has moved week by week, and what the indicators are doing.",
      },
      { property: "og:title", content: "The Evidence | India GDP Pulse" },
      {
        property: "og:description",
        content:
          "Track record, weekly estimate history, probabilities and indicator readings behind India's GDP nowcast.",
      },
    ],
  }),
  component: EvidencePage,
});

function EvidencePage() {
  const headline = NOWCAST?.nowcast ?? null;
  const model = NOWCAST?.model ?? null;
  const ci90 = ciFor(0.9);
  const stress = stressRange();

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      <div className="mx-auto max-w-[88rem] space-y-6 px-5 py-8">
        <FrozenNote />
        <Card>
          <p className="eyebrow">The evidence{headline ? ` · ${headline.label}` : ""}</p>
          {headline ? (
            <p className="mt-2 text-sm leading-relaxed text-navy">
              Our estimate is{" "}
              <span className="font-mono">{headline.pointEstimate.toFixed(1)}%</span>
              {ci90
                ? `, likely between ${ci90.lower.toFixed(1)}% and ${ci90.upper.toFixed(1)}%`
                : ", with no likely range yet"}
              {stress
                ? `. If a shock like 2020's came, the range would widen to ${stress.lower.toFixed(1)}% to ${stress.upper.toFixed(1)}%`
                : ""}
              . This page is for checking it: how earlier estimates compared with the official
              figures, how this quarter's estimate has moved, and what the indicators are doing.
            </p>
          ) : (
            <p className="mt-2 font-mono text-2xl font-semibold text-muted-foreground">
              Model in development
            </p>
          )}
          {model ? (
            <details className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
              <summary className="cursor-pointer font-mono uppercase tracking-wider">
                About the model
              </summary>
              <p className="mt-3">{model.description}</p>
              <ul className="mt-3 list-disc space-y-2 pl-4">
                {NOWCAST?.caveats.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </Card>

        {headline ? (
          <Card title="Track record">
            <NowcastVsActualChart />
            <details className="mt-6 rounded-lg border border-border/70 bg-muted/20 p-4">
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Quarter by quarter, and the tests
              </summary>
              <div className="mt-5">
                <TrackRecordTable />
              </div>
              {NOWCAST?.evaluation ? (
                <div className="mt-8 border-t border-border pt-6">
                  <EvaluationTable />
                </div>
              ) : null}
            </details>
          </Card>
        ) : null}

        <Card title="Estimate history">
          <EstimateHistory />
        </Card>

        <Card title="How likely is…">
          <Probabilities />
        </Card>

        <Card title="Breadth over time">
          <Breadth />
        </Card>

        <Card title="Movers · last three months">
          <SignalMovers />
        </Card>

        <CollapsibleCard
          title="Indicator heat map"
          summary="Every indicator, month by month, over the last two years."
        >
          <Heatmap />
        </CollapsibleCard>

        <Link
          to="/indicators"
          className="inline-block rounded-md bg-primary px-4 py-2 font-mono text-xs text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Browse all indicators →
        </Link>
      </div>
      <SiteFooter />
    </main>
  );
}
