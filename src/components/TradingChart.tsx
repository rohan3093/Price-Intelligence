import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { PricePoint } from "../types";

interface TradingChartProps {
  pricePoints: any;
}

type Timeframe = "1D" | "7D" | "1M" | "3M" | "6M" | "1Y" | "ALL";
type Channel = "whatsapp" | "marketplace" | "international";

const CHANNEL_META: Record<Channel, { label: string; color: string }> = {
  whatsapp:      { label: "WhatsApp",      color: "#10b981" },
  marketplace:   { label: "Marketplace",   color: "#3b82f6" },
  international: { label: "International", color: "#f59e0b" },
};

const CHANNELS: Channel[] = ["whatsapp", "marketplace", "international"];
const DATA_KEYS: Record<Channel, string> = {
  whatsapp: "whatsappPrice",
  marketplace: "marketplacePrice",
  international: "internationalPrice",
};

// Below this raw observation count we don't draw a chart — a 4-point line through
// weeks of timestamps misrepresents listing observations as a price trajectory.
const SPARSE_THRESHOLD = 8;

interface RawPoint {
  timestamp: number;
  price: number;
  channel: Channel;
}

interface ChartDataPoint {
  timestamp: number;
  date: string;
  displayDate: string;
  whatsappPrice?: number;
  marketplacePrice?: number;
  internationalPrice?: number;
}

const TimeframeButton: React.FC<{
  label: Timeframe;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}> = ({ label, active, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold transition-all ${
      disabled
        ? "bg-transparent text-brand-black/25 cursor-not-allowed"
        : active
        ? "bg-brand-black text-white"
        : "bg-transparent text-brand-black/60 hover:text-brand-black hover:bg-brand-gray/10"
    }`}
    style={{ borderRadius: "6px" }}
    title={disabled ? "Need 10+ data points to enable timeframe filtering" : `Show ${label} data`}
    aria-disabled={disabled}
  >
    {label}
  </button>
);

// Compact currency formatter for tight mobile layouts
const formatCompactINR = (value: number): string => {
  if (!Number.isFinite(value) || value === 0) return "₹0";
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(abs >= 1_00_00_00_000 ? 0 : 1)}Cr`;
  if (abs >= 1_00_000) return `₹${(value / 1_00_000).toFixed(abs >= 10_00_000 ? 0 : 1)}L`;
  if (abs >= 1_000) return `₹${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return `₹${value.toLocaleString("en-IN")}`;
};

export const TradingChart: React.FC<TradingChartProps> = ({ pricePoints }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [chartType, setChartType] = useState<"area" | "line">("line");

  const { chartData, activeChannels, totalPoints, channelStats } = useMemo(() => {
    const raw: RawPoint[] = [];
    const now = Date.now();

    const addPoints = (points: PricePoint[], channel: Channel) => {
      points.forEach((p) => {
        if (p.price == null || !p.lastSeen) return;
        // Sanity filter: drop zero/negative and absurdly high prices (likely scrape errors).
        if (p.price <= 0 || p.price > 10_00_000) return;

        let ts: number;
        const ls = p.lastSeen as any;
        if (typeof ls === "string") {
          ts = new Date(ls).getTime();
        } else if (ls instanceof Date) {
          ts = ls.getTime();
        } else if (typeof ls === "object" && typeof ls.toDate === "function") {
          // Firestore Timestamp
          ts = ls.toDate().getTime();
        } else if (typeof ls === "object" && typeof ls.seconds === "number") {
          // Raw Firestore Timestamp shape
          ts = ls.seconds * 1000;
        } else {
          return;
        }
        if (isNaN(ts)) return;

        raw.push({ timestamp: ts, price: p.price, channel });
      });
    };

    if (pricePoints && typeof pricePoints === "object") {
      if ("whatsapp" in pricePoints && Array.isArray(pricePoints.whatsapp)) {
        addPoints(pricePoints.whatsapp as PricePoint[], "whatsapp");
      }
      if ("marketplace" in pricePoints && Array.isArray(pricePoints.marketplace)) {
        addPoints(pricePoints.marketplace as PricePoint[], "marketplace");
      }
      if ("international" in pricePoints && Array.isArray(pricePoints.international)) {
        addPoints(pricePoints.international as PricePoint[], "international");
      }
      // Legacy structure
      if ("b2b" in pricePoints && Array.isArray(pricePoints.b2b)) {
        addPoints(pricePoints.b2b as PricePoint[], "whatsapp");
      }
      if ("endCustomer" in pricePoints && Array.isArray(pricePoints.endCustomer)) {
        addPoints(pricePoints.endCustomer as PricePoint[], "marketplace");
      }
      if ("stockxGoat" in pricePoints && Array.isArray(pricePoints.stockxGoat)) {
        addPoints(pricePoints.stockxGoat as PricePoint[], "international");
      }
    }

    raw.sort((a, b) => a.timestamp - b.timestamp);

    // Timeframe filtering (skip if < 10 points)
    let filtered = raw;
    if (raw.length >= 10) {
      let cutoff = 0;
      switch (timeframe) {
        case "1D":  cutoff = now - 1 * 24 * 60 * 60 * 1000; break;
        case "7D":  cutoff = now - 7 * 24 * 60 * 60 * 1000; break;
        case "1M":  cutoff = now - 30 * 24 * 60 * 60 * 1000; break;
        case "3M":  cutoff = now - 90 * 24 * 60 * 60 * 1000; break;
        case "6M":  cutoff = now - 180 * 24 * 60 * 60 * 1000; break;
        case "1Y":  cutoff = now - 365 * 24 * 60 * 60 * 1000; break;
        case "ALL": cutoff = 0; break;
      }
      if (cutoff > 0) filtered = raw.filter((d) => d.timestamp >= cutoff);
    }

    // Aggregate by day: best (lowest) price per channel
    const dayMap = new Map<string, {
      whatsappPrices: number[];
      marketplacePrices: number[];
      internationalPrices: number[];
      timestamp: number;
    }>();

    filtered.forEach((d) => {
      const dayKey = new Date(d.timestamp).toISOString().split("T")[0];
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, { whatsappPrices: [], marketplacePrices: [], internationalPrices: [], timestamp: d.timestamp });
      }
      const bucket = dayMap.get(dayKey)!;
      if (d.channel === "whatsapp") bucket.whatsappPrices.push(d.price);
      else if (d.channel === "marketplace") bucket.marketplacePrices.push(d.price);
      else bucket.internationalPrices.push(d.price);
    });

    const found: Set<Channel> = new Set();
    const points: ChartDataPoint[] = Array.from(dayMap.entries())
      .map(([day, data]) => {
        const wp = data.whatsappPrices.length > 0 ? Math.min(...data.whatsappPrices) : undefined;
        const mp = data.marketplacePrices.length > 0 ? Math.min(...data.marketplacePrices) : undefined;
        const ip = data.internationalPrices.length > 0 ? Math.min(...data.internationalPrices) : undefined;
        if (wp !== undefined) found.add("whatsapp");
        if (mp !== undefined) found.add("marketplace");
        if (ip !== undefined) found.add("international");
        return {
          timestamp: data.timestamp,
          date: day,
          displayDate: new Date(data.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
          whatsappPrice: wp,
          marketplacePrice: mp,
          internationalPrice: ip,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    // Per-channel raw stats — used for the sparse fallback view.
    const channelStats: Record<Channel, { best: number; count: number }> = {
      whatsapp: { best: 0, count: 0 },
      marketplace: { best: 0, count: 0 },
      international: { best: 0, count: 0 },
    };
    for (const r of raw) {
      const cs = channelStats[r.channel];
      cs.count += 1;
      cs.best = cs.count === 1 ? r.price : Math.min(cs.best, r.price);
    }

    return { chartData: points, activeChannels: found, totalPoints: raw.length, channelStats };
  }, [pricePoints, timeframe]);

  const stats = useMemo(() => {
    const latests: Partial<Record<Channel, number>> = {};
    const allPrices: number[] = [];

    for (const ch of CHANNELS) {
      const key = DATA_KEYS[ch] as keyof ChartDataPoint;
      const prices = chartData.map((d) => d[key] as number | undefined).filter((p): p is number => p !== undefined);
      allPrices.push(...prices);
      if (prices.length > 0) latests[ch] = prices[prices.length - 1];
    }

    if (allPrices.length === 0) {
      return { latests: {} as Partial<Record<Channel, number>>, high: 0, low: 0, change: 0, changePct: "0" };
    }

    const high = Math.max(...allPrices);
    const low = Math.min(...allPrices);

    const primaryChannel: Channel = activeChannels.has("marketplace") ? "marketplace"
      : activeChannels.has("whatsapp") ? "whatsapp" : "international";
    const primaryKey = DATA_KEYS[primaryChannel] as keyof ChartDataPoint;
    const primaryPrices = chartData.map((d) => d[primaryKey] as number | undefined).filter((p): p is number => p !== undefined);
    const first = primaryPrices[0] ?? 0;
    const last = primaryPrices[primaryPrices.length - 1] ?? 0;
    const change = last - first;
    const changePct = first !== 0 ? ((change / first) * 100).toFixed(2) : "0";

    return { latests, high, low, change, changePct };
  }, [chartData, activeChannels]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0]?.payload as ChartDataPoint | undefined;
    if (!data) return null;

    const rows: { channel: Channel; price: number }[] = [];
    if (data.whatsappPrice !== undefined) rows.push({ channel: "whatsapp", price: data.whatsappPrice });
    if (data.marketplacePrice !== undefined) rows.push({ channel: "marketplace", price: data.marketplacePrice });
    if (data.internationalPrice !== undefined) rows.push({ channel: "international", price: data.internationalPrice });

    if (rows.length === 0) return null;

    return (
      <div className="bg-white border-2 border-brand-black px-3 py-2 shadow-lg" style={{ borderRadius: "8px" }}>
        <p className="text-xs text-brand-black/60 mb-1.5">{data.displayDate}</p>
        {rows.map((r) => (
          <div key={r.channel} className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHANNEL_META[r.channel].color }} />
            <span className="text-xs text-brand-black/60">{CHANNEL_META[r.channel].label}</span>
            <span className="text-sm font-mono-numeric font-bold ml-auto" style={{ color: CHANNEL_META[r.channel].color }}>
              ₹{r.price.toLocaleString("en-IN")}
            </span>
          </div>
        ))}
        {rows.length >= 2 && (
          <div className="border-t border-brand-gray/20 mt-1.5 pt-1">
            <span className="text-[10px] text-brand-black/40">
              Spread: ₹{(Math.max(...rows.map((r) => r.price)) - Math.min(...rows.map((r) => r.price))).toLocaleString("en-IN")}
            </span>
          </div>
        )}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="bg-brand-background/30 border border-brand-gray/20 p-8 text-center" style={{ borderRadius: "12px" }}>
        <svg className="w-12 h-12 mx-auto mb-3 text-brand-black/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
        <p className="text-sm text-brand-black/60 font-medium">No price history available</p>
        <p className="text-xs text-brand-black/40 mt-1">Data will appear as it's collected</p>
      </div>
    );
  }

  const hasEnoughDataForTimeframes = totalPoints >= 10;
  const isSparse = totalPoints < SPARSE_THRESHOLD;
  const sparseChannels = CHANNELS.filter((ch) => channelStats[ch].count > 0);

  const allVisiblePrices = chartData.flatMap((d) =>
    [d.whatsappPrice, d.marketplacePrice, d.internationalPrice].filter((p): p is number => p !== undefined)
  );
  const yMin = Math.floor(Math.min(...allVisiblePrices) * 0.95 / 1000) * 1000;
  const yMax = Math.ceil(Math.max(...allVisiblePrices) * 1.05 / 1000) * 1000;

  const sharedAxisProps = {
    xAxis: {
      dataKey: "displayDate" as const,
      stroke: "#9ca3af",
      style: { fontSize: "11px" },
      tickLine: false,
    },
    yAxis: {
      stroke: "#9ca3af",
      style: { fontSize: "11px" },
      tickLine: false,
      domain: [yMin, yMax] as [number, number],
      tickFormatter: (value: number) => `₹${(value / 1000).toFixed(0)}k`,
    },
  };

  // Determine desktop grid layout class based on active channel count.
  // On mobile we always use a 2-col grid so labels don't overlap.
  const colCount = activeChannels.size + 2; // channels + high/low + change
  const desktopGridClass = colCount <= 3 ? "sm:grid-cols-3" : colCount === 4 ? "sm:grid-cols-4" : "sm:grid-cols-5";

  return (
    <div className="space-y-3">
      {/* Controls — hidden when data is sparse */}
      {!isSparse && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-0.5 sm:gap-1 border border-brand-gray/30 bg-brand-background/50 p-1 flex-wrap" style={{ borderRadius: "8px" }}>
            {(["1D", "7D", "1M", "3M", "6M", "1Y", "ALL"] as Timeframe[]).map((tf) => (
              <TimeframeButton key={tf} label={tf} active={timeframe === tf} onClick={() => setTimeframe(tf)} disabled={!hasEnoughDataForTimeframes} />
            ))}
          </div>

          <div className="inline-flex items-center gap-1 border border-brand-gray/30 bg-brand-background/50 p-1" style={{ borderRadius: "8px" }}>
            <button
              onClick={() => setChartType("area")}
              className={`px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                chartType === "area" ? "bg-brand-black text-white" : "bg-transparent text-brand-black/60 hover:text-brand-black"
              }`}
              style={{ borderRadius: "6px" }}
              title="Area Chart"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <span className="hidden sm:inline">Area</span>
            </button>
            <button
              onClick={() => setChartType("line")}
              className={`px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                chartType === "line" ? "bg-brand-black text-white" : "bg-transparent text-brand-black/60 hover:text-brand-black"
              }`}
              style={{ borderRadius: "6px" }}
              title="Line Chart"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4" />
              </svg>
              <span className="hidden sm:inline">Line</span>
            </button>
          </div>
        </div>
      )}

      {/* Stats Bar — 2-col on mobile, responsive on larger screens to prevent label overlap */}
      <div className={`grid grid-cols-2 ${desktopGridClass} gap-x-3 gap-y-2.5 sm:gap-3 text-sm`}>
        {CHANNELS.map((ch) =>
          activeChannels.has(ch) && stats.latests[ch] !== undefined ? (
            <div key={ch} className="min-w-0 text-left sm:text-center">
              <p
                className="text-[10px] sm:text-xs uppercase tracking-wide mb-0.5 sm:mb-1 truncate"
                style={{ color: CHANNEL_META[ch].color, opacity: 0.8 }}
                title={CHANNEL_META[ch].label}
              >
                {CHANNEL_META[ch].label}
              </p>
              <p
                className="font-mono-numeric font-semibold text-[13px] sm:text-sm truncate"
                style={{ color: CHANNEL_META[ch].color }}
              >
                <span className="sm:hidden">{formatCompactINR(stats.latests[ch]!)}</span>
                <span className="hidden sm:inline">₹{stats.latests[ch]!.toLocaleString("en-IN")}</span>
              </p>
            </div>
          ) : null
        )}
        <div className="min-w-0 text-left sm:text-center">
          <p className="text-[10px] sm:text-xs text-brand-black/50 uppercase tracking-wide mb-0.5 sm:mb-1 whitespace-nowrap">
            High / Low
          </p>
          <p className="font-mono-numeric font-semibold text-[13px] sm:text-sm text-brand-black whitespace-nowrap">
            <span className="sm:hidden">{formatCompactINR(stats.high)} / {formatCompactINR(stats.low)}</span>
            <span className="hidden sm:inline">₹{stats.high.toLocaleString("en-IN")} / ₹{stats.low.toLocaleString("en-IN")}</span>
          </p>
        </div>
        <div className="min-w-0 text-left sm:text-center">
          <p className="text-[10px] sm:text-xs text-brand-black/50 uppercase tracking-wide mb-0.5 sm:mb-1">Change</p>
          <p className={`font-mono-numeric font-semibold text-[13px] sm:text-sm ${stats.change >= 0 ? "text-green-600" : "text-red-600"}`}>
            {stats.change >= 0 ? "+" : ""}{stats.changePct}%
          </p>
        </div>
      </div>

      {/* Sparse data advisory — only for non-sparse-but-thin-day-count cases.
          When isSparse is true, the replacement view below carries its own line. */}
      {!isSparse && chartData.length < 5 && chartData.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-brand-black/50 bg-brand-background/50 border border-brand-gray/15 p-2.5" style={{ borderRadius: "8px" }}>
          <svg className="w-4 h-4 text-brand-black/30 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Building price history — only {chartData.length} data point{chartData.length !== 1 ? "s" : ""} collected so far. The trend will become more meaningful as more data is gathered over the coming days.</span>
        </div>
      )}

      {/* Chart (or sparse-data fallback) */}
      {isSparse ? (
        <div className="py-4">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.max(sparseChannels.length, 1)}, 1fr)`,
            }}
          >
            {sparseChannels.map((ch) => {
              const count = channelStats[ch].count;
              return (
                <div key={ch} className="text-center min-w-0">
                  <p
                    className="text-[10px] uppercase tracking-wider mb-1 truncate"
                    style={{ color: CHANNEL_META[ch].color, opacity: 0.7 }}
                    title={CHANNEL_META[ch].label}
                  >
                    {CHANNEL_META[ch].label}
                  </p>
                  <p
                    className="font-mono-numeric font-bold text-lg truncate"
                    style={{ color: CHANNEL_META[ch].color }}
                  >
                    {formatCompactINR(stats.latests[ch] ?? 0)}
                  </p>
                  <p className="text-[10px] text-brand-black/35 mt-0.5">
                    {count} listing{count !== 1 ? "s" : ""}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-brand-black/30 text-center mt-5">
            Price history unavailable — {totalPoints} observation{totalPoints !== 1 ? "s" : ""} recorded
          </p>
        </div>
      ) : (
        <div className="bg-white border border-brand-gray/20 p-2 sm:p-4" style={{ borderRadius: "12px" }}>
          <ResponsiveContainer width="100%" height={chartData.length < 10 ? 200 : 320}>
            {chartType === "area" ? (
              <AreaChart key="area" data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <defs>
                  <linearGradient id="whatsappGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="marketplaceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="internationalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis {...sharedAxisProps.xAxis} />
                <YAxis {...sharedAxisProps.yAxis} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="whatsappPrice" stroke="#10b981" strokeWidth={2}
                  fill="url(#whatsappGrad)" dot={{ r: 3, fill: "#10b981" }}
                  connectNulls isAnimationActive={false} name="WhatsApp" />
                <Area type="monotone" dataKey="marketplacePrice" stroke="#3b82f6" strokeWidth={2}
                  fill="url(#marketplaceGrad)" dot={{ r: 3, fill: "#3b82f6" }}
                  connectNulls isAnimationActive={false} name="Marketplace" />
                <Area type="monotone" dataKey="internationalPrice" stroke="#f59e0b" strokeWidth={2}
                  fill="url(#internationalGrad)" dot={{ r: 3, fill: "#f59e0b" }}
                  connectNulls isAnimationActive={false} name="International" />
              </AreaChart>
            ) : (
              <LineChart key="line" data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis {...sharedAxisProps.xAxis} />
                <YAxis {...sharedAxisProps.yAxis} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="whatsappPrice" stroke="#10b981" strokeWidth={2}
                  dot={{ r: 3, fill: "#10b981", stroke: "#10b981" }}
                  connectNulls isAnimationActive={false} name="WhatsApp" />
                <Line type="monotone" dataKey="marketplacePrice" stroke="#3b82f6" strokeWidth={2}
                  dot={{ r: 3, fill: "#3b82f6", stroke: "#3b82f6" }}
                  connectNulls isAnimationActive={false} name="Marketplace" />
                <Line type="monotone" dataKey="internationalPrice" stroke="#f59e0b" strokeWidth={2}
                  dot={{ r: 3, fill: "#f59e0b", stroke: "#f59e0b" }}
                  connectNulls isAnimationActive={false} name="International" />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend (hidden when sparse — no chart line for it to describe) + Footer */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        {!isSparse && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-4">
            {CHANNELS.map((ch) =>
              activeChannels.has(ch) ? (
                <div key={ch} className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: CHANNEL_META[ch].color }} />
                  <span className="text-[11px] text-brand-black/60 font-medium">{CHANNEL_META[ch].label}</span>
                </div>
              ) : null
            )}
          </div>
        )}
        <p className="text-[11px] text-brand-black/40">
          {chartData.length < 10 ? (
            <>All {chartData.length} day{chartData.length !== 1 ? "s" : ""} &bull; {totalPoints} price point{totalPoints !== 1 ? "s" : ""}</>
          ) : (
            <>{chartData.length} day{chartData.length !== 1 ? "s" : ""} &bull; {timeframe}</>
          )}
        </p>
      </div>
    </div>
  );
};
