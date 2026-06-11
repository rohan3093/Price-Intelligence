/**
 * WhatsApp Chat Import
 *
 * Allows analysts to paste a WhatsApp chat export and automatically
 * extract WTS/WTB listings, match them to catalog assets, review,
 * and save directly to pricePoints.whatsapp[].
 *
 * Workflow:
 *   1. Analyst exports chat from WhatsApp group (Export Chat → Without Media)
 *   2. Pastes the text (or uploads .txt) into this component
 *   3. Parser extracts structured listings
 *   4. Fuzzy matcher links them to existing assets
 *   5. Analyst reviews, corrects matches, and imports
 */

import React, { useState, useMemo, useCallback } from "react";
import { Asset, PricePoint } from "../types";
import {
  parseWhatsAppChat,
  matchListingsToAssets,
  matchedListingToPricePoint,
  MatchedListing,
} from "../utils/whatsappChatParser";

// ── Props ─────────────────────────────────────────────────────────────

interface WhatsAppImportProps {
  assets: Asset[];
  onUpdateAsset: (asset: Asset) => void;
}

// ── Component ─────────────────────────────────────────────────────────

export const WhatsAppImport: React.FC<WhatsAppImportProps> = ({
  assets,
  onUpdateAsset,
}) => {
  const [chatText, setChatText] = useState("");
  const [matchedListings, setMatchedListings] = useState<MatchedListing[]>([]);
  const [isParsed, setIsParsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    saved: number;
    skipped: number;
    deduplicated: number;
    errors: string[];
  } | null>(null);
  const [sideFilter, setSideFilter] = useState<"all" | "WTS" | "WTB">("all");
  const [confidenceFilter, setConfidenceFilter] = useState<"all" | "high" | "low" | "unmatched">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailListing, setDetailListing] = useState<MatchedListing | null>(null);

  // ── Parse ─────────────────────────────────────────────────────────

  const handleParse = useCallback(() => {
    if (!chatText.trim()) return;

    const parsed = parseWhatsAppChat(chatText);
    const matched = matchListingsToAssets(parsed, assets);
    setMatchedListings(matched);
    setIsParsed(true);
    setSaveResult(null);
  }, [chatText, assets]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setChatText(text);
      };
      reader.readAsText(file);
    },
    []
  );

  // ── Selection ─────────────────────────────────────────────────────

  const toggleSelection = (index: number) => {
    setMatchedListings((prev) =>
      prev.map((l, i) => (i === index ? { ...l, selected: !l.selected } : l))
    );
  };

  const selectAll = () => {
    setMatchedListings((prev) =>
      prev.map((l) => ({
        ...l,
        selected: l.matchedAsset !== null && l.price !== null,
      }))
    );
  };

  const deselectAll = () => {
    setMatchedListings((prev) => prev.map((l) => ({ ...l, selected: false })));
  };

  const handleAssetOverride = (index: number, assetId: number) => {
    const asset = assets.find((a) => a.id === assetId) || null;
    setMatchedListings((prev) =>
      prev.map((l, i) =>
        i === index
          ? {
              ...l,
              manualAssetId: assetId,
              matchedAsset: asset,
              matchConfidence: asset ? 100 : 0,
              selected: asset !== null && l.price !== null,
            }
          : l
      )
    );
  };

  const handleSizeOverride = (index: number, size: string) => {
    setMatchedListings((prev) =>
      prev.map((l, i) => (i === index ? { ...l, manualSize: size } : l))
    );
  };

  const handlePriceOverride = (index: number, price: number) => {
    setMatchedListings((prev) =>
      prev.map((l, i) => (i === index ? { ...l, price } : l))
    );
  };

  // ── Save to assets ────────────────────────────────────────────────

  const handleImport = useCallback(async () => {
    const toImport = matchedListings.filter(
      (l) => l.selected && l.matchedAsset && l.price
    );
    if (toImport.length === 0) return;

    setIsSaving(true);
    const errors: string[] = [];
    let saved = 0;
    let deduplicated = 0;

    // Group by asset ID for batched updates
    const byAsset = new Map<number, MatchedListing[]>();
    for (const listing of toImport) {
      const assetId = listing.manualAssetId || listing.matchedAsset!.id;
      if (!byAsset.has(assetId)) byAsset.set(assetId, []);
      byAsset.get(assetId)!.push(listing);
    }

    for (const [assetId, listings] of byAsset.entries()) {
      try {
        const asset = assets.find((a) => a.id === assetId);
        if (!asset) {
          errors.push(`Asset ID ${assetId} not found`);
          continue;
        }

        // Clone sizes
        const updatedSizes = (asset.sizes || []).map((s) => ({ ...s }));

        for (const listing of listings) {
          const size = listing.manualSize || listing.sizes[0] || asset.defaultSize || asset.sizes?.[0]?.size;
          if (!size) {
            errors.push(`No size for "${listing.assetText}" (${listing.sender})`);
            continue;
          }

          // Find or create size variant
          let sizeVariant = updatedSizes.find((s) => s.size === size);
          if (!sizeVariant) {
            sizeVariant = {
              size,
              b2bMarketPrice: "",
              endCustomerMarketPrice: "",
              stockxGoatPrice: "",
              fairRange: "",
              confidence: 0,
              change30d: "",
              change90d: "",
              liquidity: "",
              volumeLabel: "",
              pricePoints: {
                whatsapp: [],
                marketplace: [],
                international: [],
              },
            };
            updatedSizes.push(sizeVariant);
          }

          // Ensure pricePoints structure
          if (!sizeVariant.pricePoints) {
            sizeVariant.pricePoints = {
              whatsapp: [],
              marketplace: [],
              international: [],
            };
          }
          const pp = sizeVariant.pricePoints as {
            whatsapp: PricePoint[];
            marketplace: PricePoint[];
            international: PricePoint[];
          };
          if (!pp.whatsapp) pp.whatsapp = [];

          // Create price point
          const pricePoint = matchedListingToPricePoint(listing, size);

          // Deduplication: check if this seller already has a listing at the same price for this size.
          // Common pattern: sellers re-post the same listing daily to stay top-of-mind.
          // Match on: same seller (by name) + same price + same transaction type.
          const existingIdx = pp.whatsapp.findIndex((existing) => {
            const sameSeller =
              existing.sellerName && pricePoint.sellerName &&
              existing.sellerName.toLowerCase().trim() === pricePoint.sellerName.toLowerCase().trim();
            const samePrice = existing.price === pricePoint.price;
            const sameSide = existing.transactionType === pricePoint.transactionType;
            return sameSeller && samePrice && sameSide;
          });

          if (existingIdx !== -1) {
            // Duplicate found — just refresh the lastSeen timestamp (listing is still active)
            pp.whatsapp[existingIdx].lastSeen = pricePoint.lastSeen;
            // Also update contact/location in case they changed
            if (pricePoint.sellerContact) pp.whatsapp[existingIdx].sellerContact = pricePoint.sellerContact;
            if (pricePoint.sellerLocation) pp.whatsapp[existingIdx].sellerLocation = pricePoint.sellerLocation;
            deduplicated++;
          } else {
            pp.whatsapp.push(pricePoint);
            // Sort by price
            pp.whatsapp.sort((a, b) => a.price - b.price);
            saved++;
          }

          sizeVariant.lastUpdated = new Date().toISOString();
        }

        // Update asset
        const updatedAsset: Asset = {
          ...asset,
          sizes: updatedSizes,
          lastUpdated: new Date().toISOString(),
        };

        onUpdateAsset(updatedAsset);
      } catch (err) {
        errors.push(
          `Failed to update asset ${assetId}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    setSaveResult({
      saved,
      skipped: toImport.length - saved - deduplicated,
      deduplicated,
      errors,
    });
    setIsSaving(false);

    // Mark imported listings as deselected so they aren't re-imported
    setMatchedListings((prev) =>
      prev.map((l) => (l.selected && l.matchedAsset && l.price ? { ...l, selected: false } : l))
    );
  }, [matchedListings, assets, onUpdateAsset]);

  // ── Filtering ─────────────────────────────────────────────────────

  const filteredListings = useMemo(() => {
    return matchedListings.filter((l) => {
      if (sideFilter !== "all" && l.side !== sideFilter) return false;
      if (confidenceFilter === "high" && l.matchConfidence < 50) return false;
      if (confidenceFilter === "low" && (l.matchConfidence >= 50 || l.matchConfidence === 0))
        return false;
      if (confidenceFilter === "unmatched" && l.matchConfidence > 0) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const hay =
          `${l.assetText} ${l.sender} ${l.matchedAsset?.name || ""} ${l.matchedAsset?.sku || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [matchedListings, sideFilter, confidenceFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = matchedListings.length;
    const selected = matchedListings.filter((l) => l.selected).length;
    const highConf = matchedListings.filter((l) => l.matchConfidence >= 50).length;
    const unmatched = matchedListings.filter((l) => l.matchConfidence === 0).length;
    const wts = matchedListings.filter((l) => l.side === "WTS").length;
    const wtb = matchedListings.filter((l) => l.side === "WTB").length;
    return { total, selected, highConf, unmatched, wts, wtb };
  }, [matchedListings]);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-brand-black mb-1">
          WhatsApp Chat Import
        </h2>
        <p className="text-xs text-brand-black/50">
          Export a WhatsApp group chat (without media) and paste it below. The
          parser will extract WTS/WTB listings, match them to your asset catalog,
          and let you review before importing.
        </p>
      </div>

      {/* Input area */}
      {!isParsed && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1.5">
              Chat Export Text
            </label>
            <textarea
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              className="w-full border border-brand-gray/30 px-3 py-2 text-xs font-mono text-brand-black focus:outline-none focus:border-brand-black resize-none"
              rows={12}
              placeholder={`Paste your WhatsApp chat export here...\n\nExample:\n18/02/2026, 10:32 am - Rahul_Delhi: WTS Jordan 4 Bred UK9 12000\n18/02/2026, 10:45 am - SneakerVault: wts Dunk Low Panda uk8 uk9 uk10 ₹8,500\n18/02/2026, 11:02 am - Mayankk_01: WTB Yeezy 350 Bone UK10 7k`}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleParse}
              disabled={!chatText.trim()}
              className="px-4 py-2 bg-brand-black text-white text-xs font-semibold hover:bg-brand-black/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Parse Chat
            </button>

            <span className="text-xs text-brand-black/40">or</span>

            <label className="px-4 py-2 border border-brand-gray/30 text-brand-black text-xs font-semibold cursor-pointer hover:border-brand-black transition-all">
              Upload .txt File
              <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {chatText && (
              <span className="text-[10px] text-brand-black/40 ml-auto">
                {chatText.split("\n").length.toLocaleString()} lines pasted
              </span>
            )}
          </div>

          {/* How-to instructions */}
          <div
            className="border border-brand-gray/15 bg-brand-gray/5 p-3"
          >
            <p className="text-[10px] font-semibold text-brand-black/60 uppercase tracking-wide mb-2">
              How to Export
            </p>
            <ol className="text-[11px] text-brand-black/50 space-y-1 list-decimal list-inside">
              <li>
                Open the WhatsApp group → tap <strong>⋮</strong> (menu) →{" "}
                <strong>More</strong> → <strong>Export Chat</strong>
              </li>
              <li>
                Choose <strong>Without Media</strong>
              </li>
              <li>Save/share the .txt file, then paste or upload here</li>
            </ol>
          </div>
        </div>
      )}

      {/* Results */}
      {isParsed && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <div className="text-xs text-brand-black/60">
                <span className="font-semibold text-brand-black">{stats.total}</span>{" "}
                listings found
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="px-1.5 py-0.5 border border-red-400/40 text-red-600 font-medium">
                  {stats.wts} WTS
                </span>
                <span className="px-1.5 py-0.5 border border-emerald-400/40 text-emerald-600 font-medium">
                  {stats.wtb} WTB
                </span>
              </div>
              <div className="text-[10px] text-brand-black/40">
                {stats.highConf} auto-matched · {stats.unmatched} unmatched
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsParsed(false);
                  setMatchedListings([]);
                  setSaveResult(null);
                }}
                className="px-3 py-1.5 border border-brand-gray/30 text-brand-black text-[10px] font-semibold hover:border-brand-black transition-all"
              >
                ← Back to Input
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sideFilter}
              onChange={(e) => setSideFilter(e.target.value as any)}
              className="border border-brand-gray/30 px-2 py-1 text-[11px] text-brand-black focus:outline-none focus:border-brand-black"
            >
              <option value="all">All Sides</option>
              <option value="WTS">WTS Only</option>
              <option value="WTB">WTB Only</option>
            </select>
            <select
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(e.target.value as any)}
              className="border border-brand-gray/30 px-2 py-1 text-[11px] text-brand-black focus:outline-none focus:border-brand-black"
            >
              <option value="all">All Matches</option>
              <option value="high">High Confidence (&ge;50)</option>
              <option value="low">Low Confidence</option>
              <option value="unmatched">Unmatched</option>
            </select>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search asset, sender…"
              className="border border-brand-gray/30 px-2 py-1 text-[11px] text-brand-black focus:outline-none focus:border-brand-black placeholder:text-brand-black/30 w-48"
            />

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-[10px] text-brand-black/50 hover:text-brand-black underline"
              >
                Select All Valid
              </button>
              <button
                onClick={deselectAll}
                className="text-[10px] text-brand-black/50 hover:text-brand-black underline"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Listings table */}
          <div className="border border-brand-gray/20 overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="min-w-full text-[11px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-brand-gray/5 border-b border-brand-gray/20">
                    <th className="w-8 px-2 py-2 text-center bg-brand-gray/5">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-brand-black/60 uppercase tracking-wide text-[9px] bg-brand-gray/5">
                      Side
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-brand-black/60 uppercase tracking-wide text-[9px] bg-brand-gray/5">
                      Sender
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-brand-black/60 uppercase tracking-wide text-[9px] bg-brand-gray/5">
                      Extracted Text
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-brand-black/60 uppercase tracking-wide text-[9px] bg-brand-gray/5">
                      Matched Asset
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-brand-black/60 uppercase tracking-wide text-[9px] bg-brand-gray/5">
                      Size
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-brand-black/60 uppercase tracking-wide text-[9px] bg-brand-gray/5">
                      Price
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-brand-black/60 uppercase tracking-wide text-[9px] bg-brand-gray/5">
                      Confidence
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-brand-black/60 uppercase tracking-wide text-[9px] bg-brand-gray/5">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredListings.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-8 text-center text-xs text-brand-black/40"
                      >
                        No listings match your filters
                      </td>
                    </tr>
                  ) : (
                    filteredListings.map((listing) => {
                      // Find original index for operations
                      const originalIdx = matchedListings.indexOf(listing);
                      return (
                        <ListingRow
                          key={originalIdx}
                          listing={listing}
                          index={originalIdx}
                          assets={assets}
                          onToggleSelection={toggleSelection}
                          onAssetOverride={handleAssetOverride}
                          onSizeOverride={handleSizeOverride}
                          onPriceOverride={handlePriceOverride}
                          onShowDetail={setDetailListing}
                        />
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import action — always visible below the scrollable table */}
          <div
            className="flex items-center justify-between pt-3 pb-1 border-t border-brand-gray/15 bg-white"
          >
            <div className="text-xs text-brand-black/50">
              <span className="font-semibold text-brand-black">{stats.selected}</span>{" "}
              listing{stats.selected !== 1 ? "s" : ""} selected for import
            </div>
            <button
              onClick={handleImport}
              disabled={stats.selected === 0 || isSaving}
              className="px-5 py-2.5 bg-brand-black text-white text-xs font-semibold hover:bg-brand-black/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving
                ? "Saving…"
                : `Import ${stats.selected} Listing${stats.selected !== 1 ? "s" : ""}`}
            </button>
          </div>

          {/* Save result */}
          {saveResult && (
            <div
              className={`p-3 border text-xs ${
                saveResult.errors.length > 0
                  ? "border-yellow-300 bg-yellow-50 text-yellow-800"
                  : "border-emerald-300 bg-emerald-50 text-emerald-800"
              }`}
            >
              <p className="font-semibold mb-1">
                {saveResult.saved > 0 ? "✓ " : ""}
                {saveResult.saved} listing{saveResult.saved !== 1 ? "s" : ""} imported
                successfully
                {saveResult.deduplicated > 0 && ` · ${saveResult.deduplicated} duplicate${saveResult.deduplicated !== 1 ? "s" : ""} refreshed`}
                {saveResult.skipped > 0 && ` · ${saveResult.skipped} skipped`}
              </p>
              {saveResult.errors.length > 0 && (
                <ul className="list-disc list-inside space-y-0.5 mt-1 text-[10px]">
                  {saveResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Message Detail Modal */}
      {detailListing && (
        <MessageDetailModal
          listing={detailListing}
          onClose={() => setDetailListing(null)}
        />
      )}
    </div>
  );
};

// ── Message Detail Modal ────────────────────────────────────────────

const MessageDetailModal: React.FC<{
  listing: MatchedListing;
  onClose: () => void;
}> = ({ listing, onClose }) => {
  const time = new Date(listing.timestamp);
  const timeStr = `${time.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })} at ${time
    .toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })
    .toLowerCase()}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-lg max-h-[85vh] shadow-2xl border border-brand-gray/20 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-gray/15 bg-brand-gray/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`px-1.5 py-0.5 text-[10px] font-semibold border ${
                listing.side === "WTS"
                  ? "border-red-400/40 text-red-600"
                  : "border-emerald-400/40 text-emerald-600"
              }`}
            >
              {listing.side}
            </span>
            <span className="text-xs font-semibold text-brand-black">
              {listing.sender}
            </span>
            {listing.location && (
              <span className="text-[10px] text-brand-black/40">
                · {listing.location}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-brand-black/40 hover:text-brand-black text-sm px-1.5 py-0.5 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Full message — scrollable */}
        <div className="px-4 py-3 space-y-3 overflow-y-auto flex-1 min-h-0">
          <div>
            <p className="text-[9px] font-semibold text-brand-black/40 uppercase tracking-wide mb-1">
              Full Message
            </p>
            <div
              className="bg-brand-gray/5 border border-brand-gray/15 px-3 py-2.5 text-xs text-brand-black leading-relaxed whitespace-pre-wrap break-words"
            >
              {listing.rawMessage}
            </div>
          </div>

          {/* Extracted fields */}
          <div>
            <p className="text-[9px] font-semibold text-brand-black/40 uppercase tracking-wide mb-1.5">
              Extracted Data
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-brand-black/50">Asset Text</span>
                <span className="font-medium text-brand-black text-right ml-2">
                  {listing.assetText || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-black/50">Side</span>
                <span className="font-medium text-brand-black">{listing.side}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-black/50">Price</span>
                <span className="font-medium text-brand-black">
                  {listing.price ? `₹${listing.price.toLocaleString("en-IN")}` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-black/50">Sizes</span>
                <span className="font-medium text-brand-black">
                  {listing.sizes.length > 0 ? listing.sizes.join(", ") : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-black/50">Contact</span>
                <span className="font-medium text-brand-black">
                  {listing.contact || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-black/50">Location</span>
                <span className="font-medium text-brand-black">
                  {listing.location || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Match info */}
          {listing.matchedAsset && (
            <div>
              <p className="text-[9px] font-semibold text-brand-black/40 uppercase tracking-wide mb-1.5">
                Matched Asset
              </p>
              <div
                className="flex items-center justify-between border border-brand-gray/15 px-3 py-2"
              >
                <div>
                  <span className="text-xs font-medium text-brand-black">
                    {listing.matchedAsset.name}
                  </span>
                  <span className="block text-[10px] text-brand-black/40">
                    {listing.matchedAsset.sku} · {listing.matchedAsset.brand}
                  </span>
                </div>
                <span
                  className={`px-1.5 py-0.5 text-[9px] font-semibold border ${
                    listing.matchConfidence >= 70
                      ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                      : listing.matchConfidence >= 40
                      ? "text-yellow-700 bg-yellow-50 border-yellow-200"
                      : "text-orange-600 bg-orange-50 border-orange-200"
                  }`}
                >
                  {listing.matchConfidence}% match
                </span>
              </div>
            </div>
          )}

          {/* Other candidates */}
          {listing.matchCandidates.length > 1 && (
            <div>
              <p className="text-[9px] font-semibold text-brand-black/40 uppercase tracking-wide mb-1">
                Other Candidates
              </p>
              <div className="space-y-0.5">
                {listing.matchCandidates.slice(1, 4).map((c) => (
                  <div
                    key={c.asset.id}
                    className="flex items-center justify-between text-[10px] text-brand-black/50 px-1"
                  >
                    <span>
                      {c.asset.name}{" "}
                      <span className="text-brand-black/30">({c.asset.sku})</span>
                    </span>
                    <span className="text-brand-black/30">{c.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-[10px] text-brand-black/30 pt-1 border-t border-brand-gray/10">
            {timeStr}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Listing Row ─────────────────────────────────────────────────────

const ListingRow: React.FC<{
  listing: MatchedListing;
  index: number;
  assets: Asset[];
  onToggleSelection: (idx: number) => void;
  onAssetOverride: (idx: number, assetId: number) => void;
  onSizeOverride: (idx: number, size: string) => void;
  onPriceOverride: (idx: number, price: number) => void;
  onShowDetail: (listing: MatchedListing) => void;
}> = ({
  listing,
  index,
  assets,
  onToggleSelection,
  onAssetOverride,
  onSizeOverride,
  onPriceOverride,
  onShowDetail,
}) => {
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");

  const filteredAssets = useMemo(() => {
    if (!assetSearch.trim()) return assets.slice(0, 20);
    const q = assetSearch.toLowerCase();
    return assets
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.sku.toLowerCase().includes(q) ||
          a.brand.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [assets, assetSearch]);

  const matchedAsset = listing.matchedAsset;
  const availableSizes = matchedAsset?.sizes?.map((s) => s.size) || [];

  const confColor =
    listing.matchConfidence >= 70
      ? "text-emerald-600 bg-emerald-50 border-emerald-200"
      : listing.matchConfidence >= 40
      ? "text-yellow-700 bg-yellow-50 border-yellow-200"
      : listing.matchConfidence > 0
      ? "text-orange-600 bg-orange-50 border-orange-200"
      : "text-red-500 bg-red-50 border-red-200";

  const time = new Date(listing.timestamp);
  const timeStr = `${time.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })} ${time
    .toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })
    .toLowerCase()}`;

  return (
    <tr
      className={`border-b border-brand-gray/10 hover:bg-brand-gray/5 transition-colors ${
        listing.selected ? "bg-emerald-50/30" : ""
      }`}
    >
      {/* Checkbox */}
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={listing.selected}
          onChange={() => onToggleSelection(index)}
          className="w-3.5 h-3.5 accent-brand-black"
        />
      </td>

      {/* Side */}
      <td className="px-2 py-2">
        <span
          className={`px-1.5 py-0.5 text-[10px] font-semibold border ${
            listing.side === "WTS"
              ? "border-red-400/40 text-red-600"
              : "border-emerald-400/40 text-emerald-600"
          }`}
        >
          {listing.side}
        </span>
      </td>

      {/* Sender */}
      <td className="px-2 py-2 font-medium text-brand-black max-w-[100px] truncate">
        {listing.sender}
        {listing.location && (
          <span className="block text-[9px] text-brand-black/40 font-normal">
            {listing.location}
          </span>
        )}
      </td>

      {/* Extracted text — clickable to open detail modal */}
      <td className="px-2 py-2 text-brand-black/70 max-w-[180px]">
        <button
          onClick={() => onShowDetail(listing)}
          className="text-left w-full group"
        >
          <span className="line-clamp-2 group-hover:text-brand-black transition-colors">
            {listing.assetText}
          </span>
          <span className="flex items-center gap-1 mt-0.5">
            {listing.sizes.length > 0 && (
              <span className="text-[9px] text-brand-black/40">
                Sizes: {listing.sizes.join(", ")}
              </span>
            )}
            <span className="text-[9px] text-brand-black/25 group-hover:text-brand-black/50 transition-colors ml-auto">
              View full ›
            </span>
          </span>
        </button>
      </td>

      {/* Matched asset */}
      <td className="px-2 py-2 relative">
        {showAssetDropdown ? (
          <div className="space-y-1">
            <input
              autoFocus
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
              onBlur={() => setTimeout(() => setShowAssetDropdown(false), 200)}
              placeholder="Search assets..."
              className="w-full border border-brand-black px-1.5 py-1 text-[10px] focus:outline-none"
            />
            <div
              className="absolute z-10 w-56 max-h-40 overflow-y-auto bg-white border border-brand-gray/30 shadow-lg"
            >
              {filteredAssets.map((a) => (
                <button
                  key={a.id}
                  onMouseDown={() => {
                    onAssetOverride(index, a.id);
                    setShowAssetDropdown(false);
                    setAssetSearch("");
                  }}
                  className="w-full text-left px-2 py-1.5 hover:bg-brand-gray/10 text-[10px] border-b border-brand-gray/10 last:border-0"
                >
                  <span className="font-medium">{a.name}</span>
                  <span className="text-brand-black/40 ml-1">({a.sku})</span>
                </button>
              ))}
              {filteredAssets.length === 0 && (
                <div className="px-2 py-2 text-[10px] text-brand-black/40">
                  No assets found
                </div>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAssetDropdown(true)}
            className="text-left w-full"
          >
            {matchedAsset ? (
              <div>
                <span className="font-medium text-brand-black">
                  {matchedAsset.name}
                </span>
                <span className="block text-[9px] text-brand-black/40">
                  {matchedAsset.sku}
                </span>
              </div>
            ) : (
              <span className="text-brand-black/30 italic">
                Click to match →
              </span>
            )}
          </button>
        )}
      </td>

      {/* Size */}
      <td className="px-2 py-2">
        {matchedAsset ? (
          <select
            value={listing.manualSize || listing.sizes[0] || ""}
            onChange={(e) => onSizeOverride(index, e.target.value)}
            className="border border-brand-gray/30 px-1 py-0.5 text-[10px] focus:outline-none focus:border-brand-black w-full max-w-[80px]"
          >
            <option value="">—</option>
            {availableSizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            {/* Include extracted sizes not in catalog */}
            {listing.sizes
              .filter((s) => !availableSizes.includes(s))
              .map((s) => (
                <option key={s} value={s}>
                  {s} (new)
                </option>
              ))}
          </select>
        ) : (
          <span className="text-brand-black/30 text-[10px]">
            {listing.sizes.join(", ") || "—"}
          </span>
        )}
      </td>

      {/* Price */}
      <td className="px-2 py-2 text-right">
        <input
          type="number"
          value={listing.price || ""}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) onPriceOverride(index, val);
          }}
          className="w-20 text-right border border-brand-gray/20 px-1 py-0.5 text-[11px] font-mono-numeric focus:outline-none focus:border-brand-black"
          placeholder="₹"
        />
      </td>

      {/* Confidence */}
      <td className="px-2 py-2">
        <span
          className={`inline-block px-1.5 py-0.5 text-[9px] font-semibold border ${confColor}`}
        >
          {listing.matchConfidence > 0 ? `${listing.matchConfidence}%` : "None"}
        </span>
      </td>

      {/* Time */}
      <td className="px-2 py-2 text-brand-black/40 whitespace-nowrap">
        {timeStr}
      </td>
    </tr>
  );
};

export default WhatsAppImport;

