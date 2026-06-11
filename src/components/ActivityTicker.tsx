import React, { useMemo } from "react";
import { Asset, SizeVariant } from "../types";
import { computeMarkMetrics } from "../utils/priceMetrics";

interface ActivityTickerProps {
  assets: Asset[];
  onSelectAsset?: (id: number) => void;
}

interface TickerItem {
  id: number;
  name: string;
  markPrice: number;
  changePct: number;
}

// Validation guard for 30d moves; beyond this band a value is a data artefact
// (e.g. −100% to near-zero, +1851% off a bad anchor), not real activity.
// TEMP — superseded by validation brief.
const MAX_PLAUSIBLE_ABS_CHANGE = 100;
const MAX_TICKER_ITEMS = 24;

function getDefaultSizeVariant(asset: Asset): SizeVariant | undefined {
  const target = asset.defaultSize || asset.size;
  return asset.sizes?.find((s) => s.size === target) ?? asset.sizes?.[0];
}

function parseChangePercent(changeStr: string | undefined): number | null {
  if (!changeStr) return null;
  const match = changeStr.match(/[+-]?[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

/** Mark price for an asset from its default size, using validated quotes only. */
function getAssetMark(asset: Asset): number | undefined {
  const sv = getDefaultSizeVariant(asset);
  if (!sv?.pricePoints) return undefined;
  const wa = sv.pricePoints.whatsapp || [];
  const mp = sv.pricePoints.marketplace || [];
  const intl = sv.pricePoints.international || [];
  const asks: number[] = [
    ...wa
      .filter((p) => !p.transactionType || p.transactionType === "buy" || p.transactionType === "both")
      .map((p) => p.price),
    ...mp.map((p) => p.price),
    ...intl.map((p) => p.price + (p.reshippingCost || 0)),
  ];
  const bids: number[] = wa
    .filter((p) => p.transactionType === "sell" || p.transactionType === "both")
    .map((p) => p.price);
  return computeMarkMetrics(asks, bids).markPrice;
}

export const ActivityTicker: React.FC<ActivityTickerProps> = ({ assets, onSelectAsset }) => {
  const items = useMemo<TickerItem[]>(() => {
    const out: TickerItem[] = [];
    assets.forEach((asset) => {
      const mark = getAssetMark(asset);
      const change =
        parseChangePercent(asset.change30d) ??
        parseChangePercent(getDefaultSizeVariant(asset)?.change30d);
      // Validated metrics only — both a real mark price and a plausible move.
      if (
        mark === undefined ||
        change === null ||
        !isFinite(change) ||
        Math.abs(change) >= MAX_PLAUSIBLE_ABS_CHANGE
      ) {
        return;
      }
      out.push({ id: asset.id, name: asset.name, markPrice: mark, changePct: change });
    });
    // Surface activity: largest absolute moves first.
    out.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
    return out.slice(0, MAX_TICKER_ITEMS);
  }, [assets]);

  if (items.length === 0) return null;

  // Duplicate the sequence so the marquee can loop seamlessly. With
  // prefers-reduced-motion the animation is disabled and the strip is
  // horizontally scrollable instead.
  const loop = [...items, ...items];

  return (
    <div className="border-b border-brand-gray/20 bg-terminal-surface overflow-hidden">
      <div className="flex items-stretch">
        <div className="flex items-center px-3 border-r border-brand-gray/20 flex-shrink-0">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-brand-black/50">
            Activity
          </span>
        </div>
        <div className="sentria-ticker-viewport flex-1 overflow-x-auto">
          <div className="sentria-ticker-track flex items-center whitespace-nowrap">
            {loop.map((item, idx) => {
              const isUp = item.changePct > 0;
              const isDown = item.changePct < 0;
              const tone = isUp ? "text-up" : isDown ? "text-down" : "text-brand-black/70";
              return (
                <button
                  key={`${item.id}-${idx}`}
                  type="button"
                  onClick={() => onSelectAsset?.(item.id)}
                  aria-hidden={idx >= items.length}
                  tabIndex={idx >= items.length ? -1 : 0}
                  className="inline-flex items-baseline gap-2 px-3 py-1.5 border-r border-brand-gray/15 hover:bg-brand-gray/10 transition-colors"
                >
                  <span className="text-xs text-brand-black/80 truncate max-w-[180px]">{item.name}</span>
                  <span className="text-xs font-mono-numeric text-brand-black/60 tabular-nums">
                    ₹{Math.round(item.markPrice).toLocaleString("en-IN")}
                  </span>
                  <span className={`text-xs font-mono-numeric font-bold tabular-nums ${tone}`}>
                    {isUp ? "+" : ""}
                    {item.changePct.toFixed(1)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes sentria-ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .sentria-ticker-track {
          animation: sentria-ticker 60s linear infinite;
          width: max-content;
        }
        .sentria-ticker-track:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .sentria-ticker-track {
            animation: none;
            width: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default ActivityTicker;
