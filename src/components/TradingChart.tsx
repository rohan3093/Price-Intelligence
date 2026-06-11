import React, { useState, useMemo, useEffect } from "react";
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
import { fetchPriceHistory, markSeriesForSize, MarkSeriesPoint } from "../utils/priceHistoryApi";

interface TradingChartProps {
  /** Asset id whose daily mark-price history to plot. */
  assetId: number | string;
  /** Selected size; series is per-size, falling back to asset mark when absent. */
  size?: string;
}

type Timeframe = "7D" | "1M" | "3M" | "6M" | "1Y" | "ALL";

const MARK_COLOR = "#2563eb";
const ASK_COLOR = "#f59e0b";
const BID_COLOR = "#10b981";

// Below this many dated points we don't draw a line — a 2-point line through weeks
// misrepresents the trajectory. We show the latest value + a building-history note.
const MIN_CHART_POINTS = 5;

interface ChartDataPoint {
  date: string;
  timestamp: number;
  displayDate: string;
  mark: number;
  ask: number | null;
  bid: number | null;
}

const TimeframeButton: React.FC<{
  label: Timeframe;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold transition-all ${
      active
        ? "bg-terminal-surface-raised text-terminal-text"
        : "bg-transparent text-brand-black/60 hover:text-brand-black hover:bg-brand-gray/10"
    }`}
    title={`Show ${label} data`}
  >
    {label}
  </button>
);

const formatCompactINR = (value: number): string => {
  if (!Number.isFinite(value) || value === 0) return "₹0";
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(abs >= 1_00_00_00_000 ? 0 : 1)}Cr`;
  if (abs >= 1_00_000) return `₹${(value / 1_00_000).toFixed(abs >= 10_00_000 ? 0 : 1)}L`;
  if (abs >= 1_000) return `₹${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return `₹${value.toLocaleString("en-IN")}`;
};

const dateKeyToMs = (key: string): number => new Date(`${key}T00:00:00`).getTime();

const TIMEFRAME_MS: Record<Timeframe, number> = {
  "7D": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
  "3M": 90 * 24 * 60 * 60 * 1000,
  "6M": 180 * 24 * 60 * 60 * 1000,
  "1Y": 365 * 24 * 60 * 60 * 1000,
  "ALL": Infinity,
};

export const TradingChart: React.FC<TradingChartProps> = ({ assetId, size }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [chartType, setChartType] = useState<"area" | "line">("line");
  const [history, setHistory] = useState<MarkSeriesPoint[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHistory(null);
    fetchPriceHistory(assetId).then((days) => {
      if (cancelled) return;
      setHistory(markSeriesForSize(days, size));
    });
    return () => {
      cancelled = true;
    };
  }, [assetId, size]);

  const { chartData, totalPoints, availableTimeframes, hasAsk, hasBid } = useMemo(() => {
    const series = history ?? [];
    const now = Date.now();

    const all: ChartDataPoint[] = series
      .map((p) => ({
        date: p.date,
        timestamp: dateKeyToMs(p.date),
        displayDate: new Date(dateKeyToMs(p.date)).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        mark: p.mark,
        ask: p.bestAsk,
        bid: p.bestBid,
      }))
      .filter((p) => isFinite(p.timestamp))
      .sort((a, b) => a.timestamp - b.timestamp);

    const available: Timeframe[] = (Object.entries(TIMEFRAME_MS) as [Timeframe, number][])
      .filter(([tf, ms]) => {
        if (tf === "ALL") return all.length >= 2;
        const cutoff = now - ms;
        return all.filter((p) => p.timestamp >= cutoff).length >= 2;
      })
      .map(([tf]) => tf);

    let filtered = all;
    const ms = TIMEFRAME_MS[timeframe];
    if (ms !== Infinity) {
      const cutoff = now - ms;
      const windowed = all.filter((p) => p.timestamp >= cutoff);
      if (windowed.length >= 2) filtered = windowed;
    }

    return {
      chartData: filtered,
      totalPoints: all.length,
      availableTimeframes: available,
      hasAsk: filtered.some((p) => p.ask !== null),
      hasBid: filtered.some((p) => p.bid !== null),
    };
  }, [history, timeframe]);

  // If the active timeframe has no data, fall back to ALL so it never renders blank.
  useEffect(() => {
    if (availableTimeframes.length > 0 && !availableTimeframes.includes(timeframe)) {
      setTimeframe("ALL");
    }
  }, [availableTimeframes, timeframe]);

  const stats = useMemo(() => {
    const marks = chartData.map((d) => d.mark);
    if (marks.length === 0) return { latest: 0, high: 0, low: 0, change: 0, changePct: "0" };
    const high = Math.max(...marks);
    const low = Math.min(...marks);
    const first = marks[0];
    const last = marks[marks.length - 1];
    const change = last - first;
    const changePct = first !== 0 ? ((change / first) * 100).toFixed(2) : "0";
    return { latest: last, high, low, change, changePct };
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0]?.payload as ChartDataPoint | undefined;
    if (!data) return null;
    return (
      <div className="bg-terminal-surface border-2 border-terminal-border-strong px-3 py-2 shadow-dropdown">
        <p className="text-xs text-brand-black/60 mb-1.5">{data.displayDate}</p>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: MARK_COLOR }} />
          <span className="text-xs text-brand-black/60">Mark</span>
          <span className="text-sm font-mono-numeric font-bold ml-auto" style={{ color: MARK_COLOR }}>
            ₹{Math.round(data.mark).toLocaleString("en-IN")}
          </span>
        </div>
        {data.ask !== null && (
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ASK_COLOR }} />
            <span className="text-xs text-brand-black/60">Ask</span>
            <span className="text-sm font-mono-numeric ml-auto" style={{ color: ASK_COLOR }}>
              ₹{Math.round(data.ask).toLocaleString("en-IN")}
            </span>
          </div>
        )}
        {data.bid !== null && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: BID_COLOR }} />
            <span className="text-xs text-brand-black/60">Bid</span>
            <span className="text-sm font-mono-numeric ml-auto" style={{ color: BID_COLOR }}>
              ₹{Math.round(data.bid).toLocaleString("en-IN")}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (history === null) {
    return (
      <div className="bg-brand-background/30 border border-brand-gray/20 p-8 text-center">
        <p className="text-sm text-brand-black/50 font-medium animate-pulse">Loading price history…</p>
      </div>
    );
  }

  // No history yet
  if (totalPoints === 0) {
    return (
      <div className="bg-brand-background/30 border border-brand-gray/20 p-8 text-center">
        <svg className="w-12 h-12 mx-auto mb-3 text-brand-black/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
        <p className="text-sm text-brand-black/60 font-medium">No price history yet</p>
        <p className="text-xs text-brand-black/40 mt-1">A daily mark-price point is recorded each day — the series builds from here.</p>
      </div>
    );
  }

  // Too few dated points to draw a trustworthy line
  if (totalPoints < MIN_CHART_POINTS) {
    return (
      <div className="py-6 text-center">
        <p className="text-[10px] uppercase tracking-wider mb-1 text-brand-black/50">Mark Price</p>
        <p className="font-mono-numeric font-bold text-2xl" style={{ color: MARK_COLOR }}>
          {formatCompactINR(stats.latest)}
        </p>
        <p className="text-xs text-brand-black/40 mt-3">
          Building price history — {totalPoints} day{totalPoints !== 1 ? "s" : ""} recorded so far. The trend appears once {MIN_CHART_POINTS}+ days accrue.
        </p>
      </div>
    );
  }

  const allMarks = chartData.map((d) => d.mark);
  const yMin = Math.floor(Math.min(...allMarks) * 0.95 / 1000) * 1000;
  const yMax = Math.ceil(Math.max(...allMarks) * 1.05 / 1000) * 1000;

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

  return (
    <div className="space-y-3">
      {/* Controls */}
      {availableTimeframes.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-0.5 sm:gap-1 border border-brand-gray/30 bg-brand-background/50 p-1 flex-wrap">
            {availableTimeframes.map((tf) => (
              <TimeframeButton key={tf} label={tf} active={timeframe === tf} onClick={() => setTimeframe(tf)} />
            ))}
          </div>

          <div className="inline-flex items-center gap-1 border border-brand-gray/30 bg-brand-background/50 p-1">
            <button
              onClick={() => setChartType("area")}
              className={`px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                chartType === "area" ? "bg-terminal-surface-raised text-terminal-text" : "bg-transparent text-brand-black/60 hover:text-brand-black"
              }`}
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
                chartType === "line" ? "bg-terminal-surface-raised text-terminal-text" : "bg-transparent text-brand-black/60 hover:text-brand-black"
              }`}
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

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-2.5 sm:gap-3 text-sm">
        <div className="min-w-0 text-left sm:text-center">
          <p className="text-[10px] sm:text-xs uppercase tracking-wide mb-0.5 sm:mb-1 truncate" style={{ color: MARK_COLOR, opacity: 0.8 }}>
            Mark
          </p>
          <p className="font-mono-numeric font-semibold text-[13px] sm:text-sm truncate" style={{ color: MARK_COLOR }}>
            <span className="sm:hidden">{formatCompactINR(stats.latest)}</span>
            <span className="hidden sm:inline">₹{Math.round(stats.latest).toLocaleString("en-IN")}</span>
          </p>
        </div>
        <div className="min-w-0 text-left sm:text-center">
          <p className="text-[10px] sm:text-xs text-brand-black/50 uppercase tracking-wide mb-0.5 sm:mb-1 whitespace-nowrap">High / Low</p>
          <p className="font-mono-numeric font-semibold text-[13px] sm:text-sm text-brand-black whitespace-nowrap">
            <span className="sm:hidden">{formatCompactINR(stats.high)} / {formatCompactINR(stats.low)}</span>
            <span className="hidden sm:inline">₹{Math.round(stats.high).toLocaleString("en-IN")} / ₹{Math.round(stats.low).toLocaleString("en-IN")}</span>
          </p>
        </div>
        <div className="min-w-0 text-left sm:text-center">
          <p className="text-[10px] sm:text-xs text-brand-black/50 uppercase tracking-wide mb-0.5 sm:mb-1">Change</p>
          <p className={`font-mono-numeric font-semibold text-[13px] sm:text-sm ${stats.change >= 0 ? "text-up" : "text-down"}`}>
            {stats.change >= 0 ? "+" : ""}{stats.changePct}%
          </p>
        </div>
      </div>

      {chartData.length < 10 && (
        <div className="flex items-start gap-2 text-xs text-brand-black/50 bg-brand-background/50 border border-brand-gray/15 p-2.5">
          <svg className="w-4 h-4 text-brand-black/30 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Building price history — {totalPoints} day{totalPoints !== 1 ? "s" : ""} recorded so far. The trend becomes more meaningful as more daily points accrue.</span>
        </div>
      )}

      {/* Chart */}
      <div className="bg-terminal-surface border border-brand-gray/20 p-2 sm:p-4">
        <ResponsiveContainer width="100%" height={chartData.length < 10 ? 200 : 320}>
          {chartType === "area" ? (
            <AreaChart key="area" data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <defs>
                <linearGradient id="markGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={MARK_COLOR} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={MARK_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis {...sharedAxisProps.xAxis} />
              <YAxis {...sharedAxisProps.yAxis} />
              <Tooltip content={<CustomTooltip />} />
              {hasAsk && (
                <Area type="monotone" dataKey="ask" stroke={ASK_COLOR} strokeWidth={1} strokeDasharray="4 3"
                  fill="none" dot={false} connectNulls isAnimationActive={false} name="Ask" />
              )}
              {hasBid && (
                <Area type="monotone" dataKey="bid" stroke={BID_COLOR} strokeWidth={1} strokeDasharray="4 3"
                  fill="none" dot={false} connectNulls isAnimationActive={false} name="Bid" />
              )}
              <Area type="monotone" dataKey="mark" stroke={MARK_COLOR} strokeWidth={2}
                fill="url(#markGrad)" dot={{ r: 2.5, fill: MARK_COLOR }}
                connectNulls isAnimationActive={false} name="Mark" />
            </AreaChart>
          ) : (
            <LineChart key="line" data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis {...sharedAxisProps.xAxis} />
              <YAxis {...sharedAxisProps.yAxis} />
              <Tooltip content={<CustomTooltip />} />
              {hasAsk && (
                <Line type="monotone" dataKey="ask" stroke={ASK_COLOR} strokeWidth={1} strokeDasharray="4 3"
                  dot={false} connectNulls isAnimationActive={false} name="Ask" />
              )}
              {hasBid && (
                <Line type="monotone" dataKey="bid" stroke={BID_COLOR} strokeWidth={1} strokeDasharray="4 3"
                  dot={false} connectNulls isAnimationActive={false} name="Bid" />
              )}
              <Line type="monotone" dataKey="mark" stroke={MARK_COLOR} strokeWidth={2}
                dot={{ r: 2.5, fill: MARK_COLOR, stroke: MARK_COLOR }}
                connectNulls isAnimationActive={false} name="Mark" />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend + Footer */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: MARK_COLOR }} />
            <span className="text-[11px] text-brand-black/60 font-medium">Mark</span>
          </div>
          {hasAsk && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: ASK_COLOR }} />
              <span className="text-[11px] text-brand-black/60 font-medium">Ask</span>
            </div>
          )}
          {hasBid && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: BID_COLOR }} />
              <span className="text-[11px] text-brand-black/60 font-medium">Bid</span>
            </div>
          )}
        </div>
        <p className="text-[11px] text-brand-black/40">
          {chartData.length < 10 ? (
            <>All {chartData.length} day{chartData.length !== 1 ? "s" : ""}</>
          ) : (
            <>{chartData.length} day{chartData.length !== 1 ? "s" : ""} &bull; {timeframe}</>
          )}
        </p>
      </div>
    </div>
  );
};
