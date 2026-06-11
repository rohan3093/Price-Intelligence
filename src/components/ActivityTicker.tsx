import React, { useMemo } from "react";
import { Asset, SizeVariant } from "../types";
import { computeMarkMetrics, MarkMetrics } from "../utils/priceMetrics";

interface ActivityTickerProps {
  assets: Asset[];
  onSelectAsset?: (id: number) => void;
}

interface TickerItem {
  id: number;
  name: string;
  markPrice: number;
  /** Real 30d move (only when a genuine historical series exists), else null. */
  realChangePct: number | null;
  /** Validated cross-channel spread as a fraction of mark, else null. */
  spreadPct: number | null;
  /** Epoch ms of last update, for recency ranking. */
  updatedAt: number;
}

// A real 30d move beyond this band is a data artefact, not activity.
const MAX_PLAUSIBLE_ABS_CHANGE = 100;
const MAX_TICKER_ITEMS = 24;

function getDefaultSizeVariant(asset: Asset): SizeVariant | undefined {
  const target = asset.defaultSize || asset.size;
  return asset.sizes?.find((s) => s.size === target) ?? asset.sizes?.[0];
}

/**
 * Parse a REAL change string. Only values that look like an actual percent
 * ("+5.2%") count — null / "N/A" / blanks are treated as no real history.
 */
function parseRealChange(changeStr: string | null | undefined): number | null {
  if (!changeStr || !changeStr.includes("%")) return null;
  const match = changeStr.match(/[+-]?[\d.]+/);
  if (!match) return null;
  const val = parseFloat(match[0]);
  if (!isFinite(val) || Math.abs(val) >= MAX_PLAUSIBLE_ABS_CHANGE) return null;
  return val;
}

/** Mark metrics for an asset's default size, using validated quotes only. */
function getAssetMarkMetrics(asset: Asset): MarkMetrics | undefined {
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
  return computeMarkMetrics(asks, bids, asset.priceAnchors?.retailIndia);
}

function getUpdatedAt(asset: Asset): number {
  const raw = asset.lastUpdated ?? getDefaultSizeVariant(asset)?.lastUpdated;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return isFinite(t) ? t : 0;
}

export const ActivityTicker: React.FC<ActivityTickerProps> = ({ assets, onSelectAsset }) => {
  const items = useMemo<TickerItem[]>(() => {
    const out: TickerItem[] = [];
    assets.forEach((asset) => {
      const mark = getAssetMarkMetrics(asset);
      if (mark?.markPrice === undefined) return;
      const realChangePct =
        parseRealChange(asset.change30d) ??
        parseRealChange(getDefaultSizeVariant(asset)?.change30d);
      out.push({
        id: asset.id,
        name: asset.name,
        markPrice: mark.markPrice,
        realChangePct,
        spreadPct: mark.spreadPct ?? null,
        updatedAt: getUpdatedAt(asset),
      });
    });

    // Real history is sparse until it accrues, so the ticker's primary signal is
    // recency + widest validated spread. Genuine price movers surface ahead of
    // the rest only once a real change30d exists.
    out.sort((a, b) => {
      const aReal = a.realChangePct !== null;
      const bReal = b.realChangePct !== null;
      if (aReal !== bReal) return aReal ? -1 : 1;
      if (aReal && bReal) {
        const d = Math.abs(b.realChangePct!) - Math.abs(a.realChangePct!);
        if (d !== 0) return d;
      }
      if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
      return (b.spreadPct ?? 0) - (a.spreadPct ?? 0);
    });
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
              const change = item.realChangePct;
              const isUp = change !== null && change > 0;
              const isDown = change !== null && change < 0;
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
                  {change !== null ? (
                    <span
                      className={`text-xs font-mono-numeric font-bold tabular-nums ${
                        isUp ? "text-up" : isDown ? "text-down" : "text-brand-black/70"
                      }`}
                    >
                      {isUp ? "+" : ""}
                      {change.toFixed(1)}%
                    </span>
                  ) : item.spreadPct !== null ? (
                    <span className="text-xs font-mono-numeric text-brand-black/45 tabular-nums">
                      spr {(item.spreadPct * 100).toFixed(1)}%
                    </span>
                  ) : null}
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
