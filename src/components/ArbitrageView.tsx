import React, { useMemo, useState } from "react";
import { Asset, MarketChannel, PricePoint, SizeVariant } from "../types";

type Opportunity = {
  assetId: number;
  assetName: string;
  size: string;
  buyChannel: MarketChannel;
  buySource: string;
  buyPrice: number;
  buyAllIn: number;
  sellChannel: MarketChannel;
  sellSource: string;
  sellPrice: number;
  sellNet: number;
  netProfit: number;
  netPct: number;
  buyCount?: number;
  sellCount?: number;
};

interface ArbitrageViewProps {
  assets: Asset[];
}

// Defaults (configurable later)
const DEFAULT_MARKETPLACE_FEE = 0.085; // midpoint of 7-10%
const DEFAULT_INTL_RESHIPPING = 10000; // flat reshipping for international if missing
const DEFAULT_MIN_NET_PCT = 0.03; // 3%

export const ArbitrageView: React.FC<ArbitrageViewProps> = ({ assets }) => {
  const [includeWhatsApp, setIncludeWhatsApp] = useState(true);
  const [includeMarketplace, setIncludeMarketplace] = useState(true);
  const [includeInternational, setIncludeInternational] = useState(true);
  const [minNetPct, setMinNetPct] = useState(DEFAULT_MIN_NET_PCT);
  const [minNetRs, setMinNetRs] = useState(0);

  const opportunities = useMemo(() => {
    const opps: Opportunity[] = [];

    const channelAllowed = (channel: MarketChannel) => {
      if (channel === "whatsapp") return includeWhatsApp;
      if (channel === "marketplace") return includeMarketplace;
      if (channel === "international") return includeInternational;
      return true;
    };

    const extractPricePoints = (
      size: SizeVariant,
      channel: "whatsapp" | "marketplace" | "international"
    ): PricePoint[] => {
      if (size.pricePoints) {
        return size.pricePoints[channel] || [];
      }
      if (size.legacyPricePoints) {
        if (channel === "whatsapp") return size.legacyPricePoints.b2b || [];
        if (channel === "marketplace") return size.legacyPricePoints.endCustomer || [];
        return size.legacyPricePoints.stockxGoat || [];
      }
      return [];
    };

    const addOpportunitiesForSize = (asset: Asset, size: SizeVariant) => {
      // Build buy pools
      const waBuy = extractPricePoints(size, "whatsapp").filter(
        (p) => !p.transactionType || p.transactionType === "buy" || p.transactionType === "both"
      );
      const mpBuy = extractPricePoints(size, "marketplace");
      const intlBuy = extractPricePoints(size, "international");

      // Build sell pools
      const waSell = extractPricePoints(size, "whatsapp").filter(
        (p) => p.transactionType === "sell" || p.transactionType === "both"
      );
      const mpSell = extractPricePoints(size, "marketplace");

      const buyPools: Array<{ channel: MarketChannel; points: PricePoint[] }> = [
        { channel: "whatsapp", points: waBuy },
        { channel: "marketplace", points: mpBuy },
        { channel: "international", points: intlBuy },
      ];
      const sellPools: Array<{ channel: MarketChannel; points: PricePoint[] }> = [
        { channel: "whatsapp", points: waSell },
        { channel: "marketplace", points: mpSell },
      ];

      // Flatten and form pairs
      buyPools.forEach((buyPool) => {
        if (!channelAllowed(buyPool.channel)) return;
        buyPool.points.forEach((buy) => {
          const buyBase = buy.price;
          const buyAllIn =
            buyPool.channel === "international"
              ? buy.price + (buy.reshippingCost ?? DEFAULT_INTL_RESHIPPING)
              : buy.price;

          sellPools.forEach((sellPool) => {
            if (!channelAllowed(sellPool.channel)) return;
            sellPool.points.forEach((sell) => {
              // Prevent pairing the exact same listing if both sides are identical
              if (buyPool.channel === sellPool.channel && buy.price === sell.price && buy.source === sell.source) {
                return;
              }

              const sellNet =
                sellPool.channel === "marketplace"
                  ? sell.price * (1 - DEFAULT_MARKETPLACE_FEE)
                  : sell.price; // WhatsApp: no fee

              const netProfit = sellNet - buyAllIn;
              const netPct = netProfit / buyAllIn;

              if (netProfit < minNetRs) return;
              if (netPct < minNetPct) return;

              opps.push({
                assetId: asset.id,
                assetName: asset.name,
                size: size.size,
                buyChannel: buyPool.channel,
                buySource: buy.marketplaceName || buy.source || buy.sellerName || "Listing",
                buyPrice: buyBase,
                buyAllIn,
                sellChannel: sellPool.channel,
                sellSource: sell.marketplaceName || sell.source || sell.sellerName || "Listing",
                sellPrice: sell.price,
                sellNet,
                netProfit,
                netPct,
                buyCount: buy.listingCount,
                sellCount: sell.listingCount,
              });
            });
          });
        });
      });
    };

    assets.forEach((asset) => {
      const sizes = asset.sizes || [];
      sizes.forEach((s) => addOpportunitiesForSize(asset, s));
    });

    // Sort by net % desc, then net profit desc
    return opps
      .sort((a, b) => {
        if (b.netPct !== a.netPct) return b.netPct - a.netPct;
        return b.netProfit - a.netProfit;
      })
      .slice(0, 200); // limit to keep UI snappy
  }, [assets, includeWhatsApp, includeMarketplace, includeInternational, minNetPct, minNetRs]);

  return (
    <section className="space-y-3 text-brand-black">
      <div className="flex flex-wrap items-center gap-2 border-b border-brand-gray/30 pb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Arbitrage Opportunities</h2>
        <span className="text-[10px] text-brand-black/50 font-mono-numeric">
          {opportunities.length} ideas
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          {[
            { label: "WA", value: includeWhatsApp, setter: setIncludeWhatsApp },
            { label: "Marketplace", value: includeMarketplace, setter: setIncludeMarketplace },
            { label: "Intl", value: includeInternational, setter: setIncludeInternational },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => opt.setter(!opt.value)}
              className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide border transition ${
                opt.value
                  ? "border-brand-black bg-brand-black text-white"
                  : "border-brand-gray/30 text-brand-black hover:border-brand-black"
              }`}
              style={{ borderRadius: '0px' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <label className="text-brand-black/60 uppercase tracking-wide">Min Net %</label>
          <input
            type="number"
            value={(minNetPct * 100).toFixed(1)}
            onChange={(e) => setMinNetPct(Math.max(0, Number(e.target.value) / 100))}
            className="w-16 border border-brand-gray/30 px-1.5 py-1 text-[10px] text-brand-black focus:outline-none focus:border-brand-black"
            style={{ borderRadius: '0px' }}
            step="0.5"
          />
          <label className="text-brand-black/60 uppercase tracking-wide">Min Net ₹</label>
          <input
            type="number"
            value={minNetRs}
            onChange={(e) => setMinNetRs(Math.max(0, Number(e.target.value)))}
            className="w-20 border border-brand-gray/30 px-1.5 py-1 text-[10px] text-brand-black focus:outline-none focus:border-brand-black"
            style={{ borderRadius: '0px' }}
            step="500"
          />
        </div>
      </div>

      <div className="overflow-x-auto -mx-2 md:mx-0">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-brand-gray/30 bg-brand-gray/5">
              <th className="text-left px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Asset</th>
              <th className="text-left px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Size</th>
              <th className="text-left px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Buy</th>
              <th className="text-left px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Sell</th>
              <th className="text-right px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Net ₹</th>
              <th className="text-right px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Net %</th>
              <th className="text-center px-2 py-1.5 font-semibold text-brand-black/70 uppercase tracking-wide">Liquidity</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-6 text-center text-brand-black/50">
                  No opportunities match the filters.
                </td>
              </tr>
            ) : (
              opportunities.map((opp, idx) => (
                <tr
                  key={`${opp.assetId}-${opp.size}-${idx}`}
                  className="border-b border-brand-gray/10 hover:bg-brand-gray/5 transition-colors"
                >
                  <td className="px-2 py-1.5 text-brand-black font-semibold">{opp.assetName}</td>
                  <td className="px-2 py-1.5 text-brand-black/80">{opp.size}</td>
                  <td className="px-2 py-1.5">
                    <div className="text-brand-black font-semibold">
                      {opp.buyChannel === "international" ? "Intl" : opp.buyChannel === "marketplace" ? "Marketplace" : "WhatsApp"}
                    </div>
                    <div className="text-[10px] text-brand-black/60 truncate max-w-[160px]">
                      {opp.buySource}
                    </div>
                    <div className="text-[10px] text-brand-black/80 font-mono-numeric">
                      Buy: ₹{opp.buyPrice.toLocaleString("en-IN")}
                      {opp.buyAllIn !== opp.buyPrice && (
                        <span className="text-brand-black/60"> → All-in ₹{opp.buyAllIn.toLocaleString("en-IN")}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="text-brand-black font-semibold">
                      {opp.sellChannel === "marketplace" ? "Marketplace" : "WhatsApp"}
                    </div>
                    <div className="text-[10px] text-brand-black/60 truncate max-w-[160px]">
                      {opp.sellSource}
                    </div>
                    <div className="text-[10px] text-brand-black/80 font-mono-numeric">
                      Sell: ₹{opp.sellPrice.toLocaleString("en-IN")}
                      {opp.sellNet !== opp.sellPrice && (
                        <span className="text-brand-black/60"> → Net ₹{opp.sellNet.toLocaleString("en-IN")}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono-numeric font-semibold text-green-700">
                    ₹{opp.netProfit.toLocaleString("en-IN")}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono-numeric font-semibold">
                    {(opp.netPct * 100).toFixed(1)}%
                  </td>
                  <td className="px-2 py-1.5 text-center text-[10px] text-brand-black/70">
                    <div>Buy: {opp.buyCount ?? 1}</div>
                    <div>Sell: {opp.sellCount ?? 1}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ArbitrageView;

