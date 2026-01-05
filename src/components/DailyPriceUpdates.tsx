import React, { useState, useEffect } from "react";
import { Asset, PricePoint } from "../types";
import { convertUSDToINR, getUSDToINRRate } from "../utils/exchangeRate";
import { sortSizesByValue } from "../utils/sizeSort";

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border border-brand-gray/30 rounded-none p-4 bg-brand-white">
          <p className="text-xs font-semibold text-brand-black/60 uppercase tracking-wide mb-2">Instruments</p>
          <p className="text-2xl font-semibold text-brand-black">{assets.length}</p>
        </div>
        <div className="border border-brand-gray/30 rounded-none p-4 bg-brand-white">
          <p className="text-xs font-semibold text-brand-black/60 uppercase tracking-wide mb-2">Updated Today</p>
          <p className="text-2xl font-semibold text-green-600">
            {assets.filter(a => {
              const today = new Date().toDateString();
              const updated = a.lastUpdated ? new Date(a.lastUpdated).toDateString() : null;
              return updated === today;
            }).length}
          </p>
        </div>
        <div className="border border-brand-gray/30 rounded-none p-4 bg-brand-white">
          <p className="text-xs font-semibold text-brand-black/60 uppercase tracking-wide mb-2">Pending</p>
          <p className="text-2xl font-semibold text-red-600">
            {assets.filter(a => {
              const today = new Date().toDateString();
              const updated = a.lastUpdated ? new Date(a.lastUpdated).toDateString() : null;
              return updated !== today;
            }).length}
          </p>
        </div>
        <div className="border border-brand-gray/30 rounded-none p-4 bg-brand-white">
          <p className="text-xs font-semibold text-brand-black/60 uppercase tracking-wide mb-2">Size Variants</p>
          <p className="text-2xl font-semibold text-brand-black">
            {assets.reduce((sum, a) => sum + (a.sizes?.length || 0), 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset List */}
        <div className="lg:col-span-1">
          <div className="border border-brand-gray/30 rounded-none p-5 bg-brand-white">
            <h2 className="text-sm font-semibold text-brand-black mb-4 uppercase tracking-wide">
              Instruments
            </h2>
            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, SKU, or brand..."
                className="w-full bg-brand-white border border-brand-gray/30 py-2 px-3 text-xs font-body text-brand-black placeholder:text-brand-black/40 focus:outline-none focus:border-brand-black"
                style={{ borderRadius: '0px' }}
              />
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {assets
                .filter((asset) => {
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  return (
                    asset.name.toLowerCase().includes(query) ||
                    asset.sku.toLowerCase().includes(query) ||
                    asset.brand.toLowerCase().includes(query)
                  );
                })
                .map((asset) => {
                const today = new Date().toDateString();
                const updated = asset.lastUpdated ? new Date(asset.lastUpdated).toDateString() : null;
                const isUpdatedToday = updated === today;

                const isSelected = selectedAsset?.id === asset.id;
                
                return (
                  <div
                    key={asset.id}
                    className={`border rounded-none p-3 cursor-pointer transition ${
                      isSelected
                        ? "border-brand-black bg-brand-black text-brand-white"
                        : "border-brand-gray/30 bg-brand-white hover:border-brand-gray/50 hover:bg-brand-gray/5"
                    }`}
                    onClick={() => {
                      setSelectedAsset(asset);
                      setSelectedSize(asset.sizes?.[0]?.size || null);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`text-xs font-medium ${
                            isSelected ? "text-brand-white" : "text-brand-black"
                          }`}>
                            {asset.name}
                          </p>
                          {isUpdatedToday && (
                            <span className={`text-xs px-1.5 py-0.5 ${
                              isSelected 
                                ? "bg-green-500/30 text-green-300" 
                                : "bg-green-500/20 text-green-600"
                            }`}>
                              Updated
                            </span>
                          )}
                        </div>
                        <p className={`text-xs ${
                          isSelected ? "text-brand-white/70" : "text-brand-black"
                        }`}>
                          {asset.sku}
                        </p>
                        <p className={`text-xs mt-1 ${
                          isSelected ? "text-brand-white/70" : "text-brand-black"
                        }`}>
                          {asset.sizes?.length || 0} sizes
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
            <div className="border border-brand-gray/30 rounded-none p-12 bg-brand-white text-center">
              <p className="text-sm font-medium text-brand-black/60 mb-1">No Instrument Selected</p>
              <p className="text-xs text-brand-black/50">Select an instrument to begin market data entry</p>
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
  const [activeTab, setActiveTab] = useState<"whatsapp" | "marketplace" | "international">("whatsapp");
  const [showBulkListingModal, setShowBulkListingModal] = useState(false);
  const sizeVariant = asset.sizes?.find(s => s.size === selectedSize);
  
  // Helper to get price points from either structure
  const getPricePoints = (variant: typeof sizeVariant) => {
    if (!variant) return null;
    return variant.pricePoints || variant.legacyPricePoints || null;
  };
  
  const getWhatsAppPrices = (variant: typeof sizeVariant): PricePoint[] => {
    const pricePoints = getPricePoints(variant);
    if (!pricePoints) return [];
    if ('whatsapp' in pricePoints) return pricePoints.whatsapp || [];
    if ('b2b' in pricePoints) return pricePoints.b2b || [];
    return [];
  };
  
  const getMarketplacePrices = (variant: typeof sizeVariant): PricePoint[] => {
    const pricePoints = getPricePoints(variant);
    if (!pricePoints) return [];
    if ('marketplace' in pricePoints) return pricePoints.marketplace || [];
    if ('endCustomer' in pricePoints) return pricePoints.endCustomer || [];
    return [];
  };
  
  const getInternationalPrices = (variant: typeof sizeVariant): PricePoint[] => {
    const pricePoints = getPricePoints(variant);
    if (!pricePoints) return [];
    if ('international' in pricePoints) return pricePoints.international || [];
    if ('stockxGoat' in pricePoints) return pricePoints.stockxGoat || [];
    return [];
  };
  
  // WhatsApp prices (with buy/sell separation)
  const [whatsappBuyPrices, setWhatsappBuyPrices] = useState<PricePoint[]>(
    getWhatsAppPrices(sizeVariant).filter((p: PricePoint) => !p.transactionType || p.transactionType === 'buy' || p.transactionType === 'both')
  );
  const [whatsappSellPrices, setWhatsappSellPrices] = useState<PricePoint[]>(
    getWhatsAppPrices(sizeVariant).filter((p: PricePoint) => p.transactionType === 'sell' || p.transactionType === 'both')
  );
  
  // Marketplace prices
  const [marketplacePrices, setMarketplacePrices] = useState<PricePoint[]>(
    getMarketplacePrices(sizeVariant)
  );
  
  // International prices
  const [internationalPrices, setInternationalPrices] = useState<PricePoint[]>(
    getInternationalPrices(sizeVariant)
  );

  React.useEffect(() => {
    if (!selectedSize) {
      setWhatsappBuyPrices([]);
      setWhatsappSellPrices([]);
      setMarketplacePrices([]);
      setInternationalPrices([]);
      return;
    }

    const variant = asset.sizes?.find(s => s.size === selectedSize);
    if (variant) {
      const whatsappAll = getWhatsAppPrices(variant);
      setWhatsappBuyPrices(whatsappAll.filter((p: PricePoint) => !p.transactionType || p.transactionType === 'buy' || p.transactionType === 'both'));
      setWhatsappSellPrices(whatsappAll.filter((p: PricePoint) => p.transactionType === 'sell' || p.transactionType === 'both'));
      setMarketplacePrices(getMarketplacePrices(variant));
      setInternationalPrices(getInternationalPrices(variant));
    } else {
      setWhatsappBuyPrices([]);
      setWhatsappSellPrices([]);
      setMarketplacePrices([]);
      setInternationalPrices([]);
    }
  }, [selectedSize, asset]);

  const handleAddPricePoint = (
    channel: "whatsapp" | "marketplace" | "international",
    transactionType: "buy" | "sell" | undefined,
    price: number,
    listingCount: number,
    source: string | undefined,
    marketplaceName?: string,
    sellerName?: string,
    sellerContact?: string,
    sellerLocation?: string,
    reshippingCost?: number,
    size?: string,
    url?: string
  ) => {
    // Use provided size or fall back to selectedSize
    const targetSize = size || selectedSize;
    if (!targetSize && channel !== "international") {
      alert("Please provide a size for the listing");
      return;
    }

    const newPoint: PricePoint = {
      price,
      listingCount,
      channel,
      transactionType,
      source: source || (channel === "whatsapp" ? "whatsapp-group" : channel === "marketplace" ? "marketplace" : "stockx"),
      marketplaceName,
      sellerName,
      sellerContact,
      sellerLocation,
      reshippingCost,
      size: targetSize || undefined,
      url,
      lastSeen: new Date(),
    };

    if (channel === "whatsapp") {
      const sizeToUse = targetSize || newPoint.size || '';
      if (transactionType === "buy") {
        const updated = [...whatsappBuyPrices, newPoint].sort((a, b) => a.price - b.price);
        setWhatsappBuyPrices(updated);
        // Combine buy and sell for WhatsApp channel
        const allWhatsapp = [...updated, ...whatsappSellPrices];
        onUpdatePricePoints(asset.id, sizeToUse, "whatsapp", allWhatsapp);
      } else if (transactionType === "sell") {
        const updated = [...whatsappSellPrices, newPoint].sort((a, b) => b.price - a.price);
        setWhatsappSellPrices(updated);
        // Combine buy and sell for WhatsApp channel
        const allWhatsapp = [...whatsappBuyPrices, ...updated];
        onUpdatePricePoints(asset.id, sizeToUse, "whatsapp", allWhatsapp);
      } else {
        // Both or undefined - add to buy
        const updated = [...whatsappBuyPrices, newPoint].sort((a, b) => a.price - b.price);
        setWhatsappBuyPrices(updated);
        const allWhatsapp = [...updated, ...whatsappSellPrices];
        onUpdatePricePoints(asset.id, sizeToUse, "whatsapp", allWhatsapp);
      }
    } else if (channel === "marketplace") {
      const updated = [...marketplacePrices, newPoint].sort((a, b) => a.price - b.price);
      setMarketplacePrices(updated);
      onUpdatePricePoints(asset.id, targetSize || '', "marketplace", updated);
    } else {
      const updated = [...internationalPrices, newPoint].sort((a, b) => a.price - b.price);
      setInternationalPrices(updated);
      onUpdatePricePoints(asset.id, targetSize || newPoint.size || '', "international", updated);
    }
  };

  const handleRemovePricePoint = (
    channel: "whatsapp" | "marketplace" | "international",
    transactionType: "buy" | "sell" | undefined,
    index: number
  ) => {
    if (!selectedSize) {
      alert("Please select a size first");
      return;
    }

    if (channel === "whatsapp") {
      if (transactionType === "buy") {
        const updated = whatsappBuyPrices.filter((_, i) => i !== index);
        setWhatsappBuyPrices(updated);
        const allWhatsapp = [...updated, ...whatsappSellPrices];
        onUpdatePricePoints(asset.id, selectedSize, "whatsapp", allWhatsapp);
      } else {
        const updated = whatsappSellPrices.filter((_, i) => i !== index);
        setWhatsappSellPrices(updated);
        const allWhatsapp = [...whatsappBuyPrices, ...updated];
        onUpdatePricePoints(asset.id, selectedSize, "whatsapp", allWhatsapp);
      }
    } else if (channel === "marketplace") {
      const updated = marketplacePrices.filter((_, i) => i !== index);
      setMarketplacePrices(updated);
      onUpdatePricePoints(asset.id, selectedSize, "marketplace", updated);
    } else {
      const updated = internationalPrices.filter((_, i) => i !== index);
      setInternationalPrices(updated);
      onUpdatePricePoints(asset.id, selectedSize, "international", updated);
    }
  };

  return (
    <div className="border border-brand-gray/20 rounded-none p-6 bg-brand-white space-y-6">
      {/* Instrument Header */}
      <div className="border-b border-brand-gray/20 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-brand-black mb-1 uppercase tracking-wide">
              {asset.name}
            </h2>
            <div className="flex items-center gap-3 text-xs text-brand-black/60">
              <span>{asset.sku}</span>
              <span>•</span>
              <span>{asset.brand}</span>
              {asset.category && (
                <>
                  <span>•</span>
                  <span className="uppercase">{asset.category}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Size Selector */}
      {asset.sizes && asset.sizes.length > 0 ? (
        <div className="border-b border-brand-gray/20 pb-4">
          <label className="block text-xs font-semibold text-brand-black mb-3 uppercase tracking-wide">
            Size Variant {!selectedSize && <span className="text-red-600 font-normal">(Required)</span>}
          </label>
          <div className="flex flex-wrap gap-2">
            {sortSizesByValue(asset.sizes).map((size) => (
              <button
                key={size.size}
                onClick={() => onSizeChange(size.size)}
                className={`px-4 py-2 rounded-none border text-xs font-semibold uppercase tracking-wide transition ${
                  selectedSize === size.size
                    ? "border-brand-black bg-brand-black text-brand-white"
                    : "border-brand-gray/30 hover:border-brand-black text-brand-black"
                }`}
              >
                {size.size}
              </button>
            ))}
          </div>
          {!selectedSize && (
            <p className="text-xs text-red-600 mt-3 font-medium">
              Select a size variant to begin market data entry
            </p>
          )}
        </div>
      ) : (
        <div className="border border-red-500/30 bg-red-500/5 rounded-none p-4">
          <p className="text-xs font-semibold text-red-700 mb-1">No Size Variants Configured</p>
          <p className="text-xs text-red-600">
            Define size variants in the Portfolio tab before entering market data.
          </p>
        </div>
      )}

      {/* Market Data Entry Header */}
      <div className="border-b border-brand-gray/20 pb-4 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-brand-black uppercase tracking-wide mb-1">
              Channel Orderbook
            </h3>
            <p className="text-xs text-brand-black/60">
              Capture live market data by channel. Each entry represents a real listing with actionable details.
            </p>
          </div>
          <div className="flex items-center gap-3">
          {asset.lastUpdated && (
            <div className="text-right">
              <p className="text-xs text-brand-black/60 uppercase tracking-wide">Last Update</p>
              <p className="text-xs font-semibold text-brand-black">
                {new Date(asset.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}
            <button
              onClick={() => setShowBulkListingModal(true)}
              className="px-3 py-1.5 border border-brand-black bg-brand-white text-brand-black text-xs font-semibold uppercase tracking-wide hover:bg-brand-black hover:text-brand-white transition leading-tight"
              style={{ borderRadius: '0px' }}
            >
              Bulk Add
            </button>
          </div>
        </div>

        {/* Channel Tabs */}
        <div className="flex gap-2 border-b border-brand-gray/20">
          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide transition border-b-2 ${
              activeTab === "whatsapp"
                ? "border-brand-black text-brand-black"
                : "border-transparent text-brand-black/50 hover:text-brand-black"
            }`}
          >
            WhatsApp & Reseller
          </button>
          <button
            onClick={() => setActiveTab("marketplace")}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide transition border-b-2 ${
              activeTab === "marketplace"
                ? "border-brand-black text-brand-black"
                : "border-transparent text-brand-black/50 hover:text-brand-black"
            }`}
          >
            Indian Marketplaces
          </button>
          <button
            onClick={() => setActiveTab("international")}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide transition border-b-2 ${
              activeTab === "international"
                ? "border-brand-black text-brand-black"
                : "border-transparent text-brand-black/50 hover:text-brand-black"
            }`}
          >
            International
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "whatsapp" && (
        <WhatsAppPriceSection
          title="WhatsApp Groups & Reseller Networks"
          description="Track both buy opportunities (people selling) and sell opportunities (people buying). These groups have mixed B2B/B2C transactions."
          buyPricePoints={whatsappBuyPrices}
          sellPricePoints={whatsappSellPrices}
          onAddBuy={(price, count, source, sellerName, sellerContact, sellerLocation) =>
            handleAddPricePoint("whatsapp", "buy", price, count, source, undefined, sellerName, sellerContact, sellerLocation)
          }
          onAddSell={(price, count, source, sellerName, sellerContact, sellerLocation) =>
            handleAddPricePoint("whatsapp", "sell", price, count, source, undefined, sellerName, sellerContact, sellerLocation)
          }
          onRemoveBuy={(index) => handleRemovePricePoint("whatsapp", "buy", index)}
          onRemoveSell={(index) => handleRemovePricePoint("whatsapp", "sell", index)}
        />
      )}

      {activeTab === "marketplace" && (
        <MarketplacePriceSection
          title="Indian Marketplaces"
          description="Top 5 cheapest listings across CrepdogCrew, Mainstreet, Culture Circle, Hypefly, Dawntown, 10 Hills Studio, Find your Kicks, etc."
          pricePoints={marketplacePrices}
          onAdd={(price, count, source, marketplaceName, url) =>
            handleAddPricePoint("marketplace", undefined, price, count, source, marketplaceName, undefined, undefined, undefined, undefined, undefined, url)
          }
          onRemove={(index) => handleRemovePricePoint("marketplace", undefined, index)}
        />
      )}

      {activeTab === "international" && (
        <InternationalPriceSection
          title="International Platforms (StockX / Goat)"
          description="Track platform prices, sizes, and reshipping costs. No customs duties apply."
          pricePoints={internationalPrices}
          selectedSize={selectedSize || ''}
          onAdd={(price, count, source, marketplaceName, size, reshippingCost, url) =>
            handleAddPricePoint("international", undefined, price, count, source ?? undefined, marketplaceName, undefined, undefined, undefined, reshippingCost, size, url)
          }
          onRemove={(index) => handleRemovePricePoint("international", undefined, index)}
        />
      )}

      {/* Bulk Listing Modal */}
      {showBulkListingModal && (
        <BulkListingModal
          selectedSize={selectedSize}
          channel={activeTab}
          onAddListings={async (listings) => {
            for (const listing of listings) {
              // Skip listings with invalid price or listingCount
              if (!listing.price || !listing.listingCount || !listing.size) {
                continue;
              }
              
              // Validate that the size exists for this asset
              const sizeExists = asset.sizes?.some(s => s.size === listing.size);
              if (!sizeExists) {
                console.warn(`Size ${listing.size} not found for asset ${asset.name}, skipping listing`);
                continue;
              }
              
              if (listing.channel === "whatsapp") {
                handleAddPricePoint(
                  "whatsapp",
                  listing.transactionType as "buy" | "sell" | undefined,
                  listing.price,
                  listing.listingCount,
                  listing.source,
                  undefined,
                  listing.sellerName,
                  listing.sellerContact,
                  listing.sellerLocation,
                  undefined,
                  listing.size
                );
              } else if (listing.channel === "marketplace") {
                handleAddPricePoint(
                  "marketplace",
                  undefined,
                  listing.price,
                  listing.listingCount,
                  listing.source,
                  listing.marketplaceName,
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  listing.size,
                  listing.url
                );
              } else {
                handleAddPricePoint(
                  "international",
                  undefined,
                  listing.price,
                  listing.listingCount,
                  listing.source,
                  listing.marketplaceName,
                  undefined,
                  undefined,
                  undefined,
                  listing.reshippingCost,
                  listing.size,
                  listing.url
                );
              }
            }
            setShowBulkListingModal(false);
          }}
          onClose={() => setShowBulkListingModal(false)}
        />
      )}
    </div>
  );
};

// International Price Section with platform, price, size, and reshipping cost
interface InternationalPriceSectionProps {
  title: string;
  description: string;
  pricePoints: PricePoint[];
  selectedSize: string;
  onAdd: (price: number, listingCount: number, source: string | undefined, marketplaceName?: string, size?: string, reshippingCost?: number, url?: string) => void;
  onRemove: (index: number) => void;
}

const InternationalPriceSection: React.FC<InternationalPriceSectionProps> = ({
  title,
  description,
  pricePoints,
  selectedSize,
  onAdd,
  onRemove,
}) => {
  const [newPriceUSD, setNewPriceUSD] = useState("");
  const [newCount, setNewCount] = useState("");
  const [newSize, setNewSize] = useState(selectedSize);
  const [newReshippingCost, setNewReshippingCost] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("stockx");
  const [newUrl, setNewUrl] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  const platformOptions = [
    { value: 'stockx', label: 'StockX' },
    { value: 'goat', label: 'Goat' },
    { value: 'ebay', label: 'eBay' },
    { value: 'other', label: 'Other' },
  ];

  // Load exchange rate on mount
  useEffect(() => {
    const loadExchangeRate = async () => {
      setIsLoadingRate(true);
      try {
        const rate = await getUSDToINRRate();
        setExchangeRate(rate);
      } catch (error) {
        console.error("Failed to load exchange rate:", error);
      } finally {
        setIsLoadingRate(false);
      }
    };
    
    loadExchangeRate();
  }, []);

  React.useEffect(() => {
    setNewSize(selectedSize);
  }, [selectedSize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceUSD = parseFloat(newPriceUSD);
    const count = parseInt(newCount);
    const reshipping = newReshippingCost ? parseFloat(newReshippingCost) : undefined;
    
    if (isNaN(priceUSD) || priceUSD <= 0) {
      alert("Please enter a valid platform price in USD greater than 0");
      return;
    }
    
    if (isNaN(count) || count <= 0) {
      alert("Please enter a valid listing count greater than 0");
      return;
    }

    if (reshipping !== undefined && (isNaN(reshipping) || reshipping < 0)) {
      alert("Please enter a valid reshipping cost (0 or greater)");
      return;
    }

    if (!newSize) {
      alert("Please enter a size");
      return;
    }
    
    // Convert USD to INR
    let priceINR: number;
    try {
      priceINR = await convertUSDToINR(priceUSD);
    } catch (error) {
      console.error("Failed to convert USD to INR:", error);
      // Fallback: use approximate rate
      const fallbackRate = exchangeRate || 83;
      priceINR = priceUSD * fallbackRate;
    }
    
    const selected = platformOptions.find(opt => opt.value === selectedPlatform);
    onAdd(priceINR, count, selectedPlatform, selected?.label, newSize, reshipping, newUrl || undefined);
    setNewPriceUSD("");
    setNewCount("");
    setNewReshippingCost("");
    setNewUrl("");
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="border border-brand-gray/20 rounded-none p-4 bg-brand-white">
      <div className="mb-3">
        <h3 className="text-xs font-body font-normal text-brand-black mb-1">{title}</h3>
        <p className="text-xs text-brand-black">{description}</p>
      </div>

      {/* Current Price Points */}
      {pricePoints.length > 0 && (
        <div className="space-y-2 mb-4">
          {pricePoints.map((point, index) => {
            const reshippingCost = point.reshippingCost || 0;
            const totalLanded = point.price + reshippingCost;
            
            return (
              <div key={index} className="border border-brand-gray/20 rounded-none p-3 bg-brand-gray/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-brand-black">
                      {point.marketplaceName || point.source || 'Platform'}
                    </span>
                    {point.url && (
                      <a 
                        href={point.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-brand-black/60 hover:text-brand-black underline"
                      >
                        View →
                      </a>
                    )}
                  </div>
                  <button onClick={() => onRemove(index)} className="text-xs px-2 py-1 border border-red-500/20 hover:border-red-500 text-red-500">
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <p className="text-brand-black/60 mb-1">Size</p>
                    <p className="font-semibold text-brand-black">{point.size || '—'}</p>
                  </div>
                  <div>
                    <p className="text-brand-black/60 mb-1">Platform Price</p>
                    <p className="font-semibold text-brand-black">₹{point.price.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-brand-black/60 mb-1">Reshipping</p>
                    <p className="font-semibold text-brand-black">
                      {reshippingCost > 0 ? `₹${reshippingCost.toLocaleString("en-IN")}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-brand-black/60 mb-1">Total Landed</p>
                    <p className="font-semibold text-green-600">₹{totalLanded.toLocaleString("en-IN")}</p>
                  </div>
                </div>
                <p className="text-xs text-brand-black/60 mt-2">
                  {point.listingCount} {point.listingCount === 1 ? "listing" : "listings"} available
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Price Point */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <select 
          value={selectedPlatform} 
          onChange={(e) => setSelectedPlatform(e.target.value)} 
          className="w-full border border-brand-gray/20 rounded-none px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black"
        >
          {platformOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input 
            type="text" 
            value={newSize} 
            onChange={(e) => setNewSize(e.target.value)} 
            placeholder="Size (e.g., UK 9)" 
            className="border border-brand-gray/20 rounded-none px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" 
            required 
          />
          <input 
            type="number" 
            value={newCount} 
            onChange={(e) => setNewCount(e.target.value)} 
            placeholder="Listings" 
            className="border border-brand-gray/20 rounded-none px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" 
            required 
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
          <input 
            type="number" 
              value={newPriceUSD} 
              onChange={(e) => setNewPriceUSD(e.target.value)} 
              placeholder="Platform Price ($)" 
              className="w-full border border-brand-gray/20 rounded-none px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" 
            required 
              disabled={isLoadingRate}
          />
            {exchangeRate && newPriceUSD && !isNaN(parseFloat(newPriceUSD)) && (
              <p className="text-[10px] text-brand-black/50 mt-0.5 leading-tight">
                ≈ ₹{(parseFloat(newPriceUSD) * exchangeRate).toLocaleString('en-IN', { maximumFractionDigits: 0 })} INR
              </p>
            )}
            {exchangeRate && (
              <p className="text-[9px] text-brand-black/40 mt-0.5 leading-tight">
                Rate: ₹{exchangeRate.toFixed(2)}/USD
              </p>
            )}
          </div>
          <input 
            type="number" 
            value={newReshippingCost} 
            onChange={(e) => setNewReshippingCost(e.target.value)} 
            placeholder="Reshipping Cost (₹)" 
            className="border border-brand-gray/20 rounded-none px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" 
          />
        </div>
        <input 
          type="url" 
          value={newUrl} 
          onChange={(e) => setNewUrl(e.target.value)} 
          placeholder="Listing URL (optional)" 
          className="w-full border border-brand-gray/20 rounded-none px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" 
        />
        <button 
          type="submit" 
          className="w-full px-4 py-2 rounded-none border border-brand-black bg-brand-black text-white text-xs font-body hover:bg-brand-black/90"
        >
          Add Listing
        </button>
        {saveSuccess && (
          <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded-none">
            <p className="text-xs font-semibold text-green-700">✓ Listing added successfully</p>
          </div>
        )}
      </form>
    </div>
  );
};

// WhatsApp Price Section with Buy/Sell separation
interface WhatsAppPriceSectionProps {
  title: string;
  description: string;
  buyPricePoints: PricePoint[];
  sellPricePoints: PricePoint[];
  onAddBuy: (price: number, listingCount: number, source: string | undefined, sellerName?: string, sellerContact?: string, sellerLocation?: string) => void;
  onAddSell: (price: number, listingCount: number, source: string | undefined, sellerName?: string, sellerContact?: string, sellerLocation?: string) => void;
  onRemoveBuy: (index: number) => void;
  onRemoveSell: (index: number) => void;
}

const WhatsAppPriceSection: React.FC<WhatsAppPriceSectionProps> = ({
  title,
  description,
  buyPricePoints,
  sellPricePoints,
  onAddBuy,
  onAddSell,
  onRemoveBuy,
  onRemoveSell,
}) => {
  const [newBuyPrice, setNewBuyPrice] = useState("");
  const [newBuyCount, setNewBuyCount] = useState("");
  const [newBuySellerName, setNewBuySellerName] = useState("");
  const [newBuySellerContact, setNewBuySellerContact] = useState("");
  const [newBuySellerLocation, setNewBuySellerLocation] = useState("");
  const [newBuySource, setNewBuySource] = useState("whatsapp-group-mumbai");
  const [buySaveSuccess, setBuySaveSuccess] = useState(false);
  
  const [newSellPrice, setNewSellPrice] = useState("");
  const [newSellCount, setNewSellCount] = useState("");
  const [newSellSellerName, setNewSellSellerName] = useState("");
  const [newSellSellerContact, setNewSellSellerContact] = useState("");
  const [newSellSellerLocation, setNewSellSellerLocation] = useState("");
  const [newSellSource, setNewSellSource] = useState("whatsapp-group-mumbai");
  const [sellSaveSuccess, setSellSaveSuccess] = useState(false);

  const handleSubmitBuy = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newBuyPrice);
    const count = parseInt(newBuyCount);
    if (isNaN(price) || price <= 0 || isNaN(count) || count <= 0) {
      alert("Please enter valid price and count");
      return;
    }
    onAddBuy(price, count, newBuySource, newBuySellerName || undefined, newBuySellerContact || undefined, newBuySellerLocation || undefined);
    setNewBuyPrice("");
    setNewBuyCount("");
    setNewBuySellerName("");
    setNewBuySellerContact("");
    setNewBuySellerLocation("");
    setBuySaveSuccess(true);
    setTimeout(() => setBuySaveSuccess(false), 3000);
  };

  const handleSubmitSell = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newSellPrice);
    const count = parseInt(newSellCount);
    if (isNaN(price) || price <= 0 || isNaN(count) || count <= 0) {
      alert("Please enter valid price and count");
      return;
    }
    onAddSell(price, count, newSellSource, newSellSellerName || undefined, newSellSellerContact || undefined, newSellSellerLocation || undefined);
    setNewSellPrice("");
    setNewSellCount("");
    setNewSellSellerName("");
    setNewSellSellerContact("");
    setNewSellSellerLocation("");
    setSellSaveSuccess(true);
    setTimeout(() => setSellSaveSuccess(false), 3000);
  };

  return (
    <div className="border border-brand-gray/20 rounded-none p-4 bg-brand-white">
      <div className="mb-3">
        <h3 className="text-xs font-body font-normal text-brand-black mb-1">{title}</h3>
        <p className="text-xs text-brand-black">{description}</p>
      </div>

      {/* Buy Prices */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-3">Ask Side (Sellers)</p>
        {buyPricePoints.length > 0 && (
          <div className="space-y-2 mb-3">
            {buyPricePoints.sort((a, b) => a.price - b.price).map((point, index) => (
              <div key={index} className="flex items-center justify-between border border-brand-gray/20 rounded-none p-2 bg-brand-gray/5">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-8 w-8 flex-shrink-0 bg-brand-gray/10 border border-brand-gray/20 flex items-center justify-center text-xs font-semibold text-brand-black/60">
                    {point.sellerName ? point.sellerName.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-brand-black truncate">{point.sellerName || point.source || 'Seller'}</p>
                    <div className="flex items-center gap-2 text-xs text-brand-black/60">
                      {point.sellerLocation && <span>{point.sellerLocation}</span>}
                      {point.sellerLocation && <span>•</span>}
                      <span>Qty: {point.listingCount}</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-green-600">₹{point.price.toLocaleString("en-IN")}</span>
                </div>
                <button onClick={() => onRemoveBuy(index)} className="text-xs px-2 py-1 border border-red-500/20 hover:border-red-500 text-red-500 ml-2">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmitBuy} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={newBuySellerName} onChange={(e) => setNewBuySellerName(e.target.value)} placeholder="Seller Name" className="border border-brand-gray/20 rounded-none px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" />
            <input type="text" value={newBuySellerLocation} onChange={(e) => setNewBuySellerLocation(e.target.value)} placeholder="Location (e.g., Delhi)" className="border border-brand-gray/20 rounded-none px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={newBuyPrice} onChange={(e) => setNewBuyPrice(e.target.value)} placeholder="Price (₹)" className="border border-brand-gray/20 rounded-none px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" required />
            <input type="number" value={newBuyCount} onChange={(e) => setNewBuyCount(e.target.value)} placeholder="Quantity" className="border border-brand-gray/20 rounded-none px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" required />
          </div>
          <input type="text" value={newBuySellerContact} onChange={(e) => setNewBuySellerContact(e.target.value)} placeholder="WhatsApp Number (e.g., +91 98765 43210)" className="w-full border border-brand-gray/20 rounded-none px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" />
          <input type="text" value={newBuySource} onChange={(e) => setNewBuySource(e.target.value)} placeholder="Group/Source (optional)" className="w-full border border-brand-gray/20 rounded-none px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" />
          <button type="submit" className="w-full px-4 py-2 rounded-none border border-green-600 bg-green-600 text-white text-xs font-body hover:bg-green-700">Add Seller</button>
          {buySaveSuccess && (
            <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded-none">
              <p className="text-xs font-semibold text-green-700">✓ Seller added successfully</p>
            </div>
          )}
        </form>
      </div>

      {/* Sell Prices */}
      <div>
        <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-3">Bid Side (Buyers)</p>
        {sellPricePoints.length > 0 && (
          <div className="space-y-2 mb-3">
            {sellPricePoints.sort((a, b) => b.price - a.price).map((point, index) => (
              <div key={index} className="flex items-center justify-between border border-brand-gray/20 rounded-none p-2 bg-brand-gray/5">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-8 w-8 flex-shrink-0 bg-brand-gray/10 border border-brand-gray/20 flex items-center justify-center text-xs font-semibold text-brand-black/60">
                    {point.sellerName ? point.sellerName.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-brand-black truncate">{point.sellerName || point.source || 'Buyer'}</p>
                    <div className="flex items-center gap-2 text-xs text-brand-black/60">
                      {point.sellerLocation && <span>{point.sellerLocation}</span>}
                      {point.sellerLocation && <span>•</span>}
                      <span>Qty: {point.listingCount}</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-red-600">₹{point.price.toLocaleString("en-IN")}</span>
                </div>
                <button onClick={() => onRemoveSell(index)} className="text-xs px-2 py-1 border border-red-500/20 hover:border-red-500 text-red-500 ml-2">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmitSell} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={newSellSellerName} onChange={(e) => setNewSellSellerName(e.target.value)} placeholder="Buyer Name" className="border border-brand-gray/20 rounded-none px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" />
            <input type="text" value={newSellSellerLocation} onChange={(e) => setNewSellSellerLocation(e.target.value)} placeholder="Location (e.g., Delhi)" className="border border-brand-gray/20 rounded-none px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={newSellPrice} onChange={(e) => setNewSellPrice(e.target.value)} placeholder="Price (₹)" className="border border-brand-gray/20 rounded-none px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" required />
            <input type="number" value={newSellCount} onChange={(e) => setNewSellCount(e.target.value)} placeholder="Quantity" className="border border-brand-gray/20 rounded-none px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" required />
          </div>
          <input type="text" value={newSellSellerContact} onChange={(e) => setNewSellSellerContact(e.target.value)} placeholder="WhatsApp Number (e.g., +91 98765 43210)" className="w-full border border-brand-gray/20 rounded-none px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" />
          <input type="text" value={newSellSource} onChange={(e) => setNewSellSource(e.target.value)} placeholder="Group/Source (optional)" className="w-full border border-brand-gray/20 rounded-none px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" />
          <button type="submit" className="w-full px-4 py-2 rounded-none border border-red-600 bg-red-600 text-white text-xs font-body hover:bg-red-700">Add Buyer</button>
          {sellSaveSuccess && (
            <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded-none">
              <p className="text-xs font-semibold text-green-700">✓ Buyer added successfully</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

// Marketplace Price Section with marketplace selector
interface MarketplacePriceSectionProps {
  title: string;
  description: string;
  pricePoints: PricePoint[];
  onAdd: (price: number, listingCount: number, source: string | undefined, marketplaceName?: string, url?: string) => void;
  onRemove: (index: number) => void;
}

const MarketplacePriceSection: React.FC<MarketplacePriceSectionProps> = ({
  title,
  description,
  pricePoints,
  onAdd,
  onRemove,
}) => {
  const [newPrice, setNewPrice] = useState("");
  const [newCount, setNewCount] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [selectedMarketplace, setSelectedMarketplace] = useState("crepdogcrew");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const marketplaceOptions = [
    { value: 'crepdogcrew', label: 'CrepdogCrew' },
    { value: 'mainstreet', label: 'Mainstreet Marketplace' },
    { value: 'culturecircle', label: 'Culture Circle' },
    { value: 'hypefly', label: 'Hypefly' },
    { value: 'dawntown', label: 'Dawntown' },
    { value: '10hillsstudio', label: '10 Hills Studio' },
    { value: 'findyourkicks', label: 'Find your Kicks' },
    { value: 'instagram', label: 'Instagram Seller' },
    { value: 'facebook', label: 'Facebook Marketplace' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newPrice);
    const count = parseInt(newCount);
    if (isNaN(price) || price <= 0 || isNaN(count) || count <= 0) {
      alert("Please enter valid price and count");
      return;
    }
    const selected = marketplaceOptions.find(opt => opt.value === selectedMarketplace);
    onAdd(price, count, selectedMarketplace, selected?.label, newUrl.trim() || undefined);
    setNewPrice("");
    setNewCount("");
    setNewUrl("");
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="border border-brand-gray/20 p-4 bg-brand-white" style={{ borderRadius: '0px' }}>
      <div className="mb-3">
        <h3 className="text-xs font-body font-normal text-brand-black mb-1">{title}</h3>
        <p className="text-xs text-brand-black">{description}</p>
      </div>

      {/* Current Price Points - Top 5 cheapest */}
      {pricePoints.length > 0 && (
        <div className="space-y-2 mb-4">
          {pricePoints.sort((a, b) => a.price - b.price).slice(0, 5).map((point, index) => (
            <div key={index} className="flex items-center justify-between border border-brand-gray/20 p-2 bg-brand-gray/5" style={{ borderRadius: '0px' }}>
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xs font-semibold text-brand-black/60 w-6">#{index + 1}</span>
                <span className="text-xs font-medium text-brand-black">₹{point.price.toLocaleString("en-IN")}</span>
                <span className="text-xs text-brand-black">{point.listingCount} listings</span>
                <span className="text-xs px-2 py-0.5 bg-brand-gray/20 text-brand-black uppercase">
                  {point.marketplaceName || point.source || 'Marketplace'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {point.url && (
                  <a
                    href={point.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 border border-brand-black/20 hover:border-brand-black hover:bg-brand-black hover:text-brand-white text-brand-black transition"
                    style={{ borderRadius: '0px' }}
                  >
                    View →
                  </a>
                )}
                <button 
                  onClick={() => onRemove(index)} 
                  className="text-xs px-2 py-1 border border-red-500/20 hover:border-red-500 text-red-500"
                  style={{ borderRadius: '0px' }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {pricePoints.length > 5 && (
            <p className="text-xs text-brand-black/50 text-center">Showing top 5 cheapest. {pricePoints.length - 5} more listings available.</p>
          )}
        </div>
      )}

      {/* Add New Price Point */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="Price (₹)" className="flex-1 border border-brand-gray/20 px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" style={{ borderRadius: '0px' }} required />
          <input type="number" value={newCount} onChange={(e) => setNewCount(e.target.value)} placeholder="Listings" className="w-24 border border-brand-gray/20 px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" style={{ borderRadius: '0px' }} required />
        </div>
        <select value={selectedMarketplace} onChange={(e) => setSelectedMarketplace(e.target.value)} className="w-full border border-brand-gray/20 px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" style={{ borderRadius: '0px' }}>
          {marketplaceOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <input 
          type="url" 
          value={newUrl} 
          onChange={(e) => setNewUrl(e.target.value)} 
          placeholder="Listing URL (optional)" 
          className="w-full border border-brand-gray/20 px-3 py-2 text-xs font-body text-brand-black focus:outline-none focus:border-brand-black" 
          style={{ borderRadius: '0px' }}
        />
        <button type="submit" className="w-full px-4 py-2 border border-brand-black bg-brand-black text-white text-xs font-body hover:bg-brand-black/90" style={{ borderRadius: '0px' }}>
          Add Listing
        </button>
        {saveSuccess && (
          <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30" style={{ borderRadius: '0px' }}>
            <p className="text-xs font-semibold text-green-700">✓ Listing added successfully</p>
          </div>
        )}
      </form>
    </div>
  );
};

// Bulk Listing Modal Component
interface BulkListingModalProps {
  selectedSize: string | null;
  channel: "whatsapp" | "marketplace" | "international";
  onAddListings: (listings: Partial<PricePoint>[]) => Promise<void>;
  onClose: () => void;
}

const BulkListingModal: React.FC<BulkListingModalProps> = ({
  selectedSize,
  channel,
  onAddListings,
  onClose,
}) => {
  const [bulkInput, setBulkInput] = useState("");
  const [parsedListings, setParsedListings] = useState<Partial<PricePoint>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  // Load exchange rate for international listings
  useEffect(() => {
    if (channel === "international") {
      getUSDToINRRate().then(rate => setExchangeRate(rate)).catch(console.error);
    }
  }, [channel]);

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const parseBulkInput = (inputText?: string) => {
    const textToParse = inputText || bulkInput;
    const lines = textToParse.split('\n').filter(line => line.trim().length > 0);
    const listings: Partial<PricePoint>[] = [];
    const parseErrors: string[] = [];

    // Check if first line is a header
    let startIndex = 0;
    if (lines.length > 0) {
      const firstLine = lines[0].toLowerCase();
      if (firstLine.includes('price') || firstLine.includes('channel') || firstLine.includes('size')) {
        startIndex = 1;
      }
    }

    lines.slice(startIndex).forEach((line, index) => {
      const lineNum = index + startIndex + 1;
      const trimmed = line.trim();
      
      if (!trimmed) return;
      
      const parts = parseCSVLine(trimmed);
      
      try {
        if (channel === "whatsapp") {
          // Format: Size, Transaction Type, Price (₹), Listings, Seller Name, Location, Contact, Source
          if (parts.length < 4) {
            parseErrors.push(`Line ${lineNum}: Insufficient data. Need at least: Size, Transaction Type, Price, Listings`);
            return;
          }
          
          const size = (parts[0] || (selectedSize ?? "")).trim();
          const transactionType = (parts[1] || "").trim().toLowerCase();
          const price = parseFloat((parts[2] || "").replace(/,/g, ''));
          const listingCount = parseInt((parts[3] || "").replace(/,/g, ''));
          const sellerName = (parts[4] || "").trim();
          const sellerLocation = (parts[5] || "").trim();
          const sellerContact = (parts[6] || "").trim();
          const source = (parts[7] || "whatsapp-group").trim();

          if (!size) {
            parseErrors.push(`Line ${lineNum}: Size is required`);
            return;
          }
          if (isNaN(price) || price <= 0) {
            parseErrors.push(`Line ${lineNum}: Invalid price`);
            return;
          }
          if (isNaN(listingCount) || listingCount <= 0) {
            parseErrors.push(`Line ${lineNum}: Invalid listing count`);
            return;
          }
          if (transactionType !== "buy" && transactionType !== "sell") {
            parseErrors.push(`Line ${lineNum}: Transaction type must be "buy" or "sell"`);
            return;
          }

          listings.push({
            channel: "whatsapp",
            transactionType: transactionType as "buy" | "sell",
            price,
            listingCount,
            size: size,
            sellerName: sellerName || undefined,
            sellerLocation: sellerLocation || undefined,
            sellerContact: sellerContact || undefined,
            source: source || undefined,
            lastSeen: new Date(),
          });
        } else if (channel === "marketplace") {
          // Format: Size, Price (₹), Listings, Marketplace, URL
          if (parts.length < 3) {
            parseErrors.push(`Line ${lineNum}: Insufficient data. Need at least: Size, Price, Listings`);
            return;
          }
          
          const size = (parts[0] || (selectedSize ?? "")).trim();
          const price = parseFloat((parts[1] || "").replace(/,/g, ''));
          const listingCount = parseInt((parts[2] || "").replace(/,/g, ''));
          const marketplaceName = (parts[3] || "").trim();
          const url = (parts[4] || "").trim();

          if (!size) {
            parseErrors.push(`Line ${lineNum}: Size is required`);
            return;
          }
          if (isNaN(price) || price <= 0) {
            parseErrors.push(`Line ${lineNum}: Invalid price`);
            return;
          }
          if (isNaN(listingCount) || listingCount <= 0) {
            parseErrors.push(`Line ${lineNum}: Invalid listing count`);
            return;
          }

          listings.push({
            channel: "marketplace",
            price,
            listingCount,
            size: size,
            marketplaceName: marketplaceName || undefined,
            url: url || undefined,
            source: "marketplace",
            lastSeen: new Date(),
          });
        } else {
          // Format: Size, Price ($), Listings, Platform, Reshipping (₹), URL
          if (parts.length < 3) {
            parseErrors.push(`Line ${lineNum}: Insufficient data. Need at least: Size, Price, Listings`);
            return;
          }
          
          const size = (parts[0] || (selectedSize ?? "")).trim();
          const priceUSD = parseFloat((parts[1] || "").replace(/,/g, ''));
          const listingCount = parseInt((parts[2] || "").replace(/,/g, ''));
          const platform = (parts[3] || "stockx").trim();
          const reshippingCost = parts[4] ? parseFloat((parts[4] || "").replace(/,/g, '')) : undefined;
          const url = (parts[5] || "").trim();

          if (isNaN(priceUSD) || priceUSD <= 0) {
            parseErrors.push(`Line ${lineNum}: Invalid price`);
            return;
          }
          if (isNaN(listingCount) || listingCount <= 0) {
            parseErrors.push(`Line ${lineNum}: Invalid listing count`);
            return;
          }

          // Convert USD to INR
          const rate = exchangeRate || 83;
          const priceINR = priceUSD * rate;

          if (!size) {
            parseErrors.push(`Line ${lineNum}: Size is required`);
            return;
          }

          listings.push({
            channel: "international",
            price: priceINR,
            listingCount,
            size: size,
            marketplaceName: platform || undefined,
            source: platform || "stockx",
            reshippingCost: reshippingCost || undefined,
            url: url || undefined,
            lastSeen: new Date(),
          });
        }
      } catch (error) {
        parseErrors.push(`Line ${lineNum}: Parse error - ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    setParsedListings(listings);
    setErrors(parseErrors);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBulkInput(text);
      parseBulkInput(text);
    };
    reader.onerror = () => {
      alert("Failed to read file. Please try again.");
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (parsedListings.length === 0) {
      alert("Please parse the input first to validate the data.");
      return;
    }

    if (errors.length > 0) {
      const proceed = confirm(
        `There are ${errors.length} error(s) in the input. Do you want to proceed with the valid listings only?`
      );
      if (!proceed) return;
    }

    setIsAdding(true);
    try {
      await onAddListings(parsedListings);
      alert(`Successfully added ${parsedListings.length} listing(s)`);
      setBulkInput("");
      setParsedListings([]);
      setErrors([]);
    } catch (error) {
      console.error("Failed to add listings:", error);
      alert("Failed to add some listings. Please check the console for details.");
    } finally {
      setIsAdding(false);
    }
  };

  const getFormatDescription = () => {
    if (channel === "whatsapp") {
      return "Format: Size, Transaction Type, Price (₹), Listings, Seller Name, Location, Contact, Source\nExample: UK 9, buy, 12000, 2, John Doe, Delhi, +91 98765 43210, whatsapp-group-mumbai\nNote: Size is required. You can import listings for multiple sizes in one batch.";
    } else if (channel === "marketplace") {
      return "Format: Size, Price (₹), Listings, Marketplace, URL\nExample: UK 9, 13000, 3, CrepdogCrew, https://example.com/listing\nNote: Size is required. You can import listings for multiple sizes in one batch.";
    } else {
      return "Format: Size, Price ($), Listings, Platform, Reshipping (₹), URL\nExample: UK 9, 150, 5, stockx, 2000, https://stockx.com/...\nNote: Size is required. You can import listings for multiple sizes in one batch.";
    }
  };

  const getPlaceholder = () => {
    if (channel === "whatsapp") {
      return "Size, Transaction Type, Price (₹), Listings, Seller Name, Location, Contact, Source\nUK 9, buy, 12000, 2, John Doe, Delhi, +91 98765 43210, whatsapp-group-mumbai\nUK 10, sell, 12500, 1, Jane Smith, Mumbai, +91 98765 43211, whatsapp-group-delhi";
    } else if (channel === "marketplace") {
      return "Size, Price (₹), Listings, Marketplace, URL\nUK 9, 13000, 3, CrepdogCrew, https://example.com/listing\nUK 10, 13500, 2, Mainstreet, https://example.com/listing2";
    } else {
      return "Size, Price ($), Listings, Platform, Reshipping (₹), URL\nUK 9, 150, 5, stockx, 2000, https://stockx.com/...\nUK 10, 160, 3, goat, 2000, https://goat.com/...";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start md:items-center justify-center overflow-y-auto p-3">
      <div className="relative w-full md:max-w-4xl max-h-[90vh] overflow-y-auto bg-brand-white border border-brand-gray/30 shadow-2xl" style={{ borderRadius: '0px' }}>
        <div className="sticky top-0 z-10 flex justify-between items-center px-3 py-2 bg-brand-white border-b border-brand-gray/30">
          <h2 className="text-base font-heading font-normal text-brand-black uppercase tracking-wide leading-tight">
            Bulk Add Listings - {channel === "whatsapp" ? "WhatsApp" : channel === "marketplace" ? "Marketplace" : "International"}
          </h2>
          <button
            onClick={onClose}
            className="text-brand-black hover:text-brand-black text-base px-2 py-1 leading-tight"
          >
            ✕
          </button>
        </div>
        <div className="p-3 md:p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                Upload CSV or Enter Data
              </label>
              <p className="text-[10px] text-brand-black/60 mb-2 leading-tight whitespace-pre-line">
                {getFormatDescription()}
              </p>
              
              <div className="mb-3">
                <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                  Upload CSV File
                </label>
                <div className="flex items-center gap-2">
                  <label className="px-2.5 py-1 border border-brand-black bg-brand-white text-brand-black text-[10px] font-semibold uppercase tracking-wide hover:bg-brand-black hover:text-white transition cursor-pointer leading-tight" style={{ borderRadius: '0px' }}>
                    Choose File
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {fileName && (
                    <span className="text-[10px] text-brand-black/60 leading-tight">
                      {fileName}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                  Or Paste Data
                </label>
                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  className="w-full border border-brand-gray/30 px-2 py-1.5 text-xs font-mono font-medium text-brand-black focus:outline-none focus:border-brand-black resize-none leading-tight"
                  placeholder={getPlaceholder()}
                  rows={10}
                  style={{ borderRadius: '0px' }}
                />
                <button
                  type="button"
                  onClick={() => parseBulkInput()}
                  className="mt-1.5 px-2.5 py-1 border border-brand-gray/30 bg-brand-white text-brand-black text-xs font-semibold uppercase tracking-wide hover:bg-brand-gray/10 transition leading-tight"
                  style={{ borderRadius: '0px' }}
                >
                  Parse & Validate
                </button>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="border border-red-500/30 bg-red-500/5 p-2.5" style={{ borderRadius: '0px' }}>
                <h3 className="text-[10px] font-semibold text-red-700 mb-1.5 uppercase leading-tight">Errors <span className="font-mono-numeric">({errors.length})</span></h3>
                <ul className="space-y-0.5">
                  {errors.map((error, index) => (
                    <li key={index} className="text-[10px] text-red-600 leading-tight">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {parsedListings.length > 0 && (
              <div className="border border-brand-gray/30 p-2.5" style={{ borderRadius: '0px' }}>
                <h3 className="text-xs font-semibold text-brand-black mb-2 uppercase tracking-wide leading-tight">
                  Preview <span className="font-mono-numeric">({parsedListings.length})</span> listing{parsedListings.length !== 1 ? 's' : ''} ready
                </h3>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {parsedListings.map((listing, index) => (
                    <div 
                      key={index} 
                      className="border border-brand-gray/20 bg-brand-gray/5 p-2"
                      style={{ borderRadius: '0px' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-brand-black leading-tight">
                            {listing.size || selectedSize} • ₹{listing.price?.toLocaleString('en-IN')} • {listing.listingCount} listing{listing.listingCount !== 1 ? 's' : ''}
                          </p>
                          {listing.channel === "whatsapp" && (
                            <p className="text-[10px] text-brand-black/60 leading-tight">
                              {listing.transactionType} • {listing.sellerName || 'No seller'} • {listing.sellerLocation || 'No location'}
                            </p>
                          )}
                          {listing.channel === "marketplace" && (
                            <p className="text-[10px] text-brand-black/60 leading-tight">
                              {listing.marketplaceName || 'No marketplace'}
                            </p>
                          )}
                          {listing.channel === "international" && (
                            <p className="text-[10px] text-brand-black/60 leading-tight">
                              {listing.marketplaceName || 'No platform'} • Reshipping: {listing.reshippingCost ? `₹${listing.reshippingCost.toLocaleString('en-IN')}` : 'None'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-3 border-t border-brand-gray/20">
              <button
                type="submit"
                disabled={parsedListings.length === 0 || isAdding}
                className="px-3 py-1.5 border border-brand-black bg-brand-black text-brand-white text-xs font-semibold uppercase tracking-wide hover:bg-brand-black/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 leading-tight"
                style={{ borderRadius: '0px' }}
              >
                {isAdding ? (
                  <>
                    <div className="animate-spin rounded-full h-2.5 w-2.5 border-2 border-white border-t-transparent"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    Add {parsedListings.length > 0 ? <span className="font-mono-numeric">{parsedListings.length}</span> : ''} Listing{parsedListings.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isAdding}
                className="px-3 py-1.5 border border-brand-gray/30 text-brand-black text-xs font-semibold uppercase tracking-wide hover:bg-brand-gray/10 transition disabled:opacity-50 disabled:cursor-not-allowed leading-tight"
                style={{ borderRadius: '0px' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

