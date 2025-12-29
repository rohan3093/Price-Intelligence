import React, { useState, useEffect } from "react";
import { Asset, SizeVariant, PricePoint } from "../types";
import { SizeSelector } from "./SizeSelector";
import { PriceHistoryChart } from "./PriceHistoryChart";

interface AssetDetailPanelProps {
  asset: Asset | undefined;
  watchlisted?: boolean;
  onToggleWatchlist?: () => void;
}

export const AssetDetailPanel: React.FC<AssetDetailPanelProps> = ({
  asset,
  watchlisted = false,
  onToggleWatchlist,
}) => {
  const [selectedSize, setSelectedSize] = useState<string>("");

  // Initialize selected size when asset changes
  useEffect(() => {
    if (asset) {
      if (asset.sizes && asset.sizes.length > 0) {
        // Use default size or first available size
        setSelectedSize(asset.defaultSize || asset.sizes[0].size);
      } else {
        // Fallback to legacy size field
        setSelectedSize(asset.size || "");
      }
    }
  }, [asset]);

  if (!asset) {
    return (
      <section className="p-4 md:p-6 flex items-center justify-center text-xs text-brand-black">
        Select an asset from the middle column to view details.
      </section>
    );
  }

  // Get the selected size variant or use legacy fields
  const sizeVariant: SizeVariant | null = asset.sizes?.find(s => s.size === selectedSize) || null;
  
  // Use size-specific data if available, otherwise fall back to legacy/asset-level data
  const currentData = sizeVariant || {
    size: selectedSize || asset.size || "",
    b2bMarketPrice: asset.b2bMarketPrice || asset.b2bRange || "N/A",
    endCustomerMarketPrice: asset.endCustomerMarketPrice || asset.b2cRange || "N/A",
    stockxGoatPrice: asset.stockxGoatPrice || asset.globalRange || "N/A",
    fairRange: asset.fairRange || "N/A",
    confidence: asset.confidence || 0,
    change30d: asset.change30d || "N/A",
    change90d: asset.change90d || "N/A",
    liquidity: asset.liquidity || "N/A",
    volumeLabel: asset.volumeLabel || "N/A",
    pricePoints: asset.pricePoints,
    legacyPricePoints: undefined,
    insight: asset.insight,
    bestAvailablePrice: asset.bestAvailablePrice,
    lastUpdated: asset.lastUpdated,
    dataPoints: asset.dataPoints,
  };

  // Helper functions to extract prices from channel-based structure
  const getWhatsAppPrices = () => {
    let pricePoints: PricePoint[] = [];
    if (sizeVariant?.pricePoints) {
      pricePoints = ('whatsapp' in sizeVariant.pricePoints ? sizeVariant.pricePoints.whatsapp : []) as PricePoint[];
    } else if (sizeVariant?.legacyPricePoints) {
      pricePoints = sizeVariant.legacyPricePoints.b2b || [];
    } else if (asset.pricePoints) {
      pricePoints = ('whatsapp' in asset.pricePoints ? asset.pricePoints.whatsapp : asset.pricePoints.b2b || []) as PricePoint[];
    }
    const buyPrices = pricePoints.filter((p: PricePoint) => !p.transactionType || p.transactionType === 'buy' || p.transactionType === 'both');
    const sellPrices = pricePoints.filter((p: PricePoint) => p.transactionType === 'sell' || p.transactionType === 'both');
    return {
      buy: buyPrices.sort((a: PricePoint, b: PricePoint) => a.price - b.price),
      sell: sellPrices.sort((a: PricePoint, b: PricePoint) => b.price - a.price),
      all: pricePoints
    };
  };

  const getMarketplacePrices = () => {
    let pricePoints: PricePoint[] = [];
    if (sizeVariant?.pricePoints) {
      pricePoints = ('marketplace' in sizeVariant.pricePoints ? sizeVariant.pricePoints.marketplace : []) as PricePoint[];
    } else if (sizeVariant?.legacyPricePoints) {
      pricePoints = sizeVariant.legacyPricePoints.endCustomer || [];
    } else if (asset.pricePoints) {
      pricePoints = ('marketplace' in asset.pricePoints ? asset.pricePoints.marketplace : asset.pricePoints.endCustomer || []) as PricePoint[];
    }
    return pricePoints.sort((a: PricePoint, b: PricePoint) => a.price - b.price);
  };

  const getInternationalPrices = () => {
    let pricePoints: PricePoint[] = [];
    if (sizeVariant?.pricePoints) {
      pricePoints = ('international' in sizeVariant.pricePoints ? sizeVariant.pricePoints.international : []) as PricePoint[];
    } else if (sizeVariant?.legacyPricePoints) {
      pricePoints = sizeVariant.legacyPricePoints.stockxGoat || [];
    } else if (asset.pricePoints) {
      pricePoints = ('international' in asset.pricePoints ? asset.pricePoints.international : asset.pricePoints.stockxGoat || []) as PricePoint[];
    }
    return pricePoints.sort((a: PricePoint, b: PricePoint) => a.price - b.price);
  };

  const whatsappPrices = getWhatsAppPrices();
  const marketplacePrices = getMarketplacePrices();
  const internationalPrices = getInternationalPrices();

  // Calculate best available price (lowest price across all channels)
  // For international prices, use total landed cost (platform price + reshipping cost)
  const calculateBestPrice = () => {
    // Use pre-calculated value if available
    if (currentData.bestAvailablePrice) {
      return currentData.bestAvailablePrice;
    }

    // Collect all prices from all channels
    const allPrices: number[] = [];

    // WhatsApp buy prices
    if (whatsappPrices.buy.length > 0) {
      allPrices.push(...whatsappPrices.buy.map(p => p.price));
    }

    // Indian marketplace prices
    if (marketplacePrices.length > 0) {
      allPrices.push(...marketplacePrices.map(p => p.price));
    }

    // International prices (use total landed cost)
    if (internationalPrices.length > 0) {
      allPrices.push(...internationalPrices.map(p => p.price + (p.reshippingCost || 0)));
    }

    // Return the minimum price if any prices exist
    return allPrices.length > 0 ? Math.min(...allPrices) : undefined;
  };

  const bestPrice = calculateBestPrice();


  const anchor = asset.priceAnchors;
  // Use retail India as the anchor for spread calculation (most relevant for Indian market)
  const anchorTarget = anchor?.retailIndia;
  const spread =
    bestPrice && anchorTarget
      ? ((bestPrice - anchorTarget) / anchorTarget) * 100
      : undefined;

  return (
    <section className="p-6 md:p-8 space-y-6 text-brand-black bg-brand-white">
      {/* Professional Header with Large Image */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-brand-gray/30 pb-6">
        {/* Large Image */}
        <div className="md:col-span-1">
          <div className="aspect-square w-full max-w-xs bg-brand-gray/5 border border-brand-gray/20 flex items-center justify-center" style={{ borderRadius: '0px' }}>
            <img
              src={asset.image}
              alt={asset.name}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>
        
        {/* Asset Info */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-heading font-normal text-brand-black mb-2">
                {asset.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-brand-black/70 mb-4">
                <span>{asset.brand}</span>
                <span>·</span>
                <span>SKU {asset.sku}</span>
                {selectedSize && (
                  <>
                    <span>·</span>
                    <span className="font-medium text-brand-black">{selectedSize}</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onToggleWatchlist}
              className={`px-4 py-2 rounded-none border text-sm whitespace-nowrap ${
                watchlisted
                  ? "border-brand-black bg-brand-black text-brand-white"
                  : "border-brand-gray/30 text-brand-black hover:bg-brand-gray/10"
              }`}
            >
              {watchlisted ? "★ Watchlist" : "☆ Add"}
            </button>
          </div>

          {/* Key Metrics Bar */}
          <div className="pt-4 border-t border-brand-gray/20 space-y-4">
            {/* Primary Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">Best Price</p>
                <p className="text-xl font-semibold text-brand-black">
                  {bestPrice ? `₹${bestPrice.toLocaleString("en-IN")}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">Retail (India)</p>
                <p className="text-xl font-semibold text-brand-black">
                  {anchor?.retailIndia ? `₹${anchor.retailIndia.toLocaleString("en-IN")}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">Retail (Global)</p>
                <p className="text-xl font-semibold text-brand-black">
                  {anchor?.retailGlobal ? `₹${anchor.retailGlobal.toLocaleString("en-IN")}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">30d Change</p>
                <p
                  className={`text-xl font-semibold ${
                    currentData.change30d?.startsWith("-")
                      ? "text-red-600"
                      : currentData.change30d?.startsWith("+")
                      ? "text-green-600"
                      : "text-brand-black"
                  }`}
                >
                  {currentData.change30d || "—"}
                </p>
              </div>
            </div>
            {/* Secondary Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">Liquidity</p>
                <p className="text-lg font-semibold text-brand-black">{currentData.liquidity || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">Confidence</p>
                <p className="text-lg font-semibold text-brand-black">{currentData.confidence}/100</p>
              </div>
              <div>
                <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">90d Change</p>
                <p
                  className={`text-lg font-semibold ${
                    currentData.change90d?.startsWith("-")
                      ? "text-red-600"
                      : currentData.change90d?.startsWith("+")
                      ? "text-green-600"
                      : "text-brand-black"
                  }`}
                >
                  {currentData.change90d || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">Volatility</p>
                <p className="text-lg font-semibold text-brand-black capitalize">{asset.volatility || "—"}</p>
              </div>
            </div>
          </div>

          {/* Recommendation Badge */}
          {currentData.insight?.recommendation && (
            <div className="pt-4 border-t border-brand-gray/20">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1.5 rounded-none text-sm font-semibold ${
                    currentData.insight.recommendation === "buy"
                      ? "bg-green-500/10 text-green-700 border border-green-500/30"
                      : currentData.insight.recommendation === "sell"
                      ? "bg-red-500/10 text-red-700 border border-red-500/30"
                      : "bg-brand-gray/10 text-brand-black border border-brand-gray/30"
                  }`}
                >
                  {currentData.insight.recommendation.toUpperCase()}
                </span>
                {spread !== undefined && (
                  <span
                    className={`text-sm font-medium ${
                      spread > 0 ? "text-red-600" : spread < 0 ? "text-green-600" : "text-brand-black"
                    }`}
                  >
                    {spread > 0 ? "+" : ""}
                    {spread.toFixed(1)}% vs retail
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Size Selector */}
      {asset.sizes && asset.sizes.length > 0 && (
        <SizeSelector
          asset={asset}
          selectedSize={selectedSize}
          onSizeChange={setSelectedSize}
        />
      )}

      {/* Price History Chart */}
      <PriceHistoryChart
        pricePoints={sizeVariant?.pricePoints || sizeVariant?.legacyPricePoints || asset.pricePoints}
        historical30d={anchor?.historical30d}
        historical90d={anchor?.historical90d}
        bestAvailablePrice={currentData.bestAvailablePrice}
        size={selectedSize}
      />

      {/* Market Channels Comparison Summary */}
      <div className="border border-brand-gray/30 rounded-none p-5 bg-brand-white" style={{ borderRadius: '0px' }}>
        <div className="mb-4 pb-3 border-b border-brand-gray/20">
          <h3 className="text-sm font-semibold text-brand-black uppercase tracking-wide">
            Market Comparison Summary
          </h3>
          <p className="text-xs text-brand-black/50 mt-1">
            Side-by-side comparison across all channels
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* WhatsApp Summary */}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-2">WhatsApp & Reseller Networks</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-brand-black/50 mb-1">Best Buy Price</p>
                  <p className="text-lg font-semibold text-green-600">
                    {whatsappPrices.buy.length > 0 
                      ? `₹${whatsappPrices.buy[0].price.toLocaleString('en-IN')}` 
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-brand-black/50 mb-1">Average Price</p>
                  <p className="text-sm font-semibold text-brand-black">
                    {whatsappPrices.buy.length > 0 
                      ? `₹${Math.round(whatsappPrices.buy.reduce((sum: number, p: PricePoint) => sum + p.price, 0) / whatsappPrices.buy.length).toLocaleString('en-IN')}` 
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-brand-black/50 mb-1">Total Listings</p>
                  <p className="text-sm font-semibold text-brand-black">
                    {whatsappPrices.buy.reduce((sum: number, p: PricePoint) => sum + p.listingCount, 0)} listings
                  </p>
                </div>
                <div>
                  <p className="text-xs text-brand-black/50 mb-1">Total Sellers</p>
                  <p className="text-sm font-semibold text-brand-black">
                    {whatsappPrices.buy.length} {whatsappPrices.buy.length === 1 ? 'seller' : 'sellers'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-brand-black/50 mb-1">Total Quantity</p>
                  <p className="text-sm font-semibold text-brand-black">
                    {whatsappPrices.buy.reduce((sum: number, p: PricePoint) => sum + p.listingCount, 0)} pairs
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Indian Marketplaces Summary */}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-2">Indian Marketplaces</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-brand-black/50 mb-1">Cheapest Listing</p>
                  <p className="text-lg font-semibold text-green-600">
                    {marketplacePrices.length > 0 
                      ? `₹${marketplacePrices[0].price.toLocaleString('en-IN')}` 
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-brand-black/50 mb-1">Average Price</p>
                  <p className="text-sm font-semibold text-brand-black">
                    {marketplacePrices.length > 0 
                      ? `₹${Math.round(marketplacePrices.reduce((sum: number, p: PricePoint) => sum + p.price, 0) / marketplacePrices.length).toLocaleString('en-IN')}` 
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-brand-black/50 mb-1">Total Listings</p>
                  <p className="text-sm font-semibold text-brand-black">
                    {marketplacePrices.reduce((sum: number, p: PricePoint) => sum + p.listingCount, 0)} listings
                  </p>
                </div>
                <div>
                  <p className="text-xs text-brand-black/50 mb-1">Top 5 Average</p>
                  <p className="text-sm font-semibold text-brand-black">
                    {marketplacePrices.length > 0 
                      ? `₹${Math.round(marketplacePrices.slice(0, 5).reduce((sum: number, p: PricePoint) => sum + p.price, 0) / Math.min(5, marketplacePrices.length)).toLocaleString('en-IN')}` 
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* International Platforms Summary */}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-2">International Platforms</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-brand-black/50 mb-1">Cheapest Total Landed</p>
                  <p className="text-lg font-semibold text-green-600">
                    {internationalPrices.length > 0 
                      ? `₹${Math.min(...internationalPrices.map(p => p.price + (p.reshippingCost || 0))).toLocaleString('en-IN')}` 
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-brand-black/50 mb-1">Average Total Landed</p>
                  <p className="text-sm font-semibold text-brand-black">
                    {internationalPrices.length > 0 
                      ? `₹${Math.round(internationalPrices.reduce((sum: number, p: PricePoint) => sum + (p.price + (p.reshippingCost || 0)), 0) / internationalPrices.length).toLocaleString('en-IN')}` 
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-brand-black/50 mb-1">Total Listings</p>
                  <p className="text-sm font-semibold text-brand-black">
                    {internationalPrices.reduce((sum: number, p: PricePoint) => sum + p.listingCount, 0)} listings
                  </p>
                </div>
                <div>
                  <p className="text-xs text-brand-black/50 mb-1">Avg Platform Price</p>
                  <p className="text-sm font-semibold text-brand-black">
                    {internationalPrices.length > 0 
                      ? `₹${Math.round(internationalPrices.reduce((sum: number, p: PricePoint) => sum + p.price, 0) / internationalPrices.length).toLocaleString('en-IN')}` 
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Channels - Channel-Based Structure */}
      <div className="px-2 md:px-4 -mx-6 md:-mx-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* WhatsApp Groups & Reseller Networks */}
        <div className="border border-brand-gray/30 rounded-none p-5 bg-brand-white" style={{ borderRadius: '0px' }}>
          <div className="mb-4 pb-3 border-b border-brand-gray/20">
            <h3 className="text-sm font-semibold text-brand-black uppercase tracking-wide">
              WhatsApp & Reseller Networks
            </h3>
            <p className="text-xs text-brand-black/50 mt-1">
              Mixed B2B/B2C transactions • Fast liquidity
            </p>
          </div>
          
          <div className="space-y-4">
            {/* Buy Side - Individual Seller Listings */}
            <div>
              <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-3">
                Buy From (Sellers)
              </p>
              {whatsappPrices.buy.length > 0 ? (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {whatsappPrices.buy.map((point: PricePoint, idx: number) => (
                    <div key={idx} className="p-5 bg-brand-white border border-brand-gray/20 hover:border-brand-gray/40 transition" style={{ borderRadius: '0px' }}>
                      {/* Top Row: Seller Info */}
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-brand-black mb-1.5">
                          {point.sellerName || point.source || 'Seller'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-brand-black/60">
                          {point.sellerLocation && (
                            <>
                              <span>{point.sellerLocation}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>Qty: {point.listingCount}</span>
                        </div>
                      </div>
                      
                      {/* Bottom Row: Price and Action */}
                      <div className="pt-4 border-t border-brand-gray/20 space-y-3">
                        <div>
                          <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1.5">Price</p>
                          <p className="text-lg font-semibold text-green-600">
                            ₹{point.price.toLocaleString('en-IN')}
                          </p>
                        </div>
                        {point.sellerContact && (
                          <a
                            href={`https://wa.me/${point.sellerContact.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center px-4 py-2.5 bg-green-600 text-white text-xs font-semibold uppercase tracking-wide hover:bg-green-700 transition"
                            style={{ borderRadius: '0px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-brand-black/50 py-4 text-center">No sellers available</p>
              )}
            </div>
            
            {/* Summary Stats */}
            {whatsappPrices.buy.length > 0 && (
              <div className="pt-3 border-t border-brand-gray/20">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-brand-black/60 uppercase tracking-wide mb-1">Total Sellers</p>
                    <p className="font-semibold text-brand-black">
                      {whatsappPrices.buy.length} {whatsappPrices.buy.length === 1 ? 'seller' : 'sellers'}
                    </p>
                  </div>
                  <div>
                    <p className="text-brand-black/60 uppercase tracking-wide mb-1">Total Quantity</p>
                    <p className="font-semibold text-brand-black">
                      {whatsappPrices.buy.reduce((sum: number, p: PricePoint) => sum + p.listingCount, 0)} pairs
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Indian Marketplaces */}
        <div className="border border-brand-gray/30 rounded-none p-5 bg-brand-white" style={{ borderRadius: '0px' }}>
          <div className="mb-4 pb-3 border-b border-brand-gray/20">
            <h3 className="text-sm font-semibold text-brand-black uppercase tracking-wide">
              Indian Marketplaces
            </h3>
            <p className="text-xs text-brand-black/50 mt-1">
              Top 5 cheapest listings • Transparent pricing
            </p>
          </div>
          
          <div className="space-y-4">
            {/* Top 5 Cheapest Listings */}
            {marketplacePrices.length > 0 ? (
              <div className="space-y-2">
                {marketplacePrices.slice(0, 5).map((point: PricePoint, idx: number) => (
                  <div key={idx} className="p-4 bg-brand-white border border-brand-gray/20 hover:border-brand-gray/40 transition" style={{ borderRadius: '0px' }}>
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-brand-black/60 w-6">
                          #{idx + 1}
                        </span>
                        <p className="text-sm font-semibold text-brand-black">
                          {point.marketplaceName || point.source || 'Marketplace'}
                        </p>
                        {point.url && (
                          <a 
                            href={point.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-brand-black/60 hover:text-brand-black underline flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View →
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-brand-black/60">
                        {point.listingCount} {point.listingCount === 1 ? 'listing' : 'listings'} available
                      </p>
                    </div>
                    
                    <div className="pt-3 border-t border-brand-gray/20">
                      <div>
                        <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">Price</p>
                        <p className="text-lg font-semibold text-green-600">
                          ₹{point.price.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-brand-black/50">No marketplace listings</p>
            )}
            
            {/* Summary */}
            {marketplacePrices.length > 0 && (
              <div className="pt-3 border-t border-brand-gray/20">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-brand-black/60 uppercase tracking-wide mb-1">Cheapest</p>
                    <p className="font-semibold text-brand-black">
                      ₹{marketplacePrices[0].price.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-brand-black/60 uppercase tracking-wide mb-1">Total</p>
                    <p className="font-semibold text-brand-black">
                      {marketplacePrices.reduce((sum: number, p: PricePoint) => sum + p.listingCount, 0)} listings
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* International Platforms */}
        <div className="border border-brand-gray/30 rounded-none p-5 bg-brand-white" style={{ borderRadius: '0px' }}>
          <div className="mb-4 pb-3 border-b border-brand-gray/20">
            <h3 className="text-sm font-semibold text-brand-black uppercase tracking-wide">
              International Platforms
            </h3>
            <p className="text-xs text-brand-black/50 mt-1">
              StockX, Goat, eBay • Authentication included
            </p>
          </div>
          
          <div className="space-y-4">
            {/* Platform Listings */}
            {internationalPrices.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {internationalPrices.map((point: PricePoint, idx: number) => {
                  const reshippingCost = point.reshippingCost || 0;
                  const platformPrice = point.price;
                  const totalLanded = platformPrice + reshippingCost;
                  const displaySize = point.size || selectedSize || '—';
                  
                  return (
                    <div key={idx} className="p-4 bg-brand-white border border-brand-gray/20 hover:border-brand-gray/40 transition" style={{ borderRadius: '0px' }}>
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-semibold text-brand-black">
                            {point.marketplaceName || point.source || 'International'}
                          </p>
                          {point.url && (
                            <a 
                              href={point.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-brand-black/60 hover:text-brand-black underline flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View →
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-brand-black/60">
                          Size: {displaySize} • {point.listingCount} {point.listingCount === 1 ? 'listing' : 'listings'}
                        </p>
                      </div>
                      
                      <div className="pt-3 border-t border-brand-gray/20">
                        <div className="flex flex-wrap gap-x-6 gap-y-3">
                          <div className="flex-shrink-0">
                            <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">Platform Price</p>
                            <p className="text-sm font-semibold text-brand-black whitespace-nowrap">
                              ₹{platformPrice.toLocaleString('en-IN')}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">Reshipping</p>
                            <p className="text-sm font-semibold text-brand-black whitespace-nowrap">
                              {reshippingCost > 0 ? `₹${reshippingCost.toLocaleString('en-IN')}` : '—'}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">Total Landed</p>
                            <p className="text-sm font-semibold text-green-600 whitespace-nowrap">
                              ₹{totalLanded.toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-brand-black/50 py-4 text-center">No international listings</p>
            )}
            
            {/* Summary */}
            {internationalPrices.length > 0 && (
              <div className="pt-4 border-t border-brand-gray/20">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-2">Cheapest Total</p>
                    <p className="text-sm font-semibold text-green-600">
                      ₹{Math.min(...internationalPrices.map(p => p.price + (p.reshippingCost || 0))).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-2">Total Listings</p>
                    <p className="text-sm font-semibold text-brand-black">
                      {internationalPrices.reduce((sum: number, p: PricePoint) => sum + p.listingCount, 0)} listings
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-brand-gray/30 pt-6">
        <div>
          <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-2">30d Change</p>
          <p
            className={`text-2xl font-semibold ${
              currentData.change30d?.startsWith("-")
                ? "text-red-600"
                : currentData.change30d?.startsWith("+")
                ? "text-green-600"
                : "text-brand-black"
            }`}
          >
            {currentData.change30d || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-2">90d Change</p>
          <p
            className={`text-2xl font-semibold ${
              currentData.change90d?.startsWith("-")
                ? "text-red-600"
                : currentData.change90d?.startsWith("+")
                ? "text-green-600"
                : "text-brand-black"
            }`}
          >
            {currentData.change90d || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-2">Volatility</p>
          <p className="text-2xl font-semibold text-brand-black capitalize">{asset.volatility || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-2">Last Updated</p>
          <p className="text-sm font-medium text-brand-black">
            {currentData.lastUpdated 
              ? new Date(currentData.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : "—"}
          </p>
        </div>
      </div>

      {/* Market Insight / Recommendation */}
      {currentData.insight && (
        <div className={`border-l-4 rounded-none p-5 ${
          currentData.insight.recommendation === 'buy' 
            ? 'border-green-600 bg-green-500/5' 
            : currentData.insight.recommendation === 'sell'
            ? 'border-red-600 bg-red-500/5'
            : 'border-brand-gray/30 bg-brand-gray/5'
        }`}>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <p className={`text-base font-semibold ${
                  currentData.insight.recommendation === 'buy' 
                    ? 'text-green-700' 
                    : currentData.insight.recommendation === 'sell'
                    ? 'text-red-700'
                    : 'text-brand-black'
                }`}>
                  {currentData.insight.recommendation.toUpperCase()}
                </p>
                {selectedSize && (
                  <span className="text-xs text-brand-black/60">({selectedSize})</span>
                )}
              </div>
              <p className="text-sm text-brand-black leading-relaxed">{currentData.insight.reasoning}</p>
              {currentData.insight.expectedMovement && (
                <p className="text-xs text-brand-black/70 italic mt-2">
                  {currentData.insight.expectedMovement}
                </p>
              )}
            </div>
            {currentData.bestAvailablePrice && (
              <div className="text-right border-l border-brand-gray/20 pl-4">
                <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">Best Price</p>
                <p className="text-xl font-semibold text-brand-black">
                  ₹{currentData.bestAvailablePrice.toLocaleString('en-IN')}
                </p>
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-brand-gray/20">
            <p className="text-xs text-brand-black/70">
              Confidence: <span className="font-semibold text-brand-black">{currentData.insight.confidence}%</span>
            </p>
          </div>
        </div>
      )}
    </section>
  );
};



export default AssetDetailPanel;

