/**
 * Price History API
 *
 * Reads the daily mark-price time series persisted by the scheduled snapshot
 * Cloud Function (see functions/src/priceHistory.ts).
 *
 * Collection: priceHistory/{assetId}/days/{YYYY-MM-DD}
 *   { date, assetMark, sizes: { [size]: { mark, bestAsk, bestBid, spreadPct, dataPoints } } }
 */

import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

export type ChannelKey = "whatsapp" | "marketplace" | "international";

export interface ChannelSnap {
  value: number | null;
  bestAsk: number | null;
  dataPoints: number;
}

export interface PriceHistorySize {
  mark: number | null;
  bestAsk: number | null;
  bestBid: number | null;
  spreadPct: number | null;
  dataPoints: number;
  /** Per-channel daily value; absent on day-docs written before this feature. */
  channels?: {
    whatsapp: ChannelSnap | null;
    marketplace: ChannelSnap | null;
    international: ChannelSnap | null;
  };
}

export interface PriceHistoryDay {
  date: string; // YYYY-MM-DD
  assetMark: number | null;
  sizes: Record<string, PriceHistorySize>;
}

export interface MarkSeriesPoint {
  date: string;
  mark: number;
  bestAsk: number | null;
  bestBid: number | null;
}

export interface ChannelSeriesPoint {
  date: string;
  value: number;
}

/** Fetch the full daily history for an asset, ascending by date. */
export async function fetchPriceHistory(
  assetId: number | string
): Promise<PriceHistoryDay[]> {
  if (!db) return [];
  try {
    const daysCol = collection(db, "priceHistory", String(assetId), "days");
    const snap = await getDocs(query(daysCol, orderBy("date", "asc")));
    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        date: data.date || d.id,
        assetMark: typeof data.assetMark === "number" ? data.assetMark : null,
        sizes: (data.sizes || {}) as Record<string, PriceHistorySize>,
      };
    });
  } catch (e) {
    console.error("Failed to fetch price history:", e);
    return [];
  }
}

/**
 * Dated mark series for a specific size. When `size` is omitted (or absent for a
 * given day), falls back to the asset-level mark so the chart still renders.
 */
export function markSeriesForSize(
  history: PriceHistoryDay[],
  size: string | undefined
): MarkSeriesPoint[] {
  const out: MarkSeriesPoint[] = [];
  for (const day of history) {
    const sizeSnap = size ? day.sizes[size] : undefined;
    let mark: number | null = null;
    let bestAsk: number | null = null;
    let bestBid: number | null = null;

    if (sizeSnap && typeof sizeSnap.mark === "number") {
      mark = sizeSnap.mark;
      bestAsk = typeof sizeSnap.bestAsk === "number" ? sizeSnap.bestAsk : null;
      bestBid = typeof sizeSnap.bestBid === "number" ? sizeSnap.bestBid : null;
    } else if (!size && typeof day.assetMark === "number") {
      mark = day.assetMark;
    }

    if (mark !== null && isFinite(mark) && mark > 0) {
      out.push({ date: day.date, mark, bestAsk, bestBid });
    }
  }
  return out;
}

/**
 * Dated per-channel value series for a size. Days where the channel has no valid
 * value are DROPPED (not zero-filled) so the chart gaps rather than fabricating a
 * point. Returns [] for day-docs predating the per-channel feature.
 */
export function channelSeriesForSize(
  history: PriceHistoryDay[],
  size: string | undefined,
  channel: ChannelKey
): ChannelSeriesPoint[] {
  if (!size) return [];
  const out: ChannelSeriesPoint[] = [];
  for (const day of history) {
    const snap = day.sizes[size]?.channels?.[channel];
    const value = snap?.value;
    if (typeof value === "number" && isFinite(value) && value > 0) {
      out.push({ date: day.date, value });
    }
  }
  return out;
}
