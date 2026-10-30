/**
 * Builds public/pulse/data.js (window.GDP_DATA) for the landing page from the pipeline's export:
 * src/data/nowcast.json, indicators.json and series/. Run before every build (see package.json), so a
 * weekly data refresh rewrites the landing page's numbers, charts and sentences with no other change.
 *
 * The landing page (public/index.html with public/pulse/kit.js and story.js) reads one compact object;
 * this file is the only place that knows how nowcast.json maps onto it. The field map for nowcast.json
 * itself is docs/frontend_contract.md in the pipeline repo.
 */
import fs from "node:fs";
import path from "node:path";
import { SECTORS, sectorOf } from "../src/lib/sectors.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const fail = (msg) => {
  console.error(`build-pulse-data: ${msg}`);
  process.exit(1);
};

/* PULSE_NOWCAST and PULSE_OUT exist to try the page on another export, such as one from the early weeks of a quarter. */
const NC = process.env.PULSE_NOWCAST
  ? JSON.parse(fs.readFileSync(process.env.PULSE_NOWCAST, "utf8"))
  : read("src/data/nowcast.json");
const INDICATORS = read("src/data/indicators.json");
const BY_ID = Object.fromEntries(INDICATORS.map((i) => [i.id, i]));
for (const key of [
  "nowcast",
  "history",
  "drivers",
  "signals",
  "vintages",
  "trackRecord",
  "decomposition",
]) {
  if (NC[key] == null) fail(`nowcast.json has no "${key}": is it the Phase 0 headline export?`);
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_MS = 86_400_000;
const round = (v, d = 3) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);
const dash = (label) => label.replace("-", "–");
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const startMonth = (iso) => Number(iso.slice(5, 7)) - 1;
const longQuarter = (iso) => `${MONTHS[startMonth(iso)]} to ${MONTHS[startMonth(iso) + 2]}`;

/* What the pages call each series. These are the names the landing page's sentences are written around
   (a few are matched by name in story.js: the release calendar's reasons and the method examples). */
const NAMES = {
  iip_general: "Industrial production",
  iip_manufacturing_sector: "Manufacturing output",
  forex_total_reserves: "Forex reserves",
  wpi_all_commodities: "Wholesale prices",
  wpi_manufactured_products: "Wholesale prices, manufactures",
  non_oil_non_gold_imports: "Non-oil imports",
  steel_production_index: "Steel production",
  cement_production_index: "Cement production",
  cpi_combined_urban_rural: "Consumer prices",
  iip_electricity_sector: "Electricity output",
  electricity_generation_index: "Power generation",
  cpi_iw: "CPI, industrial workers",
  money_supply_m3: "Broad money",
  coal_production_index: "Coal production",
  crude_oil_production_index: "Crude oil production",
  bank_credit_non_food: "Non-food bank credit",
  petroleum_product_consumption: "Fuel consumption",
  central_govt_tax_revenue: "Central tax revenue",
  ici_overall: "Core industries",
  cpi_al: "CPI, farm labourers",
  cpi_rl: "CPI, rural labourers",
  "10y_gsec_yield": "10-year bond yield",
  tbill_91day_yield: "91-day T-bill yield",
  gsec10y_minus_tbill91d_spread: "Bond yield spread",
  usdinr_6m_forward_premia: "Rupee forward premium",
  scb_aggregate_deposits: "Bank deposits",
  bank_credit_housing: "Housing loans",
  bank_credit_personal_loans: "Personal loans",
  bank_credit_services: "Bank credit to services",
  bank_credit_industries: "Bank credit to industry",
  mibor_overnight: "Overnight interbank rate",
  us_fed_funds_rate_upper: "US Fed rate",
  bse_sensex_close: "Sensex",
  bse_500_close: "BSE 500",
  nifty_50_close: "Nifty 50",
  nifty_500_close: "Nifty 500",
  india_vix_close: "Market volatility (VIX)",
  sp500_close: "S&P 500",
  brent_crude_spot_price: "Brent crude price",
  repo_rate: "Repo rate",
  reverse_repo_rate: "Reverse repo rate",
  slr: "SLR",
  neer_40currency: "Rupee, trade-weighted",
  reer_40currency: "Rupee, real rate",
  net_foreign_exchange_assets_bankingsector: "Banks' foreign assets",
  usdinr_exchange_rate: "Rupee–dollar rate",
  money_supply_m0: "Reserve money",
  money_supply_m1: "Narrow money",
  crude_oil_imports_value: "Crude oil imports",
  petroleum_products_exports_value: "Petroleum exports",
  merchandise_export_import_ratio: "Export-import ratio",
  euro_area_industrial_production: "Euro-area industry",
  major_port_cargo_traffic: "Port cargo",
  us_industrial_production_index: "US industry",
  electricity_peak_demand: "Peak power demand",
  gst_eway_bill_volume: "E-way bills",
  iip_mining_sector: "Mining output",
  iip_intermediate_goods: "Intermediate goods output",
  iip_infrastructure_construction_goods: "Construction goods output",
  iip_basic_metals: "Metals output",
  wpi_non_food_articles: "Wholesale prices, non-food",
  gold_price_mumbai_inr: "Gold price",
  imf_world_commodity_price_index: "World commodity prices",
  indian_crude_oil_basket_price: "Indian crude basket price",
  agricultural_rural_wages_men_avg: "Rural wages",
  central_govt_capital_expenditure: "Central capital spending",
  central_govt_revenue_expenditure: "Central revenue spending",
  central_govt_total_receipts_ex_borrowing: "Central government receipts",
  gst_gross_revenue_collection: "GST collections",
};
const SHORT = {
  industry: "Industry",
  households: "Households",
  credit: "Credit",
  trade: "Trade",
  government: "Government",
  financial: "Financial",
  global: "Global",
  prices: "Prices",
};
const nameOf = (id) => NAMES[id] ?? BY_ID[id]?.name ?? id;

/* ---------- the quarter ---------- */
const NOW = NC.nowcast;
const asOf = NC.dataAsOf ?? NC.generatedAt.slice(0, 10);
const lastActual = [...NC.history].reverse().find((h) => h.actual != null);
if (!lastActual) fail("history has no official quarter");
/* One slot per quarter from Apr-Jun 2005 to the last official one, so a quarter with no figure
   (the 2022-23 rebasing seam has three) stays a gap instead of shifting every later quarter. */
const A = NC.history.filter((h) => h.quarterStart <= lastActual.quarterStart).map((h) => h.actual);

const ci = (level) => NOW.confidenceIntervals?.find((c) => Math.abs(c.level - level) < 1e-9);
const c68 = ci(0.68);
const c90 = ci(0.9);
const rangeAvailable = Boolean(NOW.rangeAvailable && c68 && c90);
const point = NOW.pointEstimate;

/* ---------- indicators, in a fixed order: the heaviest first ---------- */
const drivers = NC.drivers.filter((d) => sectorOf(d.id) != null);
drivers.sort(
  (a, b) => Math.abs(b.weight) - Math.abs(a.weight) || nameOf(a.id).localeCompare(nameOf(b.id)),
);
const index = Object.fromEntries(drivers.map((d, i) => [d.id, i]));
const sectorIndex = Object.fromEntries(SECTORS.map((s, i) => [s.key, i]));

const months = NC.signals.months;
const rows = Object.fromEntries(NC.signals.rows.map((r) => [r.id, r.z]));
const lastSix = months.slice(-6);
const z = drivers.map((d) =>
  (rows[d.id] ?? []).slice(-6).map((v) => (v == null ? null : round(v, 2))),
);
const qMonths = [0, 1, 2].map((k) => {
  const m = startMonth(NOW.quarterStart) + k;
  return `${NOW.quarterStart.slice(0, 4)}-${String(m + 1).padStart(2, "0")}`;
});
const reported = drivers.map((d) => qMonths.some((m) => rows[d.id]?.[months.indexOf(m)] != null));

const sg = drivers.map((d) =>
  sectorOf(d.id) === "prices" ? 1 : Math.sign(d.sign ?? d.weight) || 1,
);
const contrib = drivers.map((d) => (d.contribution == null ? null : round(d.contribution, 3)));

const sec = SECTORS.map((s) => {
  const members = drivers.map((d, i) => [d, i]).filter(([d]) => sectorOf(d.id) === s.key);
  const withC = members.filter(([d]) => d.contribution != null);
  const top = withC
    .slice()
    .sort((a, b) => Math.abs(b[0].contribution) - Math.abs(a[0].contribution))[0];
  return {
    k: s.key,
    label: s.label,
    short: SHORT[s.key],
    blurb: s.blurb,
    n: members.length,
    rep: members.filter(([, i]) => reported[i]).length,
    c: round(
      withC.reduce((a, [d]) => a + d.contribution, 0),
      3,
    ),
    w: round(
      members.reduce((a, [d]) => a + Math.abs(d.weight), 0),
      3,
    ),
    top: top ? nameOf(top[0].id) : null,
    topC: top ? round(top[0].contribution, 3) : null,
    members: members.map(([, i]) => [i, reported[i] ? 1 : 0]),
  };
});

/* ---------- breadth: the same rule as the site's signals library ---------- */
const growth = drivers.map((d, i) => i).filter((i) => sectorOf(drivers[i].id) !== "prices");
const breadthPoints = months
  .map((month, mi) => {
    const vals = growth
      .map((i) => rows[drivers[i].id]?.[mi])
      .map((v, n) => (v == null ? null : v * sg[growth[n]]))
      .filter((v) => v != null);
    return {
      month,
      share: vals.filter((v) => v > 0).length / (vals.length || 1),
      covered: vals.length,
    };
  })
  .filter((p) => p.covered >= growth.length / 2);
const bLast = breadthPoints[breadthPoints.length - 1];
const bPrev = breadthPoints[Math.max(0, breadthPoints.length - 4)];
const breadth = bLast
  ? {
      month: bLast.month,
      share: round(bLast.share, 3),
      prevMonth: bPrev.month,
      prevShare: round(bPrev.share, 3),
    }
  : {
      month: months[months.length - 1],
      share: 0,
      prevMonth: months[months.length - 1],
      prevShare: 0,
    };

/* ---------- weekly runs ---------- */
const V = NC.vintages;
const dMoves = (cur, prev) =>
  drivers
    .map((d) => [nameOf(d.id), (cur?.[d.id] ?? 0) - (prev?.[d.id] ?? 0)])
    .filter(([, v]) => Math.abs(v) >= 0.005)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3)
    .map(([n, v]) => [n, round(v, 2)]);
const vint = V.map((v, i) => [
  v.asOf,
  round(v.estimate, 2),
  /* A week with no evaluated range gets a zero-width band at its estimate, so nothing is invented. */
  round(v.lower90 ?? v.estimate, 2),
  round(v.upper90 ?? v.estimate, 2),
  (v.released ?? []).filter((id) => id in index).map((id) => index[id]),
  i ? dMoves(v.contributions, V[i - 1].contributions) : [],
]);
const lastRun = V[V.length - 1];
const monthAgo =
  V.find((v) => Date.parse(lastRun.asOf) - Date.parse(v.asOf) <= 28 * DAY_MS) ?? V[0];
const month = {
  from: monthAgo.asOf,
  fromEst: round(monthAgo.estimate, 2),
  d: round(lastRun.estimate - monthAgo.estimate, 2),
  top: dMoves(lastRun.contributions, monthAgo.contributions),
};

/* ---------- the record ---------- */
const track = NC.trackRecord.filter((r) => r.official != null).slice(-8);
const em = track.map((r) => r.estimate - r.official);
const en = track.map((r) => r.naive - r.official);
const trackStats = {
  n: track.length,
  mae: round(mean(em.map(Math.abs)), 2),
  naiveMae: round(mean(en.map(Math.abs)), 2),
  closer: track.filter((r, i) => Math.abs(em[i]) < Math.abs(en[i])).length,
  below: em.filter((e) => e < 0).length,
};
const evalCell = NC.evaluation?.horizons?.["30"]?.ordinary;
const NARROW = 0.05; // the same margin as src/lib/evaluation.ts and the pipeline's caveat
const verdict = evalCell
  ? evalCell.ratioHigh < 1
    ? evalCell.ratioHigh >= 1 - NARROW
      ? "closer than the benchmark, but only narrowly"
      : "closer than the benchmark"
    : evalCell.ratioLow > 1
      ? "further from the first print than the benchmark"
      : "not clearly different"
  : null;
const disclaimer =
  `Backtest: over the last ${trackStats.n} quarters, our estimate made a week before each release was ${trackStats.mae.toFixed(1)} pp from the first print on average. A simple benchmark (AR(1)), which predicts each quarter from the one before, was ${trackStats.naiveMae.toFixed(1)} pp away.` +
  (evalCell
    ? ` Across the whole backtest, estimates made 30 days before a release had errors ${evalCell.ratioToAr1.toFixed(2)} times the benchmark's (range ${evalCell.ratioLow.toFixed(2)} to ${evalCell.ratioHigh.toFixed(2)}), which is ${verdict}.`
    : "");

/* ---------- the release calendar: what the headline reads, by the date its next figure is due ---------- */
const readSeries = (id) => {
  try {
    return read(`src/data/series/${id}.json`);
  } catch {
    return [];
  }
};
const endOfMonth = (t, add) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + add + 1, 0);
};
const STEP = {
  Daily: (t) => t + DAY_MS,
  Weekly: (t) => t + 7 * DAY_MS,
  Fortnightly: (t) => t + 14 * DAY_MS,
  Monthly: (t) => endOfMonth(t, 1),
  Quarterly: (t) => endOfMonth(t, 5),
};
const asOfMs = Date.parse(`${asOf}T00:00:00Z`);
const DISCONTINUED_AFTER_DAYS = 180;
const watched = NC.drivers
  .filter((d) => d.weight !== 0)
  .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
  .slice(0, 20);
const due = new Map();
for (const d of watched) {
  const ind = BY_ID[d.id];
  const pts = readSeries(d.id);
  if (!ind || !pts.length || ind.releaseLagDays == null || !STEP[ind.frequency]) continue;
  const period = STEP[ind.frequency](Date.parse(`${pts[pts.length - 1].d}T00:00:00Z`));
  const when = period + ind.releaseLagDays * DAY_MS;
  if (when <= asOfMs || asOfMs - when > DISCONTINUED_AFTER_DAYS * DAY_MS) continue;
  const date = new Date(when).toISOString().slice(0, 10);
  if (!due.has(date)) due.set(date, []);
  due.get(date).push([nameOf(d.id), MONTHS[new Date(period).getUTCMonth()]]);
}
const quarterLong = `${longQuarter(NOW.quarterStart)} ${NOW.quarterStart.slice(0, 4)}`;
const cal = [...due.entries()];
if (NOW.nextOfficialRelease)
  cal.push([NOW.nextOfficialRelease, [[`Official GDP, ${quarterLong}`, ""]]]);
cal.sort((a, b) => a[0].localeCompare(b[0]));

/* ---------- the Stat team's note: written by people, kept in src/data/stat-note.json when there is one ---------- */
let note;
try {
  note = read("src/data/stat-note.json");
} catch {
  note = undefined;
}

const members = (NC.model?.members ?? []).map((m) => ({
  name: m.name,
  nowcast: m.nowcast,
  weight: m.weight,
  indicators: m.indicators?.length ?? 0,
}));

const DATA = {
  asOf,
  quarter: dash(NOW.label),
  quarterLong,
  release: NOW.nextOfficialRelease,
  prev: {
    label: dash(lastActual.label),
    labelLong: longQuarter(lastActual.quarterStart),
    v: lastActual.actual,
  },
  A,
  now: {
    point,
    se: round(NOW.standardError ?? 0.01, 2),
    lo68: round(c68?.lower ?? point, 2),
    hi68: round(c68?.upper ?? point, 2),
    lo90: round(c90?.lower ?? point, 2),
    hi90: round(c90?.upper ?? point, 2),
    rangeAvailable,
    rangeNote: NOW.rangeNote ?? null,
    stress: NOW.stressInterval90 ?? null,
    total: NOW.indicatorsTotal,
    reporting: NOW.indicatorsReporting.length,
    share: NOW.signalShare,
    pdf: (NOW.pdf ?? []).map((p) => [p.x, round(p.y, 6)]),
  },
  dec: NC.decomposition,
  model: {
    factors: NC.model?.nFactors ?? 2,
    series: drivers.length,
    read: NOW.indicatorsTotal,
    start: "2005",
    members,
  },
  sec,
  dots: drivers.map((d) => [sectorIndex[sectorOf(d.id)], round(Math.abs(d.weight), 3)]),
  names: drivers.map((d) => nameOf(d.id)),
  zMonths: lastSix,
  z,
  vint,
  month,
  track: track.map((r) => [r.label, r.estimate, r.naive, r.official]),
  trackStats,
  cal,
  sg,
  breadth,
  indicatorCount: INDICATORS.filter((i) => i.frequency !== "Quarterly").length,
  freq: drivers.map((d) => BY_ID[d.id]?.frequency ?? "Monthly"),
  trackDates: track.map((r) => r.asOf),
  contrib,
  read: drivers.map((d) => (d.weight !== 0 ? 1 : 0)),
  disclaimer,
  note,
};

const out = process.env.PULSE_OUT ?? path.join(ROOT, "public", "pulse");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, "data.js"),
  `/* Generated by scripts/build-pulse-data.mjs from src/data/nowcast.json. Do not edit. */\nwindow.GDP_DATA = ${JSON.stringify(DATA)};\n`,
);
console.log(
  `build-pulse-data: ${DATA.quarter} at ${point}%, ${drivers.length} indicators, ${vint.length} weekly runs, range ${rangeAvailable ? "given" : "not available"}`,
);
