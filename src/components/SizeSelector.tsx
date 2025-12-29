import React from "react";
import { Asset } from "../types";

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

  return (
    <div className="border border-brand-gray/20 rounded-none p-3 md:p-4 bg-brand-white">
      <p className="text-xs font-body font-normal text-brand-black mb-3">
        Select size
      </p>

      <div className="flex flex-wrap gap-2">
        {asset.sizes.map((sizeVariant) => {
          const isSelected = sizeVariant.size === selectedSize;
          return (
            <button
              key={sizeVariant.size}
              onClick={() => onSizeChange(sizeVariant.size)}
              className={`px-3 py-1.5 rounded-none text-sm border transition ${
                isSelected
                  ? "border-brand-black bg-brand-black text-brand-white"
                  : "border-brand-gray/20 bg-brand-white text-brand-black hover:border-brand-black"
              }`}
            >
              {sizeVariant.size}
              {isSelected && <span className="ml-1 text-emerald-400 text-xs">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

