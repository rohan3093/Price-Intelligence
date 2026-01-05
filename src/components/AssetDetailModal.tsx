import React, { useEffect } from "react";
import { Asset } from "../types";
import { AssetDetailPanel } from "./AssetDetailPanel";

interface AssetDetailModalProps {
  open: boolean;
  asset: Asset | undefined;
  onClose: () => void;
  watchlisted?: boolean;
  onToggleWatchlist?: () => void;
  onCompare?: (asset: Asset) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  open,
  asset,
  onClose,
  watchlisted = false,
  onToggleWatchlist,
  onCompare,
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || !asset) return null;

  return (
    <div 
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      {/* Bottom Sheet for Mobile, Centered Modal for Desktop */}
      <div 
        className="relative w-full md:max-w-5xl md:max-h-[90vh] bg-brand-white border-t md:border border-brand-gray/20 rounded-t-lg md:rounded-none shadow-2xl md:m-8 overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          borderRadius: '0px',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
        }}
      >
        {/* Mobile: Drag Handle */}
        <div className="md:hidden flex flex-col items-center pt-2 pb-1">
          <div className="w-12 h-1 bg-brand-gray/40 rounded-full mb-2"></div>
        </div>

        {/* Header */}
        <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-3 bg-brand-white border-b border-brand-gray/20">
          <div className="text-xs text-brand-black font-medium">
            {asset.brand} · {asset.sku}
          </div>
          <button
            onClick={onClose}
            className="text-brand-black hover:text-brand-black text-lg px-2 py-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <AssetDetailPanel
            asset={asset}
            watchlisted={watchlisted}
            onToggleWatchlist={onToggleWatchlist}
            onCompare={onCompare}
          />
        </div>
      </div>
    </div>
  );
};

