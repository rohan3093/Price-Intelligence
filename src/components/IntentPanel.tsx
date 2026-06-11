import React, { useState, useMemo } from "react";
import { Asset } from "../types";
import { Pill, PillGroup } from "./Pill";

interface IntentPanelProps {
  asset: Asset;
  selectedSize: string;
  currentUser?: any;
  onSubmitIntent?: (intent: IntentData) => void;
}

export interface IntentData {
  side: "Buy" | "Sell";
  size: string;
  limitPrice: number;
  urgency: number;
  assetId: string;
  assetName: string;
}

/**
 * Intelligence-first intent panel
 * Execution is a secondary, optional affordance
 * Inspired by Sentria terminal concept: "Execute later, earn it now"
 */
export const IntentPanel: React.FC<IntentPanelProps> = ({
  asset,
  selectedSize,
  onSubmitIntent,
}) => {
  const [side, setSide] = useState<"Buy" | "Sell">("Buy");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [urgency, setUrgency] = useState<number>(35);

  // Get suggested price based on asset data
  const suggestedPrice = useMemo(() => {
    const sizeVariant = asset.sizes?.find((s) => s.size === selectedSize);
    if (sizeVariant?.bestAvailablePrice) {
      return sizeVariant.bestAvailablePrice;
    }
    if (asset.bestAvailablePrice) {
      return asset.bestAvailablePrice;
    }
    return 0;
  }, [asset, selectedSize]);

  // Initialize limit price with suggested price
  React.useEffect(() => {
    if (suggestedPrice && !limitPrice) {
      setLimitPrice(suggestedPrice.toString());
    }
  }, [suggestedPrice, limitPrice]);

  const handleSubmit = () => {
    if (!limitPrice || !selectedSize) {
      alert("Please select a size and enter a limit price");
      return;
    }

    const intent: IntentData = {
      side,
      size: selectedSize,
      limitPrice: Number(limitPrice),
      urgency,
      assetId: String(asset.id),
      assetName: asset.name,
    };

    if (onSubmitIntent) {
      onSubmitIntent(intent);
    } else {
      // Default behavior
      console.log("Intent posted:", intent);
      alert(
        `Intent posted: ${side} ${selectedSize} @ ₹${Number(limitPrice).toLocaleString("en-IN")}`
      );
    }
  };

  const handleSave = () => {
    alert("Intent saved for later. Feature coming soon!");
  };

  return (
    <div
      className="bg-terminal-surface border border-brand-gray/20"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-brand-gray/10">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
          <h3 className="text-sm font-bold text-brand-black uppercase tracking-wide">
            Post Intent
          </h3>
        </div>
        <p className="text-xs text-brand-black/60 mt-1">
          Intelligence-first: start with intent. Execution becomes a natural next step.
        </p>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Side Selector */}
        <PillGroup label="Side">
          <Pill label="Buy" active={side === "Buy"} onClick={() => setSide("Buy")} size="md" />
          <Pill label="Sell" active={side === "Sell"} onClick={() => setSide("Sell")} size="md" />
        </PillGroup>

        {/* Size & Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-brand-black/60 uppercase tracking-wide mb-2 font-semibold block">
              Size
            </label>
            <div
              className="px-3 py-2.5 bg-brand-background border border-brand-gray/30 text-sm font-semibold text-brand-black"
            >
              {selectedSize || "Select size"}
            </div>
          </div>
          <div>
            <label
              htmlFor="limit-price"
              className="text-xs text-brand-black/60 uppercase tracking-wide mb-2 font-semibold block"
            >
              Limit Price (₹)
            </label>
            <input
              id="limit-price"
              type="number"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="Enter price"
              className="w-full px-3 py-2.5 bg-terminal-surface border-2 border-brand-gray text-sm font-mono-numeric font-semibold text-brand-black placeholder:text-brand-black/30 focus:border-terminal-border-strong focus:outline-none transition-colors"
            />
            {suggestedPrice > 0 && (
              <button
                onClick={() => setLimitPrice(suggestedPrice.toString())}
                className="mt-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Use market: ₹{suggestedPrice.toLocaleString("en-IN")}
              </button>
            )}
          </div>
        </div>

        {/* Urgency Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-brand-black/60 uppercase tracking-wide font-semibold">
              Urgency
            </label>
            <span className="text-sm font-bold text-brand-black">{urgency}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={urgency}
            onChange={(e) => setUrgency(Number(e.target.value))}
            className="w-full h-2 bg-brand-gray/20 rounded-full appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${urgency}%, var(--terminal-border) ${urgency}%, var(--terminal-border) 100%)`,
            }}
          />
          <p className="text-xs text-brand-black/50 mt-2">
            Higher urgency prioritizes matching and routing.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleSubmit}
            disabled={!selectedSize || !limitPrice}
            className="flex-1 bg-accent text-terminal-bg px-4 py-3 text-sm font-bold uppercase tracking-wide hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            Post Intent
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-3 border-2 border-brand-gray text-sm font-bold text-brand-black hover:bg-brand-gray/10 transition-all active:scale-[0.98]"
          >
            Save
          </button>
        </div>

        {/* Footer Note */}
        <div className="pt-4 border-t border-brand-gray/20">
          <p className="text-xs text-brand-black/40">
            Later: route to best venue, or match peer-to-peer. Sentria earns execution by owning
            the decision layer.
          </p>
        </div>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #000;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #000;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

