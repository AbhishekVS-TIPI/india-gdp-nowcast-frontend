/* The landing page: builds every chapter from window.GDP_DATA (see story.js for the rules). */
const ST = window.GDP_STORY, $ = (id) => document.getElementById(id), h = GDP.h;

/* The page changes shape through the quarter: "Your call" only shows in release week. */
if (ST.STATE !== "release-week") document.querySelectorAll("[data-release-week]").forEach((e) => { e.hidden = true; e.removeAttribute("data-block"); });   /* a hidden section is not built at all */

/* Everything that quotes a number is written by rule before the page is drawn. */
/* Chapter 7 shows the Stat team's note, so it is only on the page once someone has written one. */
const hasNote = Boolean(GDP.NOTE && GDP.NOTE.title);
if (!hasNote) {
  document.querySelectorAll("[data-needs-note]").forEach((e) => { e.hidden = true; e.removeAttribute("data-chapter"); });
  const human = document.querySelector('.layers [data-prov="human"]');
  if (human) human.closest("li").remove(); /* nothing here is written by the Stat team yet */
}
ST.renderStatCard($("stat-card"));
if (hasNote) ST.renderNotes($("notes"));
const scenes = [["sc-history", ST.S.history], ["sc-buildup", ST.S.buildup], ["sc-record", ST.S.record], ["sc-morph", ST.S.morph]];
scenes.forEach(([id, f]) => {
  const steps = f();
  if (steps.length) ST.fillSteps($(id), steps);
  else { $(id).removeAttribute("data-scene"); $(id).closest("section").hidden = true; }
});
/* What has happened since the latest note: plain cards, and only when the note is about the quarter now being estimated. */
const since = hasNote ? ST.S.since() : [];
if (since.length) ST.fillSteps($("sc-since"), since); else $("sc-since").hidden = true;
ST.R.breadthNote().forEach(([k, p]) => $("breadth-crit").append(h("li", null, h("b", { text: k }), h("span", { text: p }))));
if (ST.RANGE) ST.fillSteps($("sc-noise"), ST.S.noise()); else $("range-more").closest("section").hidden = true;   /* no range to show in detail */   /* the detailed range: the same rule-written lines, as a list, only seen when opened */
if (!ST.BREADTH.length) $("breadth-card-sec").hidden = true;
document.querySelectorAll("[data-take]").forEach((e) => (e.textContent = ST.R.take[e.dataset.take]()));
/* The experts' intro only promises what is on the page: the since-this-note replay exists when the latest note is about this quarter. */
if (hasNote) $("experts-intro").textContent += !$("sc-since").hidden ? " First, what has changed since their latest note; then the notes themselves, newest first." : " Here are their notes, newest first.";
ST.R.watch().forEach((w) => $("watch").append(h("li", null, h("span", { class: "d", text: GDP.day(w.date, false) }), h("b", { text: w.title }), h("span", { text: w.why }))));
document.querySelectorAll("[data-prov]").forEach((e) => e.replaceWith(ST.prov(e.dataset.prov)));

/* Chapters are numbered and recapped from what is on the page, so a hidden chapter leaves no gap. */
const chapters = [...document.querySelectorAll("[data-chapter]")].filter((c) => !c.hidden);
chapters.forEach((c, i) => (c.querySelector(".num").textContent = `Chapter ${i + 1} of ${chapters.length}`));   /* the heading below already carries the title */
const railLinks = [h("a", { href: "#answer", text: "Answer" })].concat(chapters.map((c, i) => h("a", { href: `#${c.id}` }, h("b", { text: String(i + 1) }), c.dataset.short)), [h("a", { href: "#recap", text: "Summary" })]);
$("rail-links").append(...railLinks);
chapters.forEach((c, i) => {
  const take = [...document.querySelectorAll(".takeaway [data-take]")].find((t) => c.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING && (!chapters[i + 1] || t.compareDocumentPosition(chapters[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING));
  if (take) $("recap-list").append(h("li", null, h("a", { href: `#${c.id}`, text: c.dataset.title }), h("span", { text: take.textContent })));
});

/* The sector picker lists the sectors in the data, so a new or dropped sector needs no change here. */
const sectors = GDP.D.sec.filter((s) => s.k !== "prices" && s.n > 0);
const worst = sectors.slice().sort((a, b) => a.c - b.c)[0].k;
/* It opens on the lowest contributor, and the sentence says what that is: a drag only if it really is one. */
$("sectors-intro").textContent = `Zoom in on one part of the economy. It opens on ${sectors.find((s) => s.k === worst).c < 0 ? "the biggest drag" : "the part adding least"} in the latest run; pick another to compare.`;
$("picker").append(...sectors.map((s) => h("button", { type: "button", "data-k": s.k, "aria-pressed": String(s.k === worst), text: s.short })));

GDP.mount();

/* The closed sections build their charts the first time they are opened, so nothing is ever drawn at zero size. */
const whenOpened = (el, fn) => { let done = false; const go = () => { if (!done && el.open) { done = true; fn(); } }; el.addEventListener("toggle", go); go(); };
let heat = null, sector = worst;
GDP.sectorSummary($("sector-sum"));
GDP.onSector((k) => { sector = k; if (heat) { heat.opt.sector = k; heat.rebuild(); } });
GDP.picker($("picker"))(worst);
whenOpened($("sector-more"), () => { heat = GDP.figure($("heat"), "heat", { sector }); });
whenOpened($("range-more"), () => GDP.figure($("noise-fig"), "noise", { pos: 3 }));
if (ST.BREADTH.length) GDP.figure($("breadth-fig"), "breadth");

/* Chapter rail: highlight the chapter in view and show reading progress. */
const rail = $("rail-links");
const links = [...rail.querySelectorAll("a")];
const targets = links.map((a) => document.querySelector(a.getAttribute("href")));
const progress = document.querySelector(".rail .bar");
let current = -1;
const onRail = () => {
  const line = innerHeight * 0.35;
  let k = 0;
  targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top < line) k = i; });
  if (k !== current) {
    current = k;
    links.forEach((a, i) => { a.classList.toggle("on", i === k); if (i === k) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
    const r = rail.getBoundingClientRect(), b = links[k].getBoundingClientRect();
    if (b.left < r.left || b.right > r.right) rail.scrollTo({ left: Math.max(0, rail.scrollLeft + (b.left - r.left) - 16), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.width = (max > 0 ? (scrollY / max) * 100 : 0).toFixed(2) + "%";
};
addEventListener("scroll", onRail, { passive: true });
addEventListener("resize", onRail);
onRail();
