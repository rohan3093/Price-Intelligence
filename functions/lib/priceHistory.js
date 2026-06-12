"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.istDateKey = istDateKey;
exports.runDailySnapshot = runDailySnapshot;
// ── Validated-quote constants (parity with src/utils/priceMetrics.ts) ──────────
const MIN_PLAUSIBLE_PRICE = 1000;
const RELATIVE_FLOOR_PCT = 0.35;
// Per-channel daily value: "median-ask" (smoother) or "best-ask" (min, jumpier).
const PER_CHANNEL_VALUE = "median-ask";
// History windows for change computation.
const CHANGE_WINDOWS = { change30d: 30, change90d: 90 };
// How far from the target day a snapshot may be and still count as "~N days ago".
const NEAREST_TOLERANCE_DAYS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MINUTES = 330;
/** IST (UTC+5:30) date key, e.g. "2026-06-11". */
function istDateKey(d = new Date()) {
    const ist = new Date(d.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
    return ist.toISOString().split("T")[0];
}
function filterPlausible(prices) {
    return prices.filter((p) => typeof p === "number" && isFinite(p) && p >= MIN_PLAUSIBLE_PRICE);
}
function median(values) {
    if (values.length === 0)
        return undefined;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function referencePrice(retailIndia, askPrices) {
    if (retailIndia && retailIndia >= MIN_PLAUSIBLE_PRICE)
        return retailIndia;
    return median(filterPlausible(askPrices));
}
/** Absolute + relative floor; low-side only (high quotes never capped). */
function filterValidQuotes(prices, reference) {
    const floored = filterPlausible(prices);
    if (reference === undefined)
        return floored;
    const relFloor = RELATIVE_FLOOR_PCT * reference;
    return floored.filter((p) => p >= relFloor);
}
/** Consolidated mark/spread from the pooled (merged-channel) asks/bids. */
function computeMarkFields(askPrices, bidPrices, reference) {
    var _a;
    const asks = filterValidQuotes(askPrices, reference);
    const bids = filterValidQuotes(bidPrices, reference);
    const bestAsk = asks.length > 0 ? Math.min(...asks) : null;
    const bestBid = bids.length > 0 ? Math.max(...bids) : null;
    let mark = null;
    let spreadPct = null;
    if (bestAsk !== null && bestBid !== null) {
        mark = (bestBid + bestAsk) / 2;
        spreadPct = mark > 0 ? (bestAsk - bestBid) / mark : null;
    }
    else if (bestAsk !== null) {
        mark = (_a = median(asks)) !== null && _a !== void 0 ? _a : null;
    }
    else if (bestBid !== null) {
        mark = bestBid;
    }
    return { mark, bestAsk, bestBid, spreadPct, dataPoints: asks.length + bids.length };
}
/**
 * Per-channel daily value from one channel's asks, validated against the SAME
 * asset/size reference used for the consolidated mark (low-side floor only).
 * Returns null when the channel has no valid asks that day.
 */
function computeChannelSnap(channelAsks, reference) {
    var _a;
    const asks = filterValidQuotes(channelAsks, reference);
    if (asks.length === 0)
        return null;
    const value = PER_CHANNEL_VALUE === "median-ask" ? ((_a = median(asks)) !== null && _a !== void 0 ? _a : null) : Math.min(...asks);
    return { value, bestAsk: Math.min(...asks), dataPoints: asks.length };
}
/** Per-channel ask arrays (and WhatsApp bids) for one size, mirroring the UI. */
function extractChannelArrays(size) {
    const pp = size === null || size === void 0 ? void 0 : size.pricePoints;
    const whatsappAsks = [];
    const whatsappBids = [];
    const marketplaceAsks = [];
    const internationalAsks = [];
    if (!pp)
        return { whatsappAsks, marketplaceAsks, internationalAsks, whatsappBids };
    const wa = pp.whatsapp || [];
    const mp = pp.marketplace || [];
    const intl = pp.international || [];
    wa.forEach((p) => {
        if (typeof p.price !== "number")
            return;
        const t = p.transactionType;
        if (!t || t === "buy" || t === "both")
            whatsappAsks.push(p.price);
        if (t === "sell" || t === "both")
            whatsappBids.push(p.price);
    });
    mp.forEach((p) => {
        if (typeof p.price === "number")
            marketplaceAsks.push(p.price);
    });
    intl.forEach((p) => {
        if (typeof p.price === "number")
            internationalAsks.push(p.price + (p.reshippingCost || 0));
    });
    return { whatsappAsks, marketplaceAsks, internationalAsks, whatsappBids };
}
function buildDayDoc(assetData, dateKey) {
    var _a, _b, _c;
    const sizes = assetData.sizes || [];
    const retailIndia = (_a = assetData.priceAnchors) === null || _a === void 0 ? void 0 : _a.retailIndia;
    const sizeSnaps = {};
    sizes.forEach((size) => {
        if (!(size === null || size === void 0 ? void 0 : size.size))
            return;
        const { whatsappAsks, marketplaceAsks, internationalAsks, whatsappBids } = extractChannelArrays(size);
        // Pooled asks drive the consolidated mark AND the shared relative-floor reference.
        const mergedAsks = [...whatsappAsks, ...marketplaceAsks, ...internationalAsks];
        const reference = referencePrice(retailIndia, mergedAsks);
        const base = computeMarkFields(mergedAsks, whatsappBids, reference);
        sizeSnaps[size.size] = Object.assign(Object.assign({}, base), { channels: {
                whatsapp: computeChannelSnap(whatsappAsks, reference),
                marketplace: computeChannelSnap(marketplaceAsks, reference),
                international: computeChannelSnap(internationalAsks, reference),
            } });
    });
    // Asset mark = default size's mark, else first size with a mark.
    const defaultSize = assetData.defaultSize || assetData.size || "";
    let assetMark = (_c = (_b = sizeSnaps[defaultSize]) === null || _b === void 0 ? void 0 : _b.mark) !== null && _c !== void 0 ? _c : null;
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
function dateKeyToMs(key) {
    // Interpret the YYYY-MM-DD key at IST midnight for stable day spacing.
    return new Date(`${key}T00:00:00.000Z`).getTime() - IST_OFFSET_MINUTES * 60 * 1000;
}
function formatPct(oldMark, newMark) {
    const pct = ((newMark - oldMark) / oldMark) * 100;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
}
/**
 * Change for a size's mark: today vs the snapshot nearest N days ago.
 * Returns null when no snapshot that far back exists (history too short).
 */
function changeForSize(history, size, todayMs, todayMark, windowDays) {
    if (todayMark === null || todayMark <= 0)
        return null;
    const targetMs = todayMs - windowDays * DAY_MS;
    // Only consider rows with a usable mark for this size that are at/older than today.
    const candidates = history.filter((r) => { var _a; return r.ms < todayMs && typeof ((_a = r.sizes[size]) === null || _a === void 0 ? void 0 : _a.mark) === "number" && r.sizes[size].mark > 0; });
    if (candidates.length === 0)
        return null;
    // No snapshot that far back → history too short.
    const oldestMs = Math.min(...candidates.map((r) => r.ms));
    if (oldestMs > targetMs)
        return null;
    // Nearest snapshot to the target day, within tolerance.
    let nearest = null;
    let bestDelta = Infinity;
    for (const r of candidates) {
        const delta = Math.abs(r.ms - targetMs);
        if (delta < bestDelta) {
            bestDelta = delta;
            nearest = r;
        }
    }
    if (!nearest || bestDelta > NEAREST_TOLERANCE_DAYS * DAY_MS)
        return null;
    const pastMark = nearest.sizes[size].mark;
    return formatPct(pastMark, todayMark);
}
/**
 * Write today's snapshot for every asset and back-fill change30d/90d from the
 * accumulated history. Idempotent on the date key (re-running the same day
 * overwrites, never duplicates). A point is ALWAYS written, even on flat days.
 */
async function runDailySnapshot(db, now = new Date()) {
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
        await Promise.all(chunk.map(async (assetDoc) => {
            var _a, _b, _c;
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
            const history = daysSnap.docs.map((d) => {
                const data = d.data();
                return { date: data.date || d.id, ms: dateKeyToMs(data.date || d.id), sizes: data.sizes || {} };
            });
            // 3. Compute change30d/90d per size from history and write back to the asset.
            const sizes = assetData.sizes || [];
            let changed = false;
            sizes.forEach((size) => {
                var _a, _b;
                if (!(size === null || size === void 0 ? void 0 : size.size))
                    return;
                const todayMark = (_b = (_a = dayDoc.sizes[size.size]) === null || _a === void 0 ? void 0 : _a.mark) !== null && _b !== void 0 ? _b : null;
                const c30 = changeForSize(history, size.size, todayMs, todayMark, CHANGE_WINDOWS.change30d);
                const c90 = changeForSize(history, size.size, todayMs, todayMark, CHANGE_WINDOWS.change90d);
                if ((size.change30d || null) !== c30)
                    changed = true;
                if ((size.change90d || null) !== c90)
                    changed = true;
                size.change30d = c30;
                size.change90d = c90;
            });
            // Asset-level change mirrors the default (or first) size.
            const defaultSize = assetData.defaultSize || assetData.size || ((_a = sizes[0]) === null || _a === void 0 ? void 0 : _a.size) || "";
            const ds = sizes.find((s) => s.size === defaultSize) || sizes[0];
            const assetC30 = ds ? (_b = ds.change30d) !== null && _b !== void 0 ? _b : null : null;
            const assetC90 = ds ? (_c = ds.change90d) !== null && _c !== void 0 ? _c : null : null;
            if (changed || (assetData.change30d || null) !== assetC30 || (assetData.change90d || null) !== assetC90) {
                await assetDoc.ref.update({
                    sizes,
                    change30d: assetC30,
                    change90d: assetC90,
                });
                assetsUpdated += 1;
            }
        }));
    }
    return {
        dateKey,
        assetsProcessed: docs.length,
        daysWritten,
        assetsUpdated,
        durationMs: Date.now() - start,
    };
}
//# sourceMappingURL=priceHistory.js.map