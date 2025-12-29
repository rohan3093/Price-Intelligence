import React from "react";
import { Asset } from "../types";
import { AssetDetailPanel } from "./AssetDetailPanel";

interface AssetDetailModalProps {
  open: boolean;
  asset: Asset | undefined;
  onClose: () => void;
  watchlisted?: boolean;
  onToggleWatchlist?: () => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  open,
  asset,
  onClose,
  watchlisted = false,
  onToggleWatchlist,
}) => {
  if (!open || !asset) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-start md:items-center justify-center overflow-y-auto">
      <div className="relative w-full md:max-w-5xl max-h-[90vh] overflow-y-auto bg-brand-white border border-brand-gray/20 rounded-none shadow-2xl m-4 md:m-8">
        <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-3 bg-brand-white border-b border-brand-gray/20">
          <div className="text-xs text-brand-black">
            {asset.brand} · {asset.sku}
          </div>
          <button
            onClick={onClose}
            className="text-brand-black hover:text-brand-black text-xs px-2 py-1"
          >
            ✕
          </button>
        </div>
        <div className="p-4 md:p-6">
          <AssetDetailPanel
            asset={asset}
            watchlisted={watchlisted}
            onToggleWatchlist={onToggleWatchlist}
          />
        </div>
      </div>
    </div>
  );
};

