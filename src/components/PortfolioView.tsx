import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Asset, PortfolioPosition, TradeListing } from "../types";
import { User } from "firebase/auth";
import { createTradeListing, getUserListings, cleanupDuplicateListings } from "../utils/connectionsApi";

interface PortfolioViewProps {
  assets: Asset[];
  currentUser: User | null;
  positions: PortfolioPosition[];
  onPositionsChange: (positions: PortfolioPosition[]) => void;
}

const getAssetBestPrice = (asset: Asset): number | undefined => {
  const defaultSize = asset.defaultSize || asset.size;
  const sizeVariant =
    asset.sizes?.find((s) => s.size === defaultSize) ?? asset.sizes?.[0];

  const pricePoints =
    sizeVariant?.pricePoints || asset.pricePoints || sizeVariant?.legacyPricePoints;

  if (!pricePoints) return undefined;

  const domesticPrices: number[] = [];
  const internationalPrices: number[] = [];

  const whatsapp = (
    "whatsapp" in pricePoints
      ? pricePoints.whatsapp
      : (pricePoints.b2b || [])
  );
  if (whatsapp?.length) {
    domesticPrices.push(...whatsapp.map((p) => p.price));
  }

  const marketplace = (
    "marketplace" in pricePoints
      ? pricePoints.marketplace
      : (pricePoints.endCustomer || [])
  );
  if (marketplace?.length) {
    domesticPrices.push(...marketplace.map((p) => p.price));
  }

  const international = (
    "international" in pricePoints
      ? pricePoints.international
      : (pricePoints.stockxGoat || [])
  );
  if (international?.length) {
    internationalPrices.push(
      ...international.map((p) => p.price + (p.reshippingCost || 0))
    );
  }

  if (domesticPrices.length > 0) return Math.min(...domesticPrices);
  if (internationalPrices.length > 0) return Math.min(...internationalPrices);
  return undefined;
};

type Tab = "active" | "sold";

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  assets,
  currentUser,
  positions,
  onPositionsChange,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [selectedForAdd, setSelectedForAdd] = useState<Asset | null>(null);
  const [addSize, setAddSize] = useState<string>("");
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [addPrice, setAddPrice] = useState<number | undefined>(undefined);
  const [selectedForSale, setSelectedForSale] = useState<{
    assetId: number;
    position: PortfolioPosition;
    asset: Asset;
  } | null>(null);
  const [salePrice, setSalePrice] = useState<number | undefined>(undefined);
  const [saleQuantity, setSaleQuantity] = useState<number>(1);
  const [selectedForListing, setSelectedForListing] = useState<{
    asset: Asset;
    position: PortfolioPosition;
  } | null>(null);
  const [listingPrice, setListingPrice] = useState<number | undefined>(undefined);
  const [listingDescription, setListingDescription] = useState<string>("");
  const [activeListings, setActiveListings] = useState<TradeListing[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("active");
  const [editingPosition, setEditingPosition] = useState<number | null>(null);
  const [editQty, setEditQty] = useState<number>(1);
  const [editPrice, setEditPrice] = useState<number | undefined>(undefined);

  const refreshActiveListings = useCallback(async () => {
    if (!currentUser) return;
    try {
      await cleanupDuplicateListings(currentUser.uid);
      const listings = await getUserListings(currentUser.uid);
      setActiveListings(listings);
    } catch (err) {
      console.error("Failed to load active listings:", err);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshActiveListings();
  }, [refreshActiveListings]);

  const getActiveListing = (assetId: number, size: string): TradeListing | undefined => {
    return activeListings.find(
      (l) => l.assetId === assetId && l.size === size && l.active
    );
  };

  const persistPositions = (next: PortfolioPosition[]) => {
    onPositionsChange(next);
  };

  const upsertPosition = (assetId: number, updates: Partial<PortfolioPosition>) => {
    const now = new Date().toISOString();
    let updated = false;
    const next = positions.map((pos) => {
      if (pos.assetId !== assetId) return pos;
      updated = true;
      const merged: PortfolioPosition = {
        ...pos,
        ...updates,
        updatedAt: now,
      };
      if (typeof merged.quantity === "number" && merged.quantity <= 0) {
        return null as unknown as PortfolioPosition;
      }
      return merged;
    }).filter(Boolean) as PortfolioPosition[];

    if (!updated) {
      const quantity =
        typeof updates.quantity === "number" && updates.quantity > 0
          ? updates.quantity
          : 1;
      const newPos: PortfolioPosition = {
        assetId,
        size: updates.size,
        quantity,
        acquisitionPrice: updates.acquisitionPrice,
        notes: updates.notes,
        createdAt: now,
        updatedAt: now,
      };
      next.push(newPos);
    }

    persistPositions(next);
  };

  const positionByAssetId = useMemo(() => {
    const map: Record<number, PortfolioPosition> = {};
    for (const pos of positions) {
      if (pos.quantity > 0 && !pos.sold) {
        map[pos.assetId] = pos;
      }
    }
    return map;
  }, [positions]);

  const soldPositions = useMemo(() => {
    return positions.filter((pos) => pos.sold);
  }, [positions]);

  const portfolioAssets = useMemo(
    () =>
      assets.filter((asset) => {
        const pos = positionByAssetId[asset.id];
        return pos && pos.quantity > 0 && !pos.sold;
      }),
    [assets, positionByAssetId]
  );

  // Auto-switch to sold tab when no active items remain
  useEffect(() => {
    if (portfolioAssets.length === 0 && soldPositions.length > 0 && activeTab === "active") {
      setActiveTab("sold");
    }
  }, [portfolioAssets.length, soldPositions.length, activeTab]);

  const markAsSold = (assetId: number, soldQuantity: number, soldPrice: number) => {
    const now = new Date().toISOString();
    const existingIndex = positions.findIndex(pos => pos.assetId === assetId && !pos.sold);

    if (existingIndex < 0) return;

    const position = positions[existingIndex];
    const next = [...positions];

    if (soldQuantity >= position.quantity) {
      next[existingIndex] = {
        ...position,
        sold: true,
        soldPrice,
        soldDate: now,
        updatedAt: now,
      };
    } else {
      next[existingIndex] = {
        ...position,
        quantity: position.quantity - soldQuantity,
        updatedAt: now,
      };
      next.push({
        assetId: position.assetId,
        size: position.size,
        quantity: soldQuantity,
        acquisitionPrice: position.acquisitionPrice,
        notes: position.notes,
        sold: true,
        soldPrice,
        soldDate: now,
        createdAt: position.createdAt,
        updatedAt: now,
      });
    }

    persistPositions(next);
    setSelectedForSale(null);
    setSalePrice(undefined);
    setSaleQuantity(1);
  };

  const addableAssets = useMemo(() => {
    const base = assets.filter((asset) => {
      const pos = positionByAssetId[asset.id];
      return !pos || pos.quantity <= 0;
    });

    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];

    const scored = base
      .map((asset) => {
        const name = asset.name.toLowerCase();
        const sku = asset.sku.toLowerCase();
        const brand = asset.brand.toLowerCase();

        let score = 0;
        if (sku === q) score += 5;
        else if (sku.startsWith(q)) score += 4;
        else if (sku.includes(q)) score += 3;
        if (name.startsWith(q)) score += 3;
        else if (name.includes(q)) score += 2;
        if (brand.startsWith(q)) score += 2;
        else if (brand.includes(q)) score += 1;

        return { asset, score, matches: score > 0 };
      })
      .filter((item) => item.matches)
      .sort((a, b) => b.score - a.score || a.asset.name.localeCompare(b.asset.name))
      .slice(0, 15)
      .map((item) => item.asset);

    return scored;
  }, [assets, positionByAssetId, searchQuery]);

  const pricedItems = useMemo(() => {
    return portfolioAssets.map((asset) => {
      const bestPrice = getAssetBestPrice(asset);
      const position = positionByAssetId[asset.id];
      const quantity = position?.quantity ?? 0;
      const acquisitionPrice = position?.acquisitionPrice;
      const positionValue =
        bestPrice !== undefined && quantity > 0 ? bestPrice * quantity : 0;
      const costBasis =
        acquisitionPrice !== undefined && quantity > 0
          ? acquisitionPrice * quantity
          : undefined;
      const pnl =
        costBasis !== undefined ? positionValue - costBasis : undefined;
      const pnlPercent =
        costBasis && costBasis > 0 && pnl !== undefined
          ? (pnl / costBasis) * 100
          : undefined;

      return {
        asset,
        bestPrice,
        position,
        quantity,
        acquisitionPrice,
        positionValue,
        costBasis,
        pnl,
        pnlPercent,
      };
    });
  }, [portfolioAssets, positionByAssetId]);

  const summary = useMemo(() => {
    const activePositions = pricedItems.filter((item) => item.quantity > 0);
    const positionsWithPrice = activePositions.filter(
      (item) => item.bestPrice !== undefined
    );

    const totalItems = activePositions.reduce((sum, item) => sum + item.quantity, 0);
    const totalMarketValue = positionsWithPrice.reduce(
      (sum, item) => sum + (item.positionValue || 0),
      0
    );
    const totalCostBasis = positionsWithPrice.reduce(
      (sum, item) => sum + (item.costBasis || 0),
      0
    );
    const totalPnl =
      totalCostBasis > 0 ? totalMarketValue - totalCostBasis : 0;
    const totalPnlPercent =
      totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;

    const soldPnl = soldPositions.reduce((sum, pos) => {
      if (pos.soldPrice !== undefined && pos.acquisitionPrice !== undefined) {
        return sum + (pos.soldPrice - pos.acquisitionPrice) * pos.quantity;
      }
      return sum;
    }, 0);

    const soldCostBasis = soldPositions.reduce((sum, pos) => {
      if (pos.acquisitionPrice !== undefined) {
        return sum + pos.acquisitionPrice * pos.quantity;
      }
      return sum;
    }, 0);

    const soldPnlPercent =
      soldCostBasis > 0 ? (soldPnl / soldCostBasis) * 100 : 0;

    return {
      totalItems,
      activePositionsCount: activePositions.length,
      hasPricing: positionsWithPrice.length > 0,
      totalMarketValue,
      totalCostBasis,
      totalPnl,
      totalPnlPercent,
      soldPnl,
      soldPnlPercent,
      soldPositionsCount: soldPositions.length,
    };
  }, [pricedItems, soldPositions]);

  const formatPrice = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

  const handleAddToPortfolio = () => {
    if (!selectedForAdd) return;
    upsertPosition(selectedForAdd.id, {
      size: addSize || undefined,
      quantity: addQuantity,
      acquisitionPrice: addPrice,
    });
    setSelectedForAdd(null);
    setSearchQuery("");
    setAddQuantity(1);
    setAddPrice(undefined);
    setShowAddPanel(false);
  };

  const startEditing = (assetId: number, position: PortfolioPosition) => {
    setEditingPosition(assetId);
    setEditQty(position.quantity);
    setEditPrice(position.acquisitionPrice);
  };

  const saveEdit = (assetId: number) => {
    upsertPosition(assetId, {
      quantity: editQty,
      acquisitionPrice: editPrice,
    });
    setEditingPosition(null);
  };

  return (
    <main className="flex-1 flex flex-col bg-brand-background px-2 py-2 md:px-3 md:py-3 pb-20 md:pb-4 w-full max-w-8xl mx-auto overflow-y-auto">

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl md:text-3xl font-heading font-normal text-brand-black">
            Portfolio
          </h1>
          <button
            onClick={() => {
              setShowAddPanel(!showAddPanel);
              setSelectedForAdd(null);
              setSearchQuery("");
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-terminal-bg text-xs font-semibold uppercase tracking-wide hover:bg-accent/90 transition-all active:scale-[0.97]"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        </div>
        <p className="text-sm text-brand-black/50">
          Track your inventory, see live P&L, and list items for trade.
        </p>
      </div>

      {/* Summary Strip */}
      {(portfolioAssets.length > 0 || soldPositions.length > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <div className="bg-terminal-surface border border-brand-gray/20 p-3">
            <p className="text-[10px] text-brand-black/50 uppercase tracking-wide mb-0.5">Items</p>
            <p className="text-lg font-mono-numeric font-semibold text-brand-black leading-tight">
              {summary.totalItems}
            </p>
            <p className="text-[10px] text-brand-black/40 mt-0.5">
              {summary.activePositionsCount} SKU{summary.activePositionsCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="bg-terminal-surface border border-brand-gray/20 p-3">
            <p className="text-[10px] text-brand-black/50 uppercase tracking-wide mb-0.5">Portfolio Value</p>
            <p className="text-lg font-mono-numeric font-semibold text-brand-black leading-tight">
              {summary.hasPricing ? formatPrice(summary.totalMarketValue) : "—"}
            </p>
            {summary.hasPricing && summary.totalCostBasis > 0 && (
              <p className="text-[10px] text-brand-black/40 mt-0.5">
                Cost: {formatPrice(summary.totalCostBasis)}
              </p>
            )}
          </div>
          <div className="bg-terminal-surface border border-brand-gray/20 p-3">
            <p className="text-[10px] text-brand-black/50 uppercase tracking-wide mb-0.5">Unrealised P&L</p>
            {summary.hasPricing && summary.totalCostBasis > 0 ? (
              <>
                <p className={`text-lg font-mono-numeric font-semibold leading-tight ${
                  summary.totalPnl > 0 ? "text-up" : summary.totalPnl < 0 ? "text-down" : "text-brand-black"
                }`}>
                  {summary.totalPnl > 0 ? "+" : ""}{formatPrice(summary.totalPnl)}
                </p>
                <p className={`text-[10px] mt-0.5 ${
                  summary.totalPnl > 0 ? "text-up/70" : summary.totalPnl < 0 ? "text-down/70" : "text-brand-black/40"
                }`}>
                  {summary.totalPnlPercent > 0 ? "+" : ""}{summary.totalPnlPercent.toFixed(1)}%
                </p>
              </>
            ) : (
              <p className="text-lg font-mono-numeric font-semibold text-brand-black leading-tight">—</p>
            )}
          </div>
          <div className="bg-terminal-surface border border-brand-gray/20 p-3">
            <p className="text-[10px] text-brand-black/50 uppercase tracking-wide mb-0.5">Realised P&L</p>
            {summary.soldPositionsCount > 0 ? (
              <>
                <p className={`text-lg font-mono-numeric font-semibold leading-tight ${
                  summary.soldPnl > 0 ? "text-up" : summary.soldPnl < 0 ? "text-down" : "text-brand-black"
                }`}>
                  {summary.soldPnl > 0 ? "+" : ""}{formatPrice(summary.soldPnl)}
                </p>
                <p className={`text-[10px] mt-0.5 ${
                  summary.soldPnl > 0 ? "text-up/70" : summary.soldPnl < 0 ? "text-down/70" : "text-brand-black/40"
                }`}>
                  {summary.soldPnlPercent > 0 ? "+" : ""}{summary.soldPnlPercent.toFixed(1)}%
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-mono-numeric font-semibold text-brand-black leading-tight">—</p>
                <p className="text-[10px] text-brand-black/40 mt-0.5">{summary.soldPositionsCount} sold</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Inventory Panel (collapsible) */}
      {showAddPanel && (
        <div className="mb-4 border border-brand-gray/20 bg-terminal-surface overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-brand-gray/15 flex items-center justify-between">
            <p className="text-xs font-semibold text-brand-black uppercase tracking-wide">
              {selectedForAdd ? "Set Position Details" : "Search Inventory"}
            </p>
            <button
              onClick={() => {
                setShowAddPanel(false);
                setSelectedForAdd(null);
                setSearchQuery("");
              }}
              className="text-brand-black/40 hover:text-brand-black transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4">
            {!selectedForAdd ? (
              <>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, SKU, or brand..."
                  className="w-full border border-brand-gray/30 px-4 py-3 text-sm text-brand-black placeholder:text-brand-gray-medium focus:outline-none focus:border-terminal-border-strong transition-all"
                  autoFocus
                />
                {addableAssets.length > 0 && (
                  <div className="mt-3 max-h-64 overflow-y-auto divide-y divide-brand-gray/10">
                    {addableAssets.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => {
                          setSelectedForAdd(asset);
                          setAddSize(asset.defaultSize || asset.size || asset.sizes?.[0]?.size || "");
                          setAddQuantity(1);
                          setAddPrice(undefined);
                        }}
                        className="w-full flex items-center gap-3 px-2 py-3 hover:bg-brand-background/60 transition-all text-left"
                      >
                        {asset.image && (
                          <img
                            src={asset.image}
                            alt=""
                            className="w-10 h-10 object-cover border border-brand-gray/20 flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-brand-black leading-tight truncate">
                            {asset.name}
                          </p>
                          <p className="text-xs text-brand-black/50 leading-tight">
                            {asset.brand} · {asset.sku}
                          </p>
                        </div>
                        <svg className="w-4 h-4 text-brand-black/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.trim().length >= 2 && addableAssets.length === 0 && (
                  <p className="mt-4 text-sm text-brand-black/40 text-center py-4">
                    No results for "{searchQuery}"
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-4">
                {/* Selected item preview */}
                <div className="flex items-center gap-3 p-3 bg-brand-background border border-brand-gray/15">
                  {selectedForAdd.image && (
                    <img
                      src={selectedForAdd.image}
                      alt=""
                      className="w-12 h-12 object-cover border border-brand-gray/20 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-black leading-tight truncate">
                      {selectedForAdd.name}
                    </p>
                    <p className="text-xs text-brand-black/50">{selectedForAdd.brand} · {selectedForAdd.sku}</p>
                  </div>
                  <button
                    onClick={() => { setSelectedForAdd(null); setSearchQuery(""); }}
                    className="text-xs text-brand-black/40 hover:text-brand-black"
                  >
                    Change
                  </button>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-brand-black/50 font-medium uppercase tracking-wide mb-1.5">Size</label>
                    <select
                      value={addSize}
                      onChange={(e) => setAddSize(e.target.value)}
                      className="w-full border border-brand-gray/30 px-3 py-2.5 text-sm text-brand-black focus:outline-none focus:border-terminal-border-strong transition-all"
                    >
                      <option value="">Any</option>
                      {selectedForAdd.sizes?.map((s) => (
                        <option key={s.size} value={s.size}>{s.size}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-brand-black/50 font-medium uppercase tracking-wide mb-1.5">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={addQuantity}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setAddQuantity(!isNaN(v) && v > 0 ? v : 1);
                      }}
                      className="w-full border border-brand-gray/30 px-3 py-2.5 text-sm font-mono-numeric text-center focus:outline-none focus:border-terminal-border-strong transition-all"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-brand-black/50 font-medium uppercase tracking-wide mb-1.5">Buy Price ₹</label>
                    <input
                      type="number"
                      min={0}
                      value={addPrice ?? ""}
                      onChange={(e) => {
                        const v = e.target.value ? Number(e.target.value) : undefined;
                        setAddPrice(v && !isNaN(v) && v > 0 ? v : undefined);
                      }}
                      className="w-full border border-brand-gray/30 px-3 py-2.5 text-sm font-mono-numeric text-right placeholder:text-brand-gray-medium focus:outline-none focus:border-terminal-border-strong transition-all"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddToPortfolio}
                  className="w-full px-5 py-3 bg-accent text-terminal-bg text-xs font-semibold uppercase tracking-wide hover:bg-accent/90 transition-all active:scale-[0.98]"
                >
                  Add to Portfolio
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State — only for truly empty portfolios (no active AND no sold) */}
      {portfolioAssets.length === 0 && soldPositions.length === 0 && !showAddPanel && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4">
          <div className="w-16 h-16 mb-5 border-2 border-brand-gray/30 flex items-center justify-center bg-terminal-surface">
            <svg className="w-7 h-7 text-brand-black/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-brand-black mb-1.5">No inventory yet</h2>
          <p className="text-sm text-brand-black/50 max-w-xs mb-6">
            Add your sneakers to track their current value and profit in real time.
          </p>
          <button
            onClick={() => setShowAddPanel(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-terminal-bg text-xs font-semibold uppercase tracking-wide hover:bg-accent/90 transition-all active:scale-[0.97]"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Your First Item
          </button>
        </div>
      )}

      {/* Tabs + Inventory */}
      {(portfolioAssets.length > 0 || soldPositions.length > 0) && (
        <>
          {/* Tabs */}
          <div className="flex gap-0 border-b border-brand-gray/20 mb-4">
            <button
              onClick={() => setActiveTab("active")}
              className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-all border-b-2 -mb-px ${
                activeTab === "active"
                  ? "border-terminal-border-strong text-brand-black"
                  : "border-transparent text-brand-black/40 hover:text-brand-black/60"
              }`}
            >
              Active ({portfolioAssets.length})
            </button>
            <button
              onClick={() => setActiveTab("sold")}
              className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-all border-b-2 -mb-px ${
                activeTab === "sold"
                  ? "border-terminal-border-strong text-brand-black"
                  : "border-transparent text-brand-black/40 hover:text-brand-black/60"
              }`}
            >
              Sold ({soldPositions.length})
            </button>
          </div>

          {/* Active Items - Card Layout */}
          {activeTab === "active" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {pricedItems.map(({
                asset,
                bestPrice,
                position,
                quantity,
                acquisitionPrice,
                pnl,
                pnlPercent,
              }) => {
                const isEditing = editingPosition === asset.id;
                const listing = getActiveListing(asset.id, position.size || "");

                return (
                  <div
                    key={asset.id}
                    className="bg-terminal-surface border border-brand-gray/20 overflow-hidden"
                  >
                    {/* Main card content */}
                    <div className="p-3.5">
                      <div className="flex gap-3">
                        {/* Image */}
                        {asset.image && (
                          <img
                            src={asset.image}
                            alt=""
                            className="w-16 h-16 md:w-18 md:h-18 object-cover border border-brand-gray/15 flex-shrink-0"
                          />
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-brand-black leading-tight truncate">
                                {asset.name}
                              </p>
                              <p className="text-xs text-brand-black/45 leading-tight mt-0.5">
                                {asset.sku}
                              </p>
                            </div>
                            {/* P&L badge */}
                            {pnl !== undefined && quantity > 0 ? (
                              <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-mono-numeric font-semibold ${
                                pnl > 0
                                  ? "bg-up/10 text-up border border-up/40"
                                  : pnl < 0
                                  ? "bg-down/10 text-down border border-down/40"
                                  : "bg-terminal-surface-raised text-brand-black border border-brand-gray/20"
                              }`}>
                                {pnl > 0 ? "+" : ""}{pnlPercent?.toFixed(1)}%
                              </span>
                            ) : null}
                          </div>

                          {/* Metrics row */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                            {position.size && (
                              <span className="text-xs text-brand-black/50">
                                <span className="text-brand-black/35">Size</span>{" "}
                                <span className="font-medium text-brand-black">{position.size}</span>
                              </span>
                            )}
                            <span className="text-xs text-brand-black/50">
                              <span className="text-brand-black/35">Qty</span>{" "}
                              <span className="font-mono-numeric font-medium text-brand-black">{quantity}</span>
                            </span>
                            {acquisitionPrice !== undefined && (
                              <span className="text-xs text-brand-black/50">
                                <span className="text-brand-black/35">Cost</span>{" "}
                                <span className="font-mono-numeric font-medium text-brand-black">{formatPrice(acquisitionPrice)}</span>
                              </span>
                            )}
                            {bestPrice !== undefined && (
                              <span className="text-xs text-brand-black/50">
                                <span className="text-brand-black/35">Mkt</span>{" "}
                                <span className="font-mono-numeric font-semibold text-brand-black">{formatPrice(bestPrice)}</span>
                              </span>
                            )}
                            {pnl !== undefined && quantity > 0 && (
                              <span className={`text-xs font-mono-numeric font-semibold ${
                                pnl > 0 ? "text-up" : pnl < 0 ? "text-down" : "text-brand-black"
                              }`}>
                                {pnl > 0 ? "+" : ""}{formatPrice(pnl)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Inline edit row (shown when editing) */}
                    {isEditing && (
                      <div className="px-3.5 pb-3 pt-0 animate-fade-in">
                        <div className="border-t border-brand-gray/15 pt-3">
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-[10px] text-brand-black/40 uppercase tracking-wide mb-1">Quantity</label>
                              <input
                                type="number"
                                min={1}
                                value={editQty}
                                onChange={(e) => setEditQty(Math.max(1, Number(e.target.value) || 1))}
                                className="w-full border border-brand-gray/30 px-3 py-2 text-sm font-mono-numeric text-center focus:outline-none focus:border-terminal-border-strong transition-all"
                                autoFocus
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-brand-black/40 uppercase tracking-wide mb-1">Buy Price ₹</label>
                              <input
                                type="number"
                                min={0}
                                value={editPrice ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value ? Number(e.target.value) : undefined;
                                  setEditPrice(v && !isNaN(v) && v > 0 ? v : undefined);
                                }}
                                className="w-full border border-brand-gray/30 px-3 py-2 text-sm font-mono-numeric text-right focus:outline-none focus:border-terminal-border-strong transition-all"
                                placeholder="—"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(asset.id)}
                              className="flex-1 px-3 py-2 bg-accent text-terminal-bg text-xs font-semibold uppercase tracking-wide hover:bg-accent/90 transition-all"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingPosition(null)}
                              className="px-3 py-2 border border-brand-gray/30 text-xs font-semibold uppercase tracking-wide text-brand-black/60 hover:text-brand-black hover:border-terminal-border-strong transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action bar */}
                    {!isEditing && (
                      <div className="flex border-t border-brand-gray/10">
                        <button
                          onClick={() => startEditing(asset.id, position)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-brand-black/50 hover:text-brand-black hover:bg-brand-background/50 transition-all border-r border-brand-gray/10"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        {listing ? (
                          <span className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-up border-r border-brand-gray/10">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Listed @ {formatPrice(listing.askingPrice)}
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedForListing({ asset, position });
                              setListingPrice(bestPrice);
                              setListingDescription("");
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium text-brand-black/50 hover:text-brand-black hover:bg-brand-background/50 transition-all border-r border-brand-gray/10"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            List
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedForSale({ assetId: asset.id, position, asset });
                            setSalePrice(bestPrice);
                            setSaleQuantity(quantity);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-brand-black hover:bg-accent hover:text-terminal-bg transition-all"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Sold
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Sold Items */}
          {activeTab === "sold" && (
            <div className="space-y-2.5 max-w-full">
              {soldPositions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-brand-black/40">No sold items yet</p>
                  <p className="text-xs text-brand-black/30 mt-1">Mark items as sold to track your realized profit</p>
                </div>
              ) : (
                <>
                  {/* Realized P&L banner */}
                  {summary.soldPnl !== 0 && (
                    <div className={`p-3 border ${
                      summary.soldPnl > 0
                        ? "bg-up/10 border-up/40"
                        : "bg-down/10 border-down/40"
                    }`}>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-wide text-brand-black/50 font-medium">
                          Total Realized P&L
                        </p>
                        <p className={`text-sm font-mono-numeric font-semibold ${
                          summary.soldPnl > 0 ? "text-up" : "text-down"
                        }`}>
                          {summary.soldPnl > 0 ? "+" : ""}{formatPrice(summary.soldPnl)}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {soldPositions.map((pos) => {
                    const asset = assets.find((a) => a.id === pos.assetId);
                    if (!asset) return null;

                    const realizedPnl =
                      pos.soldPrice !== undefined && pos.acquisitionPrice !== undefined
                        ? (pos.soldPrice - pos.acquisitionPrice) * pos.quantity
                        : undefined;

                    return (
                      <div
                        key={`${pos.assetId}-${pos.soldDate}`}
                        className="bg-terminal-surface border border-brand-gray/20 p-3.5"
                      >
                        <div className="flex gap-3">
                          {asset.image && (
                            <img
                              src={asset.image}
                              alt=""
                              className="w-12 h-12 object-cover border border-brand-gray/15 flex-shrink-0 opacity-70"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-brand-black/70 leading-tight truncate">
                                  {asset.name}
                                </p>
                                <p className="text-xs text-brand-black/35 leading-tight mt-0.5">
                                  {pos.soldDate ? new Date(pos.soldDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                                </p>
                              </div>
                              {realizedPnl !== undefined && (
                                <span className={`flex-shrink-0 text-sm font-mono-numeric font-semibold ${
                                  realizedPnl > 0 ? "text-up" : realizedPnl < 0 ? "text-down" : "text-brand-black/50"
                                }`}>
                                  {realizedPnl > 0 ? "+" : ""}{formatPrice(realizedPnl)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-x-4 mt-2">
                              <span className="text-xs text-brand-black/40">
                                Qty <span className="font-mono-numeric font-medium text-brand-black/60">{pos.quantity}</span>
                              </span>
                              {pos.acquisitionPrice !== undefined && (
                                <span className="text-xs text-brand-black/40">
                                  Cost <span className="font-mono-numeric font-medium text-brand-black/60">{formatPrice(pos.acquisitionPrice)}</span>
                                </span>
                              )}
                              {pos.soldPrice !== undefined && (
                                <span className="text-xs text-brand-black/40">
                                  Sold <span className="font-mono-numeric font-semibold text-brand-black/70">{formatPrice(pos.soldPrice)}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Mark as Sold Modal */}
      {selectedForSale && (
        <div
          className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-50 backdrop-blur-sm animate-fade-in"
          onClick={() => {
            setSelectedForSale(null);
            setSalePrice(undefined);
            setSaleQuantity(1);
          }}
        >
          <div
            className="bg-terminal-surface w-full md:max-w-md md:mx-4 shadow-modal animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-brand-gray/15 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-black uppercase tracking-wide">
                Mark as Sold
              </h2>
              <button
                onClick={() => {
                  setSelectedForSale(null);
                  setSalePrice(undefined);
                  setSaleQuantity(1);
                }}
                className="text-brand-black/40 hover:text-brand-black"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Item preview */}
              <div className="flex items-center gap-3">
                {selectedForSale.asset.image && (
                  <img src={selectedForSale.asset.image} alt="" className="w-12 h-12 object-cover border border-brand-gray/15" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brand-black leading-tight truncate">
                    {selectedForSale.asset.name}
                  </p>
                  <p className="text-xs text-brand-black/45 mt-0.5">
                    {selectedForSale.position.size && `Size ${selectedForSale.position.size} · `}
                    {selectedForSale.position.quantity} in stock
                  </p>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-[10px] text-brand-black/40 font-medium uppercase tracking-wide mb-1.5">
                  Quantity to sell
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSaleQuantity(Math.max(1, saleQuantity - 1))}
                    className="w-10 h-10 border border-brand-gray/30 flex items-center justify-center text-brand-black hover:border-terminal-border-strong transition-all"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={selectedForSale.position.quantity}
                    value={saleQuantity}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 1;
                      setSaleQuantity(Math.max(1, Math.min(val, selectedForSale.position.quantity)));
                    }}
                    className="flex-1 border border-brand-gray/30 px-3 py-2.5 text-sm font-mono-numeric text-center focus:outline-none focus:border-terminal-border-strong transition-all"
                  />
                  <button
                    onClick={() => setSaleQuantity(Math.min(selectedForSale.position.quantity, saleQuantity + 1))}
                    className="w-10 h-10 border border-brand-gray/30 flex items-center justify-center text-brand-black hover:border-terminal-border-strong transition-all"
                  >
                    +
                  </button>
                </div>
                {saleQuantity < selectedForSale.position.quantity && (
                  <p className="text-[10px] text-brand-black/40 mt-1.5">
                    {selectedForSale.position.quantity - saleQuantity} will remain in portfolio
                  </p>
                )}
              </div>

              {/* Price */}
              <div>
                <label className="block text-[10px] text-brand-black/40 font-medium uppercase tracking-wide mb-1.5">
                  Selling price per unit (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={salePrice !== undefined ? salePrice : ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setSalePrice(val);
                  }}
                  className="w-full border border-brand-gray/30 px-4 py-3 text-sm font-mono-numeric placeholder:text-brand-gray-medium focus:outline-none focus:border-terminal-border-strong transition-all"
                  placeholder="Enter selling price"
                  autoFocus
                />
              </div>

              {/* P&L Preview */}
              {selectedForSale.position.acquisitionPrice !== undefined && salePrice !== undefined && salePrice > 0 && (
                <div className={`p-3 border ${
                  (salePrice - selectedForSale.position.acquisitionPrice) > 0
                    ? "bg-up/10 border-up/40"
                    : (salePrice - selectedForSale.position.acquisitionPrice) < 0
                    ? "bg-down/10 border-down/40"
                    : "bg-terminal-surface-raised border-brand-gray/20"
                }`}>
                  <p className="text-[10px] text-brand-black/40 uppercase tracking-wide mb-1">Estimated Profit</p>
                  <p className={`text-lg font-mono-numeric font-semibold ${
                    (salePrice - selectedForSale.position.acquisitionPrice) > 0
                      ? "text-up"
                      : (salePrice - selectedForSale.position.acquisitionPrice) < 0
                      ? "text-down"
                      : "text-brand-black"
                  }`}>
                    {(salePrice - selectedForSale.position.acquisitionPrice) > 0 ? "+" : ""}
                    {formatPrice((salePrice - selectedForSale.position.acquisitionPrice) * saleQuantity)}
                  </p>
                  <p className="text-[10px] text-brand-black/40 mt-0.5">
                    {formatPrice(salePrice - selectedForSale.position.acquisitionPrice)} per unit
                  </p>
                </div>
              )}

              {/* Actions */}
              <button
                onClick={() => {
                  if (salePrice !== undefined && salePrice > 0 && saleQuantity > 0) {
                    markAsSold(selectedForSale.assetId, saleQuantity, salePrice);
                  }
                }}
                disabled={salePrice === undefined || salePrice <= 0 || saleQuantity <= 0}
                className="w-full px-5 py-3.5 text-sm uppercase tracking-wide font-semibold bg-accent text-terminal-bg hover:bg-accent/90 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                Confirm Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List for Trade Modal */}
      {selectedForListing && currentUser && (
        <div
          className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-50 backdrop-blur-sm animate-fade-in"
          onClick={() => {
            setSelectedForListing(null);
            setListingPrice(undefined);
            setListingDescription("");
          }}
        >
          <div
            className="bg-terminal-surface w-full md:max-w-md md:mx-4 shadow-modal animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-brand-gray/15 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-black uppercase tracking-wide">
                List for Trade
              </h2>
              <button
                onClick={() => {
                  setSelectedForListing(null);
                  setListingPrice(undefined);
                  setListingDescription("");
                }}
                className="text-brand-black/40 hover:text-brand-black"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Item preview */}
              <div className="flex items-center gap-3">
                {selectedForListing.asset.image && (
                  <img src={selectedForListing.asset.image} alt="" className="w-12 h-12 object-cover border border-brand-gray/15" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brand-black leading-tight truncate">
                    {selectedForListing.asset.name}
                  </p>
                  <p className="text-xs text-brand-black/45 mt-0.5">
                    {selectedForListing.position.size && `Size ${selectedForListing.position.size} · `}
                    Qty {selectedForListing.position.quantity}
                  </p>
                </div>
              </div>

              {/* Info callout */}
              <div className="p-3 bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-800 leading-relaxed">
                  Your listing will be visible to other users. Buyers can request introductions, and trades happen off-platform via WhatsApp or email.
                </p>
              </div>

              {/* Price */}
              <div>
                <label className="block text-[10px] text-brand-black/40 font-medium uppercase tracking-wide mb-1.5">
                  Asking price per unit (₹)
                </label>
                <input
                  type="number"
                  value={listingPrice || ""}
                  onChange={(e) => setListingPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="e.g., 12500"
                  className="w-full border border-brand-gray/30 px-4 py-3 text-sm font-mono-numeric focus:outline-none focus:border-terminal-border-strong transition-all"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] text-brand-black/40 font-medium uppercase tracking-wide mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  value={listingDescription}
                  onChange={(e) => setListingDescription(e.target.value)}
                  placeholder="Condition, location, shipping details..."
                  rows={3}
                  maxLength={500}
                  className="w-full border border-brand-gray/30 px-4 py-3 text-sm focus:outline-none focus:border-terminal-border-strong transition-all resize-none"
                />
              </div>

              {/* Actions */}
              <button
                onClick={async () => {
                  if (listingPrice && listingPrice > 0) {
                    const result = await createTradeListing(
                      currentUser.uid,
                      currentUser.email || "",
                      {
                        assetId: selectedForListing.asset.id,
                        assetName: selectedForListing.asset.name,
                        assetSku: selectedForListing.asset.sku,
                        assetImage: selectedForListing.asset.image,
                        size: selectedForListing.position.size || "N/A",
                        askingPrice: listingPrice,
                        quantity: selectedForListing.position.quantity,
                        condition: "new",
                        description: listingDescription.trim() || "",
                        shippingAvailable: true,
                        portfolioPositionId: `${selectedForListing.asset.id}_${selectedForListing.position.size}`
                      }
                    );

                    if (result.success) {
                      setSelectedForListing(null);
                      setListingPrice(undefined);
                      setListingDescription("");
                      refreshActiveListings();
                    } else {
                      alert("Failed to create listing: " + result.error);
                    }
                  }
                }}
                disabled={!listingPrice || listingPrice <= 0}
                className="w-full px-5 py-3.5 text-sm uppercase tracking-wide font-semibold bg-accent text-terminal-bg hover:bg-accent/90 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                Create Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
