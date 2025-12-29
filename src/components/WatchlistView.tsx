import React from "react";
import { Asset, PricePoint } from "../types";

interface WatchlistViewProps {
  assets: Asset[];
  watchlistIds: number[];
  onRemoveFromWatchlist: (assetId: number) => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  assets,
  watchlistIds,
  onRemoveFromWatchlist,
}) => {
  const watchlistAssets = assets.filter((asset) => watchlistIds.includes(asset.id));

  return (
    <main className="flex-1 flex flex-col bg-brand-white px-6 py-6 md:px-8 md:py-8 pb-20 md:pb-8 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 pb-6 border-b border-brand-gray/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-normal text-brand-black mb-2">
              Watchlist
            </h1>
            <p className="text-sm text-brand-black/70">
              Track your favorite assets and monitor price movements
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">Total Assets</p>
            <p className="text-2xl font-semibold text-brand-black">
              {watchlistIds.length}
            </p>
          </div>
        </div>
      </div>

      {/* Watchlist Content */}
      {watchlistIds.length === 0 ? (
        <div className="border border-brand-gray/30 p-12 text-center bg-brand-white">
          <p className="text-base font-medium text-brand-black mb-2">
            Your watchlist is empty
          </p>
          <p className="text-sm text-brand-black/70 mb-6">
            Add assets from the market view to track their prices and get alerts
          </p>
          <button
            onClick={() => {
              // Navigate to market view - this would need to be passed as a prop or use navigation
              window.location.hash = "#market";
            }}
            className="px-4 py-2 border border-brand-black bg-brand-black text-brand-white text-sm font-medium hover:bg-brand-black/90 transition"
            style={{ borderRadius: '0px' }}
          >
            Browse Market
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {watchlistAssets.map((asset) => {
            const selectedSize = asset.defaultSize || asset.sizes?.[0]?.size;
            const sizeVariant = asset.sizes?.find((s) => s.size === selectedSize);

            // Get best price
            const b2bFloorFromPoints = (() => {
              const pricePoints = sizeVariant?.pricePoints || sizeVariant?.legacyPricePoints;
              if (!pricePoints) return undefined;
              const whatsapp = ('whatsapp' in pricePoints ? pricePoints.whatsapp : pricePoints.b2b) || [];
              return whatsapp.length > 0 ? whatsapp.reduce(
                (min: number, p: PricePoint) => (p.price < min ? p.price : min),
                Number.POSITIVE_INFINITY
              ) : undefined;
            })();
            const buyPrice =
              sizeVariant?.bestAvailablePrice ||
              (b2bFloorFromPoints !== undefined && isFinite(b2bFloorFromPoints)
                ? b2bFloorFromPoints
                : undefined) ||
              asset.bestAvailablePrice;

            return (
              <div
                key={asset.id}
                className="border border-brand-gray/30 p-5 bg-brand-white hover:border-brand-gray/50 transition"
                style={{ borderRadius: '0px' }}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Asset Info */}
                  <div className="md:col-span-4 flex items-center gap-4">
                    <div className="h-16 w-16 flex-shrink-0 border border-brand-gray/20 overflow-hidden">
                      <img
                        src={asset.image}
                        alt={asset.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-brand-black truncate mb-1">
                        {asset.name}
                      </p>
                      <p className="text-xs text-brand-black/60">
                        {asset.brand} · {asset.sku}
                        {selectedSize && ` · ${selectedSize}`}
                      </p>
                    </div>
                  </div>

                  {/* Best Price */}
                  <div className="md:col-span-2">
                    <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">Best Price</p>
                    <p className="text-lg font-semibold text-brand-black">
                      {buyPrice ? `₹${buyPrice.toLocaleString("en-IN")}` : "—"}
                    </p>
                  </div>

                  {/* Fair Range */}
                  <div className="md:col-span-2">
                    <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">Fair Range</p>
                    <p className="text-sm font-medium text-brand-black">
                      {sizeVariant?.fairRange || asset.fairRange || "—"}
                    </p>
                  </div>

                  {/* 30d Change */}
                  <div className="md:col-span-1">
                    <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">30d</p>
                    <p
                      className={`text-sm font-semibold ${
                        asset.change30d?.startsWith("-")
                          ? "text-red-600"
                          : asset.change30d?.startsWith("+")
                          ? "text-green-600"
                          : "text-brand-black"
                      }`}
                    >
                      {asset.change30d || "—"}
                    </p>
                  </div>

                  {/* Liquidity */}
                  <div className="md:col-span-1">
                    <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">Liquidity</p>
                    <p className="text-sm font-medium text-brand-black">
                      {sizeVariant?.liquidity || asset.liquidity || "—"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="md:col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => onRemoveFromWatchlist(asset.id)}
                      className="px-3 py-1.5 border border-brand-gray/30 bg-brand-white text-xs font-medium text-brand-black hover:border-brand-black hover:bg-brand-black hover:text-brand-white transition-all"
                      style={{ borderRadius: '0px' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
};

