/**
 * Daily Price-History Snapshot
 *
 * Persists a TRUE daily time series of mark price per asset/size — one snapshot
 * every day, regardless of whether the price changed — so the chart shows real
 * history and change30d/90d compute from accumulated data instead of manual anchors.
 *
 * Data model (one doc per asset per day, keyed by date → idempotent):
 *   priceHistory/{assetId}/days/{YYYY-MM-DD}
 *     { date, assetMark, sizes: { [size]: { mark, bestAsk, bestBid, spreadPct, dataPoints } } }
 *
 * The mark price uses the SAME validated-quote path as the UI
 * (src/utils/priceMetrics.ts) so history and live hero agree.
 */

import * as admin from "firebase-admin";

// ── Validated-quote constants (parity with src/utils/priceMetrics.ts) ──────────
const MIN_PLAUSIBLE_PRICE = 1000;
const RELATIVE_FLOOR_PCT = 0.35;

// History windows for change computation.
const CHANGE_WINDOWS = { change30d: 30, change90d: 90 } as const;
// How far from the target day a snapshot may be and still count as "~N days ago".
const NEAREST_TOLERANCE_DAYS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MINUTES = 330;

interface PricePointLike {
  price?: number;
  transactionType?: string | null;
  reshippingCost?: number | null;
  listingCount?: number | null;
}

interface SizeSnapshot {
  mark: number | null;
  bestAsk: number | null;
  bestBid: number | null;
  spreadPct: number | null;
  dataPoints: number;
}

interface DayDoc {
  date: string;
  assetMark: number | null;
  sizes: Record<string, SizeSnapshot>;
}

/** IST (UTC+5:30) date key, e.g. "2026-06-11". */
export function istDateKey(d: Date = new Date()): string {
  const ist = new Date(d.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return ist.toISOString().split("T")[0];
}

function filterPlausible(prices: number[]): number[] {
  return prices.filter((p) => typeof p === "number" && isFinite(p) && p >= MIN_PLAUSIBLE_PRICE);
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function referencePrice(retailIndia: number | undefined, askPrices: number[]): number | undefined {
  if (retailIndia && retailIndia >= MIN_PLAUSIBLE_PRICE) return retailIndia;
  return median(filterPlausible(askPrices));
}

/** Absolute + relative floor; low-side only (high quotes never capped). */
function filterValidQuotes(prices: number[], reference: number | undefined): number[] {
  const floored = filterPlausible(prices);
  if (reference === undefined) return floored;
  const relFloor = RELATIVE_FLOOR_PCT * reference;
  return floored.filter((p) => p >= relFloor);
}

function computeSizeSnapshot(
  askPrices: number[],
  bidPrices: number[],
  retailIndia: number | undefined
): SizeSnapshot {
  const reference = referencePrice(retailIndia, askPrices);
  const asks = filterValidQuotes(askPrices, reference);
  const bids = filterValidQuotes(bidPrices, reference);

  const bestAsk = asks.length > 0 ? Math.min(...asks) : null;
  const bestBid = bids.length > 0 ? Math.max(...bids) : null;

  let mark: number | null = null;
  let spreadPct: number | null = null;

  if (bestAsk !== null && bestBid !== null) {
    mark = (bestBid + bestAsk) / 2;
    spreadPct = mark > 0 ? (bestAsk - bestBid) / mark : null;
  } else if (bestAsk !== null) {
    mark = median(asks) ?? null;
  } else if (bestBid !== null) {
    mark = bestBid;
  }

  return { mark, bestAsk, bestBid, spreadPct, dataPoints: asks.length + bids.length };
}

/** Extract ask/bid prices for one size, mirroring the UI's channel logic. */
function extractAsksBids(size: any): { asks: number[]; bids: number[] } {
  const pp = size?.pricePoints;
  const asks: number[] = [];
  const bids: number[] = [];
  if (!pp) return { asks, bids };

  const wa: PricePointLike[] = pp.whatsapp || [];
  const mp: PricePointLike[] = pp.marketplace || [];
  const intl: PricePointLike[] = pp.international || [];

  wa.forEach((p) => {
    if (typeof p.price !== "number") return;
    const t = p.transactionType;
    if (!t || t === "buy" || t === "both") asks.push(p.price);
    if (t === "sell" || t === "both") bids.push(p.price);
  });
  mp.forEach((p) => {
    if (typeof p.price === "number") asks.push(p.price);
  });
  intl.forEach((p) => {
    if (typeof p.price === "number") asks.push(p.price + (p.reshippingCost || 0));
  });

  return { asks, bids };
}

function buildDayDoc(assetData: any, dateKey: string): DayDoc {
  const sizes: any[] = assetData.sizes || [];
  const retailIndia: number | undefined = assetData.priceAnchors?.retailIndia;

  const sizeSnaps: Record<string, SizeSnapshot> = {};
  sizes.forEach((size) => {
    if (!size?.size) return;
    const { asks, bids } = extractAsksBids(size);
    sizeSnaps[size.size] = computeSizeSnapshot(asks, bids, retailIndia);
  });

  // Asset mark = default size's mark, else first size with a mark.
  const defaultSize: string = assetData.defaultSize || assetData.size || "";
  let assetMark: number | null = sizeSnaps[defaultSize]?.mark ?? null;
  if (assetMark === null) {
    for (const key of Object.keys(sizeSnaps)) {
      if (sizeSnaps[key].mark !== null) {
        assetMark = sizeSnaps[key].mark;
        break;
      }
    }
  }

  return { date: dateKey, assetMark, sizes: sizeSnaps };
}

// ── Change-from-history ────────────────────────────────────────────────────────

interface HistoryRow {
  date: string;
  ms: number;
  sizes: Record<string, SizeSnapshot>;
}

function dateKeyToMs(key: string): number {
  // Interpret the YYYY-MM-DD key at IST midnight for stable day spacing.
  return new Date(`${key}T00:00:00.000Z`).getTime() - IST_OFFSET_MINUTES * 60 * 1000;
}

function formatPct(oldMark: number, newMark: number): string {
  const pct = ((newMark - oldMark) / oldMark) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/**
 * Change for a size's mark: today vs the snapshot nearest N days ago.
 * Returns null when no snapshot that far back exists (history too short).
 */
function changeForSize(
  history: HistoryRow[],
  size: string,
  todayMs: number,
  todayMark: number | null,
  windowDays: number
): string | null {
  if (todayMark === null || todayMark <= 0) return null;
  const targetMs = todayMs - windowDays * DAY_MS;

  // Only consider rows with a usable mark for this size that are at/older than today.
  const candidates = history.filter(
    (r) => r.ms < todayMs && typeof r.sizes[size]?.mark === "number" && (r.sizes[size]!.mark as number) > 0
  );
  if (candidates.length === 0) return null;

  // No snapshot that far back → history too short.
  const oldestMs = Math.min(...candidates.map((r) => r.ms));
  if (oldestMs > targetMs) return null;

  // Nearest snapshot to the target day, within tolerance.
  let nearest: HistoryRow | null = null;
  let bestDelta = Infinity;
  for (const r of candidates) {
    const delta = Math.abs(r.ms - targetMs);
    if (delta < bestDelta) {
      bestDelta = delta;
      nearest = r;
    }
  }
  if (!nearest || bestDelta > NEAREST_TOLERANCE_DAYS * DAY_MS) return null;

  const pastMark = nearest.sizes[size]!.mark as number;
  return formatPct(pastMark, todayMark);
}

// ── Snapshot runner ─────────────────────────────────────────────────────────────

export interface SnapshotResult {
  dateKey: string;
  assetsProcessed: number;
  daysWritten: number;
  assetsUpdated: number;
  durationMs: number;
}

/**
 * Write today's snapshot for every asset and back-fill change30d/90d from the
 * accumulated history. Idempotent on the date key (re-running the same day
 * overwrites, never duplicates). A point is ALWAYS written, even on flat days.
 */
export async function runDailySnapshot(
  db: admin.firestore.Firestore,
  now: Date = new Date()
): Promise<SnapshotResult> {
  const start = Date.now();
  const dateKey = istDateKey(now);
  const todayMs = dateKeyToMs(dateKey);

  const assetsSnap = await db.collection("assets").get();
  let daysWritten = 0;
  let assetsUpdated = 0;

  // Process in small concurrent chunks: each asset does 1 history read + 2 writes.
  const docs = assetsSnap.docs;
  const CONCURRENCY = 20;

  for (let i = 0; i < docs.length; i += CONCURRENCY) {
    const chunk = docs.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (assetDoc) => {
        const assetData = assetDoc.data();
        const assetId = assetDoc.id;
        const dayDoc = buildDayDoc(assetData, dateKey);

        // 1. Upsert today's history doc (idempotent on dateKey).
        const dayRef = db
          .collection("priceHistory")
          .doc(assetId)
          .collection("days")
          .doc(dateKey);
        await dayRef.set(dayDoc, { merge: false });
        daysWritten += 1;

        // 2. Read accumulated history (incl. the doc just written) for change calc.
        const daysSnap = await db
          .collection("priceHistory")
          .doc(assetId)
          .collection("days")
          .get();
        const history: HistoryRow[] = daysSnap.docs.map((d) => {
          const data = d.data() as DayDoc;
          return { date: data.date || d.id, ms: dateKeyToMs(data.date || d.id), sizes: data.sizes || {} };
        });

        // 3. Compute change30d/90d per size from history and write back to the asset.
        const sizes: any[] = assetData.sizes || [];
        let changed = false;
        sizes.forEach((size) => {
          if (!size?.size) return;
          const todayMark = dayDoc.sizes[size.size]?.mark ?? null;
          const c30 = changeForSize(history, size.size, todayMs, todayMark, CHANGE_WINDOWS.change30d);
          const c90 = changeForSize(history, size.size, todayMs, todayMark, CHANGE_WINDOWS.change90d);
          if ((size.change30d || null) !== c30) changed = true;
          if ((size.change90d || null) !== c90) changed = true;
          size.change30d = c30;
          size.change90d = c90;
        });

        // Asset-level change mirrors the default (or first) size.
        const defaultSize: string = assetData.defaultSize || assetData.size || sizes[0]?.size || "";
        const ds = sizes.find((s) => s.size === defaultSize) || sizes[0];
        const assetC30 = ds ? ds.change30d ?? null : null;
        const assetC90 = ds ? ds.change90d ?? null : null;

        if (changed || (assetData.change30d || null) !== assetC30 || (assetData.change90d || null) !== assetC90) {
          await assetDoc.ref.update({
            sizes,
            change30d: assetC30,
            change90d: assetC90,
          });
          assetsUpdated += 1;
        }
      })
    );
  }

  return {
    dateKey,
    assetsProcessed: docs.length,
    daysWritten,
    assetsUpdated,
    durationMs: Date.now() - start,
  };
}
