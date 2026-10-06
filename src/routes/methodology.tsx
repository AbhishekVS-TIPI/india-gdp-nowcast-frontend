import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { NOWCAST } from "@/lib/nowcast";
import { UNITS, fmtDate, indicators, lastUpdated } from "@/lib/series";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology — India GDP Pulse" },
      {
        name: "description",
        content:
          "How India GDP Pulse builds its indicator panel: sourcing from MoSPI, RBI and the Labour Bureau, base-year splicing, manual corrections, and the current state of the nowcast model.",
      },
      { property: "og:title", content: "Methodology — India GDP Pulse" },
      {
        property: "og:description",
        content:
          "Sourcing, splicing, corrections and known limitations behind the India GDP Pulse indicator panel.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MethodologyPage,
});

function MethodologyPage() {
  const model = NOWCAST?.model ?? null;
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader subtitle="Model construction and sources" />

      <div className="hero-wash border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <p className="eyebrow">Research note</p>
          <h1 className="mt-3 max-w-2xl font-sans text-3xl font-semibold tracking-[-0.02em] text-navy sm:text-4xl">
            Methodology
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-blue-dark">
            India GDP Pulse tracks a panel of high-frequency indicators sourced directly from
            government releases, and combines them into a simple, transparent nowcast of quarterly
            GDP growth with its own uncertainty shown alongside it.
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="space-y-8">
          <section>
            <p className="eyebrow">Sourcing</p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-navy">
              Government sources only
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              Every indicator is pulled from official releases — MoSPI's eSankhyiki portal, the
              RBI's Database on Indian Economy, and the Labour Bureau — with no synthetic or
              placeholder data mixed in. Each indicator's detail page and the source register
              alongside this page name the exact agency and, where relevant, the base year each
              reading is quoted against.
            </p>
          </section>

          <div className="hairline" />

          <section>
            <p className="eyebrow">Construction</p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-navy">
              Base-year splicing and corrections
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              Indicators such as IIP and CPI are re-based periodically by their publishing agency,
              so a single indicator's history is stitched together from several base-year series.
              Where two base periods overlap, the overlap is used to compute a linking ratio and
              splice the segments onto the current base; where an official linking factor is
              published instead, that factor is used. A base segment that neither overlaps the next
              one nor has a declared linking factor is not spliced in — it is left out of the
              indicator's chart rather than shown at a misleading, non-comparable scale. Gaps and
              known errors in a source file are tracked in a manual corrections ledger, each entry
              recording what was changed and why; the ledger is used to fill or fix specific values,
              never to override a source wholesale.
            </p>
          </section>

          <div className="hairline" />

          <section>
            <p className="eyebrow">Interpretation</p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-navy">
              Reading the movers and the heat map
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              The Trends and Indicators pages show how far each indicator's level has moved over the
              selected window (1M to MAX), coloured green for a rise and red for a fall. Series with
              no readings in the window, and series that cross zero (balances and net flows, where a
              percentage change is not meaningful), are left out of the rankings.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              These movements describe each indicator on its own. They are not the nowcast model's
              weights or contributions; the headline estimate comes only from the quarterly model
              described below.
            </p>
          </section>

          <div className="hairline" />

          <section>
            <p className="eyebrow">Nowcast model</p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-navy">
              A dynamic factor model (demo)
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              Many indicators move together because they respond to the same underlying state of the
              economy. A dynamic factor model extracts that shared movement. Each of the{" "}
              {model?.panelSeries ?? "monthly"} monthly-or-faster indicators is transformed as the
              pipeline's configuration declares (mostly year-on-year growth), and{" "}
              {model?.nFactors ?? "a few"} common factor{model?.nFactors === 1 ? " is" : "s are"}{" "}
              estimated from them with the expectation–maximisation algorithm and a Kalman filter,
              which copes with indicators that start at different dates and with the ragged edge of
              releases at the end of the sample. The factors are averaged to quarters, and GDP's
              year-on-year growth is regressed on them by ordinary least squares. The current
              quarter's factor values give the point estimate, a prediction interval and a
              probability density.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              This is the standard two-step form of the approach used by the New York Fed's Staff
              Nowcast and the ECB. It is published as a demo from the project's model lab, not yet a
              settled production choice. The fit statistics in the model notes are in-sample, with a
              cross-validated R² alongside. The training sample runs from{" "}
              {model ? model.trainingStart.slice(0, 4) : "2005"} and includes the 2020–2021 COVID
              collapse and rebound, with no adjustment. The intervals assume normally distributed
              errors and ignore the uncertainty in estimating the factors themselves, so they are
              somewhat too narrow.
            </p>
          </section>

          <div className="hairline" />

          <section>
            <p className="eyebrow">Limitations</p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-navy">
              What this is not
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              This is not an official GDP statistic, and the nowcast is a simple statistical
              estimate, not a forecast from a full macroeconomic model. Series with different
              release lags and revision schedules are shown as published, without adjustment; a
              reading close to an indicator's publication date may still be provisional. Where a
              base segment was dropped for lack of a comparable link, that indicator's chart starts
              later than its full published history. The nowcast's confidence interval can be wide,
              especially early in a quarter when only the fastest-reporting indicators have anything
              to say yet — that width is the model being honest about how little it currently knows,
              not a defect.
            </p>
          </section>
        </article>

        <aside>
          <p className="eyebrow">Source register</p>
          <div className="mt-3 divide-y divide-border border-y border-border">
            {indicators.map((ind) => {
              const lu = lastUpdated(ind.id);
              return (
                <div key={ind.id} className="py-4">
                  <p className="text-sm font-medium leading-snug text-navy">{ind.name}</p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-blue-dark/80">
                    {ind.sourceName ?? "Source pending"}
                  </p>
                  <p className="tabular mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {ind.frequency}
                    {UNITS[ind.id] ? ` · ${UNITS[ind.id]}` : ""} · {lu ? fmtDate(lu) : "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      <SiteFooter />
    </main>
  );
}
