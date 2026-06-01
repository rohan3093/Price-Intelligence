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
      <label htmlFor="size-selector" className="text-[10px] font-body font-normal text-brand-black mb-1.5 uppercase tracking-wide leading-tight block">
        Select size
      </label>
      <select
        id="size-selector"
        value={selectedSize}
        onChange={(e) => onSizeChange(e.target.value)}
        className="w-full border border-brand-gray/20 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black bg-brand-white focus:outline-none focus:border-brand-black transition-colors cursor-pointer"
      >
        {sortedSizes.map((sizeVariant) => (
          <option key={sizeVariant.size} value={sizeVariant.size}>
            {sizeVariant.size}
          </option>
        ))}
      </select>
    </div>
  );
};

