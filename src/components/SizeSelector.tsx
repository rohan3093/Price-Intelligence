import React from "react";
import { Asset } from "../types";
import { sortSizesByValue } from "../utils/sizeSort";

interface SizeSelectorProps {
  asset: Asset;
  selectedSize: string;
  onSizeChange: (size: string) => void;
}

export const SizeSelector: React.FC<SizeSelectorProps> = ({
  asset,
  selectedSize,
  onSizeChange,
}) => {
  if (!asset.sizes || asset.sizes.length === 0) {
    return null;
  }

  // Sort sizes by numeric value
  const sortedSizes = sortSizesByValue(asset.sizes);

  return (
    <div className="w-full border border-brand-gray/20 rounded-none p-2.5 bg-brand-white">
      <p className="text-[10px] font-body font-normal text-brand-black mb-2 uppercase tracking-wide leading-tight">
        Select size
      </p>

      <div className="flex flex-wrap gap-1.5">
        {sortedSizes.map((sizeVariant) => {
          const isSelected = sizeVariant.size === selectedSize;
          return (
            <button
              key={sizeVariant.size}
              onClick={() => onSizeChange(sizeVariant.size)}
              className={`px-3 py-2 md:px-2 md:py-1 rounded-none text-xs border transition-all leading-tight min-h-[44px] md:min-h-0 active:scale-95 ${
                isSelected
                  ? "border-brand-black bg-brand-black text-brand-white shadow-sm"
                  : "border-brand-gray/20 bg-brand-white text-brand-black hover:border-brand-black hover:shadow-sm"
              }`}
            >
              {sizeVariant.size}
              {isSelected && <span className="ml-1 text-emerald-400 text-[10px]">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

