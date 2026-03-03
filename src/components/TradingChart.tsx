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
  pricePoints: any; // Channel-based or legacy structure
}

type Timeframe = "1D" | "7D" | "1M" | "3M" | "6M" | "1Y" | "ALL";

interface ChartDataPoint {
  timestamp: number;
  date: string;
  price: number;
  channel?: string;
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
    className={`px-3 py-1.5 text-xs font-semibold transition-all ${
      disabled
        ? "bg-transparent text-brand-black/30 cursor-not-allowed"
        : active
        ? "bg-brand-black text-white"
        : "bg-transparent text-brand-black/60 hover:text-brand-black hover:bg-brand-gray/10"
    }`}
    style={{ borderRadius: "6px" }}
  >
    {label}
  </button>
);

/**
 * Professional trading terminal style chart
 * No interpretations, no suggestions - just clean data visualization
 * Users are smart enough to interpret the data themselves
 */
export const TradingChart: React.FC<TradingChartProps> = ({
  pricePoints,
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [chartType, setChartType] = useState<"area" | "line">("area");

  // Extract and normalize price data from channel-based or legacy structure
  const chartData = useMemo(() => {
    const dataPoints: ChartDataPoint[] = [];
    const now = Date.now();

    // Helper to add price points
    const addPricePoints = (points: PricePoint[], channel: string) => {
      points.forEach((p) => {
        if (p.price && p.lastSeen) {
          const date = typeof p.lastSeen === "string" ? new Date(p.lastSeen) : p.lastSeen;
          dataPoints.push({
            timestamp: date.getTime(),
            date: date.toISOString(),
            price: p.price,
            channel,
          });
        }
      });
    };

    // Extract from channel-based structure
    if (pricePoints && typeof pricePoints === "object") {
      if ("whatsapp" in pricePoints && Array.isArray(pricePoints.whatsapp)) {
        addPricePoints(pricePoints.whatsapp, "WhatsApp");
      }
      if ("marketplace" in pricePoints && Array.isArray(pricePoints.marketplace)) {
        addPricePoints(pricePoints.marketplace, "Marketplace");
      }
      if ("international" in pricePoints && Array.isArray(pricePoints.international)) {
        addPricePoints(pricePoints.international, "International");
      }
      // Legacy structure
      if ("b2b" in pricePoints && Array.isArray(pricePoints.b2b)) {
        addPricePoints(pricePoints.b2b, "B2B");
      }
      if ("endCustomer" in pricePoints && Array.isArray(pricePoints.endCustomer)) {
        addPricePoints(pricePoints.endCustomer, "Marketplace");
      }
      if ("stockxGoat" in pricePoints && Array.isArray(pricePoints.stockxGoat)) {
        addPricePoints(pricePoints.stockxGoat, "International");
      }
    }

    // Sort by timestamp
    dataPoints.sort((a, b) => a.timestamp - b.timestamp);

    // Filter by timeframe - BUT always show all data if there are fewer than 10 points
    let filteredData = dataPoints;
    
    if (dataPoints.length >= 10) {
      let cutoffTime = now;
      switch (timeframe) {
        case "1D":
          cutoffTime = now - 24 * 60 * 60 * 1000;
          break;
        case "7D":
          cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
          break;
        case "1M":
          cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
          break;
        case "3M":
          cutoffTime = now - 90 * 24 * 60 * 60 * 1000;
          break;
        case "6M":
          cutoffTime = now - 180 * 24 * 60 * 60 * 1000;
          break;
        case "1Y":
          cutoffTime = now - 365 * 24 * 60 * 60 * 1000;
          break;
        case "ALL":
          cutoffTime = 0;
          break;
      }
      filteredData = dataPoints.filter((d) => d.timestamp >= cutoffTime);
    }

    // Aggregate by day to reduce noise
    const aggregatedByDay = new Map<string, { prices: number[]; timestamp: number }>();
    
    filteredData.forEach((d) => {
      const dayKey = new Date(d.timestamp).toISOString().split("T")[0];
      if (!aggregatedByDay.has(dayKey)) {
        aggregatedByDay.set(dayKey, { prices: [], timestamp: d.timestamp });
      }
      aggregatedByDay.get(dayKey)!.prices.push(d.price);
    });

    // Convert to chart format with average prices per day
    const aggregated = Array.from(aggregatedByDay.entries()).map(([day, data]) => ({
      timestamp: data.timestamp,
      date: day,
      price: Math.round(data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length),
      displayDate: new Date(data.timestamp).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      }),
    }));

    return aggregated.sort((a, b) => a.timestamp - b.timestamp);
  }, [pricePoints, timeframe]);

  // Calculate price statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { min: 0, max: 0, avg: 0, change: 0, changePct: 0 };
    }

    const prices = chartData.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
    const first = chartData[0].price;
    const last = chartData[chartData.length - 1].price;
    const change = last - first;
    const changePct = ((change / first) * 100).toFixed(2);

    return { min, max, avg, change, changePct };
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    return (
      <div
        className="bg-white border-2 border-brand-black px-3 py-2 shadow-lg"
        style={{ borderRadius: "8px" }}
      >
        <p className="text-xs text-brand-black/60 mb-1">{data.displayDate || data.date}</p>
        <p className="text-base font-mono-numeric font-bold text-brand-black">
          ₹{data.price.toLocaleString("en-IN")}
        </p>
      </div>
    );
  };

  // Show empty state only when there's truly no data
  if (chartData.length === 0) {
    return (
      <div className="bg-brand-background/30 border border-brand-gray/20 p-8 text-center" style={{ borderRadius: "12px" }}>
        <svg
          className="w-12 h-12 mx-auto mb-3 text-brand-black/20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
          />
        </svg>
        <p className="text-sm text-brand-black/60 font-medium">No price history available</p>
        <p className="text-xs text-brand-black/40 mt-1">Data will appear as it's collected</p>
      </div>
    );
  }

  // Check if we have enough data for timeframe filtering
  const hasEnoughDataForTimeframes = chartData.length >= 10;

  return (
    <div className="space-y-3">
      {/* Controls - Terminal Style */}
      <div className="flex items-center justify-between">
        {/* Timeframe Selector */}
        <div className="inline-flex items-center gap-1 border border-brand-gray/30 bg-brand-background/50 p-1" style={{ borderRadius: "8px" }}>
          {(["1D", "7D", "1M", "3M", "6M", "1Y", "ALL"] as Timeframe[]).map((tf) => (
            <TimeframeButton
              key={tf}
              label={tf}
              active={timeframe === tf}
              onClick={() => setTimeframe(tf)}
              disabled={!hasEnoughDataForTimeframes}
            />
          ))}
        </div>

        {/* Chart Type Toggle */}
        <div className="inline-flex items-center gap-1 border border-brand-gray/30 bg-brand-background/50 p-1" style={{ borderRadius: "8px" }}>
          <button
            onClick={() => setChartType("area")}
            className={`px-3 py-1.5 text-xs font-semibold transition-all ${
              chartType === "area"
                ? "bg-brand-black text-white"
                : "bg-transparent text-brand-black/60 hover:text-brand-black"
            }`}
            style={{ borderRadius: "6px" }}
            title="Area Chart"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </button>
          <button
            onClick={() => setChartType("line")}
            className={`px-3 py-1.5 text-xs font-semibold transition-all ${
              chartType === "line"
                ? "bg-brand-black text-white"
                : "bg-transparent text-brand-black/60 hover:text-brand-black"
            }`}
            style={{ borderRadius: "6px" }}
            title="Line Chart"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats Bar - Clean, No Interpretation */}
      <div className="grid grid-cols-4 gap-3 text-sm">
        <div className="text-center">
          <p className="text-xs text-brand-black/50 uppercase tracking-wide mb-1">High</p>
          <p className="font-mono-numeric font-semibold text-brand-black">
            ₹{stats.max.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-brand-black/50 uppercase tracking-wide mb-1">Low</p>
          <p className="font-mono-numeric font-semibold text-brand-black">
            ₹{stats.min.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-brand-black/50 uppercase tracking-wide mb-1">Avg</p>
          <p className="font-mono-numeric font-semibold text-brand-black">
            ₹{stats.avg.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-brand-black/50 uppercase tracking-wide mb-1">Change</p>
          <p
            className={`font-mono-numeric font-semibold ${
              stats.change >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {stats.change >= 0 ? "+" : ""}
            {stats.changePct}%
          </p>
        </div>
      </div>

      {/* Chart - Pure Data Visualization */}
      <div className="bg-white border border-brand-gray/20 p-4" style={{ borderRadius: "12px" }}>
        <ResponsiveContainer width="100%" height={chartData.length < 10 ? 200 : 320}>
          {chartType === "area" ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#000000" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis
                dataKey="displayDate"
                stroke="#9ca3af"
                style={{ fontSize: "11px" }}
                tickLine={false}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: "11px" }}
                tickLine={false}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#000000"
                strokeWidth={2}
                fill="url(#priceGradient)"
                animationDuration={300}
              />
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis
                dataKey="displayDate"
                stroke="#9ca3af"
                style={{ fontSize: "11px" }}
                tickLine={false}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: "11px" }}
                tickLine={false}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#000000"
                strokeWidth={2}
                dot={false}
                animationDuration={300}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer Note - Subtle */}
      <p className="text-xs text-brand-black/40 text-center">
        {chartData.length < 10 ? (
          <>All available data • {chartData.length} point{chartData.length !== 1 ? "s" : ""} collected • Timeframes disabled until 10+ points</>
        ) : (
          <>Aggregated from {chartData.length} data point{chartData.length !== 1 ? "s" : ""} • {timeframe} view</>
        )}
      </p>
    </div>
  );
};

