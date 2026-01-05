import React, { useState } from "react";
import { Asset } from "../types";

interface AssetComparisonProps {
  assets: Asset[];
  onClose: () => void;
}

// Helper to calculate best price
const getBestPrice = (asset: Asset): number | undefined => {
  if (asset.bestAvailablePrice) return asset.bestAvailablePrice;
  const defaultSize = asset.defaultSize || asset.size;
  const sizeVariant = asset.sizes?.find(s => s.size === defaultSize);
  return sizeVariant?.bestAvailablePrice;
};

export const AssetComparison: React.FC<AssetComparisonProps> = ({ assets, onClose }) => {
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>(assets.slice(0, Math.min(3, assets.length)));

  const removeAsset = (assetId: number) => {
    setSelectedAssets(selectedAssets.filter(a => a.id !== assetId));
  };

  if (selectedAssets.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-brand-white border border-brand-gray/20 p-6 max-w-2xl w-full" style={{ borderRadius: '0px' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-heading font-normal text-brand-black uppercase tracking-wide">
              Compare Assets
            </h2>
            <button
              onClick={onClose}
              className="text-brand-black hover:text-brand-black text-lg px-2 py-1 min-w-[44px] min-h-[44px]"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-brand-black/70">No assets selected for comparison</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-brand-white border border-brand-gray/20 p-6 max-w-7xl w-full my-8" style={{ borderRadius: '0px' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-brand-gray/20">
          <h2 className="text-lg font-heading font-normal text-brand-black uppercase tracking-wide">
            Compare Assets ({selectedAssets.length}/3)
          </h2>
          <button
            onClick={onClose}
            className="text-brand-black hover:text-brand-black text-lg px-2 py-1 min-w-[44px] min-h-[44px]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-gray/30">
                <th className="text-left p-3 text-xs font-semibold text-brand-black uppercase tracking-wide">Asset</th>
                {selectedAssets.map((asset) => (
                  <th key={asset.id} className="text-left p-3 text-xs font-semibold text-brand-black uppercase tracking-wide min-w-[200px]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{asset.name}</p>
                        <p className="text-xs text-brand-black/60 mt-1">{asset.brand} · {asset.sku}</p>
                      </div>
                      <button
                        onClick={() => removeAsset(asset.id)}
                        className="text-brand-black/60 hover:text-brand-black text-sm px-2"
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Image Row */}
              <tr className="border-b border-brand-gray/20">
                <td className="p-3 text-xs text-brand-black/60 uppercase tracking-wide">Image</td>
                {selectedAssets.map((asset) => (
                  <td key={asset.id} className="p-3">
                    <div className="w-24 h-24 bg-brand-gray/5 border border-brand-gray/20 flex items-center justify-center" style={{ borderRadius: '0px' }}>
                      <img
                        src={asset.image}
                        alt={asset.name}
                        className="max-h-full max-w-full object-contain"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </td>
                ))}
              </tr>

              {/* Best Price Row */}
              <tr className="border-b border-brand-gray/20">
                <td className="p-3 text-xs text-brand-black/60 uppercase tracking-wide">Best Price</td>
                {selectedAssets.map((asset) => {
                  const bestPrice = getBestPrice(asset);
                  return (
                    <td key={asset.id} className="p-3">
                      <p className="text-lg font-semibold text-green-600">
                        {bestPrice ? `₹${bestPrice.toLocaleString('en-IN')}` : '—'}
                      </p>
                    </td>
                  );
                })}
              </tr>

              {/* Retail Price Row */}
              <tr className="border-b border-brand-gray/20">
                <td className="p-3 text-xs text-brand-black/60 uppercase tracking-wide">Retail (India)</td>
                {selectedAssets.map((asset) => (
                  <td key={asset.id} className="p-3">
                    <p className="text-base font-semibold text-brand-black">
                      {asset.priceAnchors?.retailIndia ? `₹${asset.priceAnchors.retailIndia.toLocaleString('en-IN')}` : '—'}
                    </p>
                  </td>
                ))}
              </tr>

              {/* 30d Change Row */}
              <tr className="border-b border-brand-gray/20">
                <td className="p-3 text-xs text-brand-black/60 uppercase tracking-wide">30d Change</td>
                {selectedAssets.map((asset) => {
                  const change30d = asset.change30d || asset.sizes?.[0]?.change30d;
                  return (
                    <td key={asset.id} className="p-3">
                      <p
                        className={`text-base font-semibold ${
                          change30d?.startsWith("-")
                            ? "text-red-600"
                            : change30d?.startsWith("+")
                            ? "text-green-600"
                            : "text-brand-black"
                        }`}
                      >
                        {change30d || "—"}
                      </p>
                    </td>
                  );
                })}
              </tr>

              {/* Liquidity Row */}
              <tr className="border-b border-brand-gray/20">
                <td className="p-3 text-xs text-brand-black/60 uppercase tracking-wide">Liquidity</td>
                {selectedAssets.map((asset) => {
                  const liquidity = asset.liquidity || asset.sizes?.[0]?.liquidity;
                  return (
                    <td key={asset.id} className="p-3">
                      <p className="text-base font-semibold text-brand-black">{liquidity || "—"}</p>
                    </td>
                  );
                })}
              </tr>

              {/* Confidence Row */}
              <tr className="border-b border-brand-gray/20">
                <td className="p-3 text-xs text-brand-black/60 uppercase tracking-wide">Confidence</td>
                {selectedAssets.map((asset) => {
                  const confidence = asset.confidence || asset.sizes?.[0]?.confidence || 0;
                  return (
                    <td key={asset.id} className="p-3">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-brand-black">{confidence}/100</p>
                        <div className="flex-1 bg-brand-gray/20 h-2" style={{ borderRadius: '0px' }}>
                          <div 
                            className="h-full bg-brand-black transition-all"
                            style={{ width: `${confidence}%`, borderRadius: '0px' }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Volatility Row */}
              <tr className="border-b border-brand-gray/20">
                <td className="p-3 text-xs text-brand-black/60 uppercase tracking-wide">Volatility</td>
                {selectedAssets.map((asset) => (
                  <td key={asset.id} className="p-3">
                    <p className="text-base font-semibold text-brand-black capitalize">{asset.volatility || "—"}</p>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

