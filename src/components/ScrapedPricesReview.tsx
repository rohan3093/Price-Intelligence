/**
 * Scraped Prices Review (v2 — Simplified)
 *
 * Clean review queue for analysts. No confusing filters.
 *
 * Workflow:
 *   1. Analyst sees pending assets with price summaries
 *   2. "Approve All" if everything looks right (happy path)
 *   3. Expand to inspect individual sizes if something looks off
 *   4. Reject or edit specific listings
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../utils/firebase";
import {
  ScrapedPrice,
  ScrapedPriceGroup,
  ScrapeRun,
  fetchScrapedPrices,
  groupByAsset,
  getPendingReviewCount,
  approveScrapedPrice,
  rejectScrapedPrice,
  approveWithEdit,
  bulkApproveByAsset,
  fetchScrapeRuns,
  writeScrapedPricesToAsset,
} from "../utils/scrapedPricesApi";

// ── Types ────────────────────────────────────────────────────────────

interface ScrapedPricesReviewProps {
  analystEmail?: string;
}

interface ScrapeProgress {
  status: "in_progress" | "complete" | "error";
  phase: "initializing" | "clearing_stale" | "scraping" | "writing" | "done";
  batchId: string;
  totalAssets: number;
  completedAssets: number;
  currentMarketplace: string;
  scraperNames: string[];
  totalScrapers: number;
  totalListings: number;
  byMarketplace: Record<string, number>;
  errors: number;
  durationMs?: number;
  startedAt?: any;
  updatedAt?: any;
  // v2: store-centric
  totalStores?: number;
  completedStores?: number;
  // v3: url-direct
  totalUrls?: number;
  fetchedUrls?: number;
}

// ── Helper: price range string ───────────────────────────────────────

function priceRange(listings: ScrapedPrice[]): string {
  if (listings.length === 0) return "—";
  const prices = listings.map((l) => l.price).sort((a, b) => a - b);
  const lo = prices[0];
  const hi = prices[prices.length - 1];
  if (lo === hi) return `₹${lo.toLocaleString("en-IN")}`;
  return `₹${lo.toLocaleString("en-IN")} – ₹${hi.toLocaleString("en-IN")}`;
}

// ── Main Component ───────────────────────────────────────────────────

export const ScrapedPricesReview: React.FC<ScrapedPricesReviewProps> = ({
  analystEmail = "analyst@sentria.io",
}) => {
  const [groups, setGroups] = useState<ScrapedPriceGroup[]>([]);
  const [scrapeRuns, setScrapeRuns] = useState<ScrapeRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [triggeringScrape, setTriggeringScrape] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [progress, setProgress] = useState<ScrapeProgress | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const unsubProgressRef = useRef<(() => void) | null>(null);
  const triggeringScrapeRef = useRef(false);
  const scrapeStartTimeRef = useRef<number>(0);

  // ── Data loading ──────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prices, count, runs] = await Promise.all([
        fetchScrapedPrices("pending_review"),
        getPendingReviewCount(),
        fetchScrapeRuns(5),
      ]);
      setGroups(groupByAsset(prices));
      setPendingCount(count);
      setScrapeRuns(runs);
    } catch (error) {
      console.error("Failed to load scraped prices:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Actions ───────────────────────────────────────────────────────

  const handleApproveAll = async (assetId: string) => {
    setActionLoading(`approve-${assetId}`);
    setErrorMsg(null);
    try {
      const group = groups.find((g) => g.assetId === assetId);
      const count = await bulkApproveByAsset(assetId, analystEmail);
      if (count === 0) {
        // Data may have been cleared by a new scrape — reload
        setErrorMsg("No pending items found — data may have been refreshed. Reloading…");
        setTimeout(() => { setErrorMsg(null); loadData(); }, 1500);
        return;
      }
      // Write approved prices into the live asset's marketplace pricePoints
      if (group) {
        try {
          await writeScrapedPricesToAsset(assetId, group.listings);
        } catch (writeErr) {
          console.warn("Write to asset failed (prices approved but not yet in asset):", writeErr);
        }
      }
      setScrapeResult(`Approved ${count} listing(s) for ${group?.assetName || assetId} — market data updated`);
      setTimeout(() => setScrapeResult(null), 3000);
      // Remove from the list immediately for a snappy feel
      setGroups((prev) => prev.filter((g) => g.assetId !== assetId));
      setPendingCount((prev) => Math.max(0, prev - count));
      if (expandedAsset === assetId) setExpandedAsset(null);
    } catch (error: any) {
      console.error("Approve all failed:", error);
      setErrorMsg(`Approve failed: ${error?.message || "Unknown error"}. Check your login.`);
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSkip = (assetId: string) => {
    // Remove from view entirely (reject all listings silently)
    // Analyst can re-scrape later to get fresh data
    setGroups((prev) => prev.filter((g) => g.assetId !== assetId));
    if (expandedAsset === assetId) setExpandedAsset(null);
  };

  const handleApproveSingle = async (listing: ScrapedPrice) => {
    setActionLoading(listing.id);
    setErrorMsg(null);
    try {
      await approveScrapedPrice(listing.id, analystEmail);
      // Write approved price into the live asset's marketplace pricePoints
      try {
        await writeScrapedPricesToAsset(listing.assetId, [listing]);
      } catch (writeErr) {
        console.warn("Write to asset failed (price approved but not yet in asset):", writeErr);
      }
      // Remove from the group in-place
      setGroups((prev) =>
        prev
          .map((g) =>
            g.assetId === listing.assetId
              ? { ...g, listings: g.listings.filter((l) => l.id !== listing.id) }
              : g
          )
          .filter((g) => g.listings.length > 0)
      );
      setPendingCount((prev) => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error("Approve failed:", error);
      setErrorMsg(`Approve failed: ${error?.message || "Unknown error"}`);
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSingle = async (listing: ScrapedPrice) => {
    setActionLoading(listing.id);
    setErrorMsg(null);
    try {
      await rejectScrapedPrice(listing.id, analystEmail);
      setGroups((prev) =>
        prev
          .map((g) =>
            g.assetId === listing.assetId
              ? { ...g, listings: g.listings.filter((l) => l.id !== listing.id) }
              : g
          )
          .filter((g) => g.listings.length > 0)
      );
      setPendingCount((prev) => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error("Reject failed:", error);
      setErrorMsg(`Reject failed: ${error?.message || "Unknown error"}`);
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditSave = async (listing: ScrapedPrice) => {
    const newPrice = parseInt(editPrice, 10);
    if (isNaN(newPrice) || newPrice <= 0) return;
    setActionLoading(listing.id);
    try {
      await approveWithEdit(listing.id, newPrice, analystEmail);
      // Write the edited price into the live asset
      try {
        const editedListing = { ...listing, editedPrice: newPrice };
        await writeScrapedPricesToAsset(listing.assetId, [editedListing]);
      } catch (writeErr) {
        console.warn("Write to asset failed (price edited but not yet in asset):", writeErr);
      }
      setEditingId(null);
      setEditPrice("");
      setGroups((prev) =>
        prev
          .map((g) =>
            g.assetId === listing.assetId
              ? { ...g, listings: g.listings.filter((l) => l.id !== listing.id) }
              : g
          )
          .filter((g) => g.listings.length > 0)
      );
      setPendingCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Edit failed:", error);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Progress listener ─────────────────────────────────────────────

  const startProgressListener = useCallback(() => {
    if (!db) return;
    if (unsubProgressRef.current) unsubProgressRef.current();

    const progressDocRef = doc(db, "scrape_progress", "current");
    const unsub = onSnapshot(progressDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ScrapeProgress;
        const docUpdatedMs =
          data.updatedAt?.toMillis?.() ??
          (data.updatedAt?.seconds ? data.updatedAt.seconds * 1000 : 0);
        if (docUpdatedMs > 0 && docUpdatedMs < scrapeStartTimeRef.current - 5000) return;

        setProgress(data);

        if (data.status === "complete") {
          // Always refresh data when scrape completes — even if the HTTP
          // fetch already timed out and cleared triggeringScrapeRef.
          // Without this, a fetch timeout leaves the review queue blank
          // (old entries were deleted at scrape start but loadData never ran).
          triggeringScrapeRef.current = false;
          setTriggeringScrape(false);
          setScrapeResult(
            `Done — ${data.totalListings} listings from ${Object.keys(data.byMarketplace || {}).length} stores in ${((data.durationMs || 0) / 1000).toFixed(0)}s`
          );
          loadData();
          setTimeout(() => setProgress(null), 4000);
        }
      }
    });
    unsubProgressRef.current = unsub;
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (unsubProgressRef.current) unsubProgressRef.current();
    };
  }, []);

  const handleTriggerScrape = async () => {
    triggeringScrapeRef.current = true;
    scrapeStartTimeRef.current = Date.now();
    setTriggeringScrape(true);
    setScrapeResult(null);
    setProgress(null);
    startProgressListener();

    try {
      const token = await auth?.currentUser?.getIdToken();
      if (!token) {
        setScrapeResult("Failed: Not signed in — please log in and try again.");
        return;
      }

      const response = await fetch(
        "https://asia-south1-intelligence-exchange-8281f.cloudfunctions.net/manualScrapeMarketplaces?discover=false",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        if (!scrapeResult) {
          setScrapeResult(
            `Done — ${data.totalListings} listings from ${Object.keys(data.byMarketplace || {}).length} stores`
          );
        }
        await loadData();
      } else {
        setScrapeResult(`Failed: ${data.error || "Unknown error"}`);
        await loadData();
      }
    } catch (err) {
      setScrapeResult("Scrape request failed — the function may still be running. Check back shortly.");
      console.error("Scrape trigger error:", err);
    } finally {
      if (!triggeringScrapeRef.current) {
        // already handled by listener
      } else {
        triggeringScrapeRef.current = false;
        setTriggeringScrape(false);
      }
    }
  };

  // ── Filter ────────────────────────────────────────────────────────

  const filteredGroups = searchQuery.trim()
    ? groups.filter(
        (g) =>
          g.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          g.assetSku.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : groups;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-brand-black">
            Scraped Prices
          </h2>
          {pendingCount > 0 && (
            <span className="px-2.5 py-1 bg-brand-black text-brand-white text-xs font-medium">
              {pendingCount.toLocaleString()} to review
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-3 py-1.5 text-xs font-medium border transition-all ${
              showHistory
                ? "border-brand-black bg-brand-black text-brand-white"
                : "border-brand-gray/20 text-brand-black/50 hover:border-brand-black/40"
            }`}
          >
            History
          </button>
          <button
            onClick={handleTriggerScrape}
            disabled={triggeringScrape}
            className="px-4 py-1.5 bg-brand-black text-brand-white text-xs font-medium hover:bg-brand-black/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {triggeringScrape ? (
              <span className="flex items-center gap-1.5">
                <Spinner size={3} />
                Scraping…
              </span>
            ) : (
              "↻ Run Scrape"
            )}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {progress && (progress.status === "in_progress" || (progress.status === "complete" && triggeringScrape)) && (
        <ProgressBar progress={progress} />
      )}

      {/* Result banner */}
      {scrapeResult && (
        <div className="bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-700">
          {scrapeResult}
        </div>
      )}

      {/* Error banner */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* History panel (collapsible — doesn't hide the review queue) */}
      {showHistory && <HistoryPanel runs={scrapeRuns} />}

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search by name or SKU…"
        className="w-full border border-brand-gray/20 px-3 py-2 text-sm text-brand-black placeholder:text-brand-black/30 focus:outline-none focus:border-brand-black/40 transition-colors"
      />

      {/* Review queue — always visible */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Spinner size={5} />
            <p className="text-sm text-brand-black/40">Loading…</p>
          </div>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-brand-black/40">
            {searchQuery ? "No matches" : "All caught up — nothing to review"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-brand-black/40">
            Showing {filteredGroups.length} asset{filteredGroups.length !== 1 ? "s" : ""} with{" "}
            {filteredGroups.reduce((sum, g) => sum + g.listings.length, 0).toLocaleString()} listings
          </p>
          {filteredGroups.map((group) => (
            <AssetCard
              key={group.assetId}
              group={group}
              isExpanded={expandedAsset === group.assetId}
              onToggle={() =>
                setExpandedAsset(expandedAsset === group.assetId ? null : group.assetId)
              }
              onApproveAll={() => handleApproveAll(group.assetId)}
              onSkip={() => handleSkip(group.assetId)}
              onApproveSingle={handleApproveSingle}
              onRejectSingle={handleRejectSingle}
              editingId={editingId}
              editPrice={editPrice}
              onStartEdit={(id, price) => {
                setEditingId(id);
                setEditPrice(String(price));
              }}
              onEditPriceChange={setEditPrice}
              onEditSave={handleEditSave}
              onEditCancel={() => {
                setEditingId(null);
                setEditPrice("");
              }}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Asset Card ───────────────────────────────────────────────────────

const AssetCard: React.FC<{
  group: ScrapedPriceGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onApproveAll: () => void;
  onSkip: () => void;
  onApproveSingle: (l: ScrapedPrice) => void;
  onRejectSingle: (l: ScrapedPrice) => void;
  editingId: string | null;
  editPrice: string;
  onStartEdit: (id: string, price: number) => void;
  onEditPriceChange: (v: string) => void;
  onEditSave: (l: ScrapedPrice) => void;
  onEditCancel: () => void;
  actionLoading: string | null;
}> = ({
  group,
  isExpanded,
  onToggle,
  onApproveAll,
  onSkip,
  onApproveSingle,
  onRejectSingle,
  editingId,
  editPrice,
  onStartEdit,
  onEditPriceChange,
  onEditSave,
  onEditCancel,
  actionLoading,
}) => {
  // Group by marketplace
  const byMp = new Map<string, ScrapedPrice[]>();
  for (const l of group.listings) {
    if (!byMp.has(l.marketplace)) byMp.set(l.marketplace, []);
    byMp.get(l.marketplace)!.push(l);
  }

  const isApproving = actionLoading === `approve-${group.assetId}`;

  return (
    <div className="border border-brand-gray/20 bg-brand-white" style={{ overflow: 'hidden' }}>
      {/* Card header — always visible */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Image */}
          {group.image && (
            <img
              src={group.image}
              alt={group.assetName}
              className="w-14 h-14 object-cover border border-brand-gray/15 flex-shrink-0"
            />
          )}

          {/* Name + SKU */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-brand-black truncate">
              {group.assetName}
            </p>
            <p className="text-xs text-brand-black/40 font-mono-numeric mt-0.5">
              {group.assetSku}
            </p>

            {/* Marketplace price summaries */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {Array.from(byMp.entries()).map(([mp, listings]) => (
                <div key={mp} className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-brand-black/50">
                    {listings[0]?.marketplaceDisplayName || mp}
                  </span>
                  {listings[0]?.channel === "international" && (
                    <span className="text-[10px] px-1 py-0 bg-blue-100 text-blue-700 font-medium">
                      INTL
                    </span>
                  )}
                  <span className="text-xs font-mono-numeric text-brand-black/70">
                    {priceRange(listings)}
                  </span>
                  <span className="text-xs text-brand-black/30">
                    ({listings.length})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
            <button
              onClick={onToggle}
              className="px-3 py-1.5 text-xs font-medium border border-brand-gray/20 text-brand-black/50 hover:border-brand-black/40 hover:text-brand-black transition-all"
            >
              {isExpanded ? "Hide" : "Inspect"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSkip();
              }}
              className="px-3 py-1.5 text-xs font-medium border border-brand-gray/20 text-brand-black/40 hover:border-brand-black/30 transition-all"
            >
              Skip
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onApproveAll();
              }}
              disabled={isApproving}
              className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50"
            >
              {isApproving ? (
                <span className="flex items-center gap-1">
                  <Spinner size={3} />
                  …
                </span>
              ) : (
                `✓ Approve All (${group.listings.length})`
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded: size/price table per marketplace */}
      {isExpanded && (
        <div className="border-t border-brand-gray/15">
          {Array.from(byMp.entries()).map(([mp, listings]) => (
            <div key={mp}>
              {/* Marketplace sub-header */}
              <div className="px-4 py-2 bg-brand-gray/5 border-b border-brand-gray/10 flex items-center gap-2">
                <span className="text-xs font-medium text-brand-black/50">
                  {listings[0]?.marketplaceDisplayName || mp}
                </span>
                {listings[0]?.channel === "international" && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 font-medium">
                    INTL
                  </span>
                )}
              </div>

              {/* Listings table */}
              <div className="divide-y divide-brand-gray/10">
                {listings
                  .sort((a, b) => {
                    const sA = parseFloat(a.size.replace(/[^0-9.]/g, "")) || 0;
                    const sB = parseFloat(b.size.replace(/[^0-9.]/g, "")) || 0;
                    return sA - sB;
                  })
                  .map((listing) => {
                    const isEditing = editingId === listing.id;
                    const isLoading = actionLoading === listing.id;

                    return (
                      <div
                        key={listing.id}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-brand-gray/[0.03] transition-all"
                      >
                        {/* Size + stock badge */}
                        <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
                          <span className="text-xs font-mono-numeric text-brand-black">
                            {listing.size}
                          </span>
                          {listing.inStock === true && (
                            <span className="text-[9px] px-1 py-px rounded bg-green-100 text-green-700 font-medium leading-none whitespace-nowrap">
                              In Stock
                            </span>
                          )}
                          {listing.inStock === false && (
                            <span className="text-[9px] px-1 py-px rounded bg-amber-100 text-amber-700 font-medium leading-none whitespace-nowrap">
                              Listed
                            </span>
                          )}
                        </div>

                        {/* Price */}
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-brand-black/40">₹</span>
                            <input
                              type="number"
                              value={editPrice}
                              onChange={(e) => onEditPriceChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") onEditSave(listing);
                                if (e.key === "Escape") onEditCancel();
                              }}
                              className="w-20 border border-brand-black/20 px-2 py-1 text-xs font-mono-numeric focus:outline-none focus:border-brand-black/40"
                              autoFocus
                            />
                            <button
                              onClick={() => onEditSave(listing)}
                              className="text-xs text-green-700 font-medium hover:underline"
                            >
                              Save
                            </button>
                            <button
                              onClick={onEditCancel}
                              className="text-xs text-brand-black/40 hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col flex-shrink-0">
                            <span className="text-xs font-mono-numeric text-brand-black font-semibold w-24">
                              ₹{listing.price.toLocaleString("en-IN")}
                            </span>
                            {listing.channel === "international" && listing.priceUsd != null && (
                              <span className="text-[10px] text-brand-black/40 font-mono-numeric leading-tight">
                                ${listing.priceUsd}{listing.platformFeeUsd ? ` + $${listing.platformFeeUsd} fees` : ""}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Product name */}
                        <span className="text-xs text-brand-black/40 truncate flex-1 min-w-0">
                          {listing.name}
                        </span>

                        {/* Link */}
                        {listing.url && (
                          <a
                            href={listing.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-brand-black/30 hover:text-brand-black underline flex-shrink-0"
                          >
                            Link
                          </a>
                        )}

                        {/* Row actions */}
                        {!isEditing && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isLoading ? (
                              <Spinner size={3} />
                            ) : (
                              <>
                                <button
                                  onClick={() => onApproveSingle(listing)}
                                  className="w-6 h-6 flex items-center justify-center text-green-600 hover:bg-green-50 transition-all text-xs"
                                  title="Approve"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => onStartEdit(listing.id, listing.price)}
                                  className="w-6 h-6 flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-all text-xs"
                                  title="Edit price"
                                >
                                  ✎
                                </button>
                                <button
                                  onClick={() => onRejectSingle(listing)}
                                  className="w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-50 transition-all text-xs"
                                  title="Reject"
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Progress Bar ─────────────────────────────────────────────────────

const ProgressBar: React.FC<{ progress: ScrapeProgress }> = ({ progress }) => {
  // v3: URL-direct uses totalUrls/fetchedUrls for best granularity
  const hasUrls = (progress.totalUrls ?? 0) > 0;
  const hasStores = (progress.totalStores ?? 0) > 0;
  const pct = hasUrls
    ? Math.round(((progress.fetchedUrls ?? 0) / (progress.totalUrls ?? 1)) * 100)
    : hasStores
    ? Math.round(((progress.completedStores ?? 0) / (progress.totalStores ?? 1)) * 100)
    : progress.totalAssets > 0
    ? Math.round((progress.completedAssets / progress.totalAssets) * 100)
    : 0;

  const label =
    progress.phase === "initializing"
      ? "Initializing…"
      : progress.phase === "clearing_stale"
      ? "Clearing old data…"
      : progress.phase === "scraping"
      ? "Fetching product prices…"
      : progress.phase === "writing"
      ? "Writing results…"
      : "Finishing…";

  return (
    <div className="border border-brand-gray/20 bg-brand-white p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Spinner size={3} />
          <span className="text-xs font-medium text-brand-black">{label}</span>
        </div>
        <span className="text-xs font-mono-numeric text-brand-black/50">
          {hasUrls
            ? `${progress.fetchedUrls}/${progress.totalUrls} products`
            : hasStores
            ? `${progress.completedStores}/${progress.totalStores} stores`
            : `${progress.completedAssets}/${progress.totalAssets} assets`}
          {hasStores && ` • ${progress.completedStores}/${progress.totalStores} stores`}
          {" • "}{pct}%
        </span>
      </div>

      <div className="w-full h-1.5 bg-brand-gray/15 overflow-hidden">
        <div
          className="h-full bg-brand-black transition-all duration-500 ease-out"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>

      {progress.currentMarketplace && (
        <p className="text-xs text-brand-black/40">{progress.currentMarketplace}</p>
      )}

      {progress.totalListings > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-brand-black/50">
            <span className="font-semibold text-brand-black">{progress.totalListings}</span> listings
          </span>
          {Object.entries(progress.byMarketplace || {})
            .sort(([, a], [, b]) => b - a)
            .map(([mp, count]) => (
              <span key={mp} className="text-xs text-brand-black/40 font-mono-numeric">
                {mp}: {count}
              </span>
            ))}
        </div>
      )}
    </div>
  );
};

// ── History Panel ────────────────────────────────────────────────────

const HistoryPanel: React.FC<{ runs: ScrapeRun[] }> = ({ runs }) => {
  if (runs.length === 0) {
    return (
      <div className="border border-brand-gray/20 p-6 text-center bg-brand-white">
        <p className="text-sm text-brand-black/40">No scrape runs yet</p>
      </div>
    );
  }

  return (
    <div className="border border-brand-gray/20 divide-y divide-brand-gray/10 bg-brand-white overflow-hidden">
      <div className="px-4 py-3 bg-brand-gray/5">
        <span className="text-xs font-medium text-brand-black/50">
          Recent Runs
        </span>
      </div>
      {runs.map((run) => (
        <div key={run.id} className="px-4 py-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-brand-black">
                {run.totalListings.toLocaleString()} listings
              </span>
              <span className="text-brand-black/50">{run.assetsScraped} assets</span>
              <span className="text-brand-black/50 font-mono-numeric">
                {(run.durationMs / 1000).toFixed(0)}s
              </span>
              {run.errors.length > 0 && (
                <span className="text-red-500">
                  {run.errors.length} error{run.errors.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <span className="text-xs text-brand-black/40 font-mono-numeric">
              {run.completedAt
                ? new Date((run.completedAt as any).seconds * 1000).toLocaleString("en-IN", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(run.byMarketplace)
              .sort(([, a], [, b]) => b - a)
              .map(([mp, count]) => (
                <span
                  key={mp}
                  className="text-xs text-brand-black/50 font-mono-numeric"
                >
                  {mp}: {count}
                </span>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Spinner ──────────────────────────────────────────────────────────

const Spinner: React.FC<{ size?: number }> = ({ size = 4 }) => (
  <svg
    className={`w-${size} h-${size} animate-spin text-brand-black/40`}
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export default ScrapedPricesReview;
