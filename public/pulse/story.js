/* India GDP Pulse story rules.
   The model reruns every week; people write on their own schedule. So every sentence on the landing
   page that carries a number is written here, from the latest run, by rule, and rewrites itself each week.
   The Stat team's note keeps its own date and is checked against the latest run automatically.
   Explainers in the page carry no live numbers at all. */
(() => {
"use strict";
const G = window.GDP;
const { D, SEC, VIS, NOTE, pct, pp, fix, day, h, el, set, scale, clamp, lerp, ease, seg, niceAxis } = G;
const N = D.now, DEC = D.dec, V = D.vint, A = D.A, T = D.track;
/* The record is worked out here from the track itself, so it cannot drift from the quarters it describes. */
const TS = (() => {
  const em = T.map((r) => r[1] - r[3]), en = T.map((r) => r[2] - r[3]), mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const run = (test) => { let k = 0; for (let i = em.length - 1; i >= 0 && test(em[i]); i--) k++; return k; };
  return { n: T.length, mae: mean(em.map(Math.abs)), naiveMae: mean(en.map(Math.abs)), below: run((e) => e < 0), above: run((e) => e > 0) };
})();
const LAST = A.length - 1;
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const QUARTER_START = ["April", "July", "October", "January"];
const qYear = (i) => 2005 + Math.floor(i / 4) + (i % 4 === 3 ? 1 : 0);
const qStart = (i) => `${QUARTER_START[i % 4]} ${qYear(i)}`;
const monthOnly = (ym) => MONTHS_LONG[Number(ym.slice(5)) - 1];
const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
const list = (xs) => (xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]);
/* Lower-case a series name mid-sentence, but leave proper names and acronyms alone. */
const lc = (name) => (/^([A-Z]{2}|S&P|Nifty|Sensex|Brent|Euro|Indian)/.test(name) ? name : name.charAt(0).toLowerCase() + name.slice(1));
const lcl = (label) => label.charAt(0).toLowerCase() + label.slice(1);
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const count = (n) => (n >= 0 && n <= 10 ? WORDS[n] : String(n));
const sentenceCase = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/* ---------- Facts every rule draws on ---------- */
const reported = DEC.baseline + DEC.reported;
const diffPrev = N.point - D.prev.v;
const carryBig = Math.abs(DEC.carriedForward) > Math.abs(DEC.reported);
const RUN = { start: LAST - 11, lo: Math.min(...A.slice(LAST - 11)), hi: Math.max(...A.slice(LAST - 11)) };
const inRun = N.point >= RUN.lo && N.point <= RUN.hi;
const toRelease = daysBetween(D.asOf, D.release);
/* Page state: the same rules decide which chapters show, so the page changes shape through the quarter. */
/* Before about 45 days out the headline has no evaluated range: the page says so and calls it too early, instead of drawing one. */
const RANGE = N.rangeAvailable !== false;
const STATE = N.share < 0.25 || !RANGE ? "early" : toRelease >= 0 && toRelease <= 7 ? "release-week" : "building";
const weekly = V.map((v, i) => (i ? v[1] - V[i - 1][1] : 0));
/* One definition each, used everywhere. A weekly change smaller than MOVE is not worth calling out, and a run of
   estimates that stays within MOVE counts as settled. It is a policy choice, so the Stat team can set it. */
const MOVE = 0.2;
const EST = V.map((v) => v[1]);
const span = (xs) => Math.max(...xs) - Math.min(...xs);
/* The earliest run from which the estimate stayed within MOVE, held for at least three runs; null if it has not settled. */
const SETTLED_FROM = (() => { for (let i = 0; i <= EST.length - 3; i++) if (span(EST.slice(i)) <= MOVE + 1e-9) return i; return null; })();
const growthIds = D.dots.map((d, i) => i).filter((i) => D.dots[i][0] !== D.sec.findIndex((s) => s.k === "prices"));
const BREADTH = D.zMonths.map((m, j) => {
  const vals = growthIds.map((i) => D.z[i][j]).map((z, n) => (z == null ? null : z * D.sg[growthIds[n]])).filter((z) => z != null);
  return { j, month: m, share: vals.filter((z) => z > 0).length / (vals.length || 1), covered: vals.length };
}).filter((b) => b.covered >= growthIds.length / 2);
/* One source for breadth: the readings themselves, so a sentence can never disagree with its own chart. Three months back may not exist yet. */
const shareNow = BREADTH.length ? Math.round(BREADTH[BREADTH.length - 1].share * 100) : null;
const sharePrev = BREADTH.length >= 4 ? Math.round(BREADTH[BREADTH.length - 4].share * 100) : null;
/* The heaviest monthly releases that landed in a given week; daily and weekly market series arrive every week, so they say nothing. */
const notable = (i) => V[i][4].filter((d) => D.freq[d] === "Monthly").sort((a, b) => D.dots[b][1] - D.dots[a][1]).slice(0, 2).map((d) => D.names[d]);
const growthSectors = D.sec.filter((s) => s.k !== "prices");
const breadthWord = (s) => (s >= 0.6 ? "Strength is broad-based." : s <= 0.4 ? "Weakness is widespread." : "The picture is mixed.");

/* ---------- Headline rules ---------- */
const R = {};
R.verdict = () => {
  if (STATE === "early") return `It is too early to call ${D.quarterLong}: little of the quarter's data is in yet.`;
  const pace = diffPrev < -0.5 ? "slower than" : diffPrev > 0.5 ? "faster than" : "close to";
  const lift = carryBig
    ? `momentum from earlier months is doing more of the ${DEC.carriedForward >= 0 ? "lifting" : "damage"} than new data`
    : `this quarter's data is ${DEC.reported >= 0 ? "adding to it" : "holding it back"}`;
  return `Growth looks ${pace} last quarter's ${pct(D.prev.v)}, and ${lift}.`;
};
R.three = () => {
  const pace = Math.abs(diffPrev) < 0.05 ? `About ${pct(N.point)}, unchanged from last quarter.` : `About ${pct(N.point)}, ${diffPrev < 0 ? "down" : "up"} from ${pct(D.prev.v)}.`;
  const run = `${inRun ? "Still inside" : N.point < RUN.lo ? "Below" : "Above"} the ${pct(RUN.lo)} to ${pct(RUN.hi)} range growth has held since ${qStart(RUN.start)}.`;
  const tone = reported < DEC.baseline - 0.3 ? "softer than normal" : reported > DEC.baseline + 0.3 ? "stronger than normal" : "close to normal";
  const evidence = `Published figures alone point to ${pct(reported)}, and ${shareNow}% of growth indicators were above normal in ${monthOnly(D.breadth.month)}.` + (carryBig ? " Momentum from earlier months makes up the rest." : "");
  const record = TS.below >= 3
    ? ["Our estimates have been running low.", `The official figure has come in above our estimate ${count(TS.below)} quarters running. If that pattern holds, the official number${STATE === "release-week" ? ` on ${day(D.release, false)}` : ""} could be higher than ${pct(N.point)}.`]
    : TS.naiveMae < TS.mae
      ? ["A simple rule has beaten us lately.", `Assuming growth stays at last quarter's rate missed by ${TS.naiveMae.toFixed(2)} pp on average, against ${TS.mae.toFixed(2)} pp for our model.`]
      : ["Our record is holding up.", `Over the last ${TS.n} quarters we missed by ${TS.mae.toFixed(2)} pp on average, better than a simple rule of thumb.`];
  return [[pace, run], [`The data in so far is ${tone}.`, evidence], record];
};
R.take = {
  ch1: () => {
    const step = diffPrev < -0.5 ? `A step down from ${pct(D.prev.v)}` : diffPrev > 0.5 ? `A step up from ${pct(D.prev.v)}` : `Close to last quarter's ${pct(D.prev.v)}`;
    if (inRun) return `${step}, but within the range growth has held since ${qStart(RUN.start)}. ${diffPrev < -0.5 ? "A slowdown, not a break." : diffPrev > 0.5 ? "Faster, but not out of the ordinary." : "Business as usual."}`;
    return `${step}, and ${N.point < RUN.lo ? "below" : "above"} the range growth has held since ${qStart(RUN.start)}. ${N.point < RUN.lo ? "A sharper slowdown than any recent quarter." : "Faster than any recent quarter."}`;
  },
  /* What's behind it: what the published data says, then which parts of the economy are doing it. One takeaway for one chapter. */
  drivers: () => {
    const reportedLine = `The data in so far points to ${pct(reported)}. ` + (carryBig
      ? `Momentum from earlier months ${DEC.carriedForward >= 0 ? "lifts" : "lowers"} the estimate to ${pct(N.point)}, so the headline still depends on figures to come.`
      : `This quarter's data is now the main driver of the estimate.`);
    const drags = growthSectors.filter((x) => x.c <= -0.05).sort((p, q) => p.c - q.c).slice(0, 3);
    const boosts = growthSectors.filter((x) => x.c >= 0.05).sort((p, q) => q.c - p.c).slice(0, 2);
    const heavy = growthSectors.slice().sort((p, q) => q.w - p.w)[0];
    const parts = [];
    if (drags.length) parts.push(`${list(drags.map((x, i) => (i ? lcl(x.label) : x.label)))} ${drags.length > 1 ? "are the biggest drags" : "is the biggest drag"} so far.`);
    if (boosts.length) parts.push(`${list(boosts.map((x) => x.label))} ${boosts.length > 1 ? "are" : "is"} adding to growth.`);
    if (heavy && Math.abs(heavy.c) < 0.05) parts.push(`${heavy.label}, the model's most heavily weighted sector, is flat.`);
    if (!parts.length) parts.push("No part of the economy is moving the estimate much so far.");
    return `${reportedLine} ${parts.join(" ")}`;
  },
  breadth: () => shareNow == null ? "" : `${shareNow}% of growth indicators are above normal${sharePrev == null ? "." : `, ${shareNow === sharePrev ? "the same as" : shareNow > sharePrev ? `up from ${sharePrev}%` : `down from ${sharePrev}%`} three months earlier.`} ${breadthWord(BREADTH[BREADTH.length - 1].share)}`,
  ch3: () => {
    const n = EST.length;
    if (n < 3) return `Only ${count(n)} weekly run${n === 1 ? "" : "s"} so far, so it is too early to say whether the estimate has settled.`;
    if (SETTLED_FROM == null) {
      const win = EST.slice(-5);
      return `Still moving: the estimate has shifted ${fix(span(win), 1)} pp over the past ${count(win.length - 1)} weeks, so expect more change before the official release.`;
    }
    const plateau = EST.slice(SETTLED_FROM), weeks = plateau.length - 1, before = EST.slice(0, SETTLED_FROM);
    const held = `The estimate has held between ${pct(Math.min(...plateau))} and ${pct(Math.max(...plateau))} ${SETTLED_FROM === 0 ? "since the first run of the quarter" : `for ${count(weeks)} weeks`}.`;
    return before.length && span(before) > MOVE ? `Early swings between ${pct(Math.min(...before))} and ${pct(Math.max(...before))} have settled. ${held}` : held;
  },
  ch4: () => (RANGE ? `Plan around the range, ${pct(N.lo90)} to ${pct(N.hi90)}, not the point.` : "There is no likely range yet, so treat the estimate as a first look, not a forecast to plan around.") +
    (TS.below >= 3 ? ` Our last ${count(TS.below)} misses were all on the low side, so an upside surprise would fit the pattern.` : TS.above >= 3 ? ` Our last ${count(TS.above)} misses were all on the high side, so a downside surprise would fit the pattern.` : ""),
  method: () => {
    const heavy = D.sec.slice().sort((a, b) => b.w - a.w)[0], total = D.sec.reduce((a, x) => a + x.w, 0);
    return `The headline reads ${D.model.read} of the ${D.dots.length} indicators we track, two models that look at them in different ways. ${heavy.label} carries ${Math.round((heavy.w / total) * 100)}% of the weight, so its data moves the estimate most; this quarter about ${Math.round(N.share * 100)}% of the signal is in.`;
  },
};

/* ---------- Scroll steps, chosen and written by rule ---------- */
const S = {};
S.history = () => {
  const known = A.filter((v) => v != null), frac = known.filter((v) => v >= 5 && v <= 10).length / known.length;
  return [
    { at: 0, k: "Since 2005", h: `${Math.abs(frac - 2 / 3) < 0.04 ? "Two quarters in three" : `${Math.round(frac * 100)}% of quarters`} land between 5% and 10%`, p: "With sharp breaks in the 2008–09 financial crisis and the 2020 lockdown." },
    { at: 3, k: `Since ${qStart(RUN.start)}`, h: `A run between ${pct(RUN.lo)} and ${pct(RUN.hi)}`, p: `The last official figure, for ${D.prev.labelLong} ${D.prev.label.slice(-4)}, was ${pct(D.prev.v)}.` },
    { at: 4, k: D.quarterLong, h: `About ${pct(N.point)}`, p: `${Math.abs(diffPrev) < 0.05 ? "Level with" : diffPrev < 0 ? "A step down from" : "A step up from"} ${pct(D.prev.v)}, ${inRun ? "inside" : "outside"} the recent run.${RANGE ? ` The whisker shows the likely range, ${pct(N.lo90)} to ${pct(N.hi90)}.` : " There is no likely range to show yet."}` },
  ];
};
S.buildup = () => {
  /* The same sector groups the chart uses, so a sector added or dropped in a later run stays in step. */
  const steps = [{ at: 0, k: "The starting point", h: `${pct(DEC.baseline)}: long-run average growth`, p: "What the model expects when every indicator is at its normal level." }];
  G.GROUPS.forEach((secs, g) => {
    const sum = secs.reduce((a, x) => a + x.c, 0);
    const big = secs.slice().sort((a, b) => Math.abs(b.c) - Math.abs(a.c))[0];
    let p = Math.abs(sum) < 0.05 ? "Little net effect. " : "";
    if (Math.abs(big.c) >= 0.05) p += `${big.label} ${big.c < 0 ? "takes off" : "adds"} ${fix(big.c, 2)} pp${big.top ? `; its biggest mover is ${lc(big.top)}` : ""}.`;
    if (g === G.GROUPS.length - 1) p += ` The data in so far adds up to ${pct(reported)}.`;
    steps.push({ at: g + 1, k: list(secs.map((x, i) => (i ? lcl(x.label) : x.label))), h: pp(sum, 2), p: p.trim() || "Little net effect." });
  });
  const G2 = G.GROUPS.length;
  const noMomentum = Math.abs(DEC.carriedForward) < 0.005;
  steps.push({ at: G2 + 1, k: "Momentum from earlier months", h: noMomentum ? "No effect" : pp(DEC.carriedForward, 2), p: noMomentum ? `The model's carry-forward for figures not yet in adds nothing this quarter, so the estimate is ${pct(N.point)}.` : `The model's carry-forward for figures not yet in, about ${100 - Math.round(N.share * 100)}% of the quarter's signal. It brings the estimate to ${pct(N.point)}.` });
  steps.push({ at: G2 + 2, k: "This quarter's estimate", h: `About ${pct(N.point)}`, p: `Long-run average ${pct(DEC.baseline)}, this quarter's data ${pp(DEC.reported)}${Math.abs(DEC.carriedForward) < 0.05 ? "" : `, momentum ${pp(DEC.carriedForward)}`}.` });
  return steps;
};
/* The criteria behind the breadth card, built from the data so the counts and examples never go stale. */
R.breadthNote = () => {
  const others = D.dots.length - growthIds.length;
  const flipped = growthIds.filter((i) => D.sg[i] < 0).sort((a, b) => D.dots[b][1] - D.dots[a][1]).slice(0, 2).map((i) => D.names[i]);
  return [
    ["Indicators included", `The ${growthIds.length} indicators in the model that measure growth.${others > 0 ? ` The other ${others} are price indicators. Prices describe inflation rather than how strongly the economy is growing, so they are left out.` : ""}`],
    ["Above normal", "An indicator is above normal when its growth is higher than its own long-run average. Each one is compared only with its own history, so a small series and a large one are treated alike."],
    flipped.length ? ["Direction of readings", `A few indicators point the other way: when they rise, growth has tended to fall, such as ${list(flipped.map(lc))}. Their readings are flipped, so green always means stronger growth.`] : null,
    ["Colours and shades", "Green is above normal and red is below. The deeper the colour, the further from normal. Grey means the indicator has not published for that month; it is left out of the percentage."],
    ["Months shown", "A month is shown once at least half of the growth indicators have published for it."],
  ].filter(Boolean);
};
S.breadth = () => BREADTH.map((b, i) => {
  const share = Math.round(b.share * 100), prev = i ? Math.round(BREADTH[i - 1].share * 100) : null;
  const p = i === 0 ? "Each square is one growth indicator: green when it is above its normal level, red when below."
    : i === BREADTH.length - 1 ? `${share === prev ? "Level with" : share > prev ? `Up from ${prev}% in` : `Down from ${prev}% in`} ${monthOnly(BREADTH[i - 1].month)}. ${breadthWord(b.share)}`
      : `${share === prev ? "Level with" : share > prev ? `Up from ${prev}% in` : `Down from ${prev}% in`} ${monthOnly(BREADTH[i - 1].month)}.`;
  return { at: i, k: `${monthOnly(b.month)} ${b.month.slice(0, 4)}`, h: `${share}% of growth indicators above normal`, p };
});
S.timelapse = () => {
  const n = V.length;
  /* A biggest rise or fall is only a stop if it was a real move, and the low point only if it is not part of the settled stretch. */
  let rise = null, fall = null;
  for (let i = 1; i < n; i++) { if (weekly[i] >= MOVE - 1e-9 && (rise == null || weekly[i] > weekly[rise])) rise = i; if (weekly[i] <= -MOVE + 1e-9 && (fall == null || weekly[i] < weekly[fall])) fall = i; }
  const lowAt = EST.indexOf(Math.min(...EST));
  const low = SETTLED_FROM != null && lowAt > SETTLED_FROM ? null : lowAt;
  const settled = SETTLED_FROM != null && SETTLED_FROM > 0 ? SETTLED_FROM : null;
  const stops = [...new Set([0, rise, fall, low, settled, n - 1].filter((x) => x != null))].sort((a, b) => a - b);
  const steady = (i) => i === SETTLED_FROM && i < n - 1;
  return stops.map((i) => {
    const d = day(V[i][0], false), e = pct(V[i][1]), names = notable(i);
    const during = names.length ? ` in the week ${list(names.map(lc))} came in` : "";
    const since = steady(i) ? ", and steady since" : "", barely = steady(i) ? " It has barely moved since." : "";
    if (i === 0) return { at: i, k: d, h: `First look: ${e}`, p: `Our first weekly estimate for ${D.quarterLong}.` };
    if (i === n - 1) return { at: i, k: d, h: `${e}, ${Math.abs(weekly[i]) < 0.05 ? "unchanged this week" : `${pp(weekly[i])} this week`}`, p: STATE === "release-week" ? `The official figure is expected around ${day(D.release, false)}.` : "The latest weekly run." };
    if (i === rise) return { at: i, k: d, h: `Up to ${e}${since}`, p: `The estimate ${weekly[i] >= 0.5 ? "jumps" : "rises"} ${fix(weekly[i], 1)} pp${during}.${barely}` };
    if (i === fall) return { at: i, k: d, h: `Down to ${e}${since}`, p: `A fall of ${fix(weekly[i], 1)} pp${during}.${i <= (n - 1) / 2 ? " Early in a quarter, single releases can swing the estimate a long way." : ""}${barely}` };
    if (i === low) return { at: i, k: d, h: `${e}, the low point${since}`, p: `The lowest weekly estimate this quarter${during ? "," + during : ""}.${barely}` };
    return { at: i, k: d, h: `${e}, and steady since`, p: `${Math.abs(weekly[i]) < 0.05 ? "No change that week" : `It moved ${pp(weekly[i])}${during}`}, and has barely moved since.` };
  });
};
S.noise = () => {
  const est = V.map((v) => v[1]), inside = est.every((e) => e >= N.lo90 && e <= N.hi90);
  return [
    { at: 0, k: "The headline", h: "One number hides a range", p: `About ${pct(N.point)} is our central estimate.` },
    { at: 1, k: "The range", h: `Likely between ${pct(N.lo90)} and ${pct(N.hi90)}`, p: `Nine times in ten. Two times in three it should land between ${pct(N.lo68)} and ${pct(N.hi68)}.` },
    { at: 2, k: "Simulated outcomes", h: "Twenty equally likely outcomes", p: `Each dot is one outcome simulated from the model's typical error of ${fix(N.se, 1)} pp.` },
    { at: 3, k: "This quarter", h: inside ? "Our weekly estimates stayed inside it" : "Some weekly estimates fell outside it", p: `They moved between ${pct(Math.min(...est))} and ${pct(Math.max(...est))}.` },
    ...(N.stress ? [{ at: 3, k: "If a shock came", h: `Allowing for a 2020-sized miss: ${pct(N.stress.lower)} to ${pct(N.stress.upper)}`, p: "The ranges above are for ordinary conditions. They are cut from our past misses with the pandemic quarters left out, so they do not allow for a shock like 2020's; this wider range does." }] : []),
  ];
};
S.record = () => {
  const below = T.filter((r) => r[1] < r[3]).length;
  return [
    { at: 0, k: `The last ${count(T.length)} quarters`, h: "The official figures", p: "Each dark dot is the official growth figure for one quarter." },
    { at: 1, k: "Our estimates", h: below === T.length ? `All ${count(T.length)} of our estimates came in below` : `${sentenceCase(count(below))} of ${count(T.length)} came in below`, p: `We made each one a week before the release, using only the data published by then. On average we missed by ${TS.mae.toFixed(2)} pp.` },
    { at: 1, k: "A simple benchmark", h: `Assuming growth stays at last quarter's rate missed by ${TS.naiveMae.toFixed(2)} pp`, p: TS.naiveMae < TS.mae ? "It has done better than our model over this period." : "Our model has done better than this rule of thumb." },
  ];
};
/* The note reconciled against the latest run: what moved since, and whether what it flagged has arrived. */
const noteIdx = V.filter((v) => v[0] <= NOTE.date).length - 1;   /* last run on or before the note; -1 = the note predates every run of this quarter */
const NF = (() => {
  const comparable = NOTE.sameQuarter && noteIdx >= 0, runsSince = comparable ? V.length - 1 - noteIdx : 0;
  const weeks = Math.floor(daysBetween(NOTE.date, D.asOf) / 7), moved = N.point - NOTE.estThen;
  return { comparable, runsSince, weeks, moved, stale: comparable && runsSince > 0 && (weeks >= 3 || Math.abs(moved) >= 0.3) };
})();
const WATCH = NOTE.watch.map((w) => {
  const id = D.names.indexOf(w.name);
  const r = id < 0 ? -1 : V.findIndex((v, i) => i > noteIdx && v[4].includes(id));
  return { ...w, gone: id < 0, r: r < 0 ? null : r };
});
S.since = () => {
  /* Only when the note is about the quarter now being estimated. A note about an earlier quarter has nothing to compare. */
  if (!NF.comparable) return [];
  const first = { at: 0, k: `Stat team note · ${day(NOTE.date)}`, h: `Written when the estimate was ${pct(NOTE.estThen)}`, p: "The Stat team writes on its own schedule, so every note keeps its date. Here is what has happened since." };
  if (NF.runsSince === 0) return [first, { at: 1, k: "Since then", h: "No new weekly run yet", p: `The latest run, ${day(V[V.length - 1][0], false)}, came before this note. The next run will show how the estimate has moved.` }];
  const moved = NF.moved;
  let big = noteIdx + 1;
  for (let i = noteIdx + 1; i < V.length; i++) if (Math.abs(weekly[i]) > Math.abs(weekly[big])) big = i;
  const names = notable(big), arrived = WATCH.filter((w) => w.r != null);
  const steps = [first,
    { at: 1, k: "Since then", h: Math.abs(moved) < 0.1 ? `Little changed, at ${pct(N.point)}` : `${moved > 0 ? "Up" : "Down"} ${fix(moved, 1)} pp to ${pct(N.point)}`, p: Math.abs(weekly[big]) < 0.05 ? "No weekly run has moved the estimate by a visible amount." : `The biggest weekly move, ${pp(weekly[big])}, came in the week to ${day(V[big][0], false)}${names.length ? `, when ${list(names.map(lc))} came in` : ""}.` }];
  if (WATCH.length) steps.push({ at: 2, k: "Releases it flagged", h: arrived.length === 0 ? "None of the releases it flagged are in" : arrived.length === WATCH.length ? `All ${count(WATCH.length)} releases it flagged are in` : `${sentenceCase(count(arrived.length))} of ${count(WATCH.length)} flagged releases ${arrived.length === 1 ? "is" : "are"} in`, p: WATCH.map((w) => `${w.label}: ${w.gone ? "no longer in the model" : w.r != null ? `in by ${day(V[w.r][0], false)}` : "not yet in our data"}.`).join(" ") });
  return steps;
};
/* A few named examples for the method chapter: the most heavily weighted indicator in each of the three heaviest sectors. */
const examples = () => D.sec.filter((x) => x.members && x.members.length).sort((a, b) => b.w - a.w).slice(0, 3).map((x) => D.names[x.members[0][0]]);
S.morph = () => {
  const heavy = D.sec.slice().sort((a, b) => b.w - a.w)[0], total = D.sec.reduce((a, s) => a + s.w, 0);
  return [
    { at: 0, k: "Step 1", h: `We follow ${D.dots.length} indicators`, p: `One dot each, such as ${list(examples().map(lc))}. The headline reads ${D.model.read} of them; the rest we keep watching.` },
    { at: 1, k: "Step 2", h: `Grouped into ${D.sec.length} parts of the economy`, p: `${list(D.sec.map((x, i) => (i ? lcl(x.label) : x.label)))}.` },
    { at: 2, k: "Step 3", h: "Some matter far more than others", p: `Dot size shows how much a typical move in each indicator shifts the estimate; a tiny dot is one we watch but the headline does not read. ${heavy.label} carries ${Math.round((heavy.w / total) * 100)}% of the total weight. Hover over a dot to see which indicator it is.` },
    { at: 3, k: "Step 4", h: "Two models, one estimate", p: `One finds ${D.model.factors} common trends that move many indicators together; the other leans on a few activity indicators. Their average is the headline: ${pct(N.point)} in the latest run.` },
  ];
};

/* ---------- What to watch: dates from the release calendar; reasons written once, the clause on this quarter by rule ---------- */
/* Where an indicator ranks by how much a typical move in it shifts the estimate (1 = heaviest); 0 if it is not in the model. */
const weightRank = (name) => { const i = D.names.indexOf(name); return i < 0 ? 0 : 1 + D.dots.filter((d) => d[1] > D.dots[i][1]).length; };
const WHY = {
  "Manufacturing output": [() => `Detail behind industrial production${weightRank("Industrial production") >= 1 && weightRank("Industrial production") <= 3 ? ", one of the model's most heavily weighted indicators" : ""}.`, "industry"],
  "GST collections": ["An early signal on household spending.", "households"],
  "Indian crude basket price": ["What India pays for oil, which feeds costs and the import bill.", null],
  "World commodity prices": ["Global prices for what India buys and sells.", null],
  "Non-oil imports": ["Demand for imported goods, a read on spending at home.", "trade"],
  "E-way bills": ["Goods moving around the country, a quick read on activity.", "industry"],
  "Central government receipts": ["Tax and other receipts, a read on activity and public finances.", "government"],
};
R.watch = () => {
  /* The calendar can lag the run, so anything already past is dropped rather than shown as upcoming. */
  const isGdp = (e) => /^Official GDP/.test(e[1][0][0]);
  const gdpEv = D.cal.find(isGdp);
  const items = [{ date: D.release, title: `Official GDP, ${D.quarterLong}`, why: toRelease >= 0
    ? `Scores this estimate: our ${pct(N.point)} against ${pct(D.prev.v)} if growth held at last quarter's rate.${STATE === "release-week" ? " After the release, the estimate moves on to the next quarter." : ""}`
    : `Due on ${day(D.release, false)} and not yet in our data. We will score our final estimate of ${pct(N.point)} against it.` }];
  D.cal.filter((e) => !isGdp(e) && e[0] >= D.asOf).slice(0, 5).forEach(([date, evs]) => {
    const names = evs.map((x) => x[0]);
    const shown = names.map((n, k) => (k ? lc(n) : n));
    const title = `${names.length > 2 ? `${shown.slice(0, 2).join(", ")} and ${names.length - 2} more` : shown.join(" and ")}, ${evs[0][1]}`;
    const [why0, k] = WHY[names[0]] || ["Feeds the next weekly update.", null];
    const why = typeof why0 === "function" ? why0() : why0;
    const sc = k ? SEC[k] : null;
    const clause = sc && Math.abs(sc.c) >= 0.05 ? ` ${sc.label} has been ${sc.c < 0 ? "a drag" : "adding to growth"} this quarter.` : "";
    items.push({ date, title, why: why + clause });
  });
  return items;
};

/* ---------- Two new scenes ---------- */
/* Breadth, month by month: one square per growth indicator, coloured by its reading that month. */
VIS.breadth = {
  n: Math.max(1, BREADTH.length),
  build(c) {
    const g = c.svg, W = c.W, H = c.H, n = growthIds.length;
    c.n = Math.max(1, BREADTH.length);
    c.month = el("text", { x: 4, y: 28, class: "head" }, g);
    c.share = el("text", { x: W - 4, y: 28, class: "head", "text-anchor": "end" }, g);
    el("text", { x: 4, y: 48 }, g, "one square per growth indicator");
    const cols = W < 520 ? 10 : 15, gap = 4, top = 62;
    const size = Math.min(34, (W - 8 - gap * (cols - 1)) / cols, (H - top - 120) / Math.ceil(n / cols) - gap);
    const tp = G.tipper(c);
    c.cells = growthIds.map((id, r) => {
      const cell = el("rect", { x: 4 + (r % cols) * (size + gap), y: top + Math.floor(r / cols) * (size + gap), width: size, height: size, rx: 3, class: "hz-na" }, g);
      /* Hover (or tap) a square to see which indicator it is and how it reads in the month shown. */
      tp.bind(cell, (tip) => {
        const b = BREADTH[clamp(Math.round(c.pos), 0, BREADTH.length - 1)], z = D.z[id][b.j], when = `${MONTHS_LONG[Number(b.month.slice(5)) - 1]} ${b.month.slice(0, 4)}`;
        const s = z == null ? null : z * D.sg[id];
        tip.append(h("b", { text: D.names[id] }), h("span", { text: D.sec[D.dots[id][0]].label }));
        if (D.sg[id] < 0) tip.append(h("span", { text: "A rise here has gone with weaker growth, so its reading is flipped" }));
        tip.append(h("span", { class: "dz-sep", text: s == null ? `${when}: not yet published` : `${when}: ${s > 0 ? "above" : "not above"} normal. ${Math.abs(s) < 0.05 ? "Right at its own long-run average" : `${Math.abs(s).toFixed(1)} standard deviations ${s > 0 ? "above" : "below"} its own long-run average`}` }));
      });
      return cell;
    });
    const by = top + Math.ceil(n / cols) * (size + gap) + 26, bh = H - by - 24;
    const bw = Math.min(70, (W - 8) / Math.max(1, BREADTH.length) - 10), mx = Math.max(0.01, ...BREADTH.map((b) => b.share));   /* bars are scaled to the tallest month, so they read as a comparison */
    c.bars = BREADTH.map((b, i) => {
      const x = 4 + i * (bw + 10), hgt = bh * (b.share / mx);
      const r = el("rect", { x, y: by + bh - hgt, width: bw, height: hgt, rx: 3, class: "sbar" }, g);
      el("text", { x: x + bw / 2, y: H - 6, "text-anchor": "middle" }, g, MONTHS_LONG[Number(b.month.slice(5)) - 1].slice(0, 3));
      el("text", { x: x + bw / 2, y: by + bh - hgt - 6, "text-anchor": "middle", class: "val" }, g, Math.round(b.share * 100) + "%");
      return r;
    });
    el("line", { x1: 4, x2: 4 + BREADTH.length * (bw + 10) - 10, y1: by + bh, y2: by + bh, class: "axis" }, g);
  },
  render(c, pos) {
    const i = clamp(Math.round(pos), 0, BREADTH.length - 1), b = BREADTH[i];
    if (!b) return;
    c.cells.forEach((cell, r) => {
      const id = growthIds[r], z = D.z[id][b.j];
      if (z == null) { set(cell, { class: "hz-na", opacity: 1 }); return; }
      const s = z * D.sg[id];
      set(cell, { class: s > 0 ? "hz-pos" : "hz-neg", opacity: (0.2 + 0.8 * Math.min(1, Math.abs(s) / 1.5)).toFixed(2) });
    });
    c.bars.forEach((r, k) => r.setAttribute("class", k === i ? "sbar sel" : "sbar"));
    c.month.textContent = `${MONTHS_LONG[Number(b.month.slice(5)) - 1]} ${b.month.slice(0, 4)}`;
    c.share.textContent = `${Math.round(b.share * 100)}% above normal`;
  },
};
/* ---------- The stat card: the estimate as a few easy numbers; the ranges live in the chart's hover ---------- */
/* Differences between figures shown to one decimal are taken from the figures as shown, so readers can check them. */
const r1 = (v) => Math.sign(v) * Math.round((Math.abs(v) + 1e-9) * 10) / 10;
const ncdf = (z) => {
  const t = 1 / (1 + (0.3275911 * Math.abs(z)) / Math.SQRT2);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
};
const rangeText = N.rangeAvailable === false ? ["No likely range yet"] : [`Nine times in ten: ${pct(N.lo90)} to ${pct(N.hi90)}`, `Two times in three: ${pct(N.lo68)} to ${pct(N.hi68)}`];
/* The likely range as two plain bars: nine times in ten, and two times in three, with the estimate and last quarter marked. */
const massAbove = (t) => { const p = N.pdf || []; let all = 0, up = 0; for (let i = 1; i < p.length; i++) { const w = (p[i][1] + p[i - 1][1]) / 2 * (p[i][0] - p[i - 1][0]); all += w; const mid = (p[i][0] + p[i - 1][0]) / 2; if (mid > t) up += w; } return all > 0 ? up / all : null; };
const CHANCE_ABOVE_PREV = Math.round((massAbove(D.prev.v) ?? 1 - ncdf((D.prev.v - N.point) / N.se)) * 100);
VIS.ci = {
  n: 1,
  build(c) {
    const g = c.svg, W = c.W, H = c.H, mL = 18, mR = 18;   /* room for half an axis label at either end */
    const ax = niceAxis([N.lo90, N.hi90, N.point, D.prev.v], 0.3, [0, 12], 7);
    const X = scale(ax.lo, ax.hi, mL, W - mR), ay = H - 34;
    ax.ticks.forEach((v) => {
      el("line", { x1: X(v), x2: X(v), y1: 34, y2: ay, class: "dz-grid" }, g);
      el("text", { x: clamp(X(v), 17, W - 17), y: ay + 20, "text-anchor": "middle", class: "dz-tick" }, g, G.tickLabel(v));
    });
    el("line", { x1: X(ax.lo), x2: X(ax.hi), y1: ay, y2: ay, class: "dz-axis" }, g);
    const bars = RANGE ? [[52, N.lo90, N.hi90, "Nine times in ten", "ci-90"], [112, N.lo68, N.hi68, "Two times in three", "ci-68"]] : [];
    bars.forEach(([y, lo, hi, , cls]) => el("rect", { x: X(lo), y, width: Math.max(2, X(hi) - X(lo)), height: 24, rx: 6, class: cls }, g));
    el("line", { x1: X(N.point), x2: X(N.point), y1: 28, y2: ay, class: "dz-point" }, g);
    /* the captions are drawn after the estimate line so that their halo keeps the line from running through the words */
    bars.forEach(([y, lo, hi, cap]) => {
      const text = `${cap} · ${pct(lo)} to ${pct(hi)}`, w = text.length * 7.2;
      el("text", { x: clamp(X(lo), mL, Math.max(mL, W - mR - w)), y: y - 9, class: "ci-cap" }, g, text);
    });
    el("text", { x: clamp(X(N.point), 24, W - 24), y: 18, "text-anchor": "middle", class: "ci-est" }, g, pct(N.point));
    if (!RANGE) el("text", { x: W / 2, y: 98, "text-anchor": "middle", class: "ci-cap" }, g, "No likely range yet");
    /* last quarter's official figure, as a marker on the axis */
    const px = X(D.prev.v), left = px < W / 2, lab = `Last quarter ${pct(D.prev.v)}`;
    el("path", { d: `M${px},${ay - 6}l6,6l-6,6l-6,-6z`, class: "ci-prev" }, g);
    el("text", { x: left ? px + 11 : px - 11, y: ay - 9, "text-anchor": left ? "start" : "end", class: "ci-prevlbl" }, g, lab);
    const tp = G.tipper(c);
    const hit = el("rect", { x: 0, y: 0, width: W, height: H, fill: "transparent", tabindex: 0, role: "img", "aria-label": `Likely range for growth. ${rangeText.join(". ")}. Chance it comes in above last quarter's ${pct(D.prev.v)}: ${CHANCE_ABOVE_PREV} per cent.`, class: "dz-hit" }, g);
    const fill = (tip) => !RANGE ? tip.append(h("b", { text: "No likely range yet" }), h("span", { text: N.rangeNote || "A likely range is given once the headline has been tested at this distance from a release." })) : tip.append(h("b", { text: "How to read this" }),
      h("span", { text: `Nine times in ten the official figure should land between ${pct(N.lo90)} and ${pct(N.hi90)}.` }),
      h("span", { text: `Two times in three, between ${pct(N.lo68)} and ${pct(N.hi68)}. These are for ordinary conditions.` }),
      h("span", { class: "dz-sep", text: `Chance it comes in above last quarter's ${pct(D.prev.v)}: ${CHANCE_ABOVE_PREV}%` }));
    const b = tp.bind(hit, fill, { hot: false });
    hit.addEventListener("focus", () => tp.open(X(N.point) - 80, 40, fill));
    hit.addEventListener("blur", b.hide);
  },
  render() {},
};
function renderStatCard(host) {
  const tiles = [
    [pct(D.prev.v), `Last official figure · ${D.prev.label}`, ""],
    [r1(N.point) === r1(D.prev.v) ? "No change" : pp(r1(N.point) - r1(D.prev.v), 1), "Change from last quarter", r1(N.point) < r1(D.prev.v) ? "down" : r1(N.point) > r1(D.prev.v) ? "up" : ""],
    [`${Math.round(N.share * 100)}%`, `Of the signal in · ${N.reporting} of ${N.total} indicators`, ""],
    [V.length < 2 ? "First run" : Math.abs(weekly[weekly.length - 1]) < 0.05 ? "No change" : pp(weekly[weekly.length - 1], 1), V.length < 2 ? "Of this quarter" : "Since last week", ""],
    [day(D.release, false), toRelease < 0 ? "Official figure was due" : "Official figure due", ""],
  ];
  const fig = h("div", { class: "fig", style: "height:200px" });
  host.append(h("div", { class: "wrap" }, h("div", { class: "statcard" },
    prov("auto"),
    h("div", { class: "sc-top" },
      h("div", { class: "sc-main" },
        h("p", { class: "eyebrow", text: "India's GDP growth · early estimate" }),
        h("h1", { class: "sc-quarter", text: D.quarterLong }),
        h("p", { class: "sc-big" }, (r1(N.point) < 0 ? "−" : "") + fix(N.point, 1), h("small", { text: "%" })),
        STATE === "early" ? h("p", { class: "sc-flag", text: RANGE ? `Too early to call: only ${Math.round(N.share * 100)}% of the signal is in` : `Too early to call. ${N.rangeNote || "No likely range has been evaluated at this distance from the release."}` }) : null),
      h("div", { class: "sc-chart" }, fig, h("p", { class: "sc-hint", text: "Hover or tap the bars to see what they mean" }))),
    h("ul", { class: "sc-tiles" }, tiles.map(([v, l, cls]) => h("li", null, h("b", { class: cls, text: v }), h("span", { text: l })))))));
  G.figure(fig, "ci");
}

/* ---------- The Stat team's notes, newest first, each checked against what happened next ---------- */
const QLONG = { "Jan-Mar": "January to March", "Apr-Jun": "April to June", "Jul-Sep": "July to September", "Oct-Dec": "October to December" };
const longLabel = (label) => `${QLONG[label.slice(0, 7)]} ${label.slice(-4)}`;
/* Past notes: the last few quarters, minus the quarter the latest note already covers. */
const ARCHIVE = [].concat(T).slice(0, 0).map((r, i) => ({ label: r[0], est: r[1], official: r[3], date: D.trackDates[i] })).filter((a) => a.label !== String(NOTE.quarter).replace(/\u2013/g, "-")).reverse().slice(0, 4);
function renderNotes(host) {
  const more = h("div", { class: "nc-more", hidden: "" }, NOTE.more.map((t) => h("p", { text: t })));
  const btn = h("button", { class: "btn ghost", type: "button", "aria-expanded": "false", text: "Read the full note" });
  btn.addEventListener("click", () => { const open = more.hidden; more.hidden = !open; btn.setAttribute("aria-expanded", String(open)); btn.textContent = open ? "Show less" : "Read the full note"; });
  const lastRun = V[V.length - 1][0];
  const since = !NOTE.title ? null : NF.comparable
    ? (NF.runsSince === 0
      ? h("p", { class: "nc-since", text: `Written after the latest model run (${day(lastRun, false)}), so the estimate above does not yet reflect it.` })
      : h("p", { class: "nc-since" }, `Written when our estimate was ${pct(NOTE.estThen)}. `, h("b", { text: `It is now ${pct(N.point)}.` })))
    : h("p", { class: "nc-since", text: `About ${longLabel(NOTE.quarter)}, the quarter before the one now being estimated (${D.quarterLong}).` });
  const latest = !NOTE.title ? null : h("article", { class: "note-card latest" },
    h("p", { class: "eyebrow", text: `Latest · ${day(NOTE.date)} · ${longLabel(NOTE.quarter)}` }),
    h("h3", { text: NOTE.title }),
    NOTE.teaser.map((t) => h("p", { text: t })),
    more,
    since,
    NF.stale ? h("p", { class: "stale", text: `Written ${NF.weeks} week${NF.weeks === 1 ? "" : "s"} before the latest model run, and the estimate ${Math.abs(NF.moved) < 0.05 ? "has barely moved" : `has moved ${pp(NF.moved)}`} since.` }) : null,
    h("div", { class: "nc-foot" }, btn));
  const past = ARCHIVE.map((a) => {
    const X = (v) => `${clamp((v / 10) * 100, 4, 100).toFixed(0)}%`;
    return h("article", { class: "note-card" },
      h("p", { class: "eyebrow", text: `Note of ${day(a.date)}` }),
      h("h3", { text: `Preview: ${longLabel(a.label)}` }),
      h("p", { class: "nc-sample", text: "Sample note, written the day before the official figure" }),
      h("div", { class: "nc-bars" },
        h("span", { class: "nc-k", text: "Our estimate then" }), h("span", { class: "nc-bar" }, h("i", { class: "ours", style: `width:${X(a.est)}` })), h("b", { text: pct(a.est) }),
        h("span", { class: "nc-k", text: "Official figure" }), h("span", { class: "nc-bar" }, h("i", { class: "off", style: `width:${X(a.official)}` })), h("b", { text: pct(a.official) })),
      h("p", { class: "nc-gap", text: `${r1(a.est) === r1(a.official) ? "Spot on" : `${fix(r1(a.est) - r1(a.official), 1)} pp ${a.est < a.official ? "below" : "above"} the official figure`}` }),
      h("span", { class: "nc-read", "aria-disabled": "true", text: "Read the note →" }));
  });
  const row = h("div", { class: "notes-row", tabindex: "0", role: "region", "aria-label": "Stat team notes, newest first" }, latest, past);
  const total = (latest ? 1 : 0) + past.length;
  const step = (dir) => row.scrollBy({ left: dir * Math.min(row.clientWidth * 0.8, 380), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  const newer = h("button", { class: "mini", type: "button", "aria-label": "Newer notes", text: "← Newer", onclick: () => step(-1) });
  const older = h("button", { class: "mini", type: "button", "aria-label": "Older notes", text: "Older →", onclick: () => step(1) });
  const edges = () => { newer.disabled = row.scrollLeft <= 2; older.disabled = row.scrollLeft + row.clientWidth >= row.scrollWidth - 2; };
  row.addEventListener("scroll", edges, { passive: true });
  addEventListener("resize", edges);
  setTimeout(edges, 0);
  host.append(h("div", { class: "wrap" },
    h("div", { class: "notes-head" },
      h("p", { class: "eyebrow", text: `From the Stat team · ${total} note${total === 1 ? "" : "s"}, newest first` }),
      h("div", { class: "notes-nav" }, newer, older)),
    row));
}

/* ---------- Writing it into the page ---------- */
function fillSteps(root, steps) {
  const box = root.querySelector(".steps");
  box.textContent = "";
  steps.forEach((s) => box.append(h("div", { class: "step", "data-at": String(s.at) }, h("div", { class: "box" }, h("p", { class: "k", text: s.k }), h("p", { class: "h", text: s.h }), h("p", { text: s.p })))));
}
function prov(kind) {
  const text = kind === "auto" ? `Updates weekly · model run of ${day(D.asOf)}` : kind === "human" ? `Stat team · written ${day(NOTE.date)}` : "Explainer · no live numbers";
  return h("p", { class: "prov " + kind, text });
}

window.GDP_STORY = { STATE, RANGE, R, S, WATCH, fillSteps, prov, BREADTH, renderStatCard, renderNotes };
})();
