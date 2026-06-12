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
import {
  fetchPriceHistory,
  markSeriesForSize,
  channelSeriesForSize,
  PriceHistoryDay,
  ChannelKey,
} from "../utils/priceHistoryApi";

interface TradingChartProps {
  /** Asset id whose daily mark-price history to plot. */
  assetId: number | string;
  /** Selected size; series is per-size, falling back to asset mark when absent. */
  size?: string;
}

type Timeframe = "7D" | "1M" | "3M" | "6M" | "1Y" | "ALL";

// Mark is the bold primary; channels are thinner, muted, in their brand colors.
const MARK_COLOR = "#111827";
const CHANNEL_META: Record<ChannelKey, { label: string; color: string }> = {
  whatsapp: { label: "WhatsApp", color: "#10b981" },
  marketplace: { label: "Marketplace", color: "#3b82f6" },
  international: { label: "International", color: "#f59e0b" },
};
const CHANNELS: ChannelKey[] = ["whatsapp", "marketplace", "international"];

// Below this many dated points we don't draw a line — a 2-point line through weeks
// misrepresents the trajectory. We show the latest value + a building-history note.
const MIN_CHART_POINTS = 5;

interface ChartDataPoint {
  date: string;
  timestamp: number;
  displayDate: string;
  mark?: number;
  whatsapp?: number;
  marketplace?: number;
  international?: number;
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

const isDesktop = (): boolean =>
  typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches;

export const TradingChart: React.FC<TradingChartProps> = ({ assetId, size }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [chartType, setChartType] = useState<"area" | "line">("line");
  const [days, setDays] = useState<PriceHistoryDay[] | null>(null);
  // Default: mark + channels on desktop; mark-only on mobile (toggle reveals channels).
  const [showChannels, setShowChannels] = useState<boolean>(isDesktop());

  useEffect(() => {
    let cancelled = false;
    setDays(null);
    fetchPriceHistory(assetId).then((d) => {
      if (!cancelled) setDays(d);
    });
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  const { chartData, totalPoints, availableTimeframes, channelsWithData } = useMemo(() => {
    const history = days ?? [];
    const now = Date.now();

    const markSeries = markSeriesForSize(history, size);
    const byDate = new Map<string, ChartDataPoint>();

    const ensure = (date: string): ChartDataPoint => {
      let pt = byDate.get(date);
      if (!pt) {
        const ts = dateKeyToMs(date);
        pt = {
          date,
          timestamp: ts,
          displayDate: new Date(ts).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        };
        byDate.set(date, pt);
      }
      return pt;
    };

    markSeries.forEach((p) => {
      ensure(p.date).mark = p.mark;
    });

    const channelsWithData: ChannelKey[] = [];
    CHANNELS.forEach((ch) => {
      const series = channelSeriesForSize(history, size, ch);
      if (series.length > 0) channelsWithData.push(ch);
      series.forEach((p) => {
        (ensure(p.date) as any)[ch] = p.value;
      });
    });

    const all = Array.from(byDate.values())
      .filter((p) => isFinite(p.timestamp))
      .sort((a, b) => a.timestamp - b.timestamp);

    const available: Timeframe[] = (Object.entries(TIMEFRAME_MS) as [Timeframe, number][])
      .filter(([, ms]) => {
        const pts = ms === Infinity ? all : all.filter((p) => p.timestamp >= now - ms);
        return pts.filter((p) => p.mark !== undefined).length >= 2;
      })
      .map(([tf]) => tf);

    let filtered = all;
    const ms = TIMEFRAME_MS[timeframe];
    if (ms !== Infinity) {
      const windowed = all.filter((p) => p.timestamp >= now - ms);
      if (windowed.filter((p) => p.mark !== undefined).length >= 2) filtered = windowed;
    }

    return {
      chartData: filtered,
      totalPoints: all.filter((p) => p.mark !== undefined).length,
      availableTimeframes: available,
      channelsWithData,
    };
  }, [days, size, timeframe]);

  // If the active timeframe has no data, fall back to ALL so it never renders blank.
  useEffect(() => {
    if (availableTimeframes.length > 0 && !availableTimeframes.includes(timeframe)) {
      setTimeframe("ALL");
    }
  }, [availableTimeframes, timeframe]);

  const stats = useMemo(() => {
    const marks = chartData.map((d) => d.mark).filter((m): m is number => m !== undefined);
    if (marks.length === 0) return { latest: 0, high: 0, low: 0, change: 0, changePct: "0" };
    const high = Math.max(...marks);
    const low = Math.min(...marks);
    const first = marks[0];
    const last = marks[marks.length - 1];
    const change = last - first;
    const changePct = first !== 0 ? ((change / first) * 100).toFixed(2) : "0";
    return { latest: last, high, low, change, changePct };
  }, [chartData]);

  const visibleChannels = showChannels ? channelsWithData : [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0]?.payload as ChartDataPoint | undefined;
    if (!data) return null;
    const rows: { label: string; color: string; value: number }[] = [];
    if (data.mark !== undefined) rows.push({ label: "Mark", color: MARK_COLOR, value: data.mark });
    visibleChannels.forEach((ch) => {
      const v = data[ch];
      if (typeof v === "number") rows.push({ label: CHANNEL_META[ch].label, color: CHANNEL_META[ch].color, value: v });
    });
    if (rows.length === 0) return null;
    return (
      <div className="bg-terminal-surface border-2 border-terminal-border-strong px-3 py-2 shadow-dropdown">
        <p className="text-xs text-brand-black/60 mb-1.5">{data.displayDate}</p>
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
            <span className="text-xs text-brand-black/60">{r.label}</span>
            <span className="text-sm font-mono-numeric font-bold ml-auto" style={{ color: r.color }}>
              ₹{Math.round(r.value).toLocaleString("en-IN")}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Loading state
  if (days === null) {
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

  const allMarks = chartData.map((d) => d.mark).filter((m): m is number => m !== undefined);
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        {availableTimeframes.length > 1 ? (
          <div className="inline-flex items-center gap-0.5 sm:gap-1 border border-brand-gray/30 bg-brand-background/50 p-1 flex-wrap">
            {availableTimeframes.map((tf) => (
              <TimeframeButton key={tf} label={tf} active={timeframe === tf} onClick={() => setTimeframe(tf)} />
            ))}
          </div>
        ) : <span />}

        <div className="inline-flex items-center gap-1">
          {channelsWithData.length > 0 && (
            <button
              onClick={() => setShowChannels((s) => !s)}
              className={`px-3 py-1.5 text-xs font-semibold transition-all border ${
                showChannels
                  ? "bg-terminal-surface-raised text-terminal-text border-terminal-border-strong"
                  : "bg-brand-background/50 text-brand-black/60 hover:text-brand-black border-brand-gray/30"
              }`}
              title="Toggle per-channel lines"
            >
              Channels
            </button>
          )}
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
      </div>

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
                  <stop offset="0%" stopColor={MARK_COLOR} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={MARK_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis {...sharedAxisProps.xAxis} />
              <YAxis {...sharedAxisProps.yAxis} />
              <Tooltip content={<CustomTooltip />} />
              {visibleChannels.map((ch) => (
                <Area key={ch} type="monotone" dataKey={ch} stroke={CHANNEL_META[ch].color} strokeWidth={1}
                  strokeOpacity={0.7} strokeDasharray="4 3" fill="none" dot={false}
                  connectNulls={false} isAnimationActive={false} name={CHANNEL_META[ch].label} />
              ))}
              <Area type="monotone" dataKey="mark" stroke={MARK_COLOR} strokeWidth={2.5}
                fill="url(#markGrad)" dot={{ r: 2.5, fill: MARK_COLOR }}
                connectNulls isAnimationActive={false} name="Mark" />
            </AreaChart>
          ) : (
            <LineChart key="line" data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis {...sharedAxisProps.xAxis} />
              <YAxis {...sharedAxisProps.yAxis} />
              <Tooltip content={<CustomTooltip />} />
              {visibleChannels.map((ch) => (
                <Line key={ch} type="monotone" dataKey={ch} stroke={CHANNEL_META[ch].color} strokeWidth={1}
                  strokeOpacity={0.7} strokeDasharray="4 3" dot={false}
                  connectNulls={false} isAnimationActive={false} name={CHANNEL_META[ch].label} />
              ))}
              <Line type="monotone" dataKey="mark" stroke={MARK_COLOR} strokeWidth={2.5}
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
          {visibleChannels.map((ch) => (
            <div key={ch} className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: CHANNEL_META[ch].color }} />
              <span className="text-[11px] text-brand-black/60 font-medium">{CHANNEL_META[ch].label}</span>
            </div>
          ))}
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
