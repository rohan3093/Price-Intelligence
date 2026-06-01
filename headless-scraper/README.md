# headless-scraper — PARKED (do not deploy yet)

A Cloud Run service that uses Playwright + stealth plugins to scrape
sites behind Cloudflare's bot protection. Built during the StockX/GOAT
outage investigation in May 2026.

## Why it's parked

The approach **functionally works** for both StockX and GOAT — proven
live by sample scrapes that returned full bid/ask + variant pricing —
**but it isn't durable**:

- Cloudflare's per-IP heuristics let through the first ~20 product
  scrapes from a fresh IP, then escalate to issuing a fresh JS challenge
  on every `/api/v1/*` call regardless of valid `cf_clearance` cookies.
- From Cloud Run, every cold start gets a fresh egress IP — so each
  batch would start in "first 20 requests" mode and immediately hit the
  wall. Worse, the IP reputation builds up against us across runs.

Verified: same standalone Playwright test that returned 200 with full
variant JSON on 2026-05-12 10:46 began returning 403 "Just a moment..."
challenge pages by 13:30 from the same machine and same code.

## Decision

For **StockX**: drop this approach. We've applied for the official
StockX Developer API at developer.stockx.com. Once approved we'll wire
up `functions/src/scrapers/customScrapers/stockx.ts` to call
`/v2/catalog/products/{id}/variants` + `/v2/markets` directly from
Firebase Functions — no headless browser, no Cloudflare in the path.

For **GOAT**: no public developer API exists. Options still on the
table (in order of preference):

1. Add a residential-proxy pool (Bright Data / Oxylabs / SmartProxy,
   ~$50–100/mo) and keep this Playwright service. The combination of
   real-browser TLS + rotating real-user IPs is what every viable GOAT
   scraper today uses.
2. Use a managed scraping service (ScraperAPI / ZenRows / Scrapfly,
   ~$50–150/mo) and replace this service entirely with HTTP calls to
   the managed service's endpoint.
3. Drop GOAT coverage entirely. Their price coverage overlaps heavily
   with StockX so we may not lose much arbitrage signal.

No decision yet — handled as a follow-up after the StockX API access
is sorted, since we want to see what coverage we have via StockX alone
first.

## What's in here

| File | Purpose |
|------|---------|
| `src/server.ts` | Express service exposing `POST /scrape` with shared-secret auth. |
| `src/browser.ts` | Singleton Playwright Chromium lifecycle + stealth plugin registration. |
| `src/stockx.ts` | StockX scraper: navigate to product page → intercept the page's own `GetMarketData` GraphQL response (for prices) → parse `__NEXT_DATA__.props.pageProps.req.appContext.states.query.value.queries[*].state.data.product.variants[*].sizeChart` (for sizes). |
| `src/goat.ts` | GOAT scraper: warm up by navigating to first batch entry's product page (this is the key insight — homepage warmup doesn't get us `cf_clearance`, product-page warmup does) → fire same-origin `/api/v1/product_templates/{slug}` + `/api/v1/product_variants` calls from inside `page.evaluate()`. |
| `src/semaphore.ts` | Simple async concurrency limiter. |
| `src/types.ts` | Request/response interfaces shared with the Firebase Functions caller. |
| `Dockerfile` | Builds on `mcr.microsoft.com/playwright` so Chromium is preinstalled. |

## Local dev

```bash
npm install
npm run build

SCRAPER_SHARED_SECRET=dev-secret \
PW_CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
PORT=8788 \
node dist/server.js
```

Then in another shell:

```bash
curl -X POST http://localhost:8788/scrape \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-secret" \
  -d '{"site":"goat","entries":[{"url":"https://www.goat.com/sneakers/<slug>","sku":"<sku>"}]}'
```

`PW_CHROMIUM_PATH` is a convenience for local dev that skips the
Playwright browser download. The Dockerfile in this repo uses the
bundled Chromium that ships with `mcr.microsoft.com/playwright`, so in
Cloud Run you leave it unset.

## Before re-engaging this service

Pick **one** of:

- [ ] StockX is migrated to the Developer API. GOAT alone is left for
      this service. Decide between residential proxy and managed scraper
      and update `Dockerfile` / config accordingly.
- [ ] We've decided to drop GOAT entirely. In that case delete this
      directory and remove the `goat` entry from `customScrapers/index.ts`.

Either way, this directory should not be deployed in its current form.
