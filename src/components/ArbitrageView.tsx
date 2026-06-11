import React, { useMemo, useState } from "react";
import { Asset } from "../types";
import {
  scanAllAssets,
  buildSummary,
  ArbitrageConfig,
  ArbitrageOpportunity,
  ArbitrageSummary,
  Strategy,
  DEFAULT_CONFIG,
  channelLabel,
  strategyLabel,
  strategyIcon,
  riskColor,
  riskBgColor,
  confidenceColor,
  turnaroundColor,
  turnaroundLabel,
} from "../utils/arbitrageEngine";

interface ArbitrageViewProps {
  assets: Asset[];
}

// ─── Summary Highlight Card ───────────────────────────────────
const HighlightCard: React.FC<{
  title: string;
  icon: string;
  opp: ArbitrageOpportunity | null;
  metric: React.ReactNode;
  subtitle: string;
}> = ({ title, icon, opp, metric, subtitle }) => {
  if (!opp) return null;
  return (
    <div className="border border-brand-gray/20 bg-white p-4 flex-1 min-w-[240px]">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-brand-gray/15">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-black/60">{title}</span>
      </div>
      <div className="mb-2">
        <div className="text-sm font-semibold text-brand-black truncate">{opp.assetName}</div>
        <div className="text-xs text-brand-black/50">Size {opp.size}</div>
      </div>
      <div className="text-2xl font-bold font-mono-numeric text-brand-black mb-1">{metric}</div>
      <div className="text-xs text-brand-black/50">{subtitle}</div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className={`px-1.5 py-0.5 font-semibold uppercase tracking-wide ${riskBgColor(opp.risk)} ${riskColor(opp.risk)}`}>
          {opp.risk} risk
        </span>
        <span className={`font-mono-numeric ${confidenceColor(opp.confidence)}`}>
          {opp.confidence}% conf
        </span>
      </div>
    </div>
  );
};

// ─── Strategy Filter Pill ─────────────────────────────────────
const StrategyPill: React.FC<{
  strategy: Strategy | "all";
  label: string;
  icon: string;
  count: number;
  active: boolean;
  onClick: () => void;
}> = ({ label, icon, count, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wide border transition-all ${
      active
        ? "border-brand-black bg-brand-black text-white"
        : "border-brand-gray/30 bg-white text-brand-black hover:border-brand-black"
    }`}
  >
    <span>{icon}</span>
    <span>{label}</span>
    {count > 0 && (
      <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-white/20' : 'bg-brand-gray/10'}`}>
        {count}
      </span>
    )}
  </button>
);

// ─── Opportunity Row ──────────────────────────────────────────
const OpportunityRow: React.FC<{
  opp: ArbitrageOpportunity;
  idx: number;
}> = ({ opp, idx }) => {
  const roiPct = opp.netPct * 100;
  const isEven = idx % 2 === 0;

  return (
    <tr className={`border-b border-brand-gray/10 ${isEven ? 'bg-white' : 'bg-brand-gray/5'} hover:bg-brand-background/50 transition-colors`}>
      {/* Asset + Size */}
      <td className="px-3 py-2.5">
        <div className="text-sm font-semibold text-brand-black truncate max-w-[160px]">{opp.assetName}</div>
        <div className="text-[10px] text-brand-black/50">{opp.size}</div>
      </td>

      {/* Strategy */}
      <td className="px-3 py-2.5">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-black/80">
          <span>{strategyIcon(opp.strategy)}</span>
          <span>{strategyLabel(opp.strategy)}</span>
        </span>
      </td>

      {/* Buy From */}
      <td className="px-3 py-2.5">
        <div className="text-xs font-semibold text-brand-black">{channelLabel(opp.buy.channel)}</div>
        <div className="text-[10px] text-brand-black/50 truncate max-w-[120px]">{opp.buy.source}</div>
      </td>

      {/* Buy Price */}
      <td className="px-3 py-2.5 text-right">
        <div className="font-semibold font-mono-numeric text-brand-black text-sm">
          ₹{opp.buy.allIn.toLocaleString("en-IN")}
        </div>
        {opp.buyShippingCost > 0 && (
          <div className="text-[10px] text-brand-black/40 font-mono-numeric">
            +₹{opp.buyShippingCost.toLocaleString("en-IN")} ship
          </div>
        )}
      </td>

      {/* Sell To */}
      <td className="px-3 py-2.5">
        <div className="text-xs font-semibold text-brand-black">{channelLabel(opp.sell.channel)}</div>
        <div className="text-[10px] text-brand-black/50 truncate max-w-[120px]">{opp.sell.source}</div>
        {opp.sellReliability === "consignment" && (
          <div className="mt-0.5">
            <span className="inline-block px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200/60">
              Consignment
            </span>
          </div>
        )}
      </td>

      {/* Sell Net */}
      <td className="px-3 py-2.5 text-right">
        <div className="font-semibold font-mono-numeric text-brand-black text-sm">
          ₹{opp.sell.net.toLocaleString("en-IN")}
        </div>
        {opp.sellFeeAmount > 0 && (
          <div className="text-[10px] text-brand-black/40 font-mono-numeric">
            −{(opp.sellFeeRate * 100).toFixed(1)}% fee
          </div>
        )}
      </td>

      {/* Profit */}
      <td className="px-3 py-2.5 text-right">
        <div className="font-bold font-mono-numeric text-brand-black text-sm">
          ₹{opp.netProfit.toLocaleString("en-IN")}
        </div>
        <div className="text-[10px] text-brand-black/50 font-mono-numeric">
          {roiPct.toFixed(1)}% ROI
        </div>
      </td>

      {/* Time Horizon */}
      <td className="px-3 py-2.5 text-center">
        <div className={`text-xs font-semibold ${turnaroundColor(opp.turnaroundDays)}`}>
          {turnaroundLabel(opp.turnaroundDays)}
        </div>
      </td>

      {/* Confidence + Risk */}
      <td className="px-3 py-2.5 text-center">
        <div className={`text-xs font-bold font-mono-numeric ${confidenceColor(opp.confidence)}`}>
          {opp.confidence}
        </div>
        <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold uppercase ${riskBgColor(opp.risk)} ${riskColor(opp.risk)}`}>
          {opp.risk}
        </span>
      </td>

      {/* Scale */}
      <td className="px-3 py-2.5 text-center">
        <div className="text-xs font-mono-numeric text-brand-black/70">{opp.scalable}</div>
        <div className="text-[10px] text-brand-black/40">pairs</div>
      </td>
    </tr>
  );
};

// ─── Mobile Card ──────────────────────────────────────────────
const OpportunityCard: React.FC<{ opp: ArbitrageOpportunity }> = ({ opp }) => {
  const roiPct = opp.netPct * 100;

  return (
    <div className="border border-brand-gray/20 bg-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-brand-gray/15">
        <div>
          <div className="text-sm font-semibold text-brand-black">{opp.assetName}</div>
          <div className="text-xs text-brand-black/50">Size {opp.size}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase ${riskBgColor(opp.risk)} ${riskColor(opp.risk)}`}>
            {opp.risk}
          </span>
          <span className={`text-xs font-bold font-mono-numeric ${confidenceColor(opp.confidence)}`}>
            {opp.confidence}%
          </span>
        </div>
      </div>

      {/* Strategy + Time Horizon */}
      <div className="flex items-center gap-1.5 mb-3">
        <span>{strategyIcon(opp.strategy)}</span>
        <span className="text-xs font-semibold text-brand-black/70 uppercase tracking-wide">
          {strategyLabel(opp.strategy)}
        </span>
        <span className={`ml-auto text-[10px] font-semibold ${turnaroundColor(opp.turnaroundDays)}`}>
          {turnaroundLabel(opp.turnaroundDays)}
        </span>
      </div>

      {/* Buy → Sell */}
      <div className="space-y-2 mb-3">
        <div className="flex items-baseline justify-between bg-brand-background/30 border border-brand-gray/15 p-2.5">
          <div>
            <div className="text-[10px] text-brand-black/50 uppercase font-semibold tracking-wider mb-0.5">Buy from</div>
            <div className="text-xs font-semibold text-brand-black">{channelLabel(opp.buy.channel)}</div>
            <div className="text-[10px] text-brand-black/50 truncate max-w-[140px]">{opp.buy.source}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold font-mono-numeric text-brand-black">₹{opp.buy.allIn.toLocaleString("en-IN")}</div>
            {opp.buyShippingCost > 0 && (
              <div className="text-[10px] text-brand-black/40 font-mono-numeric">+₹{opp.buyShippingCost.toLocaleString("en-IN")} ship</div>
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <svg className="w-4 h-4 text-brand-black/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        <div className="flex items-baseline justify-between bg-brand-background/30 border border-brand-gray/15 p-2.5">
          <div>
            <div className="text-[10px] text-brand-black/50 uppercase font-semibold tracking-wider mb-0.5">Sell to</div>
            <div className="text-xs font-semibold text-brand-black">{channelLabel(opp.sell.channel)}</div>
            <div className="text-[10px] text-brand-black/50 truncate max-w-[140px]">{opp.sell.source}</div>
            {opp.sellReliability === "consignment" && (
              <span className="inline-block mt-0.5 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200/60">
                Consignment
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm font-bold font-mono-numeric text-brand-black">₹{opp.sell.net.toLocaleString("en-IN")}</div>
            {opp.sellFeeAmount > 0 && (
              <div className="text-[10px] text-brand-black/40 font-mono-numeric">−{(opp.sellFeeRate * 100).toFixed(1)}% fee</div>
            )}
          </div>
        </div>
      </div>

      {/* Profit row */}
      <div className="bg-brand-black text-white p-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase font-semibold tracking-wider opacity-70">Net Profit</div>
          <div className="text-xl font-bold font-mono-numeric">₹{opp.netProfit.toLocaleString("en-IN")}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold font-mono-numeric">{roiPct.toFixed(1)}%</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-brand-black/40">
        <span>{opp.scalable} pair{opp.scalable !== 1 ? 's' : ''} available</span>
        <span>Buy: {opp.buy.count} · Sell: {opp.sell.count}</span>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────
export const ArbitrageView: React.FC<ArbitrageViewProps> = ({ assets }) => {
  // Filters
  const [includeWhatsApp, setIncludeWhatsApp] = useState(true);
  const [includeMarketplace, setIncludeMarketplace] = useState(true);
  const [includeInternational, setIncludeInternational] = useState(true);
  const [minNetPct, setMinNetPct] = useState(DEFAULT_CONFIG.minNetPct);
  const [minNetRs, setMinNetRs] = useState(DEFAULT_CONFIG.minNetRs);
  const [strategyFilter, setStrategyFilter] = useState<Strategy | "all">("all");
  const [minConfidence, setMinConfidence] = useState(0);
  const [sortBy, setSortBy] = useState<"confidence" | "netPct" | "netProfit" | "turnaround">("confidence");

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Compute
  const config: ArbitrageConfig = useMemo(() => ({
    minNetPct,
    minNetRs,
    enabledChannels: {
      whatsapp: includeWhatsApp,
      marketplace: includeMarketplace,
      international: includeInternational,
    },
    strategyFilter,
    minConfidence,
    limit: 200,
  }), [minNetPct, minNetRs, includeWhatsApp, includeMarketplace, includeInternational, strategyFilter, minConfidence]);

  const opportunities = useMemo(() => {
    const opps = scanAllAssets(assets, config);
    // Re-sort based on user selection
    return [...opps].sort((a, b) => {
      switch (sortBy) {
        case "confidence": return b.confidence - a.confidence;
        case "netPct": return b.netPct - a.netPct;
        case "netProfit": return b.netProfit - a.netProfit;
        case "turnaround": {
          const avgA = (a.turnaroundDays.min + a.turnaroundDays.max) / 2;
          const avgB = (b.turnaroundDays.min + b.turnaroundDays.max) / 2;
          return avgA - avgB; // fastest first
        }
        default: return 0;
      }
    });
  }, [assets, config, sortBy]);

  const summary: ArbitrageSummary = useMemo(() => buildSummary(opportunities), [opportunities]);

  // For strategy pill counts, compute unfiltered counts
  const unfilteredCounts = useMemo(() => {
    const allOpps = scanAllAssets(assets, { ...config, strategyFilter: "all", limit: 500 });
    const counts: Record<Strategy | "all", number> = {
      "all": allOpps.length,
      "flip": 0,
      "import": 0,
      "cross-list": 0,
      "p2p": 0,
    };
    for (const o of allOpps) counts[o.strategy]++;
    return counts;
  }, [assets, config]);

  return (
    <section className="space-y-4 text-brand-black">
      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-brand-gray/20">
        <h2 className="text-base font-semibold text-brand-black">Arbitrage Scanner</h2>
        <span className="text-xs text-brand-black/50 font-mono-numeric">
          {opportunities.length} opportunities across {assets.length} assets
        </span>
      </div>

      {/* ─── Summary Highlight Cards ─── */}
      {opportunities.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <HighlightCard
            title="Best Flip"
            icon="⚡"
            opp={summary.bestQuickFlip}
            metric={summary.bestQuickFlip ? `₹${summary.bestQuickFlip.netProfit.toLocaleString("en-IN")}` : "—"}
            subtitle={summary.bestQuickFlip ? `${(summary.bestQuickFlip.netPct * 100).toFixed(1)}% ROI · ${turnaroundLabel(summary.bestQuickFlip.turnaroundDays)}` : ""}
          />
          <HighlightCard
            title="Most Reliable"
            icon="🎯"
            opp={summary.highestConfidence}
            metric={summary.highestConfidence ? `${summary.highestConfidence.confidence}% conf` : "—"}
            subtitle={summary.highestConfidence ? `₹${summary.highestConfidence.netProfit.toLocaleString("en-IN")} profit · ${(summary.highestConfidence.netPct * 100).toFixed(1)}% ROI` : ""}
          />
          <HighlightCard
            title="Best Scale Play"
            icon="📦"
            opp={summary.bestScalePlay}
            metric={summary.bestScalePlay ? `${summary.bestScalePlay.scalable} × ₹${summary.bestScalePlay.netProfit.toLocaleString("en-IN")}` : "—"}
            subtitle={summary.bestScalePlay ? `₹${(summary.bestScalePlay.scalable * summary.bestScalePlay.netProfit).toLocaleString("en-IN")} total potential` : ""}
          />
        </div>
      )}

      {/* ─── Strategy Filter Pills ─── */}
      <div className="flex flex-wrap gap-2">
        <StrategyPill strategy="all" label="All" icon="📊" count={unfilteredCounts["all"]} active={strategyFilter === "all"} onClick={() => setStrategyFilter("all")} />
        <StrategyPill strategy="flip" label="Flip" icon="⚡" count={unfilteredCounts["flip"]} active={strategyFilter === "flip"} onClick={() => setStrategyFilter("flip")} />
        <StrategyPill strategy="import" label="Import" icon="🌍" count={unfilteredCounts["import"]} active={strategyFilter === "import"} onClick={() => setStrategyFilter("import")} />
        <StrategyPill strategy="cross-list" label="Cross-List" icon="🔄" count={unfilteredCounts["cross-list"]} active={strategyFilter === "cross-list"} onClick={() => setStrategyFilter("cross-list")} />
        <StrategyPill strategy="p2p" label="P2P" icon="💬" count={unfilteredCounts["p2p"]} active={strategyFilter === "p2p"} onClick={() => setStrategyFilter("p2p")} />
      </div>

      {/* ─── Filters Row ─── */}
      <div className="flex flex-wrap items-center gap-3 border border-brand-gray/15 bg-brand-background/30 p-3">
        {/* Channel toggles */}
        <div className="flex items-center gap-1.5">
          {[
            { label: "WA", value: includeWhatsApp, setter: setIncludeWhatsApp },
            { label: "Marketplace", value: includeMarketplace, setter: setIncludeMarketplace },
            { label: "Intl", value: includeInternational, setter: setIncludeInternational },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => opt.setter(!opt.value)}
              className={`px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide border transition ${
                opt.value
                  ? "border-brand-black bg-brand-black text-white"
                  : "border-brand-gray/30 bg-white text-brand-black hover:border-brand-black"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-brand-gray/20 hidden sm:block" />

        {/* Numeric filters */}
        <div className="flex items-center gap-1.5 text-xs">
          <label className="text-brand-black/50 uppercase tracking-wide font-semibold text-[10px]">Min ROI</label>
          <input
            type="number"
            value={(minNetPct * 100).toFixed(1)}
            onChange={(e) => setMinNetPct(Math.max(0, Number(e.target.value) / 100))}
            className="w-16 border border-brand-gray/30 px-2 py-1.5 text-xs text-brand-black font-mono-numeric focus:outline-none focus:border-brand-black bg-white"
            step="0.5"
          />
          <span className="text-brand-black/40">%</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <label className="text-brand-black/50 uppercase tracking-wide font-semibold text-[10px]">Min ₹</label>
          <input
            type="number"
            value={minNetRs}
            onChange={(e) => setMinNetRs(Math.max(0, Number(e.target.value)))}
            className="w-20 border border-brand-gray/30 px-2 py-1.5 text-xs text-brand-black font-mono-numeric focus:outline-none focus:border-brand-black bg-white"
            step="500"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <label className="text-brand-black/50 uppercase tracking-wide font-semibold text-[10px]">Min Conf</label>
          <input
            type="number"
            value={minConfidence}
            onChange={(e) => setMinConfidence(Math.max(0, Math.min(100, Number(e.target.value))))}
            className="w-14 border border-brand-gray/30 px-2 py-1.5 text-xs text-brand-black font-mono-numeric focus:outline-none focus:border-brand-black bg-white"
            step="10"
          />
        </div>

        <div className="flex-1" />

        {/* Sort selector */}
        <div className="flex items-center gap-1.5 text-xs">
          <label className="text-brand-black/50 uppercase tracking-wide font-semibold text-[10px]">Sort</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="border border-brand-gray/30 px-2 py-1.5 text-xs text-brand-black focus:outline-none focus:border-brand-black bg-white"
          >
            <option value="confidence">Confidence</option>
            <option value="netPct">ROI %</option>
            <option value="netProfit">Profit ₹</option>
            <option value="turnaround">Fastest First</option>
          </select>
        </div>
      </div>

      {/* ─── Fee Disclaimer ─── */}
      <div className="flex items-start gap-2 text-[10px] text-brand-black/60 bg-brand-background/40 border border-brand-gray/15 p-2.5">
        <svg className="w-3.5 h-3.5 text-brand-black/40 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          Per-platform fees applied (CDC 9.5%, Mainstreet 8%, etc). International includes platform buyer fees.
          Marketplace sells are consignment/source-on-order — payout timing varies.
          Confidence is penalised for marketplace sell-side and stale data. Always verify before executing.
          Signals with spreads above 500% are automatically suppressed as likely data anomalies.
        </span>
      </div>

      {/* ─── Results ─── */}
      {opportunities.length === 0 ? (
        <div className="border border-brand-gray/15 bg-white p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-brand-gray/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <p className="text-sm font-semibold text-brand-black/60">No Opportunities Found</p>
          <p className="text-xs text-brand-black/40 mt-1">Try adjusting filters or adding more listing data</p>
        </div>
      ) : isMobile ? (
        <div className="space-y-3">
          {opportunities.map((opp, idx) => (
            <OpportunityCard key={`${opp.assetId}-${opp.size}-${idx}`} opp={opp} />
          ))}
        </div>
      ) : (
        <div className="border border-brand-gray/15 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-brand-background/50 border-b-2 border-brand-gray/15">
                <tr>
                  <th className="text-left px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Asset</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Strategy</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Buy From</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Buy Price</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Sell To</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Sell Net</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Profit</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Time Horizon</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Conf / Risk</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-brand-black/60 uppercase tracking-wider text-[10px]">Scale</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opp, idx) => (
                  <OpportunityRow key={`${opp.assetId}-${opp.size}-${idx}`} opp={opp} idx={idx} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Avg Stats Footer ─── */}
      {opportunities.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 text-[10px] text-brand-black/40 uppercase tracking-wide font-semibold pt-1">
          <span>Avg ROI: {(summary.avgRoi * 100).toFixed(1)}%</span>
          <span>Avg Confidence: {summary.avgConfidence}</span>
          <span>Flips: {summary.byStrategy["flip"]}</span>
          <span>Imports: {summary.byStrategy["import"]}</span>
          <span>Cross-List: {summary.byStrategy["cross-list"]}</span>
          <span>P2P: {summary.byStrategy["p2p"]}</span>
        </div>
      )}
    </section>
  );
};

export default ArbitrageView;
