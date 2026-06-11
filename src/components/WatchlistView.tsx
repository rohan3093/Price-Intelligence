import React from "react";
import { Asset, PricePoint } from "../types";
import { User } from "firebase/auth";

interface WatchlistViewProps {
  assets: Asset[];
  watchlistIds: number[];
  onRemoveFromWatchlist: (assetId: number) => void;
  currentUser: User | null;
  onSignInClick: () => void;
  onBrowseMarket?: () => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  assets,
  watchlistIds,
  onRemoveFromWatchlist,
  currentUser,
  onSignInClick,
  onBrowseMarket,
}) => {
  const watchlistAssets = assets.filter((asset) => watchlistIds.includes(asset.id));


  // Show sign-in prompt if user is not logged in
  if (!currentUser) {
    return (
      <main className="flex-1 min-h-0 flex flex-col bg-brand-background px-2 py-2 md:px-3 md:py-3 pb-20 md:pb-4 w-full max-w-8xl mx-auto overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-heading font-normal text-brand-black mb-2">
            Watchlist
          </h1>
          <p className="text-sm text-brand-black/60">
            Track your favorite assets and monitor price movements
          </p>
        </div>
        <div className="border border-brand-gray/20 p-8 text-center bg-terminal-surface">
          <svg className="w-12 h-12 mx-auto text-brand-black/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <p className="text-sm font-medium text-brand-black mb-1.5 leading-tight">
            Sign in to access your watchlist
          </p>
          <p className="text-xs text-brand-black/70 mb-4 leading-tight">
            Your watchlist is synced across all your devices when you're signed in
          </p>
          <button
            onClick={onSignInClick}
            className="px-4 py-2 bg-accent text-terminal-bg text-xs font-semibold hover:bg-accent/90 transition leading-tight"
          >
            Sign In
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 min-h-0 flex flex-col bg-brand-background px-2 py-2 md:px-3 md:py-3 pb-20 md:pb-4 w-full max-w-8xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-heading font-normal text-brand-black mb-2">
              Watchlist
            </h1>
            <p className="text-sm text-brand-black/60">
              Track your favorite assets and monitor price movements
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-brand-black/50 uppercase tracking-wider mb-1">Total Assets</p>
            <p className="text-2xl font-mono-numeric font-bold text-brand-black">
              {watchlistIds.length}
            </p>
          </div>
        </div>
      </div>

      {/* Watchlist Content */}
      {watchlistIds.length === 0 ? (
        <div className="border border-brand-gray/20 p-8 text-center bg-terminal-surface">
          <svg className="w-12 h-12 mx-auto text-brand-black/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <p className="text-sm font-medium text-brand-black mb-1.5 leading-tight">
            Your watchlist is empty
          </p>
          <p className="text-xs text-brand-black/70 mb-4 leading-tight">
            Add assets from the market view to track their prices and get alerts
          </p>
          <button
            onClick={onBrowseMarket}
            className="px-4 py-2 bg-accent text-terminal-bg text-xs font-semibold hover:bg-accent/90 transition leading-tight"
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
                className="border border-brand-gray/20 p-4 bg-terminal-surface transition-all"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Asset Info */}
                  <div className="md:col-span-4 flex items-center gap-3">
                    <div className="h-14 w-14 flex-shrink-0 border border-brand-gray/20 overflow-hidden">
                      <img
                        src={asset.image}
                        alt={asset.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-brand-black truncate mb-1 leading-tight">
                        {asset.name}
                      </p>
                      <p className="text-xs text-brand-black/60 leading-tight">
                        {asset.brand} · {asset.sku}
                        {selectedSize && ` · ${selectedSize}`}
                      </p>
                    </div>
                  </div>

                  {/* Best Price */}
                  <div className="md:col-span-2">
                    <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1 leading-tight font-semibold">Best Price</p>
                    <p className="text-sm font-mono-numeric font-semibold text-brand-black leading-tight">
                      {buyPrice ? `₹${buyPrice.toLocaleString("en-IN")}` : "—"}
                    </p>
                  </div>

                  {/* Fair Range */}
                  <div className="md:col-span-2">
                    <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1 leading-tight font-semibold">Fair Range</p>
                    <p className="text-xs font-mono-numeric font-medium text-brand-black leading-tight">
                      {sizeVariant?.fairRange || asset.fairRange || "—"}
                    </p>
                  </div>

                  {/* 30d Change */}
                  <div className="md:col-span-1">
                    <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1 leading-tight font-semibold">30d</p>
                    <p
                      className={`text-sm font-mono-numeric font-semibold leading-tight ${
                        asset.change30d?.startsWith("-")
                          ? "text-down"
                          : asset.change30d?.startsWith("+")
                          ? "text-up"
                          : "text-brand-black"
                      }`}
                    >
                      {asset.change30d || "—"}
                    </p>
                  </div>

                  {/* Liquidity */}
                  <div className="md:col-span-1">
                    <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1 leading-tight font-semibold">Liquidity</p>
                    <p className="text-xs font-mono-numeric font-medium text-brand-black leading-tight">
                      {sizeVariant?.liquidity || asset.liquidity || "—"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="md:col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => onRemoveFromWatchlist(asset.id)}
                      className="px-4 py-2 border border-brand-gray/30 bg-terminal-surface text-xs font-semibold text-brand-black hover:border-terminal-border-strong hover:bg-accent hover:text-terminal-bg transition-all leading-tight"
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

