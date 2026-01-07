import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { PricePoint } from "../types";

interface PriceHistoryChartProps {
  pricePoints?: {
    whatsapp?: PricePoint[];
    marketplace?: PricePoint[];
    international?: PricePoint[];
    // Legacy support
    b2b?: PricePoint[];
    endCustomer?: PricePoint[];
    stockxGoat?: PricePoint[];
  };
  historical30d?: { min: number; max: number };
  historical90d?: { min: number; max: number };
  bestAvailablePrice?: number;
  retailPrice?: number;
  size?: string;
}

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  pricePoints,
  historical30d,
  historical90d,
  bestAvailablePrice,
  retailPrice,
  size: _size,
}) => {
  // Prepare chart data from pricePoints - MUST be a hook and called before any returns
  const chartData = useMemo(() => {
    const prepareChartData = () => {
    if (!pricePoints) {
      // If no pricePoints, create a simple chart from historical data
      const data = [];
      
      if (historical90d) {
        data.push({
          period: "90d ago",
          b2b: historical90d.min,
          endCustomer: historical90d.max * 1.15, // Estimate
          stockxGoat: historical90d.max * 1.2, // Estimate
        });
      }
      
      if (historical30d) {
        data.push({
          period: "30d ago",
          b2b: historical30d.min,
          endCustomer: historical30d.max * 1.15,
          stockxGoat: historical30d.max * 1.2,
        });
      }
      
      if (bestAvailablePrice) {
        data.push({
          period: "Today",
          b2b: bestAvailablePrice,
          endCustomer: bestAvailablePrice * 1.15,
          stockxGoat: bestAvailablePrice * 1.2,
        });
      }
      
      return data;
    }

    // Calculate overall averages for each channel (across all dates)
    const whatsappPrices = pricePoints.whatsapp || pricePoints.b2b || [];
    const marketplacePrices = pricePoints.marketplace || pricePoints.endCustomer || [];
    const internationalPrices = pricePoints.international || pricePoints.stockxGoat || [];

    // Calculate overall channel averages
    const b2bOverallAvg = whatsappPrices.length > 0
      ? whatsappPrices.reduce((sum, p) => sum + p.price, 0) / whatsappPrices.length
      : undefined;

    const endCustomerOverallAvg = marketplacePrices.length > 0
      ? marketplacePrices.reduce((sum, p) => sum + p.price, 0) / marketplacePrices.length
      : undefined;

    const stockxGoatOverallAvg = internationalPrices.length > 0
      ? internationalPrices.reduce((sum, p) => sum + (p.price + (p.reshippingCost || 0)), 0) / internationalPrices.length
      : undefined;

    // Collect all unique dates from all channels
    const dateSet = new Set<string>();
    
    whatsappPrices.forEach((point) => {
      const date = point.lastSeen 
        ? new Date(point.lastSeen).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
        : "Recent";
      dateSet.add(date);
    });

    marketplacePrices.forEach((point) => {
      const date = point.lastSeen 
        ? new Date(point.lastSeen).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
        : "Recent";
      dateSet.add(date);
    });

    internationalPrices.forEach((point) => {
      const date = point.lastSeen 
        ? new Date(point.lastSeen).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
        : "Recent";
      dateSet.add(date);
    });

    // Create data points with overall averages for each date
    const data = Array.from(dateSet)
      .map((period) => ({
        period,
        ...(b2bOverallAvg !== undefined && { b2b: b2bOverallAvg }),
        ...(endCustomerOverallAvg !== undefined && { endCustomer: endCustomerOverallAvg }),
        ...(stockxGoatOverallAvg !== undefined && { stockxGoat: stockxGoatOverallAvg }),
      }))
      .sort((a, b) => {
        // Sort by period (Recent last)
        if (a.period === "Recent") return 1;
        if (b.period === "Recent") return -1;
        return a.period.localeCompare(b.period);
      });

    // If we have historical data, prepend it
    if (historical90d && data.length > 0) {
      data.unshift({
        period: "90d ago",
        b2b: historical90d.min,
        endCustomer: data[0]?.endCustomer || historical90d.max * 1.15,
        stockxGoat: data[0]?.stockxGoat || historical90d.max * 1.2,
      });
    }

    if (historical30d && data.length > 0) {
      const thirtyDaysAgo = data.find(d => d.period === "30d ago");
      if (!thirtyDaysAgo) {
        data.splice(1, 0, {
          period: "30d ago",
          b2b: historical30d.min,
          endCustomer: data[0]?.endCustomer || historical30d.max * 1.15,
          stockxGoat: data[0]?.stockxGoat || historical30d.max * 1.2,
        });
      }
    }

      return data;
    };
    
    return prepareChartData();
  }, [pricePoints, historical30d, historical90d, bestAvailablePrice]);

  // Calculate trend indicators - MUST be called before any returns
  const trendAnalysis = useMemo(() => {
    if (!pricePoints) return null;
    
    const whatsappPrices = pricePoints.whatsapp || pricePoints.b2b || [];
    const marketplacePrices = pricePoints.marketplace || pricePoints.endCustomer || [];
    
    // Get recent prices (last 7 days if available)
    const recentPrices = [...whatsappPrices, ...marketplacePrices]
      .filter(p => p.lastSeen)
      .map(p => ({
        price: p.price,
        date: p.lastSeen ? (typeof p.lastSeen === 'string' ? new Date(p.lastSeen) : p.lastSeen) : new Date(),
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);
    
    if (recentPrices.length < 2) return null;
    
    const oldest = recentPrices[recentPrices.length - 1].price;
    const newest = recentPrices[0].price;
    const change = newest - oldest;
    const changePct = (change / oldest) * 100;
    
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
      change,
      changePct: Math.abs(changePct),
      isSignificant: Math.abs(changePct) > 5,
    };
  }, [pricePoints]);

  // Calculate price range for reference lines - MUST be called before any returns
  const priceRange = useMemo(() => {
    if (chartData.length === 0) return null;
    const allPrices = chartData.flatMap(d => [d.b2b, d.endCustomer, d.stockxGoat].filter(Boolean) as number[]);
    if (allPrices.length === 0) return null;
    return {
      min: Math.min(...allPrices),
      max: Math.max(...allPrices),
    };
  }, [chartData]);

  // Helper function - can be defined after hooks
  const formatPrice = (value: number) => {
    return `₹${Math.round(value).toLocaleString("en-IN")}`;
  };

  // Early return AFTER all hooks
  if (chartData.length === 0) {
    return (
      <div className="bg-brand-white text-center py-8" style={{ borderRadius: '0px' }}>
        <p className="text-xs text-brand-black/60">No price history data available</p>
      </div>
    );
  }

  return (
    <div className="bg-brand-white" style={{ borderRadius: '0px' }}>
      {/* Trend Indicator */}
      {trendAnalysis && (
        <div className="px-3 pt-3 pb-2 border-b border-brand-gray/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-brand-black/60 uppercase tracking-wide">Recent Trend:</span>
              <span className={`text-xs font-semibold ${
                trendAnalysis.direction === 'up' ? 'text-green-600' : 
                trendAnalysis.direction === 'down' ? 'text-red-600' : 
                'text-brand-black/60'
              }`}>
                {trendAnalysis.direction === 'up' ? '↑' : trendAnalysis.direction === 'down' ? '↓' : '→'} 
                {trendAnalysis.direction !== 'flat' && `${trendAnalysis.changePct.toFixed(1)}%`}
                {trendAnalysis.isSignificant && (
                  <span className="ml-1 text-[9px] text-brand-black/50">(Significant)</span>
                )}
              </span>
            </div>
            {bestAvailablePrice && retailPrice && (
              <div className="text-right">
                <span className="text-[10px] text-brand-black/60 uppercase tracking-wide">vs Retail:</span>
                <span className={`text-xs font-mono-numeric font-semibold ml-1 ${
                  bestAvailablePrice < retailPrice ? 'text-green-600' : 'text-red-600'
                }`}>
                  {((bestAvailablePrice - retailPrice) / retailPrice * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="pt-3">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
            <XAxis 
              dataKey="period" 
              stroke="#666"
              tick={{ fontSize: 10, fill: '#666' }}
              axisLine={{ stroke: '#e5e5e5' }}
              tickMargin={8}
            />
            <YAxis 
              stroke="#666"
              tick={{ fontSize: 10, fill: '#666' }}
              tickFormatter={formatPrice}
              axisLine={{ stroke: '#e5e5e5' }}
              width={60}
            />
            <Tooltip 
              formatter={(value: number | undefined) => value !== undefined ? formatPrice(value) : '—'}
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e5e5e5',
                borderRadius: '0',
                fontSize: '10px',
                padding: '6px 10px'
              }}
              labelStyle={{ fontWeight: 600, marginBottom: '4px', fontSize: '10px' }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
              iconType="line"
              iconSize={10}
            />
            {/* Retail price reference line */}
            {retailPrice && priceRange && retailPrice >= priceRange.min && retailPrice <= priceRange.max && (
              <ReferenceLine 
                y={retailPrice} 
                stroke="#666" 
                strokeDasharray="4 4" 
                strokeOpacity={0.5}
                label={{ value: "Retail", position: "right", fontSize: 9, fill: '#666' }}
              />
            )}
            {chartData.some(d => d.b2b) && (
              <Line 
                type="monotone" 
                dataKey="b2b" 
                stroke="#10b981" 
                strokeWidth={2.5}
                name="WhatsApp & Reseller"
                dot={{ r: 4, fill: '#10b981' }}
                activeDot={{ r: 6 }}
              />
            )}
            {chartData.some(d => d.endCustomer) && (
              <Line 
                type="monotone" 
                dataKey="endCustomer" 
                stroke="#3b82f6" 
                strokeWidth={2.5}
                name="Marketplace"
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 6 }}
              />
            )}
            {chartData.some(d => d.stockxGoat) && (
              <Line 
                type="monotone" 
                dataKey="stockxGoat" 
                stroke="#8b5cf6" 
                strokeWidth={2.5}
                name="International"
                dot={{ r: 4, fill: '#8b5cf6' }}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Price Range Summary */}
      {priceRange && (
        <div className="px-3 pb-3 pt-2 border-t border-brand-gray/20">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[9px] text-brand-black/60 uppercase tracking-wide mb-0.5">Low</div>
              <div className="text-xs font-mono-numeric font-semibold text-brand-black">{formatPrice(priceRange.min)}</div>
            </div>
            <div>
              <div className="text-[9px] text-brand-black/60 uppercase tracking-wide mb-0.5">Range</div>
              <div className="text-xs font-mono-numeric font-semibold text-brand-black">
                {formatPrice(priceRange.max - priceRange.min)}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-brand-black/60 uppercase tracking-wide mb-0.5">High</div>
              <div className="text-xs font-mono-numeric font-semibold text-brand-black">{formatPrice(priceRange.max)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

