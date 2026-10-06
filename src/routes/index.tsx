import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/Card";
import { ComingUp } from "@/components/briefing/ComingUp";
import { GdpBarsChart } from "@/components/briefing/GdpBarsChart";
import { SectorTiles } from "@/components/briefing/SectorTiles";
import { Waterfall } from "@/components/briefing/Waterfall";
import { FrozenNote } from "@/components/FrozenNote";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SECTOR_CONTRIBUTIONS } from "@/lib/attribution";
import { NOWCAST, ciFor, isTooEarly, lastReleasedGdp, trackSummary } from "@/lib/nowcast";
import { TODAY, fmtDate, indicators } from "@/lib/series";
import { BREADTH, fmtMonth } from "@/lib/signals";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "India GDP Pulse — Where Is Growth Right Now?" },
      {
        name: "description",
        content:
          "A two-minute briefing on India's GDP growth this quarter: an early estimate from high-frequency data, how sure we are, what is driving it and what comes next.",
      },
      { property: "og:title", content: "India GDP Pulse — Where Is Growth Right Now?" },
      {
        property: "og:description",
        content:
          "An early, experimental estimate of India's GDP growth this quarter, with its likely range, drivers and track record.",
      },
    ],
  }),
  component: Briefing,
});

const pct1 = (v: number) => `${v.toFixed(1)}%`;
const signedPp = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)} pp`;
const isoDate = (iso: string) => fmtDate(Date.parse(`${iso}T00:00:00Z`));

function threeThings(): { title: string; text: string }[] {
  const n = NOWCAST?.nowcast;
  const d = NOWCAST?.decomposition;
  const last = lastReleasedGdp();
  const out: { title: string; text: string }[] = [];

  if (n && last?.actual != null) {
    const diff = n.pointEstimate - last.actual;
    const word = diff < -0.5 ? "easing" : diff > 0.5 ? "picking up" : "holding steady";
    let text = `The central estimate of about ${pct1(n.pointEstimate)} compares with ${pct1(last.actual)} officially recorded for ${last.label}, so growth looks to be ${word}.`;
    const v = (NOWCAST?.vintages ?? []).filter((x) => x.estimate != null);
    if (v.length >= 2) {
      text += ` The estimate has moved from ${pct1(v[0]!.estimate!)} on ${isoDate(v[0]!.asOf)} to ${pct1(v[v.length - 1]!.estimate!)} as new data arrived.`;
    }
    out.push({ title: "Momentum", text });
  }

  const now = BREADTH[BREADTH.length - 1];
  const before = BREADTH[BREADTH.length - 4];
  if (now) {
    const share = Math.round(now.share * 100);
    let text = `${share}% of growth indicators pointed to stronger-than-usual growth in ${fmtMonth(now.month)}`;
    if (before) {
      const prev = Math.round(before.share * 100);
      text +=
        share === prev
          ? ", the same as three months earlier."
          : `, ${share > prev ? "up" : "down"} from ${prev}% three months earlier.`;
    } else {
      text += ".";
    }
    text +=
      share >= 60
        ? " Strength is broad-based."
        : share <= 40
          ? " Weakness is widespread."
          : " The picture is mixed.";
    out.push({ title: "Breadth", text });
  }

  if (d) {
    const reported = SECTOR_CONTRIBUTIONS.filter((s) => s.reported > 0);
    const best = [...reported].sort((a, b) => b.total - a.total)[0];
    const worst = [...reported].sort((a, b) => a.total - b.total)[0];
    const sentences: string[] = [];
    if (Math.abs(d.carriedForward) > Math.abs(d.reported)) {
      sentences.push(
        isTooEarly()
          ? `Most of the estimate still rests on momentum from earlier months (${signedPp(d.carriedForward)}), because little of this quarter's data is in.`
          : `Momentum carried from earlier months (${signedPp(d.carriedForward)}) outweighs what this quarter's reported data adds (${signedPp(d.reported)}).`,
      );
    }
    const plus =
      best && best.total > 0
        ? `${best.label.toLowerCase()} adds the most (${signedPp(best.total)})`
        : null;
    const minus =
      worst && worst.total < 0
        ? `${worst.label.toLowerCase()} subtracts the most (${signedPp(worst.total)})`
        : null;
    if (plus || minus) {
      sentences.push(`Of the data that is in, ${[plus, minus].filter(Boolean).join(" and ")}.`);
    }
    if (sentences.length) out.push({ title: "Drivers", text: sentences.join(" ") });
  }
  return out;
}

function Headline() {
  const n = NOWCAST?.nowcast;
  const ci90 = ciFor(0.9);
  const last = lastReleasedGdp();
  if (!n) {
    return (
      <p className="mt-2 font-mono text-2xl font-semibold text-muted-foreground">
        Model in development
      </p>
    );
  }
  const tooEarly = isTooEarly();
  const range = ci90 ? `likely between ${pct1(ci90.lower)} and ${pct1(ci90.upper)}` : null;
  const share = n.signalShare;
  return (
    <div>
      <p className="eyebrow">GDP growth · {n.label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
        {tooEarly ? "Too early to call" : `About ${pct1(n.pointEstimate)}`}
      </p>
      {range ? <p className="mt-1 font-mono text-base text-blue-dark">{range}</p> : null}
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-navy">
        {tooEarly
          ? `With little of this quarter's data in, growth in ${n.label} is ${range ?? "uncertain"}; the central estimate is about ${pct1(n.pointEstimate)}.`
          : `Growth in ${n.label} is provisionally estimated at about ${pct1(n.pointEstimate)}${range ? `, ${range}` : ""}.`}
        {last?.actual != null ? ` Official growth for ${last.label} was ${pct1(last.actual)}.` : ""}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] text-muted-foreground">
            Data in: {n.indicatorsReporting.length} of {n.indicatorsTotal} indicators
            {share != null ? `, about ${Math.round(share * 100)}% of the model's signal` : ""}
          </p>
          {share != null ? (
            <div
              className="mt-1.5 h-2 w-full rounded-full bg-muted"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(share * 100)}
              aria-label="Share of this quarter's data in"
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(share * 100, 2)}%` }}
              />
            </div>
          ) : null}
        </div>
        {n.nextOfficialRelease ? (
          <p className="text-[11px] text-muted-foreground sm:text-right">
            Next official GDP figure expected around{" "}
            <span className="font-medium text-navy">{isoDate(n.nextOfficialRelease)}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Briefing() {
  const things = threeThings();
  const track = trackSummary(8);

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader
        subtitle={
          NOWCAST?.frozenAsOf
            ? `${indicators.length} high-frequency indicators · estimate as of ${isoDate(NOWCAST.frozenAsOf)}`
            : `${indicators.length} high-frequency indicators · data to ${fmtDate(TODAY)}`
        }
      />

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        <FrozenNote />
        <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          <Card>
            <Headline />
            {NOWCAST?.nowcast ? (
              <div className="mt-6">
                <GdpBarsChart />
              </div>
            ) : null}
          </Card>

          <Card title="Three things to know">
            <ol className="space-y-5">
              {things.map((t, i) => (
                <li key={t.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs text-primary-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-navy">{t.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-blue-dark">{t.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link
              to="/trends"
              className="mt-6 inline-block rounded-md bg-primary px-4 py-2 font-mono text-xs text-primary-foreground transition-colors hover:bg-primary/90"
            >
              See the evidence →
            </Link>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          <Card title="What's moving the estimate">
            <Waterfall />
          </Card>
          <Card title="What's coming">
            <ComingUp />
          </Card>
        </div>

        <Card title="The economy by sector">
          <SectorTiles />
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            Each sector is judged on its latest readings against their own long-run normal. A
            reading counts as pointing to stronger growth when the model links it to faster GDP
            growth, so a rise in unemployment or market volatility counts as weaker.
          </p>
        </Card>

        <aside className="rounded-xl border border-border bg-muted/30 px-5 py-4 text-xs leading-relaxed text-blue-dark">
          <span className="font-semibold text-navy">
            Experimental estimate, not official statistics.
          </span>{" "}
          {track
            ? `Over the last ${track.quarters} quarters, our estimate made the day before each official release missed by ${track.modelMiss.toFixed(1)} pp on average; simply assuming growth stays at last quarter's rate missed by ${track.naiveMiss.toFixed(1)} pp.`
            : ""}{" "}
          <Link to="/methodology" className="underline underline-offset-2">
            How this works
          </Link>
        </aside>
      </div>
      <SiteFooter />
    </main>
  );
}
