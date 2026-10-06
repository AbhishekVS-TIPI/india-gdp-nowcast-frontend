import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/Card";
import { Breadth } from "@/components/evidence/Breadth";
import { Freshness } from "@/components/evidence/Freshness";
import { Heatmap } from "@/components/evidence/Heatmap";
import { Probabilities } from "@/components/evidence/Probabilities";
import { SignalMovers } from "@/components/evidence/SignalMovers";
import { TrackRecordTable } from "@/components/evidence/TrackRecord";
import { Vintages } from "@/components/evidence/Vintages";
import { NowcastVsActualChart } from "@/components/NowcastCharts";
import { FrozenNote } from "@/components/FrozenNote";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { NOWCAST, ciFor } from "@/lib/nowcast";
import { indicators } from "@/lib/series";

export const Route = createFileRoute("/trends")({
  head: () => ({
    meta: [
      { title: "The Evidence — India GDP Pulse" },
      {
        name: "description",
        content:
          "The evidence behind India GDP Pulse's growth estimate: track record, how the estimate moved this quarter, probabilities, an indicator heat map and data freshness.",
      },
      { property: "og:title", content: "The Evidence — India GDP Pulse" },
      {
        property: "og:description",
        content:
          "Track record, weekly estimates, probabilities and a 24-month indicator heat map for India's GDP nowcast.",
      },
    ],
  }),
  component: EvidencePage,
});

function EvidencePage() {
  const headline = NOWCAST?.nowcast ?? null;
  const model = NOWCAST?.model ?? null;
  const ci90 = ciFor(0.9);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader subtitle={`${indicators.length} high-frequency indicators`} />

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        <FrozenNote />
        <Card>
          <p className="eyebrow">The evidence{headline ? ` · ${headline.label}` : ""}</p>
          {headline ? (
            <p className="mt-2 text-sm leading-relaxed text-navy">
              Central estimate{" "}
              <span className="font-mono">{headline.pointEstimate.toFixed(2)}%</span>
              {ci90
                ? `, likely between ${ci90.lower.toFixed(1)}% and ${ci90.upper.toFixed(1)}%`
                : ""}
              . This page is for checking that estimate: how well the model has done, how the
              estimate moved as data arrived, and what the underlying indicators are doing.
            </p>
          ) : (
            <p className="mt-2 font-mono text-2xl font-semibold text-muted-foreground">
              Model in development
            </p>
          )}
          {model ? (
            <details className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
              <summary className="cursor-pointer font-mono uppercase tracking-wider">
                Model notes{model.name ? ` · ${model.name}` : ""} ({model.trainingQuarters} training
                quarters, R² {model.rSquared.toFixed(2)}
                {model.cvRSquared != null ? `, cross-validated ${model.cvRSquared.toFixed(2)}` : ""}
                )
              </summary>
              <p className="mt-3 normal-case">{model.description}</p>
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
            <div className="mt-6">
              <TrackRecordTable />
            </div>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="How the estimate moved this quarter">
            <Vintages />
          </Card>
          <Card title="How likely is…">
            <Probabilities />
          </Card>
        </div>

        <Card title="Indicator heat map · last 24 months">
          <Heatmap />
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <Card title="Breadth over time">
            <Breadth />
          </Card>
          <Card title="Movers · last three months">
            <SignalMovers />
          </Card>
        </div>

        <Card title="Data freshness" id="freshness">
          <Freshness />
        </Card>

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
