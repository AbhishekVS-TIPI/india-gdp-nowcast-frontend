import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CoverageMap, GapsList } from "@/components/model/Coverage";
import { MemberCards } from "@/components/model/Members";
import { COVERAGE_SECTIONS, UNREAD_SECTIONS, directionNote } from "@/lib/coverage";
import { benchmarkName, whenBefore } from "@/lib/evaluation";
import { DRIVERS, MODEL_DRIVERS, NOWCAST, TOO_EARLY_SIGNAL_SHARE } from "@/lib/nowcast";
import { UNITS, fmtDate, indicators, lastUpdated } from "@/lib/series";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology | India GDP Pulse" },
      {
        name: "description",
        content:
          "How India GDP Pulse builds its indicator panel and nowcast: sourcing, base-year splicing, corrections, the dynamic factor model, and how the briefing explains and checks the estimate.",
      },
      { property: "og:title", content: "Methodology | India GDP Pulse" },
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

const list = (xs: string[]) =>
  xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

function MethodologyPage() {
  const model = NOWCAST?.model ?? null;
  const monitoredOnly = DRIVERS.length > MODEL_DRIVERS.length;
  const direction = directionNote();
  const bench = benchmarkName(NOWCAST?.evaluation);
  const horizons = Object.keys(NOWCAST?.evaluation?.horizons ?? {})
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => b - a);
  const trackDays = NOWCAST?.trackRecord?.at(-1)?.daysBeforeRelease ?? null;
  const covered = COVERAGE_SECTIONS.filter((s) => s.indicators.some((i) => i.role === "core")).map(
    (s) => s.section,
  );
  const members = model?.members ?? [];
  const regression = members.find((m) => m.family === "bridge");
  const factors = members.find((m) => m.family === "dfm");
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      <div className="hero-wash border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <p className="eyebrow">How it works</p>
          <h1 className="mt-3 max-w-2xl font-sans text-3xl font-semibold tracking-[-0.02em] text-navy sm:text-4xl">
            Methodology
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-blue-dark">
            India GDP Pulse estimates GDP growth for the quarter in progress, before the official
            figure, from indicators that are published sooner. This page covers where the data comes
            from, how the estimate is built and how we check it.
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="space-y-8">
          <section>
            <p className="eyebrow">Data</p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-navy">
              Where it comes from
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              Most indicators come from Indian official sources: the RBI, MoSPI, the Office of the
              Economic Adviser (DPIIT), the Labour Bureau, the GST Council and others. A few global
              and market series come from FRED, Eurostat, the EIA, the IMF, S&amp;P Global and the
              NSE and BSE. Each indicator's page names its source and the base year its values are
              quoted against. The list on this page gives the source of every series.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              Gaps and known errors in a source file are recorded in a corrections ledger. Each
              entry says what was changed and why. The ledger fixes specific values. It never
              replaces a source.
            </p>
          </section>

          <div className="hairline" />

          <section>
            <p className="eyebrow">Data</p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-navy">Base years</h2>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              Agencies re-base series from time to time, IIP and CPI among them, so one indicator's
              history can come from several base years. Where two base years overlap, the overlap
              sets the link between them and the older segment is rescaled to the current base.
              Where the agency publishes its own linking factor, we use that. A segment that cannot
              be linked is left out of the chart, because on its own scale it would mislead.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              Year-on-year changes are worked out within one base year, so a re-basing never shows
              up as growth. They are growth for levels and percentage-point changes for rates.
              Balances that swing between surplus and deficit have none.
            </p>
          </section>

          <div className="hairline" />

          <section id="data-and-model" className="scroll-mt-20">
            <p className="eyebrow">The estimate</p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-navy">
              {model?.name ?? "The headline model"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              The estimate is the average of two models that read the indicators in different ways.
              {regression
                ? ` One is a regression on ${regression.indicators.length} activity indicators.`
                : ""}
              {factors
                ? ` The other pulls ${factors.nFactors ?? "a few"} common trends out of ${factors.indicators.length} indicators and links them to GDP growth.`
                : ""}{" "}
              They make partly different errors, and averaging them usually helps.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">{model?.description}</p>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              Both are trained on data from {model ? model.trainingStart.slice(0, 4) : "2005"}. The
              training sample includes the 2020 to 2021 COVID collapse and rebound, with no
              adjustment.
            </p>
            <div className="mt-5">
              <MemberCards />
            </div>
            <h3 className="mt-8 text-sm font-semibold text-navy">What is read, and what is not</h3>
            <div className="mt-3">
              <CoverageMap />
            </div>
            <h3 className="mt-8 text-sm font-semibold text-navy">What is missing</h3>
            <div className="mt-3">
              <GapsList />
            </div>
          </section>

          <div className="hairline" />

          <section>
            <p className="eyebrow">Reading the pages</p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-navy">
              How the numbers are read
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              <span className="font-medium text-navy">Relative to normal.</span> Each indicator's
              growth is compared with its own long-run average, in standard deviations. A reading
              points to stronger growth when a rise in that indicator has gone with faster GDP
              growth, so a rise in unemployment or market volatility counts as weaker. Prices are
              shown as background and never counted either way. Sector tiles use the median of their
              indicators' latest readings, including series the headline only monitors. Breadth is
              the share of growth indicators above normal in a month.
            </p>
            {direction ? (
              <p className="mt-2 text-sm leading-relaxed text-blue-dark">{direction}</p>
            ) : null}
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              <span className="font-medium text-navy">What moves the estimate.</span> Each indicator
              the models use has a weight: the percentage points of GDP growth that a move of one
              standard deviation in it is worth. Half comes from the regression and half from the
              factor model, because each counts for half of the headline. An indicator's
              contribution this quarter is its weight times its reading, for the indicators that
              have reported.
              {monitoredOnly
                ? " An indicator the headline only monitors has weight 0 and no contribution."
                : ""}{" "}
              Starting from long-run average growth, the contributions add up to the estimate, apart
              from one remainder: what the models carry forward from earlier months for data not yet
              in. That remainder is shown on its own and is not spread across indicators.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              <span className="font-medium text-navy">How sure we are.</span> The likely range is
              where earlier estimates, made{" "}
              {horizons.length ? `${list(horizons.map(String))} days` : "close to a release"} before
              each first print, landed around the true figure in ordinary conditions. The COVID
              quarters are left out of it. The tail-risk range keeps them in, so it allows for a
              miss as large as 2020's. A range can only be measured once a release is near, so none
              is shown before then. The pages say "too early to call" while there is no range, and
              while less than {Math.round(TOO_EARLY_SIGNAL_SHARE * 100)}% of the quarter's own
              information is in.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              <span className="font-medium text-navy">The track record.</span> It is a backtest.
              Each estimate was made {whenBefore(trackDays)} the first print, using only data
              released before it, but with today's revised values for the indicators. We score it
              against the first print and against the {bench} benchmark, which predicts each quarter
              from the one before. A result counts as better only if the whole range around its
              error ratio is below 1.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              A first print from before GDP was rebased in February 2026 is on an older price base.
              It can differ from the quarter's latest figure because of the rebasing as well as
              revision, and the track record marks those quarters. Every run is also saved when it
              is made, and scored once the first print is out. Those runs make up the live record.
            </p>
          </section>

          <div className="hairline" />

          <section>
            <p className="eyebrow">Limits</p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-navy">
              What this is not
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              This is not an official GDP statistic. It is an estimate from a small statistical
              model, not a forecast from a full macroeconomic model. Indicators are shown as
              published, with their own release lags and revision schedules, and a reading close to
              its publication date may be provisional. Release dates on the site are estimates based
              on each indicator's usual lag.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-blue-dark">
              The headline reads only part of the economy. Its indicators sit in these sections:{" "}
              {covered.join(", ")}.
              {UNREAD_SECTIONS.length ? ` It reads nothing in ${list(UNREAD_SECTIONS)}.` : ""} Where
              a base year was dropped for lack of a link, that indicator's chart starts later than
              its full published history.
            </p>
          </section>
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">Source register</p>
          <div
            tabIndex={0}
            role="region"
            aria-label="Source of every indicator"
            className="mt-3 max-h-[60vh] divide-y divide-border overflow-y-auto overscroll-contain border-y border-border pr-3 lg:max-h-[calc(100vh-11rem)]"
          >
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
