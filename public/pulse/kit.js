/* India GDP Pulse landing page kit: the charts, content blocks and scroll scenes behind the page.
   Every number comes from window.GDP_DATA, written by scripts/build-pulse-data.mjs from src/data/nowcast.json.
   Ported from the recommended page of the Landing Demos moodboard; the changes are the header and footer (the site's own),
   a gap in the growth history where a quarter has no official figure, and wording that matches the backtest. */
(() => {
"use strict";
const D = window.GDP_DATA;
const NS = "http://www.w3.org/2000/svg";
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const seg = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
/* A domain of a single value (one weekly run, one point) sits in the middle instead of dividing by zero. */
const scale = (d0, d1, r0, r1) => (v) => (d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0));
/* Round half up on the decimal value (8.35 shows as 8.4), not on its binary approximation. */
const fix = (v, d) => (Math.round((Math.abs(v) + 1e-9) * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
/* Up to four evenly spread positions along a run of n weekly estimates, for axis labels. */
const spread = (n) => [...new Set([0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1])];
/* A tidy axis for numbers that can move. `anchors` are the range the chart normally covers, so ordinary data keeps the
   familiar look; data outside it widens the axis to a round step, so no mark is ever drawn off the chart. */
function niceAxis(vals, pad = 0, anchors = [], maxTicks = 6) {
  const all = vals.filter((v) => Number.isFinite(v));
  const lo0 = Math.min(...(all.length ? all.map((v) => v - pad) : []), ...anchors), hi0 = Math.max(...(all.length ? all.map((v) => v + pad) : []), ...anchors);
  const steps = [0.5, 1, 2, 2.5, 5, 10, 20, 50, 100];
  let step = steps[steps.length - 1];
  for (const st of steps) { if (Math.ceil(hi0 / st - 1e-9) - Math.floor(lo0 / st + 1e-9) + 1 <= maxTicks) { step = st; break; } }
  const lo = Math.floor(lo0 / step + 1e-9) * step, hi = Math.ceil(hi0 / step - 1e-9) * step, ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return { lo, hi, ticks, step };
}
const tickLabel = (v) => (v < -1e-9 ? "−" : "") + (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.abs(Math.round(v))) : Math.abs(v).toFixed(1)) + "%";
const pct = (v, d = 1) => (v < 0 ? "−" : "") + fix(v, d) + "%";
const pts = (v, d = 2) => {
  const zero = Math.abs(v) < 0.5 * Math.pow(10, -d);
  return (zero ? "" : v > 0 ? "+" : "−") + fix(zero ? 0 : v, d);
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ymd = (iso) => iso.split("-").map(Number);
const day = (iso, year = true) => { const [y, m, d] = ymd(iso); return `${d} ${MONTHS[m - 1]}${year ? " " + y : ""}`; };

function el(tag, attrs, parent, text) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
function set(e, attrs) { for (const k in attrs) e.setAttribute(k, attrs[k]); }
/* HTML builder: h("p", {class: "x"}, "text", child, ...) */
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  if (props) for (const k in props) {
    if (k === "class") e.className = props[k];
    else if (k === "text") e.textContent = props[k];
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), props[k]);
    else e.setAttribute(k, props[k]);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid instanceof Node ? kid : String(kid));
  return e;
}
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const N = D.now, A = D.A, DEC = D.dec, V = D.vint, T = D.track, TS = D.trackStats;
const SEC = Object.fromEntries(D.sec.map((x) => [x.k, x]));
/* The build-up adds sectors in three steps, in a fixed story order. A sector the list does not know joins the
   last step and an empty step is dropped, so indicators or sectors can come and go between runs. */
const GROUP_OF = { industry: 1, households: 1, credit: 1, trade: 2, government: 2, financial: 3, global: 3, prices: 3 };
const GROUPS = [1, 2, 3].map((g) => D.sec.filter((x) => (GROUP_OF[x.k] || 3) === g)).filter((g) => g.length);
const SEC_INDUSTRY = D.sec.findIndex((x) => x.k === "industry");
const secOf = (i) => D.sec[i] || { k: "other", label: "Other", short: "Other" };
const LAST = A.length - 1;    // the latest official quarter
const qCalYear = (i) => 2005 + Math.floor(i / 4) + (i % 4 === 3 ? 1 : 0);
const NOW_I = A.length;       // Apr–Jun 2026, the quarter being estimated
const WEEK = V[V.length - 1], PREV_WEEK = V[V.length - 2];
const weekChange = PREV_WEEK ? WEEK[1] - PREV_WEEK[1] : 0;   /* a quarter's first run has no week before it */
const reported = DEC.baseline + DEC.reported;

/* ---------- Shared sentences, worded as the live India GDP Pulse site words them ---------- */
const pp = (v, d = 1) => `${pts(v, d)} pp`;
const COPY = {
  eyebrow: `GDP growth · ${D.quarter} · early estimate`,
  range: `likely between ${pct(N.lo90)} and ${pct(N.hi90)}`,
  lede: `Growth in ${D.quarterLong} is provisionally estimated at about ${pct(N.point)}, likely between ${pct(N.lo90)} and ${pct(N.hi90)}. Official growth for ${D.prev.label} was ${pct(D.prev.v)}.`,
  dataIn: `Data in: ${N.reporting} of ${N.total} indicators, about ${Math.round(N.share * 100)}% of the model's signal`,
  asOf: `Estimate as of ${day(D.asOf)}`,
  week: !PREV_WEEK ? "First weekly run" : Math.abs(weekChange) < 0.05 ? "Unchanged this week" : `${pp(weekChange)} this week`,
  release: `Next official GDP figure expected around ${day(D.release)}`,
  releaseShort: `Official figure due ${day(D.release, false)}`,
};
const monthName = (ym) => `${MONTHS_LONG[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)}`;
/* The live site's "three things to know": momentum, breadth and drivers, with its own rules for the wording. */
const THREE = (() => {
  const diff = N.point - D.prev.v;
  const word = diff < -0.5 ? "easing" : diff > 0.5 ? "picking up" : "holding steady";
  const b = D.breadth, share = Math.round(b.share * 100), prev = Math.round(b.prevShare * 100);
  const breadth = `${share}% of growth indicators pointed to stronger-than-usual growth in ${monthName(b.month)}` +
    (share === prev ? ", the same as three months earlier." : `, ${share > prev ? "up" : "down"} from ${prev}% three months earlier.`) +
    (share >= 60 ? " Strength is broad-based." : share <= 40 ? " Weakness is widespread." : " The picture is mixed.");
  const growth = D.sec.filter((s) => s.k !== "prices");
  const worst = growth.slice().sort((a, x) => a.c - x.c)[0], best = growth.slice().sort((a, x) => x.c - a.c)[0];
  const parts = [];
  if (best.c >= 0.05) parts.push(`${best.label.toLowerCase()} adds the most (${pp(best.c)})`);
  if (worst.c <= -0.05) parts.push(`${worst.label.toLowerCase()} subtracts the most (${pp(worst.c)})`);
  const drivers = (Math.abs(DEC.carriedForward) > Math.abs(DEC.reported)
    ? `Momentum carried from earlier months (${pp(DEC.carriedForward)}) outweighs what this quarter's reported data adds (${pp(DEC.reported)}). `
    : "") + (parts.length ? `Of the data that is in, ${parts.join(" and ")}.` : "");
  return [
    ["Momentum", `The central estimate of about ${pct(N.point)} compares with ${pct(D.prev.v)} officially recorded for ${D.prev.label}, so growth looks to be ${word}. The estimate has moved from ${pct(V[0][1])} on ${day(V[0][0])} to ${pct(N.point)} as new data arrived.`],
    ["Breadth", breadth],
    ["Drivers", drivers],
  ];
})();
/* The Stat team's latest note. Only the date, the words and what it says to watch are written by hand;
   the estimate at the time and everything that has happened since are looked up from the model runs. */
const NOTE_RAW = D.note || { date: D.asOf, quarter: D.quarter, title: "", teaser: [], more: [], watch: [] };
const dashed = (q) => String(q || "").replace(/\u2013/g, "-");
const NOTE = {
  date: NOTE_RAW.date,
  quarter: NOTE_RAW.quarter,
  title: NOTE_RAW.title,
  teaser: NOTE_RAW.teaser,
  more: NOTE_RAW.more,
  watch: NOTE_RAW.watch || [],
  /* Does the note describe the quarter being estimated? Only then can the page compare it with today's estimate. */
  sameQuarter: dashed(NOTE_RAW.quarter) === dashed(D.quarter),
  estThen: (V.filter((v) => v[0] <= NOTE_RAW.date).pop() || V[0])[1],
};
/* Takeaway headings: each card says its point in the heading, the topic in the eyebrow. */
const runLo = Math.min(...A.slice(LAST - 11)), runHi = Math.max(...A.slice(LAST - 11));
const drags = D.sec.filter((s) => s.k !== "prices").slice().sort((a, b) => a.c - b.c).slice(0, 2);
const TAKE = {
  changed: `${COPY.week}, ${D.month.d >= 0 ? "up" : "down"} ${Math.abs(D.month.d).toFixed(1)} pp over the past month`,
  why: `This quarter's data so far points to ${pct(DEC.baseline + DEC.reported)}; momentum from earlier months brings it to ${pct(N.point)}`,
  context: N.point >= runLo && N.point <= runHi
    ? `In line with the run since April 2023, between ${pct(runLo)} and ${pct(runHi)}`
    : `${N.point < runLo ? "Below" : "Above"} the run since April 2023, between ${pct(runLo)} and ${pct(runHi)}`,
  sure: `Likely between ${pct(N.lo90)} and ${pct(N.hi90)}, and our recent estimates have run low`,
  guess: `Higher or lower than ${pct(N.point)}?`,
  sectors: drags.length > 1 ? `${drags[0].label} and ${drags[1].label.toLowerCase()} are the biggest drags so far` : drags.length ? `${drags[0].label} is the biggest drag so far` : "How each part of the economy has moved the estimate",
  next: `Official figure on ${day(D.release, false)}, then September's releases`,
  how: `Two models read ${D.model.read} of ${D.dots.length} indicators, and their average is the estimate`,
};

/* ---------- Visual definitions: build(c) draws once per size, render(c, pos) moves things ---------- */
const VIS = {};

VIS.rangebar = {
  n: 1,
  build(c) {
    const ax = niceAxis([N.lo90, N.hi90, N.point], 0, [0, 14], 3);
    const g = c.svg, W = c.W, H = c.H, X = scale(ax.lo, ax.hi, 6, W - 6), y = H / 2;
    el("line", { x1: X(ax.lo), x2: X(ax.hi), y1: y, y2: y, class: "axis" }, g);
    el("rect", { x: X(N.lo90), width: X(N.hi90) - X(N.lo90), y: y - 9, height: 18, rx: 4, class: "band90" }, g);
    el("rect", { x: X(N.lo68), width: X(N.hi68) - X(N.lo68), y: y - 9, height: 18, rx: 4, class: "band68" }, g);
    el("line", { x1: X(N.point), x2: X(N.point), y1: y - 13, y2: y + 13, class: "mark" }, g);
    el("text", { x: X(ax.lo), y: H - 1 }, g, tickLabel(ax.lo));
    el("text", { x: X(ax.hi), y: H - 1, "text-anchor": "end" }, g, tickLabel(ax.hi));
  },
  render() {},
};

/* The zoomed view of the recent run has to hold the run, our range and the track record's points. */
const HIST_ZOOM = niceAxis([...A.slice(-12), N.lo90, N.hi90, N.point, ...T.flatMap((r) => [r[1], r[3]])], 0.3, [2, 12]);
VIS.history = {
  n: 6,
  build(c) {
    const g = c.svg;
    c.clipId = "clip-h-" + Math.random().toString(36).slice(2, 8);
    c.clipR = el("rect", null, el("clipPath", { id: c.clipId }, el("defs", null, g)));
    c.gGrid = el("g", null, g);
    const pl = el("g", { "clip-path": `url(#${c.clipId})` }, g);
    c.sh1 = el("rect", { class: "shade" }, pl);
    c.sh2 = el("rect", { class: "shade" }, pl);
    c.path = el("path", { class: "line" }, pl);
    c.gTrack = el("g", null, pl);
    c.track = T.map(() => ({ err: el("line", { class: "err" }, c.gTrack), dot: el("circle", { r: 4.5, class: "ours" }, c.gTrack) }));
    c.conn = el("path", { class: "conn" }, pl);
    c.band = el("rect", { class: "band68", rx: 3 }, pl);
    c.dot = el("circle", { class: "nowdot", r: 5.5 }, pl);
    c.l1 = el("text", { class: "lbl strong" }, g);
    c.l2 = el("text", { class: "lbl strong" }, g);
    c.l3 = el("text", { class: "lbl strong", "text-anchor": "end" }, g);
    c.leg = el("text", { class: "lbl", x: 48, y: 16 }, g, "○ our final estimate each quarter");
  },
  render(c, pos) {
    const W = c.W, H = c.H, m = { l: 40, r: 22, t: 26, b: 28 };
    const ctx = c.opt.mode === "context";
    const z = ctx ? 0 : ease(seg(pos, 2.2, 3));
    const quiet = ctx || c.opt.quiet;
    const h1 = quiet ? 0 : seg(pos, 0.45, 0.95) * (1 - seg(pos, 1.45, 1.9));
    const h2 = quiet ? 0 : seg(pos, 1.45, 1.95) * (1 - seg(pos, 2.05, 2.3));   /* gone before the zoom starts at 2.2, so its labels never sit outside the chart */
    const tn = ctx ? 1 : ease(seg(pos, 3.3, 4));
    const tt = ctx ? 0 : ease(seg(pos, 4.3, 5));
    const x0 = lerp(-0.5, LAST - 11.5, z), x1 = NOW_I + 0.6;
    const y0 = lerp(-26, HIST_ZOOM.lo, z), y1 = lerp(27, HIST_ZOOM.hi, z);
    const X = scale(x0, x1, m.l, W - m.r), Y = scale(y0, y1, H - m.b, m.t);
    set(c.clipR, { x: m.l, y: m.t - 10, width: W - m.l - m.r + 14, height: H - m.b - m.t + 20 });
    c.gGrid.textContent = "";
    const st = y1 - y0 > 20 ? 10 : HIST_ZOOM.step;
    for (let v = Math.ceil(y0 / st) * st; v <= y1 + 1e-9; v += st) {
      el("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: Math.abs(v) < 1e-9 ? "zero" : "grid" }, c.gGrid);
      el("text", { x: m.l - 8, y: Y(v) + 4, "text-anchor": "end" }, c.gGrid, tickLabel(v));
    }
    const ys = x1 - x0 > 30 ? (W < 520 ? 10 : 5) : 1;
    for (let yr = 2005; yr <= qCalYear(A.length); yr += ys) {
      const i = (yr - 2005) * 4;
      if (i < x0 || i > x1) continue;
      el("text", { x: X(i), y: H - m.b + 18, "text-anchor": "middle" }, c.gGrid, String(yr));
    }
    c.path.setAttribute("d", A.map((v, i) => (v == null ? "" : (i === 0 || A[i - 1] == null ? "M" : "L") + X(i).toFixed(1) + "," + Y(v).toFixed(1))).join(""));
    set(c.sh1, { x: X(13.5), width: X(16.5) - X(13.5), y: m.t, height: H - m.b - m.t, opacity: h1 });
    set(c.sh2, { x: X(59.5), width: X(64.5) - X(59.5), y: m.t, height: H - m.b - m.t, opacity: h2 });
    set(c.l1, { x: X(60) + 8, y: Y(A[60]) + 4, opacity: h2 }); c.l1.textContent = pct(A[60]);
    set(c.l2, { x: X(64) + 8, y: Y(A[64]) + 4, opacity: h2 }); c.l2.textContent = "+" + pct(A[64]);
    const xn = X(NOW_I), yn = Y(N.point);
    set(c.conn, { d: `M${X(LAST)},${Y(A[LAST])}L${xn},${yn}`, opacity: tn });
    set(c.band, { x: xn - 7, width: 14, y: Y(N.hi90), height: Y(N.lo90) - Y(N.hi90), opacity: tn });
    set(c.dot, { cx: xn, cy: yn, opacity: tn });
    set(c.l3, { x: xn - 12, y: yn - 12, opacity: tn }); c.l3.textContent = pct(N.point);
    c.track.forEach((t, j) => {
      const i = LAST - (T.length - 1) + j, tj = clamp(tt * (T.length + 2) - j, 0, 1);
      set(t.err, { x1: X(i), x2: X(i), y1: Y(A[i]), y2: Y(T[j][1]), opacity: tj });
      set(t.dot, { cx: X(i), cy: Y(T[j][1]), opacity: tj });
    });
    c.leg.setAttribute("opacity", tt);
  },
};

VIS.buildup = {
  n: 6,
  /* The live site's waterfall: long-run average, each sector, momentum from earlier months, the estimate.
     Steps group the sectors so a scroll scene can add them a few at a time. */
  rows(focus) {
    if (focus) {
      const s = SEC[focus];
      return [
        { label: "Long-run average growth", short: "Long-run average", kind: "base", v: DEC.baseline, k: 0, o: 0 },
        { label: s.label, short: s.short, v: s.c, k: 1, o: 0, sel: true },
        { label: "All other sectors", short: "Other sectors", v: DEC.reported - s.c, k: 2, o: 0 },
        { label: "Momentum from earlier months", short: "Momentum", kind: "carry", v: DEC.carriedForward, k: 3, o: 0 },
        { label: "This quarter's estimate", short: "Estimate", kind: "total", v: N.point, k: 4, o: 0 },
      ];
    }
    const G = GROUPS.length;
    return [
      { label: "Long-run average growth", short: "Long-run average", kind: "base", v: DEC.baseline, k: 0, o: 0 },
      ...GROUPS.flatMap((grp, g) => grp.map((s, j) => ({ label: s.label, short: s.short, v: s.c, k: g + 1, o: j * Math.min(0.2, 0.6 / grp.length) }))),
      { label: "Momentum from earlier months", short: "Momentum", kind: "carry", v: DEC.carriedForward, k: G + 1, o: 0 },
      { label: "This quarter's estimate", short: "Estimate", kind: "total", v: N.point, k: G + 2, o: 0 },
    ];
  },
  build(c) {
    const g = c.svg, W = c.W, H = c.H;
    c.rows = VIS.buildup.rows(c.opt.focus);
    c.pid = "hatch-" + Math.random().toString(36).slice(2, 8);
    const pat = el("pattern", { id: c.pid, width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, el("defs", null, g));
    el("rect", { width: 6, height: 6, class: "hatch-bg" }, pat);
    el("line", { x1: 0, y1: 0, x2: 0, y2: 6, class: "hatch-ln" }, pat);
    const narrow = W < 520, m = { l: narrow ? 124 : 206, r: narrow ? 56 : 62, t: 6, b: 40 };
    /* Every running total the bars pass through has to fit, wherever growth has moved to. */
    let lvl = 0; const levels = [];
    c.rows.forEach((r) => { lvl = r.kind === "base" || r.kind === "total" ? r.v : lvl + r.v; levels.push(lvl); });
    const ax = (c.ax = niceAxis(levels, 0.35, [5.5, 7.4], 5));
    c.X = scale(ax.lo, ax.hi, m.l, W - m.r);
    const rowH = (H - m.t - m.b) / c.rows.length, bh = Math.min(22, rowH * 0.58);
    for (const v of ax.ticks) {
      el("line", { x1: c.X(v), x2: c.X(v), y1: m.t, y2: H - m.b, class: "grid" }, g);
      el("text", { x: c.X(v), y: H - m.b + 16, "text-anchor": "middle" }, g, tickLabel(v));
    }
    el("text", { x: m.l, y: H - 4 }, g, narrow ? `axis starts at ${tickLabel(ax.lo)}` : `axis starts at ${tickLabel(ax.lo)} · pp = percentage points`);
    c.els = c.rows.map((r, i) => {
      const cy = m.t + i * rowH + rowH / 2;
      const cls = r.kind === "base" || r.kind === "total" ? "b-base" : r.kind === "carry" ? "b-carry" : r.v < 0 ? "b-neg" : "b-pos";
      if (r.sel) el("rect", { x: 0, y: cy - rowH / 2 + 2, width: W, height: rowH - 4, rx: 8, class: "rowsel" }, g);
      const bar = el("rect", { y: cy - bh / 2, height: bh, rx: 3, class: cls }, g);
      if (r.kind === "carry") bar.style.fill = `url(#${c.pid})`;
      return {
        lab: el("text", { x: m.l - 10, y: cy + 4, class: "lbl" + (r.kind === "total" || r.sel ? " strong" : ""), "text-anchor": "end" }, g, narrow ? r.short : r.label),
        link: i ? el("line", { class: "link", y1: cy - rowH + bh / 2, y2: cy - bh / 2 }, g) : null,
        bar,
        val: el("text", { y: cy + 4, class: "val" }, g),
      };
    });
    c.n = c.rows[c.rows.length - 1].k + 1;
  },
  render(c, pos) {
    const X = c.X;
    let level = 0;
    c.rows.forEach((r, i) => {
      const e = c.els[i];
      const t = r.k === 0 ? 1 : ease(seg(pos, r.k - 0.8 + r.o, r.k - 0.25 + r.o));
      let a, b;
      const from = level;
      if (r.kind === "base" || r.kind === "total") {
        a = c.ax.lo; b = c.ax.lo + (r.v - c.ax.lo) * t; level = r.v;
        set(e.val, { x: X(b) + 6, "text-anchor": "start" });
        e.val.textContent = pct(r.v);
      } else {
        const to = from + r.v * t;
        a = Math.min(from, to); b = Math.max(from, to); level = from + r.v;
        const neg = r.v < 0;
        set(e.val, { x: neg ? X(a) - 6 : X(b) + 6, "text-anchor": neg ? "end" : "start" });
        e.val.textContent = pts(r.v);
      }
      set(e.bar, { x: X(a), width: Math.max(0, X(b) - X(a)), opacity: t > 0.001 ? 1 : 0 });
      e.val.setAttribute("opacity", t);
      e.lab.setAttribute("opacity", r.k === 0 ? 1 : 0.4 + 0.6 * t);
      if (e.link) set(e.link, { x1: X(from), x2: X(from), opacity: t });
    });
  },
};

VIS.weekly = {
  n: 2,
  build(c) {
    const g = c.svg, W = c.W, H = c.H, m = { l: 40, r: 50, t: 16, b: 26 };
    c.X = scale(0, V.length - 1, m.l, W - m.r);
    const ax = niceAxis(V.flatMap((v) => [v[1], v[2], v[3]]), 0.2, [2, 12]);
    c.Y = scale(ax.lo, ax.hi, H - m.b, m.t);
    for (const v of ax.ticks) {
      el("line", { x1: m.l, x2: W - m.r, y1: c.Y(v), y2: c.Y(v), class: "grid" }, g);
      el("text", { x: m.l - 8, y: c.Y(v) + 4, "text-anchor": "end" }, g, tickLabel(v));
    }
    spread(V.length).forEach((i) => el("text", { x: c.X(i), y: H - 6, "text-anchor": i === V.length - 1 ? "end" : "middle" }, g, day(V[i][0], false)));
    c.band = el("path", { class: "band90" }, g);
    c.line = el("path", { class: "line" }, g);
    c.dot = el("circle", { r: 5, class: "nowdot" }, g);
    c.lab = el("text", { class: "lbl strong" }, g);
  },
  render(c, pos) {
    const X = c.X, Y = c.Y, f = pos * (V.length - 1);
    const kf = Math.floor(f), fr = f - kf, P = [];
    for (let j = 0; j <= kf && j < V.length; j++) P.push([j, V[j][1], V[j][2], V[j][3]]);
    if (kf + 1 < V.length && fr > 0) { const a = V[kf], b = V[kf + 1]; P.push([kf + fr, lerp(a[1], b[1], fr), lerp(a[2], b[2], fr), lerp(a[3], b[3], fr)]); }
    c.line.setAttribute("d", P.map((p, j) => (j ? "L" : "M") + X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1)).join(""));
    const up = P.map((p) => X(p[0]).toFixed(1) + "," + Y(p[3]).toFixed(1));
    const lo = P.slice().reverse().map((p) => X(p[0]).toFixed(1) + "," + Y(p[2]).toFixed(1));
    c.band.setAttribute("d", "M" + up.concat(lo).join("L") + "Z");
    const last = P[P.length - 1];
    set(c.dot, { cx: X(last[0]), cy: Y(last[1]) });
    set(c.lab, { x: X(last[0]) + 9, y: Y(last[1]) + 4 });
    c.lab.textContent = pct(last[1]);
  },
};

VIS.timelapse = {
  n: V.length,
  init(c) {
    const order = D.dots.map((d, i) => i).sort((a, b) => D.dots[a][0] - D.dots[b][0] || D.dots[b][1] - D.dots[a][1]);
    c.cellOf = [];
    c.order = order;
    order.forEach((di, rank) => (c.cellOf[di] = rank));
    c.now = V.map((v) => new Set(v[4]));
    c.ever = [];
    const acc = new Set();
    V.forEach((v, i) => { v[4].forEach((x) => acc.add(x)); c.ever[i] = new Set(acc); });
  },
  build(c) {
    if (!c.cellOf) VIS.timelapse.init(c);
    const g = c.svg, W = c.W, H = c.H, n = D.dots.length;
    c.date = el("text", { x: 4, y: 26, class: "head" }, g);
    c.estT = el("text", { x: W - 4, y: 26, class: "head", "text-anchor": "end" }, g);
    el("text", { x: 4, y: 46 }, g, `${D.dots.length} indicators · lit when updated`);
    const top = 60, cols = W < 520 ? 12 : 17, gap = 3;
    const size = Math.min(18, (W - 8 - gap * (cols - 1)) / cols);
    const rows = Math.ceil(n / cols), gx = 4;
    c.cells = [];
    const tp = tipper(c);
    for (let r = 0; r < n; r++) {
      c.cells[r] = el("rect", { x: gx + (r % cols) * (size + gap), y: top + Math.floor(r / cols) * (size + gap), width: size, height: size, rx: 2, class: "cell" }, g);
      /* Hover (or tap) a square to see which indicator it is and where it stands at the point the chart has reached. */
      tp.bind(c.cells[r], (tip) => {
        const d = c.order[r], i = clamp(Math.round(c.pos), 0, V.length - 1), when = (j) => day(V[j][0], false);
        let state;
        if (c.now[i].has(d)) state = i === 0 ? `In by our first run, ${when(0)}` : `Updated in the week to ${when(i)}`;
        else if (c.ever[i].has(d)) { let j = i; while (j > 0 && !c.now[j].has(d)) j--; state = j === 0 ? `In by our first run, ${when(0)}` : `Last updated in the week to ${when(j)}`; }
        else state = `Not yet published by ${when(i)}`;
        tip.append(h("b", { text: D.names[d] }), h("span", { text: secOf(D.dots[d][0]).label }),
          h("span", { text: `A typical move shifts the estimate by ${D.dots[d][1].toFixed(2)} pp` }),
          h("span", { class: "dz-sep", text: state }));
      });
    }
    const ly = top + rows * (size + gap) + 10;
    let lx = gx, ry = ly;
    [["cell now", "updated this week"], ["cell seen", "earlier"], ["cell", "not yet"]].forEach(([cls, t]) => {
      const wItem = 15 + t.length * 6.8 + 16;
      if (lx + wItem - 16 > W - 4 && lx > gx) { lx = gx; ry += 16; }   /* a legend that does not fit on one row continues on the next */
      el("rect", { x: lx, y: ry, width: 10, height: 10, rx: 2, class: cls }, g);
      el("text", { x: lx + 15, y: ry + 9 }, g, t);
      lx += wItem;
    });
    const cT = ry + 36, cB = H - 24;
    c.X = scale(0, V.length - 1, 40, W - 50);
    const ax = niceAxis(V.flatMap((v) => [v[1], v[2], v[3]]), 0.2, [0, 12], 5);
    c.Y = scale(ax.lo, ax.hi, cB, cT);
    for (const v of ax.ticks) {
      el("line", { x1: 40, x2: W - 50, y1: c.Y(v), y2: c.Y(v), class: Math.abs(v) < 1e-9 ? "zero" : "grid" }, g);
      el("text", { x: 32, y: c.Y(v) + 4, "text-anchor": "end" }, g, tickLabel(v));
    }
    spread(V.length).forEach((i) => el("text", { x: c.X(i), y: cB + 18, "text-anchor": "middle" }, g, day(V[i][0], false)));
    c.band = el("path", { class: "band90" }, g);
    c.line = el("path", { class: "line" }, g);
    c.dot = el("circle", { class: "nowdot", r: 5 }, g);
    c.dl = el("text", { class: "lbl strong" }, g);
  },
  render(c, pos) {
    const X = c.X, Y = c.Y, i = Math.min(V.length - 1, Math.round(pos));
    const now = c.now[i], ever = c.ever[i];
    for (let d = 0; d < D.dots.length; d++) c.cells[c.cellOf[d]].setAttribute("class", now.has(d) ? "cell now" : ever.has(d) ? "cell seen" : "cell");
    const kf = Math.floor(pos), fr = pos - kf, P = [];
    for (let j = 0; j <= kf && j < V.length; j++) P.push([j, V[j][1], V[j][2], V[j][3]]);
    if (kf + 1 < V.length && fr > 0) { const a = V[kf], b = V[kf + 1]; P.push([kf + fr, lerp(a[1], b[1], fr), lerp(a[2], b[2], fr), lerp(a[3], b[3], fr)]); }
    c.line.setAttribute("d", P.map((p, j) => (j ? "L" : "M") + X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1)).join(""));
    const up = P.map((p) => X(p[0]).toFixed(1) + "," + Y(p[3]).toFixed(1));
    const lo = P.slice().reverse().map((p) => X(p[0]).toFixed(1) + "," + Y(p[2]).toFixed(1));
    c.band.setAttribute("d", "M" + up.concat(lo).join("L") + "Z");
    const last = P[P.length - 1];
    set(c.dot, { cx: X(last[0]), cy: Y(last[1]) });
    set(c.dl, { x: X(last[0]) + 9, y: Y(last[1]) - 9 });
    c.dl.textContent = pct(last[1]);
    c.date.textContent = day(V[i][0]);
    c.estT.textContent = pct(V[i][1]);
  },
};

VIS.noise = {
  n: 4,
  init(c) {
    const rnd = seeded(20260828);
    c.draws = Array.from({ length: 20 }, () => { const u = 1 - rnd(), v = rnd(); return N.point + N.se * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); });
  },
  build(c) {
    if (!c.draws) VIS.noise.init(c);
    const g = c.svg, W = c.W, H = c.H;
    const ax = niceAxis([N.lo90 - 0.4 * N.se, N.hi90 + 0.4 * N.se, ...c.draws, ...V.map((v) => v[1])], 0, [0, 14], 8);
    const X = (c.X = scale(ax.lo, ax.hi, 22, W - 22));
    const ay = (c.ay = Math.round(H * 0.58));
    c.b90 = el("rect", { y: ay - 12, height: 24, rx: 4, class: "band90" }, g);
    c.b68 = el("rect", { y: ay - 12, height: 24, rx: 4, class: "band68" }, g);
    el("line", { x1: X(ax.lo), x2: X(ax.hi), y1: ay, y2: ay, class: "axis" }, g);
    for (const v of ax.ticks) {
      el("line", { x1: X(v), x2: X(v), y1: ay - 4, y2: ay + 4, class: "axis" }, g);
      el("text", { x: X(v), y: ay + 22, "text-anchor": "middle" }, g, tickLabel(v));
    }
    const bigY = Math.max(52, H * 0.17);
    el("line", { x1: X(N.point), x2: X(N.point), y1: bigY + 12, y2: ay - 16, class: "leader" }, g);
    el("line", { x1: X(N.point), x2: X(N.point), y1: ay - 16, y2: ay + 16, class: "mark" }, g);
    el("text", { x: X(N.point), y: bigY, class: "big", "text-anchor": "middle" }, g, pct(N.point));
    c.rl = [
      el("text", { x: X(N.lo68), y: ay + 40, class: "lbl", "text-anchor": "middle" }, g, pct(N.lo68)),
      el("text", { x: X(N.hi68), y: ay + 40, class: "lbl", "text-anchor": "middle" }, g, pct(N.hi68)),
    ];
    const bins = {};
    c.dots = c.opt.noDraws ? [] : c.draws.map((v) => {
      const b = Math.round(v / (0.62 * Math.max(1, (ax.hi - ax.lo) / 14))), k = (bins[b] = (bins[b] || 0) + 1) - 1;
      return { e: el("circle", { r: 5, cx: X(clamp(v, ax.lo, ax.hi)), class: "draw" }, g), ty: ay - 22 - k * 12 };
    });
    const vy = ay + 70;
    c.vlab = el("text", { x: X(ax.lo), y: vy - 14 }, g, W < 300 ? "Weekly estimates" : "Our weekly estimates this quarter");
    c.vints = V.map((v) => el("circle", { cx: X(v[1]), cy: vy, r: 4, class: "vint" }, g));
  },
  render(c, pos) {
    const t1 = ease(seg(pos, 0.2, 1)), cx = c.X(N.point);
    const band = (e, lo, hi) => { const x0 = lerp(cx, c.X(lo), t1), x1 = lerp(cx, c.X(hi), t1); set(e, { x: x0, width: Math.max(0, x1 - x0), opacity: t1 > 0.001 ? 1 : 0 }); };
    band(c.b90, N.lo90, N.hi90);
    band(c.b68, N.lo68, N.hi68);
    c.rl.forEach((e) => e.setAttribute("opacity", t1));
    const k = seg(pos, 1.2, 2) * c.dots.length, dim = lerp(1, 0.4, seg(pos, 2.2, 2.8));
    c.dots.forEach((d, j) => { const tj = clamp(k - j, 0, 1); set(d.e, { cy: lerp(c.ay - 150, d.ty, ease(tj)), opacity: tj * dim }); });
    const kv = seg(pos, 2.2, 3) * c.vints.length;
    c.vints.forEach((e, j) => e.setAttribute("opacity", clamp(kv - j, 0, 1)));
    c.vlab.setAttribute("opacity", seg(pos, 2.2, 2.6));
  },
};

VIS.track = {
  n: 2,
  build(c) {
    const g = c.svg, W = c.W, H = c.H, m = { l: 40, r: 16, t: 30, b: 28 };
    const X = (c.X = scale(-0.5, T.length - 0.5, m.l, W - m.r));
    const ax = niceAxis(T.flatMap((r) => [r[1], r[3]]), 0.3, [4.5, 9]);
    const Y = (c.Y = scale(ax.lo, ax.hi, H - m.b, m.t));
    for (const v of ax.ticks) {
      el("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: "grid" }, g);
      el("text", { x: m.l - 8, y: Y(v) + 4, "text-anchor": "end" }, g, tickLabel(v));
    }
    T.forEach((r, j) => { if (r[0].startsWith("Apr")) el("text", { x: X(j), y: H - 8, "text-anchor": "middle" }, g, r[0].slice(-4)); });
    el("circle", { cx: m.l + 4, cy: 12, r: 4.5, class: "off" }, g);
    el("text", { x: m.l + 14, y: 16 }, g, "official");
    el("circle", { cx: m.l + 86, cy: 12, r: 4.5, class: "ours" }, g);
    el("text", { x: m.l + 96, y: 16 }, g, W > 520 ? "our estimate a week before release" : "our estimate");
    el("path", { d: T.map((r, j) => (j ? "L" : "M") + X(j) + "," + Y(r[3])).join(""), class: "line" }, g).style.stroke = "var(--fg)";
    c.items = T.map((r, j) => ({
      err: el("line", { x1: X(j), x2: X(j), y1: Y(r[3]), y2: Y(r[3]), class: "err" }, g),
      off: el("circle", { cx: X(j), cy: Y(r[3]), r: 4.5, class: "off" }, g),
      ours: el("circle", { cx: X(j), cy: Y(r[3]), r: 4.5, class: "ours" }, g),
      j,
    }));
  },
  render(c, pos) {
    c.items.forEach(({ err, ours, j }) => {
      const t = ease(clamp(pos * 1.6 - j * 0.05, 0, 1));
      const y = lerp(c.Y(T[j][3]), c.Y(T[j][1]), t);
      set(ours, { cy: y, opacity: t > 0.01 ? 1 : 0 });
      set(err, { y2: y });
    });
  },
};

VIS.guess = {
  n: 4,
  init(c) { c.guess = A[LAST]; c.dragged = false; },
  build(c) {
    if (c.guess == null) VIS.guess.init(c);
    const g = c.svg, W = c.W, H = c.H;
    const m = (c.m = { l: 48, r: W < 480 ? 86 : 116, t: 34, b: 30 });
    const X = (c.X = scale(LAST - 11.5, NOW_I + 0.5, m.l, W - m.r));
    const ax = (c.ax = niceAxis([...A.slice(-12), N.lo90, N.hi90, N.point], 0.4, [2, 12.5]));
    const Y = (c.Y = scale(ax.lo, ax.hi, H - m.b, m.t));
    c.Yinv = (y) => ax.lo + ((H - m.b - y) / (H - m.b - m.t)) * (ax.hi - ax.lo);
    const xu0 = X(NOW_I - 0.5), xu1 = X(NOW_I + 0.5), xn = X(NOW_I);
    el("rect", { x: xu0, y: m.t, width: xu1 - xu0, height: H - m.b - m.t, class: "unknown" }, g);
    for (const v of ax.ticks) {
      el("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: "grid" }, g);
      el("text", { x: m.l - 8, y: Y(v) + 4, "text-anchor": "end" }, g, tickLabel(v));
    }
    [LAST - 11, LAST - 7, LAST - 3].forEach((i) => el("text", { x: X(i), y: H - m.b + 18, "text-anchor": "middle" }, g, String(qCalYear(i))));
    el("text", { x: xn, y: m.t - 12, "text-anchor": "middle", class: "lbl strong" }, g, D.quarter);
    const p0 = [];
    for (let i = LAST - 11; i <= LAST; i++) p0.push(X(i).toFixed(1) + "," + Y(A[i]).toFixed(1));
    el("path", { d: "M" + p0.join("L"), class: "line" }, g);
    el("circle", { cx: X(LAST), cy: Y(A[LAST]), r: 3.5, class: "nowdot" }, g);
    el("text", { x: X(LAST) - 6, y: Y(A[LAST]) - 10, "text-anchor": "end", class: "lbl" }, g, `${D.prev.label} ${pct(A[LAST])}`);
    c.b90 = el("rect", { x: xn - 10, width: 20, y: Y(N.hi90), height: Y(N.lo90) - Y(N.hi90), rx: 4, class: "band90" }, g);
    c.b68 = el("rect", { x: xn - 10, width: 20, y: Y(N.hi68), height: Y(N.lo68) - Y(N.hi68), rx: 4, class: "band68" }, g);
    c.model = el("path", { d: `M${X(LAST)},${Y(A[LAST])}L${xn},${Y(N.point)}`, class: "model", pathLength: 1, "stroke-dasharray": "1 1" }, g);
    c.mdot = el("circle", { cx: xn, cy: Y(N.point), r: 5.5, class: "nowdot" }, g);
    c.mlab = el("text", { x: xn + 16, class: "lbl strong" }, g, `Ours ${pct(N.point)}`);
    c.cmp = el("line", { x1: xn - 22, x2: xn - 22, class: "cmp" }, g);
    c.cmpl = el("text", { x: xn - 28, class: "lbl", "text-anchor": "end" }, g);
    c.user = el("path", { class: "user" }, g);
    c.ring = el("circle", { cx: xn, r: 8, class: "ring" }, g);
    c.handle = el("circle", { cx: xn, r: 8, class: "handle" }, g);
    c.ulab = el("text", { x: xn + 16, class: "lbl you" }, g);
    c.zone = el("rect", { x: xn - 34, width: 68, y: m.t - 12, height: H - m.b - m.t + 24, class: "dragzone", tabindex: 0, role: "slider", "aria-label": `Your guess for ${D.quarterLong} growth`, "aria-valuemin": ax.lo, "aria-valuemax": ax.hi }, g);
    const setGuess = (v) => {
      c.guess = Math.round(clamp(v, ax.lo + 0.3, ax.hi - 0.3) * 10) / 10;
      c.dragged = true;
      VIS.guess.drawUser(c);
      if (c.opt.onChange) c.opt.onChange(c);
    };
    const fromEvent = (e) => { const r = c.svg.getBoundingClientRect(); setGuess(c.Yinv((e.clientY - r.top) * (c.H / r.height))); };
    c.zone.addEventListener("pointerdown", (e) => { e.preventDefault(); c.zone.setPointerCapture(e.pointerId); fromEvent(e); });
    c.zone.addEventListener("pointermove", (e) => { if (c.zone.hasPointerCapture(e.pointerId)) fromEvent(e); });
    c.zone.addEventListener("keydown", (e) => {
      const dv = { ArrowUp: 0.1, ArrowRight: 0.1, ArrowDown: -0.1, ArrowLeft: -0.1, PageUp: 1, PageDown: -1 }[e.key];
      if (dv) { e.preventDefault(); setGuess(c.guess + dv); }
    });
    c.setGuess = setGuess;
    VIS.guess.drawUser(c);
  },
  drawUser(c) {
    const X = c.X, Y = c.Y, xn = X(NOW_I), yg = Y(c.guess), ym = Y(N.point);
    c.user.setAttribute("d", `M${X(LAST)},${Y(A[LAST])}L${xn},${yg}`);
    c.handle.setAttribute("cy", yg);
    c.ring.setAttribute("cy", yg);
    c.ring.style.display = c.dragged ? "none" : "";
    c.ulab.setAttribute("y", yg + 4);
    c.ulab.textContent = c.dragged ? `You ${pct(c.guess)}` : "Drag me";
    set(c.zone, { "aria-valuenow": c.guess, "aria-valuetext": pct(c.guess) });
    c.mlab.setAttribute("y", Math.abs(ym - yg) < 18 ? (ym > yg ? yg + 22 : yg - 14) : ym + 4);
    const d = c.guess - N.point;
    set(c.cmp, { y1: Math.min(ym, yg), y2: Math.max(ym, yg) });
    set(c.cmpl, { y: (ym + yg) / 2 + 4 });
    c.cmpl.textContent = Math.abs(d) < 0.05 ? "" : `${Math.abs(d).toFixed(1)} pp`;
    c.cmpShow = c.dragged && Math.abs(d) >= 0.1;
  },
  render(c, pos) {
    const tm = ease(seg(pos, 0.3, 1)), tb = ease(seg(pos, 1.3, 2)), tc = ease(seg(pos, 2.3, 3));
    c.model.style.strokeDashoffset = String(1 - tm);
    const md = seg(tm, 0.85, 1);
    c.mdot.setAttribute("opacity", md);
    c.mlab.setAttribute("opacity", md);
    c.b68.setAttribute("opacity", tb);
    c.b90.setAttribute("opacity", tb);
    VIS.guess.drawUser(c);
    const show = c.cmpShow ? tc : 0;
    c.cmp.setAttribute("opacity", show);
    c.cmpl.setAttribute("opacity", show);
  },
};

/* One tooltip per chart. A mouse gets it on hover; a finger gets it on tap, and it closes on the next tap elsewhere or on scroll
   (a touch pointer "leaves" the instant it lifts, so closing on leave would make the tooltip flash and vanish). */
const TIPS = new Set();
let tipsWired = false;
function closeTips() {
  TIPS.forEach((t) => { t.hidden = true; });
  document.querySelectorAll("[data-hot]").forEach((e) => e.removeAttribute("data-hot"));
}
function tipper(c) {
  const tip = c.tip || (c.tip = h("div", { class: "dz-tip", "aria-hidden": "true", hidden: "" }));
  if (!tip.parentNode) c.host.append(tip);
  TIPS.add(tip);
  if (!tipsWired) {
    tipsWired = true;
    document.addEventListener("pointerdown", (e) => { if (!(e.target.closest && e.target.closest("[data-tip]"))) closeTips(); }, true);
    addEventListener("scroll", () => { if ([...TIPS].some((t) => !t.hidden)) closeTips(); }, { passive: true });
  }
  const local = (ev) => { const r = c.svg.getBoundingClientRect(); return [(ev.clientX - r.left) * (c.W / (r.width || 1)), (ev.clientY - r.top) * (c.H / (r.height || 1))]; };
  const open = (x, y, fill) => {
    tip.textContent = "";
    fill(tip);
    tip.hidden = false;
    tip.style.left = clamp(x + 14, 0, Math.max(0, c.W - tip.offsetWidth)) + "px";
    tip.style.top = clamp(y + 14, 0, Math.max(0, c.H - tip.offsetHeight)) + "px";
  };
  const hide = () => { tip.hidden = true; if (c.hot) { c.hot.removeAttribute("data-hot"); c.hot = null; } };
  /* Opens `fill(tip)` beside the pointer whenever it is over `target`; the target is outlined while it is the one shown. */
  const bind = (target, fill, o) => {
    target.setAttribute("data-tip", "");
    const show = (ev) => {
      const [x, y] = local(ev);
      open(x, y, fill);
      if (!o || o.hot !== false) { if (c.hot && c.hot !== target) c.hot.removeAttribute("data-hot"); c.hot = target; target.setAttribute("data-hot", ""); }
    };
    target.addEventListener("pointerenter", show);
    target.addEventListener("pointermove", show);
    target.addEventListener("pointerdown", show);
    target.addEventListener("pointerleave", (ev) => { if (ev.pointerType !== "touch") hide(); });
    return { show, hide };
  };
  return { tip, local, open, hide, bind };
}

VIS.morph = {
  n: 4,
  build(c) {
    const g = c.svg, W = c.W, H = c.H, n = D.dots.length, mob = W < 520;
    const cols = mob ? 9 : 14, rows = Math.ceil(n / cols);
    const cell = Math.min((W - 40) / cols, (H - 40) / rows, 34);
    const gx = (W - cols * cell) / 2 + cell / 2, gy = (H - rows * cell) / 2 + cell / 2;
    const rnd = seeded(68), perm = D.dots.map((d, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    const L0 = perm.map((slot) => [gx + (slot % cols) * cell, gy + Math.floor(slot / cols) * cell, 5]);
    const nSec = Math.max(D.sec.length, ...D.dots.map((d) => d[0] + 1));
    const lw = mob ? 84 : 118, rowH = (H - 24) / nSec, avail = W - lw - 26;
    const bySec = Array.from({ length: nSec }, () => []);
    D.dots.forEach((d, i) => bySec[d[0]].push(i));
    const maxw = Math.max(...D.dots.map((d) => d[1]));
    const rad = (i) => 2 + 13 * Math.sqrt(D.dots[i][1] / maxw);
    let maxRow = 0;
    bySec.forEach((ids) => { maxRow = Math.max(maxRow, ids.reduce((w, i) => w + 2 * rad(i) + 2, 0)); });
    const f = Math.min(1, avail / maxRow, (rowH * 0.46) / 15);
    const L1 = [], L2 = [];
    const maxN = Math.max(1, ...bySec.map((a) => a.length)), stepX = Math.min(13, (W - lw - 26) / maxN), r1 = Math.min(5, stepX * 0.42);
    bySec.forEach((ids, s) => {
      const cy = 12 + rowH * (s + 0.5);
      let x = lw + 10;
      ids.forEach((i, j) => {
        L1[i] = [lw + 14 + j * stepX, cy, r1];
        const r = rad(i) * f;
        L2[i] = [x + r, cy, Math.max(r, 1.5)];
        x += 2 * r + 2 * f;
      });
    });
    const fx = W * (mob ? 0.25 : 0.3), fy = H * 0.46;
    const L3 = D.dots.map((d, i) => { const a = i * 2.39996, rr = 3.1 * Math.sqrt(i + 1); return [fx + Math.cos(a) * rr, fy + Math.sin(a) * rr, 2.6]; });
    c.L = [L0, L1, L2, L3];
    c.gLab = el("g", null, g);
    bySec.forEach((ids, s) => { if (ids.length) el("text", { x: lw, y: 12 + rowH * (s + 0.5) + 4, class: "lbl", "text-anchor": "end" }, c.gLab, secOf(s).short); });
    c.gEnd = el("g", null, g);
    const ax0 = fx + 36, ax1 = W * (mob ? 0.56 : 0.6);
    el("line", { x1: ax0, y1: fy, x2: ax1 - 6, y2: fy, class: "arrow" }, c.gEnd);
    el("path", { d: `M${ax1},${fy}l-9,-5v10z`, class: "arrowhead" }, c.gEnd);
    el("text", { x: fx, y: fy + 54, class: "lbl", "text-anchor": "middle" }, c.gEnd, `${D.model.factors} common trends`);
    const rx = W * (mob ? 0.79 : 0.78);
    el("text", { x: rx, y: fy + 14, class: "big", "text-anchor": "middle" }, c.gEnd, pct(N.point));
    el("text", { x: rx, y: fy + 40, class: "lbl", "text-anchor": "middle" }, c.gEnd, "GDP growth");
    el("text", { x: rx, y: fy + 57, class: "lbl", "text-anchor": "middle" }, c.gEnd, D.quarter);
    /* Hover a dot to see which indicator it is, what a typical move in it does, and what it did this quarter. */
    const tp = tipper(c);
    c.dots = D.dots.map((d, i) => {
      const e = el("circle", { class: d[0] === SEC_INDUSTRY ? "d ind" : "d" }, g);
      tp.bind(e, (tip) => {
        const cv = D.contrib ? D.contrib[i] : null;
        tip.append(h("b", { text: D.names[i] }), h("span", { text: secOf(d[0]).label }),
          h("span", { text: `A typical move shifts the estimate by ${d[1].toFixed(2)} pp` }),
          h("span", { class: "dz-sep", text: cv == null ? "Not yet published this quarter" : `This quarter: ${pp(cv, 2)}` }));
      });
      return e;
    });
  },
  render(c, pos) {
    const k = Math.min(2, Math.floor(pos)), f = pos - k, n = c.dots.length;
    c.dots.forEach((e, i) => {
      const t = ease(clamp((f - (i / n) * 0.35) / 0.65, 0, 1));
      const a = c.L[k][i], b = c.L[k + 1][i];
      set(e, { cx: lerp(a[0], b[0], t).toFixed(1), cy: lerp(a[1], b[1], t).toFixed(1), r: lerp(a[2], b[2], t).toFixed(2) });
    });
    c.gLab.setAttribute("opacity", ease(seg(pos, 0.4, 1)) * (1 - ease(seg(pos, 2.1, 2.6))));
    c.gEnd.setAttribute("opacity", ease(seg(pos, 2.5, 3)));
  },
};

/* Monthly readings for one sector's indicators: green points to faster growth, red to slower. */
VIS.heat = {
  n: 1,
  build(c) {
    const g = c.svg, W = c.W, H = c.H, S = SEC[c.opt.sector || "industry"];
    const ids = S.members.slice(0, 8).map((m) => m[0]);
    const lw = W < 480 ? 128 : 190, top = 26, bottom = W < 330 ? 58 : 40;
    const cw = (W - lw - 8) / D.zMonths.length, rh = Math.min(30, (H - top - bottom) / ids.length);
    D.zMonths.forEach((mo, j) => el("text", { x: lw + cw * j + cw / 2, y: 16, "text-anchor": "middle" }, g, MONTHS[Number(mo.slice(5)) - 1]));
    ids.forEach((id, i) => {
      const y = top + i * rh;
      /* Long names wrap onto two lines, and are cut with an ellipsis only if they still do not fit; the full name stays on hover. */
      const full = D.names[id], maxc = Math.max(6, Math.floor((lw - 14) / 6.6));
      let lines = [full];
      if (full.length > maxc) {
        let a1 = "", b1 = "";
        full.split(" ").forEach((w) => { if (!b1 && (a1 + " " + w).trim().length <= maxc) a1 = (a1 + " " + w).trim(); else b1 = (b1 + " " + w).trim(); });
        lines = !a1 ? [full.slice(0, maxc - 1) + "…"] : [a1, b1.length > maxc ? b1.slice(0, maxc - 1) + "…" : b1];
      }
      lines.forEach((ln, k) => {
        const t = el("text", { x: lw - 10, y: lines.length === 1 ? y + rh / 2 + 4 : y + rh / 2 - 2 + k * 12, class: "lbl", "text-anchor": "end" }, g, ln);
        el("title", null, t, full);
      });
      D.z[id].forEach((z, j) => {
        const x = lw + cw * j + 1.5;
        if (z == null) { el("rect", { x, y: y + 2, width: cw - 3, height: rh - 4, rx: 3, class: "hz-na" }, g); return; }
        const s = z * D.sg[id];
        el("rect", { x, y: y + 2, width: cw - 3, height: rh - 4, rx: 3, class: s >= 0 ? "hz-pos" : "hz-neg", opacity: (0.15 + 0.85 * Math.min(1, Math.abs(s) / 1.5)).toFixed(2) }, g);
      });
    });
    const ly = top + ids.length * rh + 18;
    (W < 330 ? ["green: faster growth", "red: slower growth", "grey: not yet published"] : ["green: faster growth · red: slower growth", "grey: not yet published"]).forEach((t, k) => el("text", { x: 4, y: ly + k * 16 }, g, t));
  },
  render() {},
};

/* ---------- Framework ---------- */
const ALL = [], SCENES = [], TRACKS = [], SCRUBS = [];
function ctx(host, name, opt) {
  const def = VIS[name];
  const c = { host, o: def, name, opt: opt || {}, svg: null, W: 0, H: 0, pos: -1 };
  if (def.init) def.init(c);
  c.rebuild = () => { build(c); draw(c, c.pos < 0 ? 0 : c.pos); };
  build(c);
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => { const r = host.getBoundingClientRect(); if (Math.round(r.width) !== c.W || Math.round(r.height) !== c.H) c.rebuild(); }).observe(host);
  }
  ALL.push(c);
  return c;
}
function build(c) {
  const r = c.host.getBoundingClientRect();
  /* A chart whose box has no size yet (not laid out, or inside a closed section) is drawn once it has one: the ResizeObserver calls rebuild. */
  if (r.width < 4 || r.height < 4) { c.built = false; return; }
  c.built = true;
  c.W = Math.max(1, Math.round(r.width));
  c.H = Math.max(1, Math.round(r.height));
  if (c.svg) c.svg.remove();
  c.svg = el("svg", { class: "plot", viewBox: `0 0 ${c.W} ${c.H}`, "aria-hidden": "true" });
  c.host.prepend(c.svg);
  c.o.build(c);
}
function draw(c, pos) { c.pos = pos; if (c.built === false) return; c.o.render(c, pos); }
function nOf(c) { return c.n || c.o.n; }
/* A static figure, drawn at its final state, or scrubbed by its position on screen with data-scrub. */
function figure(host, name, opt) {
  const c = ctx(host, name, opt);
  draw(c, opt && opt.pos != null ? opt.pos : nOf(c) - 1);
  if (opt && opt.scrub) SCRUBS.push(c);
  return c;
}
/* A scrollytelling scene: a pinned graphic that follows the text steps beside or below it. */
function scene(root, name, opt) {
  const host = root.querySelector(".graphic .fig");
  const c = ctx(host, name, opt);
  c.steps = [...root.querySelectorAll(".step")];
  c.at = c.steps.map((s, i) => (s.dataset.at != null ? Number(s.dataset.at) : i));
  c.root = root;
  draw(c, c.at[0]);
  SCENES.push(c);
  return c;
}
function updateScene(c, vh) {
  const r = c.root.getBoundingClientRect();
  if (r.bottom < -100 || r.top > vh + 100) return;
  const g = c.root.querySelector(".graphic").getBoundingClientRect();
  const stacked = innerWidth <= 860;
  const trigger = stacked ? (g.bottom + vh) / 2 : vh * 0.55;
  const centers = c.steps.map((s) => { const b = (s.querySelector(".box") || s).getBoundingClientRect(); return b.top + b.height / 2; });
  let f = 0;
  if (trigger >= centers[centers.length - 1]) f = centers.length - 1;
  else if (trigger > centers[0]) {
    for (let k = 0; k < centers.length - 1; k++) {
      if (trigger >= centers[k] && trigger < centers[k + 1]) { f = k + (trigger - centers[k]) / (centers[k + 1] - centers[k]); break; }
    }
  }
  const k = Math.floor(f), fr = f - k;
  const pos = k + 1 < c.at.length ? lerp(c.at[k], c.at[k + 1], fr) : c.at[k];
  const active = Math.round(f);
  c.steps.forEach((s, i) => s.classList.toggle("is-active", i === active));
  if (Math.abs(pos - c.pos) > 0.0005) draw(c, pos);
  if (c.opt.onStep && active !== c.active) { c.active = active; c.opt.onStep(active, c); }
}
function updateScrub(c, vh) {
  const r = c.host.getBoundingClientRect();
  if (r.bottom < -100 || r.top > vh + 100) return;
  const t = clamp((vh * 0.92 - r.top) / (vh * 0.5), 0, 1);
  const pos = t * (nOf(c) - 1);
  if (Math.abs(pos - c.pos) > 0.0005) draw(c, pos);
}
function onScroll() {
  const vh = innerHeight;
  SCENES.forEach((c) => updateScene(c, vh));
  SCRUBS.forEach((c) => updateScrub(c, vh));
  TRACKS.forEach((t) => {
    const r = t.root.getBoundingClientRect();
    if (r.bottom < -100 || r.top > vh + 100) return;
    const top = t.stick instanceof Element ? parseFloat(getComputedStyle(t.stick).top) || 0 : 0;
    const span = r.height - t.stick.offsetHeight - top;
    t.render(span > 0 ? clamp((top - r.top) / span, 0, 1) : 0);
  });
}
let ticking = false;
function requestTick() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; onScroll(); });
}

/* ---------- 02 Pinned hero that comes apart (a track scene, no SVG) ---------- */
function heroScene(root) {
  const stick = root.querySelector(".stick");
  const q = (s) => root.querySelector(s);
  const k = q(".k"), num = q(".bignum"), say = q(".say"), rng = q(".rng"), rngi = q(".rng .bar i"), parts = [...root.querySelectorAll(".part")], cue = q(".cue"), hint = q(".hint");
  q(".bignum .v").textContent = N.point.toFixed(1);
  q(".rng .lo").textContent = pct(N.lo90);
  q(".rng .hi").textContent = pct(N.hi90);
  say.textContent = COPY.lede;
  const signed = (v) => (v < 0 ? "−" : "+") + Math.abs(v).toFixed(1);
  [DEC.baseline.toFixed(1), signed(DEC.reported), signed(DEC.carriedForward)].forEach((v, i) => (parts[i].querySelector("b").textContent = v));
  const render = (p) => {
    const H = stick.offsetHeight, W = stick.offsetWidth, pos = p * 4;
    const t1 = ease(seg(pos, 0.15, 1)), t2 = ease(seg(pos, 1.15, 2.1)), t3 = ease(seg(pos, 2.4, 3.3));
    const open = t2 * (1 - t3);
    const numY = -H * 0.08 - H * 0.1 * t1;
    k.style.transform = `translateY(${-H * 0.34}px)`;
    num.style.transform = `translateY(${numY}px) scale(${1 - 0.4 * t1})`;
    num.style.opacity = String(1 - 0.9 * open);
    say.style.transform = `translateY(${H * 0.17}px)`;
    say.style.opacity = String(1 - t1);
    rng.style.transform = `translateY(${H * 0.1}px)`;
    rng.style.opacity = String(t1 * (1 - open));
    rngi.style.transform = `scaleX(${t1})`;
    const spread = Math.min(W * 0.31, 260);
    parts.forEach((pt, i) => {
      pt.style.transform = `translate(${(i - 1) * spread * open}px, ${lerp(numY, H * 0.1, open)}px) scale(${lerp(0.55, 1, open)})`;
      pt.style.opacity = String(open);
    });
    cue.style.transform = `translateY(${H * 0.12}px)`;
    cue.style.opacity = String(t3);
    hint.style.opacity = String(1 - seg(pos, 0, 0.4));
  };
  TRACKS.push({ root, stick, render });
  render(0);
}

/* ---------- 07 Field-note opener: terrain drawn from the GDP record, with parallax ---------- */
/* Three ridges drawn from the GDP record, layered back to front. The same drawing is the opener's backdrop and the first card's. */
function drawTerrain(root, svg) {
  const W = root.offsetWidth, H = root.offsetHeight;
  svg.textContent = "";
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");
  const sm = A.map((v, i) => { let s = 0, k = 0; for (let j = i - 3; j <= i + 3; j++) if (j >= 0 && j < A.length && A[j] != null) { s += clamp(A[j], 0, 12); k++; } return k ? s / k : 6; });
  [[0.6, 0.18, 0], [0.72, 0.13, 21], [0.84, 0.09, 42]].forEach(([base, amp, shift], L) => {
    let d = `M0,${H}`;
    for (let j = 0; j <= 60; j++) {
      const v = sm[(Math.round((j / 60) * (sm.length - 1)) + shift) % sm.length];
      d += `L${((j / 60) * W).toFixed(1)},${(H * base - ((v - 6) / 6) * H * amp).toFixed(1)}`;
    }
    el("path", { d: d + `L${W},${H}Z`, class: "t" + L }, svg);
  });
}
function opener(root) {
  const svg = root.querySelector(".terrain"), inner = root.querySelector(".wrap");
  const draw = () => drawTerrain(root, svg);
  draw();
  addEventListener("resize", draw);
  TRACKS.push({
    root, stick: { offsetHeight: 0 },
    render: () => {
      const y = clamp(-root.getBoundingClientRect().top, 0, root.offsetHeight);
      svg.style.transform = `translateY(${(y * 0.45).toFixed(1)}px)`;
      inner.style.transform = `translateY(${(y * 0.25).toFixed(1)}px)`;
      inner.style.opacity = String(1 - seg(y, root.offsetHeight * 0.15, root.offsetHeight * 0.7));
    },
  });
}
/* The first card's backdrop: the same terrain, still, so the numbers over it never move or fade. */
function terrain(root) {
  const svg = root.querySelector(".terrain");
  drawTerrain(root, svg);
  let w = root.offsetWidth;
  addEventListener("resize", () => { if (root.offsetWidth !== w) { w = root.offsetWidth; drawTerrain(root, svg); } });
}

/* ---------- Content blocks: cards like the live site's, the topic as an eyebrow and the takeaway as the heading ---------- */
function head(eyebrow, title, sub) {
  return h("div", { class: "sec-head" }, h("p", { class: "eyebrow", text: eyebrow }), title ? h("h2", { class: "take", text: title }) : null, sub ? h("p", { text: sub }) : null);
}
function panel(el, eyebrow, title, sub, ...content) {
  const d = el.dataset;
  el.append(h("div", { class: "wrap" }, h("div", { class: "panel" }, head(d.eyebrow || eyebrow, d.title != null ? d.title : title, d.sub != null ? d.sub : sub), ...content)));
}
function figHost(cls) { return h("div", { class: "fig" + (cls ? " " + cls : "") }); }
function signedSpan(v, unit = " pp") { return h("span", { class: Math.abs(v) < 0.005 ? "" : v > 0 ? "up" : "down", text: pts(v) + unit }); }

/* Marks a note as written before newer data: three weeks old, or the estimate has moved 0.3 pp since. */
function noteStale(el) {
  const weeks = Math.floor((Date.parse(D.asOf) - Date.parse(NOTE.date)) / (7 * 864e5));
  const moved = N.point - NOTE.estThen;
  if (weeks < 3 && Math.abs(moved) < 0.3) return null;
  return h("p", { class: "stale", text: `Written ${weeks} week${weeks === 1 ? "" : "s"} before the latest model run, and the estimate has moved ${pp(moved)} since. Read it ${el.dataset.since === "above" ? "with the update above" : "alongside the latest numbers"}.` });
}
const BLOCKS = {
  answer(el) {
    const rb = h("div", { class: "rb" });
    el.classList.add("hero-wash");
    el.style.paddingBlock = "18px 14px";
    el.append(h("div", { class: "wrap" }, h("div", { class: "panel" }, h("div", { class: "answer" },
      h("div", null,
        h("p", { class: "eyebrow", text: COPY.eyebrow }),
        h("p", { class: "big" }, N.point.toFixed(1), h("small", { text: "%" })),
        h("p", { class: "rng-line", text: COPY.range }),
        el.dataset.verdict ? h("h1", { class: "verdict", text: el.dataset.verdict }) : null,
        h("p", { class: "lede", text: COPY.lede })),
      h("div", { class: "side" },
        h("div", { class: "rangebar" }, h("span", { class: "lab", text: "Where the official figure is likely to land" }), rb),
        h("div", { class: "meter", role: "meter", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(Math.round(N.share * 100)), "aria-label": "Share of this quarter's data in" },
          h("span", { text: COPY.dataIn }), h("span", { class: "track" }, h("i", { style: `width:${Math.round(N.share * 100)}%` }))),
        h("ul", { class: "chips" }, h("li", { text: COPY.asOf }), h("li", { text: COPY.week })),
        h("p", { class: "small", style: "margin:0" }, h("b", { text: COPY.release })))))));
    figure(rb, "rangebar");
  },
  strip(el) {
    const rb = h("div", { class: "rb", style: "width:220px;height:30px;position:relative" });
    el.classList.add("strip");
    el.append(h("div", { class: "wrap" },
      h("span", { class: "n", text: pct(N.point) }),
      h("span", { class: "t" }, h("b", { text: `GDP growth, ${D.quarter} · early estimate` }), h("span", { text: `${COPY.range} · ${COPY.releaseShort}` })),
      rb));
    figure(rb, "rangebar");
  },
  three(el) {
    panel(el, "Three things to know", null, null,
      h("ol", { class: "three" }, THREE.map(([b, s]) => h("li", null, h("b", { text: b }), h("span", { text: s })))));
  },
  changed(el) {
    const f = figHost("short");
    const names = WEEK[4].map((i) => D.names[i]);
    panel(el, "What changed", TAKE.changed, "We re-run the estimate every week as new figures are published.",
      h("div", { class: "grid-2" },
        h("div", null,
          h("dl", { class: "kpi" },
            h("div", null, h("dt", { text: "This week" }), h("dd", { text: Math.abs(weekChange) < 0.05 ? "Unchanged" : pp(weekChange) })),
            h("div", null, h("dt", { text: `Since ${day(D.month.from, false)}` }), h("dd", { text: pp(D.month.d) }))),
          h("p", { class: "muted", text: `A quiet week: ${names.length} minor update${names.length === 1 ? "" : "s"} (${names.join(", ")}). Over the past month the estimate rose from ${pct(D.month.fromEst)} to ${pct(N.point)}, most of it on 2 Aug when industrial production for June came in.` }),
          h("p", { class: "eyebrow", style: "margin-top:14px", text: "Biggest moves over the past month" }),
          h("ul", { class: "movers" }, D.month.top.map(([n, v]) => h("li", null, h("span", { text: n }), signedSpan(v, " pp"))))),
        h("div", null, f, h("p", { class: "caption", text: "Our weekly estimate since June, with the range it is likely to fall in nine times in ten." }))));
    figure(f, "weekly", { scrub: el.dataset.scrub != null });
  },
  why(el) {
    const f = figHost("tall");
    const fin = (SEC.financial || { c: 0 }).c, tr = (SEC.trade || { c: 0 }).c;
    panel(el, "What's moving the estimate", TAKE.why, null,
      h("div", { class: "grid-2" },
        h("div", null, f),
        h("div", { style: "display:grid;gap:12px;align-content:start" },
          h("p", { style: "margin:0", text: `Start from long-run average growth of ${pct(DEC.baseline)}. This quarter's reported data takes off ${Math.abs(DEC.reported).toFixed(1)} pp, led by financial conditions (${pp(fin, 2)}, mostly share prices) and trade and external (${pp(tr, 2)}, mostly the rupee).` }),
          h("p", { style: "margin:0", text: `Momentum from earlier months adds ${DEC.carriedForward.toFixed(1)} pp. It is the model's carry-forward for data not yet in, so the estimate will keep moving until the quarter's figures are complete.` }),
          h("p", { class: "muted small", style: "margin:0", text: "pp = percentage points of GDP growth." }))));
    figure(f, "buildup", { focus: el.dataset.focus || null, scrub: el.dataset.scrub != null });
  },
  context(el) {
    const f = figHost("tall");
    panel(el, "Context", TAKE.context, `Quarterly GDP growth since 2005, each quarter against the same quarter a year earlier. The dot is our estimate for ${D.quarterLong}.`,
      f, h("p", { class: "caption", text: "Source: MoSPI. The last point is the India GDP Pulse estimate." }));
    figure(f, "history", { mode: "context" });
  },
  sure(el) {
    const f1 = figHost(), f2 = figHost();
    panel(el, "How sure we are", TAKE.sure, "An early estimate is a range, not a point. Here is ours, and how our past estimates have done.",
      h("div", { class: "grid-2" },
        h("div", null, h("h3", { style: "margin:0 0 6px;font-size:1rem", text: "The range this quarter" }), f1,
          h("p", { class: "caption", text: `Light band: nine times in ten (${pct(N.lo90)} to ${pct(N.hi90)}). Dark band: two times in three (${pct(N.lo68)} to ${pct(N.hi68)}).` })),
        h("div", null, h("h3", { style: "margin:0 0 6px;font-size:1rem", text: "Our record so far" }), f2, BLOCKS.honest())));
    figure(f1, "noise", { noDraws: true });
    figure(f2, "track", { scrub: true });
  },
  honest() {
    return h("div", { class: "honest" },
      h("div", { class: "statrow" },
        h("div", { class: "stat" }, h("b", { text: TS.mae.toFixed(2) + " pp" }), h("span", { text: `our average miss over the last ${TS.n} quarters` })),
        h("div", { class: "stat" }, h("b", { text: TS.naiveMae.toFixed(2) + " pp" }), h("span", { text: "if growth simply stayed at last quarter's rate" })),
        h("div", { class: "stat" }, h("b", { text: String(TS.below) }), h("span", { text: "quarters in a row below the official figure" }))),
      h("p", { class: "small", text: `Over the last ${TS.n} quarters, our estimate made a week before each official release missed by ${TS.mae.toFixed(1)} pp on average; simply assuming growth stays at last quarter's rate missed by ${TS.naiveMae.toFixed(1)} pp. Our estimates have also run below the official figure ${TS.below} quarters in a row. The Stat team is reviewing why, and this record updates after every release.` }));
  },
  note(el) {
    const night = el.dataset.variant === "night";
    const more = h("div", { class: "body", hidden: "" }, NOTE.more.map((t) => h("p", { text: t })));
    const btn = h("button", { class: "btn ghost", type: "button", "aria-expanded": "false", text: "Read the full note" });
    btn.addEventListener("click", () => { const open = more.hidden; more.hidden = !open; btn.setAttribute("aria-expanded", String(open)); btn.textContent = open ? "Show less" : "Read the full note"; });
    el.append(h("div", { class: "wrap" },
      h("article", { class: "note" + (night ? " night" : "") },
        h("div", { class: "who" }, h("p", { class: "eyebrow", text: `From the Stat team · note of ${day(NOTE.date)}` }), h("span", { class: "sample", text: "Sample text for this demo" })),
        h("h3", { text: NOTE.title }),
        h("div", { class: "body" }, NOTE.teaser.map((t) => h("p", { text: t }))),
        more,
        h("p", { class: "since" }, h("span", { text: `Written when our estimate was ${pct(NOTE.estThen)}.` }), h("b", { text: `It is now ${pct(N.point)}.` })),
        noteStale(el),
        h("div", null, btn))));
  },
  /* Comes after the answer on every page that shows it first, so it asks for a call against our estimate
     instead of hiding it: higher or lower than us? */
  guess(el) {
    const f = figHost();
    const result = h("p", { class: "result", "aria-live": "polite" });
    const lock = h("button", { class: "btn", type: "button", text: "Lock in my call" });
    let c, locked = false;
    const explain = () => {
      if (!c.dragged) { result.textContent = `Drag the dot in the shaded column. It starts at last quarter's ${pct(A[LAST])}.`; return; }
      const g = c.guess, d = g - N.point, inside = g >= N.lo68 && g <= N.hi68;
      const where = Math.abs(d) < 0.05 ? "the same as our estimate" : `${Math.abs(d).toFixed(1)} pp ${d > 0 ? "above" : "below"} our estimate, ${inside ? "inside" : "outside"} the range we expect two times in three`;
      result.textContent = locked
        ? `Locked in at ${pct(g)}, ${where}. Come back on ${day(D.release, false)} to see who was closer.`
        : `You say ${pct(g)}: ${where}.`;
    };
    lock.addEventListener("click", () => {
      if (!c.dragged && !locked) { explain(); return; }
      locked = !locked;
      lock.textContent = locked ? "Change my call" : "Lock in my call";
      explain();
    });
    panel(el, "Make your call", TAKE.guess, `The official figure for ${D.quarterLong} is due on ${day(D.release)}. Do you think it will come in above or below our estimate?`,
      h("div", { class: "guess" },
        h("div", { class: "controls" }, result, h("div", null, lock),
          h("p", { class: "muted small", text: "On the live site, readers' calls would be collected and shown here after the release." })),
        f));
    c = figure(f, "guess", { pos: 3, onChange: () => { if (locked) { locked = false; lock.textContent = "Lock in my call"; } explain(); } });
    explain();
  },
  sectors(el) {
    const list = D.sec.filter((s) => s.k !== "prices");
    const maxAbs = Math.max(...list.map((s) => Math.abs(s.c)));
    const sel = el.dataset.sel;
    panel(el, "The economy by sector", TAKE.sectors, "How much each part of the economy has moved this quarter's estimate, from the data reported so far.",
      h("div", { class: "tiles" }, list.map((s) => h("div", { class: "tile" + (s.k === sel ? " sel" : ""), "data-k": s.k },
        h("h3", { text: s.label }), h("p", { text: s.blurb }),
        h("span", { class: "v" }, signedSpan(s.c)),
        h("span", { class: "meter" }, h("i", { style: `width:${((Math.abs(s.c) / maxAbs) * 100).toFixed(0)}%;background:var(${s.c < 0 ? "--down" : "--up"})` })),
        h("span", { class: "in", text: `${s.rep} of ${s.n} reported` })))));
  },
  next(el) {
    const msg = h("p", { class: "msg", "aria-live": "polite", text: "One short email a week, the day the estimate updates." });
    const form = h("form", null, h("label", { for: "signup-email", style: "position:absolute;left:-9999px", text: "Email address" }),
      h("input", { id: "signup-email", type: "email", placeholder: "you@example.org", autocomplete: "off" }),
      h("button", { class: "btn", type: "submit", text: "Sign up" }));
    form.addEventListener("submit", (e) => { e.preventDefault(); msg.textContent = "Demo only: sign-up isn't connected on this page."; });
    panel(el, "What's coming", TAKE.next, null,
      h("div", { class: "grid-2" },
        h("ul", { class: "cal" }, D.cal.slice(0, 6).map(([date, items], i) => h("li", { class: i === 0 ? "gdp" : "" },
          h("span", { class: "d", text: day(date, false) }),
          h("span", { class: "w" }, i === 0 ? `Official GDP for ${D.quarter}` : items.slice(0, 2).map((x) => x[0]).join(", ") + (items.length > 2 ? ` and ${items.length - 2} more` : ""),
            h("small", { text: i === 0 ? "Expected around this date. We score our estimate against it the same day." : `${items[0][1]} figures, due around this date` }))))),
        h("div", { class: "signup" }, h("h3", { style: "margin:0;font-size:1rem", text: "Get the weekly update" }), form, msg)));
  },
  how(el) {
    const msg = h("span", { class: "msg", "aria-live": "polite" });
    const cite = `The India Prosperity Initiative, India GDP Pulse: early estimate of India's GDP growth for ${D.quarterLong}, as of ${day(D.asOf)}.`;
    const citeBtn = h("button", { class: "btn ghost", type: "button", text: "Copy citation" });
    citeBtn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(cite); msg.textContent = "Citation copied."; } catch (e) { msg.textContent = cite; }
    });
    panel(el, "How it works", TAKE.how, null,
      h("ol", { class: "how" },
        h("li", null, h("b", { text: String(D.dots.length) }), h("span", { text: `indicators across ${D.sec.length} parts of the economy, each updated as it is published.` })),
        h("li", null, h("b", { text: "2" }), h("span", { text: `models read ${D.model.read} of them: a regression on a few activity indicators, and a statistical model that finds ${D.model.factors} common trends.` })),
        h("li", null, h("b", { text: "1" }), h("span", { text: "early estimate of GDP growth, the average of the two, updated every week." }))),
      h("div", { class: "use" }, h("a", { class: "btn ghost", href: "/methodology", text: "Methodology" }), citeBtn, msg));
  },
};

/* ---------- 06 Sector picker: re-tells the page for one part of the economy ---------- */
const sectorViews = [];
function sectorSummary(el) {
  const render = (k) => {
    const S = SEC[k];
    el.textContent = "";
    el.append(h("div", { class: "sector-sum" },
      h("p", { class: "eyebrow", text: "Your part of the economy" }),
      h("h3", { text: S.label }),
      h("p", { class: "muted", text: S.blurb }),
      h("p", { class: "big" }, signedSpan(S.c), h("small", { class: "muted", style: "font-size:1rem", text: " on the estimate so far" })),
      h("p", { text: `${S.rep === S.n ? `All ${S.n}` : `${S.rep} of ${S.n}`} of its indicators have reported for ${D.quarterLong}.${S.top ? ` The biggest mover so far is ${S.top} (${pp(S.topC, 2)}).` : ""}` })));
  };
  sectorViews.push(render);
}
const PICKERS = [];
function pickSector(k) {
  PICKERS.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === k)));
  sectorViews.forEach((f) => f(k));
}
function picker(root) {
  const buttons = [...root.querySelectorAll("[data-k]")];
  buttons.forEach((b) => { PICKERS.push(b); b.addEventListener("click", () => pickSector(b.dataset.k)); });
  return pickSector;
}

/* ---------- Demo chrome ---------- */
const DEMOS = [
  ["briefing.html", "The straight answer"],
  ["comes-apart.html", "The number comes apart"],
  ["twenty-years.html", "Twenty years in one chart"],
  ["week-in-data.html", "The week in data"],
  ["make-your-call.html", "Make your call"],
  ["your-economy.html", "Your part of the economy"],
  ["field-note.html", "The field note"],
  ["how-we-know.html", "How we know"],
];
/* The site's header, disclaimer and footer, the same as the other pages. */
const CONNECT = [["YouTube", "https://www.youtube.com/"], ["Instagram", "https://www.instagram.com/"], ["Twitter", "https://twitter.com/"], ["LinkedIn", "https://www.linkedin.com/"]];
const TIPI_URL = "https://fantastic-donut-1c4357.netlify.app/";
function chrome() {
  const hd = document.querySelector('[data-chrome="head"]');
  if (hd) {
    hd.className = "site-head";
    const nav = h("nav", { class: "nav", id: "site-nav", "aria-label": "Site sections" },
      h("a", { href: "/", class: "on", "aria-current": "page", text: "GDP Pulse" }), h("a", { href: "/trends", text: "Evidence" }),
      h("a", { href: "/indicators", text: "Indicators" }), h("a", { href: "/methodology", text: "Methodology" }));
    const menu = h("button", { class: "menu", type: "button", "aria-expanded": "false", "aria-controls": "site-nav", "aria-label": "Toggle navigation" }, h("i"), h("i"), h("i"));
    menu.addEventListener("click", () => { const open = !nav.classList.contains("open"); nav.classList.toggle("open", open); menu.setAttribute("aria-expanded", String(open)); });
    hd.append(h("div", { class: "wrap" },
      h("a", { class: "brand", href: "/" },
        h("img", { src: "/tipi-logo.svg", alt: "The India Prosperity Initiative logo", width: "91", height: "36" }),
        h("span", null, h("b", { text: "India GDP Pulse" }))),
      nav, menu));
    const onScroll = () => hd.classList.toggle("scrolled", scrollY > 12);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
  const ft = document.querySelector('[data-chrome="foot"]');
  if (ft) {
    ft.before(h("div", { class: "wrap" }, h("aside", { class: "disclaimer" },
      h("b", { text: "Experimental estimate, not official statistics." }), " " + (D.disclaimer || ""), " ",
      h("a", { href: "/methodology", text: "How this works" }))));
    ft.className = "site-foot";
    const ext = (label, href) => h("li", null, h("a", { href, target: "_blank", rel: "noreferrer", text: label }));
    ft.append(
      h("div", { class: "wrap top" },
        h("div", null,
          h("img", { class: "plate", src: "/tipi-logo.svg", alt: "The India Prosperity Initiative logo", width: "162", height: "64" }),
          h("p", { class: "lead", text: "India GDP Pulse is the flagship project of The India Prosperity Initiative" })),
        h("div", { class: "cols" },
          h("div", null, h("h2", { text: "Connect" }), h("ul", null, CONNECT.map(([l, u]) => ext(l, u)))),
          h("div", null, h("h2", { text: "Other links" }), h("ul", null, ext("The India Prosperity Initiative", TIPI_URL))))),
      h("div", { class: "wrap" }, h("div", { class: "rule" }),
        h("p", { class: "copy", text: `© ${new Date().getFullYear()} The India Prosperity Initiative. Images are owned by respective owners.` })));
  }
}

/* A page opens at its top. The browser can carry a saved scroll position over (a reload, "back", or a link followed from far down
   another page), so reset it unless the reader has already scrolled or followed a link to a section. */
function startAtTop() {
  try { history.scrollRestoration = "manual"; } catch (e) { /* not available */ }
  if (location.hash) return;
  let moved = false;
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach((ev) => addEventListener(ev, () => { moved = true; }, { once: true, passive: true }));
  addEventListener("hashchange", () => { moved = true; });   /* a link to a section is the reader asking to be there */
  const top = () => { if (!moved && scrollY > 0) scrollTo({ top: 0, left: 0, behavior: "instant" }); };
  top();
  addEventListener("load", top);
  addEventListener("pageshow", top);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(top);
  setTimeout(top, 400);
}
function mount() {
  startAtTop();
  chrome();
  document.querySelectorAll("[data-block]").forEach((e) => BLOCKS[e.dataset.block](e));
  document.querySelectorAll("[data-figure]").forEach((e) => figure(e, e.dataset.figure, { pos: e.dataset.pos != null ? Number(e.dataset.pos) : null, scrub: e.dataset.scrub != null, mode: e.dataset.mode, focus: e.dataset.focus, sector: e.dataset.sector, noDraws: e.dataset.nodraws != null }));
  document.querySelectorAll(".scrolly[data-scene]").forEach((e) => scene(e, e.dataset.scene, { focus: e.dataset.focus, quiet: e.dataset.quiet != null }));
  document.querySelectorAll(".hero-scene").forEach(heroScene);
  document.querySelectorAll(".opener").forEach(opener);
  if (document.body.dataset.reveal != null && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { rootMargin: "0px 0px -12% 0px" });
    document.querySelectorAll(".reveal").forEach((e) => io.observe(e));
  }
  addEventListener("scroll", requestTick, { passive: true });
  addEventListener("resize", requestTick);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { ALL.forEach((c) => c.rebuild()); requestTick(); });
  requestTick();
}

window.GDP = { charts: ALL, terrain, tipper, niceAxis, tickLabel, mount, figure, scene, sectorSummary, picker, onSector: (f) => sectorViews.push(f), VIS, BLOCKS, COPY, NOTE, TAKE, SEC, GROUPS, D, pct, pts, pp, fix, day, h, el, set, scale, clamp, lerp, ease, seg, draw };
})();
