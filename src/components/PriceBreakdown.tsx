import React from "react";
import { Asset } from "../types";

interface PriceBreakdownProps {
  asset: Asset;
}

export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({ asset }) => {
  if (!asset.pricePoints) {
    return null;
  }

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString('en-IN')}`;
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const updated = typeof date === 'string' ? new Date(date) : date;
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* Data Freshness */}
      {asset.lastUpdated && (
        <div className="flex items-center justify-between text-xs text-brand-black">
          <span>Last updated: {formatTimeAgo(asset.lastUpdated)}</span>
          {asset.dataPoints && (
            <span>Based on {asset.dataPoints} data points</span>
          )}
        </div>
      )}

      {/* B2B Market Price Breakdown */}
      {asset.pricePoints.b2b && asset.pricePoints.b2b.length > 0 && (
        <div className="border border-brand-gray/20 rounded-none p-3 bg-brand-white">
          <p className="text-xs font-body font-normal text-brand-black mb-2">
            B2B Market (WhatsApp Groups) - Specific Prices
          </p>
          <div className="space-y-1.5">
            {asset.pricePoints.b2b.map((point, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm py-1 border-b border-brand-gray/20 last:border-0"
              >
                <span className="text-brand-black font-medium">
                  {formatPrice(point.price)}
                </span>
                <span className="text-brand-black">
                  {point.listingCount} {point.listingCount === 1 ? 'listing' : 'listings'}
                </span>
              </div>
            ))}
          </div>
          {asset.bestAvailablePrice && asset.pricePoints.b2b[0]?.price === asset.bestAvailablePrice && (
            <div className="mt-2 pt-2 border-t border-emerald-500/30">
              <p className="text-xs text-emerald-400">
                ✓ Best available: {formatPrice(asset.bestAvailablePrice)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* End Customer Market Price Breakdown */}
      {asset.pricePoints.endCustomer && asset.pricePoints.endCustomer.length > 0 && (
        <div className="border border-brand-gray/20 rounded-none p-3 bg-brand-white">
          <p className="text-xs font-body font-normal text-brand-black mb-2">
            End Customer Market - Specific Prices
          </p>
          <div className="space-y-1.5">
            {asset.pricePoints.endCustomer.map((point, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm py-1 border-b border-brand-gray/20 last:border-0"
              >
                <span className="text-brand-black font-medium">
                  {formatPrice(point.price)}
                </span>
                <span className="text-brand-black">
                  {point.listingCount} {point.listingCount === 1 ? 'listing' : 'listings'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* StockX/Goat Price Breakdown */}
      {asset.pricePoints.stockxGoat && asset.pricePoints.stockxGoat.length > 0 && (
        <div className="border border-brand-gray/20 rounded-none p-3 bg-brand-white">
          <p className="text-xs font-body font-normal text-brand-black mb-2">
            StockX / Goat (Reshipping) - Specific Prices
          </p>
          <div className="space-y-1.5">
            {asset.pricePoints.stockxGoat.map((point, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm py-1 border-b border-brand-gray/20 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-brand-black font-medium">
                    {formatPrice(point.price)}
                  </span>
                  {point.source && (
                    <span className="text-xs text-brand-black uppercase">
                      {point.source}
                    </span>
                  )}
                </div>
                <span className="text-brand-black">
                  {point.listingCount} {point.listingCount === 1 ? 'listing' : 'listings'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

