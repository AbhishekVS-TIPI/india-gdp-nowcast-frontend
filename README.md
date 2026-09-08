# India GDP Pulse

A dashboard of high-frequency indicators behind India's GDP, plus a transparent
GDP growth nowcast with its own confidence interval — built for The India Prosperity
Initiative.

All data is real, sourced from MoSPI's eSankhyiki portal, the RBI's Database on Indian
Economy, and the Labour Bureau. Nothing on this site is synthetic or placeholder data.

## How it fits together

This is the frontend half of a two-repo system:

- **[india-gdp-nowcast](https://github.com/AbhishekVS-TIPI/india-gdp-nowcast)** — the
  pipeline repo. It ingests source files, splices base-year series, applies manual
  corrections, fits the nowcast model, and exports `indicators.json`, `nowcast.json`,
  and one JSON file per indicator series.
- **This repo** — a static-data TanStack Start app. It reads those exported JSON files
  from `src/data/` at build time; there's no live API call at runtime. A weekly GitHub
  Actions job in the pipeline repo re-exports fresh data and pushes it here automatically.

See `src/routes/methodology.tsx` for the full writeup of sourcing, splicing, and how the
nowcast model works.

## Development

Requires Node.js ≥20.19 (see `.nvmrc`) and [Bun](https://bun.sh).

```sh
bun install
bun run dev
```

## Build & deploy

```sh
bun run build
```

This builds via Nitro's `cloudflare-module` preset and deploys as a Cloudflare Worker,
either manually with `npx nitro deploy --prebuilt` or automatically on push to `main`
via Cloudflare Workers Builds.
