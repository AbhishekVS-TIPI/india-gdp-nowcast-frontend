# Indicator metadata columns + trend analysis summary

## 1. Indicators tab: two new columns

Each row in the indicator list gains:
- **Last updated** — the date of the most recent observation in that indicator's series (real data where available, generated series otherwise), formatted e.g. `21 Aug 2026`.
- **Frequency** — Daily / Monthly / Quarterly / Event-based, shown as its own column instead of being appended to the category line.

Layout becomes: name + category | frequency | last updated | sparkline | % change. On narrow screens the two metadata columns stack under the name so nothing overflows.

## 2. Nowcast tab: trend analysis box

A card directly under the GDP nowcast chart, titled "Trend Analysis", with an auto-generated summary based on the currently selected period:
- Direction and size of the nowcast move over the period (rise/fall, % change, start and end values).
- Recent momentum: how the latest month compares with the prior stretch.
- The indicators pulling the composite up and down the most over the same window, named with their own % change.

The text regenerates whenever the period selector changes. Wording uses ↑/↓ symbols and the existing blue palette — no red/green.

## Technical notes

- Add a helper in `src/lib/series.ts`: `lastUpdated(id)` returning the last point timestamp, and `contributions(range)` returning per-indicator % change over the range sorted by magnitude.
- `src/routes/indicators.tsx`: extend the row markup with the frequency and last-updated cells using `fmtDate`.
- `src/routes/index.tsx`: new `TrendAnalysis` block (composed inline or as `src/components/TrendAnalysis.tsx`) reading the same `range` state that drives the chart.
