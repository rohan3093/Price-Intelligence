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
    <main className="flex-1 flex flex-col bg-brand-white px-3 py-3 md:px-4 md:py-4 pb-20 md:pb-4 w-full max-w-7xl mx-auto">
      {/* Header - more compact */}
      <div className="mb-3 pb-3 border-b border-brand-gray/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-heading font-normal text-brand-black mb-1 leading-tight">
              Watchlist
            </h1>
            <p className="text-xs text-brand-black/70 leading-tight">
              Track your favorite assets and monitor price movements
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-0.5 leading-tight">Total Assets</p>
            <p className="text-lg font-mono-numeric font-semibold text-brand-black leading-tight">
              {watchlistIds.length}
            </p>
          </div>
        </div>
      </div>

      {/* Watchlist Content */}
      {watchlistIds.length === 0 ? (
        <div className="border border-brand-gray/30 p-8 text-center bg-brand-white">
          <p className="text-sm font-medium text-brand-black mb-1.5 leading-tight">
            Your watchlist is empty
          </p>
          <p className="text-xs text-brand-black/70 mb-4 leading-tight">
            Add assets from the market view to track their prices and get alerts
          </p>
          <button
            onClick={() => {
              // Navigate to market view - this would need to be passed as a prop or use navigation
              window.location.hash = "#market";
            }}
            className="px-3 py-1.5 border border-brand-black bg-brand-black text-brand-white text-xs font-medium hover:bg-brand-black/90 transition leading-tight"
            style={{ borderRadius: '0px' }}
          >
            Browse Market
          </button>
        </div>
      ) : (
        <div className="space-y-2">
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
                className="border border-brand-gray/30 p-2.5 bg-brand-white hover:border-brand-gray/50 transition"
                style={{ borderRadius: '0px' }}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Asset Info - more compact */}
                  <div className="md:col-span-4 flex items-center gap-2.5">
                    <div className="h-12 w-12 flex-shrink-0 border border-brand-gray/20 overflow-hidden">
                      <img
                        src={asset.image}
                        alt={asset.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-brand-black truncate mb-0.5 leading-tight">
                        {asset.name}
                      </p>
                      <p className="text-[10px] text-brand-black/60 leading-tight">
                        {asset.brand} · {asset.sku}
                        {selectedSize && ` · ${selectedSize}`}
                      </p>
                    </div>
                  </div>

                  {/* Best Price - exchange style */}
                  <div className="md:col-span-2">
                    <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-0.5 leading-tight">Best Price</p>
                    <p className="text-sm font-mono-numeric font-semibold text-brand-black leading-tight">
                      {buyPrice ? `₹${buyPrice.toLocaleString("en-IN")}` : "—"}
                    </p>
                  </div>

                  {/* Fair Range */}
                  <div className="md:col-span-2">
                    <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-0.5 leading-tight">Fair Range</p>
                    <p className="text-xs font-mono-numeric font-medium text-brand-black leading-tight">
                      {sizeVariant?.fairRange || asset.fairRange || "—"}
                    </p>
                  </div>

                  {/* 30d Change - exchange style */}
                  <div className="md:col-span-1">
                    <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-0.5 leading-tight">30d</p>
                    <p
                      className={`text-xs font-mono-numeric font-semibold leading-tight ${
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
                    <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-0.5 leading-tight">Liquidity</p>
                    <p className="text-xs font-mono-numeric font-medium text-brand-black leading-tight">
                      {sizeVariant?.liquidity || asset.liquidity || "—"}
                    </p>
                  </div>

                  {/* Actions - more compact */}
                  <div className="md:col-span-2 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onRemoveFromWatchlist(asset.id)}
                      className="px-2 py-1 border border-brand-gray/30 bg-brand-white text-[10px] font-medium text-brand-black hover:border-brand-black hover:bg-brand-black hover:text-brand-white transition-all leading-tight"
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

