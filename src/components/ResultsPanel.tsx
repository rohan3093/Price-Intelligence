import React from "react";
import { Asset } from "../types";

interface ResultsPanelProps {
  assets: Asset[];
  selectedId: number | null;
  setSelectedId: (id: number) => void;
}

/**
 * Formats size range from asset sizes array
 * Returns format like "UK 6 - UK 10" or single size if only one exists
 */
function formatSizeRange(asset: Asset): string {
  if (!asset.sizes || asset.sizes.length === 0) {
    return asset.size || asset.sku || "";
  }

  const sizes = asset.sizes.map(s => s.size).filter(Boolean);
  
  if (sizes.length === 0) {
    return asset.size || asset.sku || "";
  }

  if (sizes.length === 1) {
    return sizes[0];
  }

  // Extract numeric part for sorting (handles formats like "UK 6", "US 9", etc.)
  const extractNumeric = (size: string): number => {
    const match = size.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  // Sort sizes by numeric value
  const sortedSizes = [...sizes].sort((a, b) => extractNumeric(a) - extractNumeric(b));
  
  const minSize = sortedSizes[0];
  const maxSize = sortedSizes[sortedSizes.length - 1];

  // If min and max are the same, return single size
  if (minSize === maxSize) {
    return minSize;
  }

  return `${minSize} - ${maxSize}`;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  assets,
  selectedId,
  setSelectedId,
}) => {
  return (
    <section className="border border-brand-gray/30 rounded-none p-5 bg-brand-white" style={{ borderRadius: '0px' }}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-gray/20">
        <h2 className="text-sm font-semibold text-brand-black uppercase tracking-wide">
          Assets
        </h2>
        <span className="text-xs text-brand-black/60">
          {assets.length}
        </span>
      </div>
      <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
        {assets.length === 0 ? (
          <div className="text-center py-8 text-sm text-brand-black/50">
            No assets found
          </div>
        ) : (
          assets.map((asset) => {
            const isSelected = selectedId === asset.id;
            const sizeRange = formatSizeRange(asset);

            return (
              <div
                key={asset.id}
                onClick={() => setSelectedId(asset.id)}
                className={`border p-3 cursor-pointer transition-all flex gap-3 ${
                  isSelected 
                    ? "border-brand-black bg-brand-black text-brand-white" 
                    : "border-brand-gray/30 bg-brand-white hover:border-brand-gray/50 hover:bg-brand-gray/5"
                }`}
                style={{ borderRadius: '0px' }}
              >
                <div className="h-14 w-14 bg-brand-white flex items-center justify-center flex-shrink-0 border border-brand-gray/20" style={{ borderRadius: '0px' }}>
                  <img
                    src={asset.image}
                    alt={asset.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate text-sm ${
                        isSelected ? "text-brand-white" : "text-brand-black"
                      }`}>
                        {asset.name}
                      </p>
                      <p className={`text-xs mt-0.5 ${
                        isSelected ? "text-brand-white/70" : "text-brand-black/60"
                      }`}>
                        {asset.brand} · {sizeRange}
                      </p>
                    </div>
                    {asset.change30d && (
                      <div className={`text-right flex-shrink-0 ${
                        isSelected ? "text-brand-white" : ""
                      }`}>
                        <p
                          className={`text-xs font-semibold ${
                            asset.change30d.startsWith("-")
                              ? "text-red-500"
                              : asset.change30d.startsWith("+")
                              ? "text-green-600"
                              : isSelected ? "text-brand-white" : "text-brand-black"
                          }`}
                        >
                          {asset.change30d}
                        </p>
                        <p className={`text-[10px] mt-0.5 ${
                          isSelected ? "text-brand-white/60" : "text-brand-black/50"
                        }`}>
                          30d
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

