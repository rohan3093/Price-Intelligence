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
        style={{ borderRadius: '0px' }}
      >
        {/* Mobile: Drag Handle */}
        <div className="md:hidden flex flex-col items-center pt-3 pb-2">
          <div className="w-12 h-1 bg-brand-gray"></div>
        </div>

        {/* Header */}
        <div className="sticky top-0 z-10 flex justify-between items-center px-4 md:px-6 py-4 bg-brand-white border-b border-brand-gray shadow-soft">
          <div className="text-sm text-brand-black font-semibold">
            {asset.brand} · {asset.sku}
          </div>
          <button
            onClick={onClose}
            className="text-brand-black hover:text-brand-white hover:bg-brand-black border-2 border-brand-gray text-xl px-3 py-2 min-w-[44px] min-h-[44px] flex items-center justify-center transition-all duration-200 active:scale-95"
            aria-label="Close"
            style={{ borderRadius: '0px' }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-brand-background">
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

