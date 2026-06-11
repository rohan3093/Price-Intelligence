import React, { useState } from "react";
import { Asset, PricePoint } from "../types";
import { sortSizesByValue } from "../utils/sizeSort";
import { ListingsSpreadsheet } from "./ListingsSpreadsheet";
import { BulkAddListingsModal } from "./BulkAddListingsModal";
import { AddListingModal } from "./AddListingModal";

interface DailyPriceUpdatesProps {
  assets: Asset[];
  onUpdateAsset: (asset: Asset) => void;
}

export const DailyPriceUpdates: React.FC<DailyPriceUpdatesProps> = ({
  assets,
  onUpdateAsset,
}) => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "updated">("pending");

  // Update selectedAsset when assets change (to get latest data after updates)
  React.useEffect(() => {
    if (selectedAsset) {
      const updated = assets.find(a => a.id === selectedAsset.id);
      if (updated) {
        console.log("Asset updated in DailyPriceUpdates:", updated.id, "sizes:", updated.sizes?.length);
        setSelectedAsset(updated);
        // Reset selected size if it no longer exists, or select first size if none selected
        if (selectedSize && !updated.sizes?.find(s => s.size === selectedSize)) {
          setSelectedSize(updated.sizes?.[0]?.size || null);
        } else if (!selectedSize && updated.sizes && updated.sizes.length > 0) {
          // Auto-select first size if none selected but sizes exist
          setSelectedSize(updated.sizes[0].size);
        }
      }
    } else if (assets.length > 0) {
      // If no asset selected, select the first one
      setSelectedAsset(assets[0]);
      if (assets[0].sizes && assets[0].sizes.length > 0) {
        setSelectedSize(assets[0].sizes[0].size);
      }
    }
  }, [assets]);

  // Helper to get all assets that still need an update today
  const getPendingAssets = React.useCallback(() => {
    const today = new Date().toDateString();
    return assets.filter(asset => {
      const updated = asset.lastUpdated ? new Date(asset.lastUpdated).toDateString() : null;
      return updated !== today;
    });
  }, [assets]);


  const handleUpdatePricePoints = (
    assetId: number,
    size: string,
    channel: "whatsapp" | "marketplace" | "international",
    pricePoints: PricePoint[]
  ) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) {
      console.error("Asset not found:", assetId);
      return;
    }

    if (!asset.sizes || asset.sizes.length === 0) {
      console.error("Asset has no sizes:", assetId);
      alert("This asset has no sizes configured. Please add sizes first in Asset Management.");
      return;
    }

    const sizeExists = asset.sizes.some(s => s.size === size);
    if (!sizeExists) {
      console.error("Size not found:", size, "in asset:", assetId);
      alert(`Size "${size}" not found in this asset. Please select a valid size.`);
      return;
    }

    const updatedSizes = asset.sizes.map(s => {
      if (s.size === size) {
        // Use new channel-based structure, with legacy fallback
        const existingPricePoints = s.pricePoints || s.legacyPricePoints;
        let updatedPricePoints: { whatsapp: PricePoint[]; marketplace: PricePoint[]; international: PricePoint[] };
        
        if (existingPricePoints) {
          if ('whatsapp' in existingPricePoints) {
            updatedPricePoints = {
              whatsapp: existingPricePoints.whatsapp || [],
              marketplace: existingPricePoints.marketplace || [],
              international: existingPricePoints.international || [],
              [channel]: pricePoints,
            };
          } else {
            // Legacy structure
            updatedPricePoints = {
              whatsapp: existingPricePoints.b2b || [],
              marketplace: existingPricePoints.endCustomer || [],
              international: existingPricePoints.stockxGoat || [],
              [channel]: pricePoints,
            };
          }
        } else {
          updatedPricePoints = {
            whatsapp: [],
            marketplace: [],
            international: [],
            [channel]: pricePoints,
          };
        }
        return {
          ...s,
          pricePoints: updatedPricePoints,
          lastUpdated: new Date().toISOString(),
        };
      }
      return s;
    });

    const updatedAsset = {
      ...asset,
      sizes: updatedSizes,
      lastUpdated: new Date().toISOString(),
    };

    console.log("Updating asset:", updatedAsset.id, "size:", size, "channel:", channel, "pricePoints:", pricePoints);
    onUpdateAsset(updatedAsset);
  };

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="border border-brand-gray/20 bg-brand-background p-4">
          <p className="text-xs text-brand-black/50 mb-1">Instruments</p>
          <p className="text-2xl font-semibold text-brand-black">{assets.length}</p>
        </div>
        <div className="border border-brand-gray/20 bg-brand-background p-4">
          <p className="text-xs text-brand-black/50 mb-1">Updated Today</p>
          <p className="text-2xl font-semibold text-up">
            {assets.filter(a => {
              const today = new Date().toDateString();
              const updated = a.lastUpdated ? new Date(a.lastUpdated).toDateString() : null;
              return updated === today;
            }).length}
          </p>
        </div>
        <div className="border border-brand-gray/20 bg-brand-background p-4">
          <p className="text-xs text-brand-black/50 mb-1">Pending</p>
          <p className="text-2xl font-semibold text-down">
            {assets.filter(a => {
              const today = new Date().toDateString();
              const updated = a.lastUpdated ? new Date(a.lastUpdated).toDateString() : null;
              return updated !== today;
            }).length}
          </p>
        </div>
        <div className="border border-brand-gray/20 bg-brand-background p-4">
          <p className="text-xs text-brand-black/50 mb-1">Size Variants</p>
          <p className="text-2xl font-semibold text-brand-black">
            {assets.reduce((sum, a) => sum + (a.sizes?.length || 0), 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Asset List */}
        <div className="lg:col-span-1">
          <div className="border border-brand-gray/20 bg-terminal-surface p-4">
            <h2 className="text-sm font-semibold text-brand-black mb-4">
              Instruments
            </h2>
            {/* Search Bar + Status Filters */}
            <div className="mb-4 space-y-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, SKU, or brand..."
                className="w-full bg-brand-background border border-brand-gray/20 py-2 px-3 text-xs text-brand-black placeholder:text-brand-black/40 focus:outline-none focus:border-terminal-border-strong"
              />
              <div className="flex flex-wrap gap-2 items-center">
                {(["all", "pending", "updated"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 text-xs font-semibold transition ${
                      filterStatus === status
                        ? "bg-terminal-surface-raised text-terminal-text"
                        : "bg-terminal-surface border border-brand-gray/30 text-brand-black hover:border-terminal-border-strong"
                    }`}
                  >
                    {status === "all" ? "All" : status === "pending" ? (
                      <>Pending <span className="font-mono-numeric">({getPendingAssets().length})</span></>
                    ) : "Updated"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto custom-scrollbar">
              {assets
                .filter((asset) => {
                  if (searchQuery.trim()) {
                    const query = searchQuery.toLowerCase();
                    const matchesText =
                      asset.name.toLowerCase().includes(query) ||
                      asset.sku.toLowerCase().includes(query) ||
                      asset.brand.toLowerCase().includes(query);
                    if (!matchesText) return false;
                  }
                  if (filterStatus !== "all") {
                    const today = new Date().toDateString();
                    const updated = asset.lastUpdated
                      ? new Date(asset.lastUpdated).toDateString()
                      : null;
                    const isUpdatedToday = updated === today;
                    if (filterStatus === "pending" && isUpdatedToday) return false;
                    if (filterStatus === "updated" && !isUpdatedToday) return false;
                  }
                  return true;
                })
                .map((asset) => {
                const today = new Date().toDateString();
                const updated = asset.lastUpdated ? new Date(asset.lastUpdated).toDateString() : null;
                const isUpdatedToday = updated === today;
                const isSelected = selectedAsset?.id === asset.id;
                
                return (
                  <div
                    key={asset.id}
                    className={`border p-3 cursor-pointer transition-all ${
                      isSelected
                        ? "border-terminal-border-strong bg-terminal-surface-raised text-terminal-text"
                        : "border-brand-gray/20 bg-terminal-surface hover:border-brand-gray/40"
                    }`}
                    onClick={() => {
                      setSelectedAsset(asset);
                      setSelectedSize(asset.sizes?.[0]?.size || null);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`text-xs font-semibold truncate ${
                            isSelected ? "text-white" : "text-brand-black"
                          }`}>
                            {asset.name}
                          </p>
                          {isUpdatedToday && (
                            <span className={`text-xs px-1.5 py-0.5 flex-shrink-0 ${
                              isSelected 
                                ? "bg-up/30 text-up" 
                                : "bg-up/10 text-up"
                            }`}>
                              ✓
                            </span>
                          )}
                        </div>
                        <p className={`text-xs ${
                          isSelected ? "text-white/70" : "text-brand-black/50"
                        }`}>
                          {asset.sku} · {asset.sizes?.length || 0} sizes
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Price Update Form */}
        <div className="lg:col-span-2">
          {selectedAsset ? (
            <PriceUpdateForm
              asset={selectedAsset}
              selectedSize={selectedSize || selectedAsset.sizes?.[0]?.size || null}
              onSizeChange={setSelectedSize}
              onUpdatePricePoints={handleUpdatePricePoints}
            />
          ) : (
            <div className="border border-brand-gray/20 bg-terminal-surface p-12 text-center">
              <p className="text-sm font-medium text-brand-black/60 mb-1">No Instrument Selected</p>
              <p className="text-xs text-brand-black/40">Select an instrument to begin market data entry</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface PriceUpdateFormProps {
  asset: Asset;
  selectedSize: string | null;
  onSizeChange: (size: string) => void;
  onUpdatePricePoints: (
    assetId: number,
    size: string,
    channel: "whatsapp" | "marketplace" | "international",
    pricePoints: PricePoint[]
  ) => void;
}

const PriceUpdateForm: React.FC<PriceUpdateFormProps> = ({
  asset,
  selectedSize,
  onSizeChange,
  onUpdatePricePoints,
}) => {
  const [showAddListingModal, setShowAddListingModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);

  const handleAddListing = async (listing: PricePoint) => {
    if (!selectedSize) {
      alert("Please select a size first");
      return;
    }

    // Get existing listings for the channel
    const sizeVariant = asset.sizes?.find(s => s.size === selectedSize);
    if (!sizeVariant) return;

    const pricePoints = sizeVariant.pricePoints || sizeVariant.legacyPricePoints;
    if (!pricePoints) return;

    let channelListings: PricePoint[] = [];
    if (listing.channel === "whatsapp") {
      channelListings = ("whatsapp" in pricePoints ? pricePoints.whatsapp : pricePoints.b2b) || [];
    } else if (listing.channel === "marketplace") {
      channelListings = ("marketplace" in pricePoints ? pricePoints.marketplace : pricePoints.endCustomer) || [];
    } else {
      channelListings = ("international" in pricePoints ? pricePoints.international : pricePoints.stockxGoat) || [];
    }

    // Add new listing
    const updatedListings = [...channelListings, listing].sort((a, b) => a.price - b.price);
    onUpdatePricePoints(asset.id, selectedSize, listing.channel, updatedListings);
  };

  const handleBulkAddListings = async (listings: PricePoint[]) => {
    if (!selectedSize) {
      alert("Please select a size first");
      return;
    }

    // Get existing listings for each channel
    const sizeVariant = asset.sizes?.find(s => s.size === selectedSize);
    if (!sizeVariant) return;

    const pricePoints = sizeVariant.pricePoints || sizeVariant.legacyPricePoints;
    if (!pricePoints) return;

    // Group listings by channel
    const listingsByChannel: Record<string, PricePoint[]> = {
      whatsapp: [],
      marketplace: [],
      international: [],
    };

    listings.forEach(listing => {
      const channel = listing.channel;
      if (channel in listingsByChannel) {
        listingsByChannel[channel].push(listing);
      }
    });

    // Update each channel separately
    for (const [channel, newListings] of Object.entries(listingsByChannel)) {
      if (newListings.length === 0) continue;

      let channelListings: PricePoint[] = [];
      if (channel === "whatsapp") {
        channelListings = ("whatsapp" in pricePoints ? pricePoints.whatsapp : pricePoints.b2b) || [];
      } else if (channel === "marketplace") {
        channelListings = ("marketplace" in pricePoints ? pricePoints.marketplace : pricePoints.endCustomer) || [];
      } else {
        channelListings = ("international" in pricePoints ? pricePoints.international : pricePoints.stockxGoat) || [];
      }

      // Merge and sort
      const updatedListings = [...channelListings, ...newListings].sort((a, b) => a.price - b.price);
      onUpdatePricePoints(asset.id, selectedSize, channel as "whatsapp" | "marketplace" | "international", updatedListings);
    }
  };

  const handleUpdateListings = (
    channel: "whatsapp" | "marketplace" | "international",
    size: string,
    listings: PricePoint[]
  ) => {
    onUpdatePricePoints(asset.id, size, channel, listings);
  };

  const handleDeleteListing = (
    channel: "whatsapp" | "marketplace" | "international",
    size: string,
    listingIndex: number
  ) => {
    const sizeVariant = asset.sizes?.find(s => s.size === size);
    if (!sizeVariant) return;

    const pricePoints = sizeVariant.pricePoints || sizeVariant.legacyPricePoints;
    if (!pricePoints) return;

    let channelListings: PricePoint[] = [];
    if (channel === "whatsapp") {
      channelListings = ("whatsapp" in pricePoints ? pricePoints.whatsapp : pricePoints.b2b) || [];
    } else if (channel === "marketplace") {
      channelListings = ("marketplace" in pricePoints ? pricePoints.marketplace : pricePoints.endCustomer) || [];
    } else {
      channelListings = ("international" in pricePoints ? pricePoints.international : pricePoints.stockxGoat) || [];
    }

    const updatedListings = channelListings.filter((_, index) => index !== listingIndex);
    onUpdatePricePoints(asset.id, size, channel, updatedListings);
  };

  return (
    <div className="border border-brand-gray/20 bg-terminal-surface p-5 space-y-5">
      {/* Instrument Header */}
      <div className="border-b border-brand-gray/20 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-brand-black mb-1">
              {asset.name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-brand-black/50">
              <span>{asset.sku}</span>
              <span>•</span>
              <span>{asset.brand}</span>
              {asset.category && (
                <>
                  <span>•</span>
                  <span>{asset.category}</span>
                </>
              )}
            </div>
          </div>
          {asset.lastUpdated && (
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-brand-black/40 mb-0.5">Last Update</p>
              <p className="text-xs font-semibold text-brand-black">
                {new Date(asset.lastUpdated).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Size Selector */}
      {asset.sizes && asset.sizes.length > 0 ? (
        <div className="border-b border-brand-gray/20 pb-4">
          <label className="block text-xs font-medium text-brand-black mb-3">
            Size Variant {!selectedSize && <span className="text-down">(Required)</span>}
          </label>
          <div className="flex flex-wrap gap-2">
            {sortSizesByValue(asset.sizes).map((size) => (
              <button
                key={size.size}
                onClick={() => onSizeChange(size.size)}
                className={`px-4 py-2 border text-xs font-semibold transition ${
                  selectedSize === size.size
                    ? "border-terminal-border-strong bg-terminal-surface-raised text-terminal-text"
                    : "border-brand-gray/30 hover:border-terminal-border-strong text-brand-black bg-terminal-surface"
                }`}
              >
                {size.size}
              </button>
            ))}
          </div>
          {!selectedSize && (
            <p className="text-xs text-down mt-3">
              Select a size variant to begin market data entry
            </p>
          )}
        </div>
      ) : (
        <div className="border border-down/40 bg-down/10 p-4">
          <p className="text-xs font-semibold text-down mb-1">No Size Variants Configured</p>
          <p className="text-xs text-down">
            Define size variants in the Assets tab before entering market data.
          </p>
        </div>
      )}

      {/* Market Data Entry Header */}
      <div className="border-b border-brand-gray/20 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-brand-black mb-1">
              All Listings
            </h3>
            <p className="text-xs text-brand-black/50">
              View and edit all listings across all channels.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAddListingModal(true)}
              className="px-3 py-1.5 bg-accent text-terminal-bg text-xs font-semibold hover:bg-accent/90 transition disabled:opacity-50"
              disabled={!selectedSize}
            >
              + Add Listing
            </button>
            <button
              onClick={() => setShowBulkAddModal(true)}
              className="px-3 py-1.5 border border-brand-gray/30 bg-terminal-surface text-brand-black text-xs font-semibold hover:border-terminal-border-strong transition disabled:opacity-50"
              disabled={!selectedSize}
            >
              + Bulk Add
            </button>
          </div>
        </div>
      </div>

      {/* Spreadsheet View */}
      <ListingsSpreadsheet
        asset={asset}
        selectedSize={selectedSize}
        onUpdateListings={handleUpdateListings}
        onDeleteListing={handleDeleteListing}
        onAddListing={handleAddListing}
      />

      {/* Add Listing Modal */}
      {showAddListingModal && (
        <AddListingModal
          selectedSize={selectedSize}
          onAddListing={handleAddListing}
          onClose={() => setShowAddListingModal(false)}
        />
      )}

      {/* Bulk Add Listings Modal */}
      {showBulkAddModal && (
        <BulkAddListingsModal
          selectedSize={selectedSize}
          onAddListings={handleBulkAddListings}
          onClose={() => setShowBulkAddModal(false)}
        />
      )}
    </div>
  );
};
