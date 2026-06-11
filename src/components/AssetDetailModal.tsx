import React, { useEffect } from "react";
import { Asset, PortfolioPosition } from "../types";
import { AssetDetailPanel } from "./AssetDetailPanel";
import { User } from "firebase/auth";

interface AssetDetailModalProps {
  open: boolean;
  asset: Asset | undefined;
  onClose: () => void;
  watchlisted?: boolean;
  onToggleWatchlist?: () => void;
  currentUser?: User | null;
  portfolioPositions?: PortfolioPosition[];
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  open,
  asset,
  onClose,
  watchlisted = false,
  onToggleWatchlist,
  currentUser = null,
  portfolioPositions = [],
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
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      {/* Bottom Sheet for Mobile, Centered Modal for Desktop */}
      <div 
        className="relative w-full md:max-w-5xl md:max-h-[90vh] bg-brand-white border-t-2 md:border-2 border-brand-black shadow-modal md:m-8 overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar — combined drag handle + brand/SKU + close. flex-shrink-0 keeps it always visible regardless of scroll. */}
        <div className="flex-shrink-0 bg-brand-white border-b border-brand-gray relative z-10">
          {/* Mobile: Drag Handle */}
          <div className="md:hidden flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-brand-gray/60" style={{ borderRadius: '999px' }}></div>
          </div>
          {/* Header content */}
          <div className="flex justify-between items-center gap-3 px-3 md:px-6 pb-2 pt-1 md:py-4">
            <div className="text-xs md:text-sm text-brand-black font-semibold min-w-0 truncate">
              {asset.brand} · {asset.sku}
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-brand-black hover:text-brand-white hover:bg-brand-black border-2 border-brand-gray text-xl min-w-[40px] min-h-[40px] md:min-w-[44px] md:min-h-[44px] flex items-center justify-center transition-all duration-200 active:scale-95"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-8 bg-brand-background">
          <AssetDetailPanel
            asset={asset}
            watchlisted={watchlisted}
            onToggleWatchlist={onToggleWatchlist}
            currentUser={currentUser}
            portfolioPositions={portfolioPositions}
          />
        </div>
      </div>
    </div>
  );
};

