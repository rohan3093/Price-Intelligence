import React, { useMemo } from "react";
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  Area
} from "recharts";
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

interface ChartDataPoint {
  period: string;
  date: Date;
  sourcePrice: number | null;  // Best B2B/WhatsApp price (buy at)
  marketPrice: number | null;  // Best Marketplace/International price (sell at)
  margin: number | null;       // Absolute margin
  marginPct: number | null;    // Percentage margin
  sourceTrend?: number;
  marketTrend?: number;
}

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  pricePoints,
  historical30d, // kept for now (not used in chartData, but available for future annotations)
  historical90d, // kept for now (not used in chartData, but available for future annotations)
  bestAvailablePrice,
  retailPrice,
}) => {
  // Prepare chart data - use real backend observations over time
  const chartData = useMemo(() => {
    const data: ChartDataPoint[] = [];

    // Group all real backend observations by calendar day
    const sourcePrices = pricePoints?.whatsapp || pricePoints?.b2b || [];
    const marketplacePrices = pricePoints?.marketplace || pricePoints?.endCustomer || [];
    const internationalPrices = pricePoints?.international || pricePoints?.stockxGoat || [];

    // Use up to 365 days of history from backend (tweakable)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);

    const sourceByPeriod = new Map<string, { prices: number[]; date: Date }>();
    const marketByPeriod = new Map<string, { prices: number[]; date: Date }>();

    sourcePrices.forEach((p) => {
      if (!p.lastSeen) return;
      const date = typeof p.lastSeen === 'string' ? new Date(p.lastSeen) : p.lastSeen;
      // Drop only very old observations beyond our history window
      if (date < cutoff) return;

      const period = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      const existing = sourceByPeriod.get(period);
      if (existing) {
        existing.prices.push(p.price);
      } else {
        sourceByPeriod.set(period, { prices: [p.price], date });
      }
    });
    
    [...marketplacePrices, ...internationalPrices].forEach((p) => {
      if (!p.lastSeen) return;
      const date = typeof p.lastSeen === 'string' ? new Date(p.lastSeen) : p.lastSeen;
      if (date < cutoff) return;

      const period = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      const price = p.price + (p.reshippingCost || 0);
      const existing = marketByPeriod.get(period);
      if (existing) {
        existing.prices.push(price);
      } else {
        marketByPeriod.set(period, { prices: [price], date });
      }
    });
    
    // Build chart data from all grouped observation days
    const recentPeriods = new Set([...sourceByPeriod.keys(), ...marketByPeriod.keys()]);
    recentPeriods.forEach(period => {
      const sourceData = sourceByPeriod.get(period);
      const marketData = marketByPeriod.get(period);
      
      const sourcePrice = sourceData ? Math.min(...sourceData.prices) : null;
      const marketPrice = marketData ? Math.max(...marketData.prices) : null;
      
      if (sourcePrice || marketPrice) {
        const date = sourceData?.date || marketData?.date || new Date();
        data.push({
          period,
          date,
          sourcePrice,
          marketPrice,
          margin: sourcePrice && marketPrice ? marketPrice - sourcePrice : null,
          marginPct: sourcePrice && marketPrice ? ((marketPrice - sourcePrice) / sourcePrice) * 100 : null,
        });
      }
    });
    
    // If we have no historical observations but do have a bestAvailablePrice,
    // fall back to a single "Now" point so the chart isn't empty.
    if (data.length === 0 && bestAvailablePrice) {
      const now = new Date();
      const period = now.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      const fallbackMarketPrice = retailPrice || bestAvailablePrice;

      data.push({
        period,
        date: now,
        sourcePrice: bestAvailablePrice,
        marketPrice: fallbackMarketPrice,
        margin: fallbackMarketPrice - bestAvailablePrice,
        marginPct: bestAvailablePrice
          ? ((fallbackMarketPrice - bestAvailablePrice) / bestAvailablePrice) * 100
          : null,
      });
    }

    // Sort by date
    const allData = data.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Calculate trendlines (simple linear regression for source and market)
    if (allData.length >= 2) {
      const sourcePoints = allData.filter(d => d.sourcePrice !== null);
      const marketPoints = allData.filter(d => d.marketPrice !== null);
      
      // Source trendline
      if (sourcePoints.length >= 2) {
        const n = sourcePoints.length;
        const xValues = sourcePoints.map((_, i) => i);
        const yValues = sourcePoints.map(d => d.sourcePrice!);
        
        const sumX = xValues.reduce((a, b) => a + b, 0);
        const sumY = yValues.reduce((a, b) => a + b, 0);
        const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
        const sumXX = xValues.reduce((acc, x) => acc + x * x, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        sourcePoints.forEach((d, i) => {
          d.sourceTrend = Math.round(intercept + slope * i);
        });
      }
      
      // Market trendline
      if (marketPoints.length >= 2) {
        const n = marketPoints.length;
        const xValues = marketPoints.map((_, i) => i);
        const yValues = marketPoints.map(d => d.marketPrice!);
        
        const sumX = xValues.reduce((a, b) => a + b, 0);
        const sumY = yValues.reduce((a, b) => a + b, 0);
        const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
        const sumXX = xValues.reduce((acc, x) => acc + x * x, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        marketPoints.forEach((d, i) => {
          d.marketTrend = Math.round(intercept + slope * i);
        });
      }
    }
    
    return allData;
  }, [pricePoints, historical30d, historical90d, bestAvailablePrice, retailPrice]);

  // Analyze margin trend for resellers
  const marginAnalysis = useMemo(() => {
    const validData = chartData.filter(d => d.marginPct !== null);
    if (validData.length < 2) {
      // Single data point analysis
      if (validData.length === 1) {
        const current = validData[0];
        return {
          currentMargin: current.margin,
          currentMarginPct: current.marginPct,
          trend: 'unknown' as const,
          signal: current.marginPct! > 15 ? 'strong' : current.marginPct! > 5 ? 'moderate' : 'weak',
          message: current.marginPct! > 15 
            ? 'Strong flip opportunity' 
            : current.marginPct! > 5 
            ? 'Moderate margin available'
            : 'Thin margins',
          subMessage: `${current.marginPct!.toFixed(1)}% potential profit`,
        };
      }
      return null;
    }
    
    const first = validData[0];
    const last = validData[validData.length - 1];
    const marginChange = last.marginPct! - first.marginPct!;
    
    let trend: 'expanding' | 'compressing' | 'stable';
    let signal: 'strong' | 'moderate' | 'weak' | 'none';
    let message: string;
    let subMessage: string;
    
    // Determine margin trend
    if (Math.abs(marginChange) < 3) {
      trend = 'stable';
    } else if (marginChange > 0) {
      trend = 'expanding';
    } else {
      trend = 'compressing';
    }
    
    // Determine current opportunity strength
    if (last.marginPct! > 15) {
      signal = 'strong';
      message = 'Strong flip opportunity';
    } else if (last.marginPct! > 8) {
      signal = 'moderate';
      message = 'Decent margin available';
    } else if (last.marginPct! > 0) {
      signal = 'weak';
      message = 'Thin margins';
    } else {
      signal = 'none';
      message = 'No margin - avoid';
    }
    
    // Adjust message based on trend
    if (trend === 'expanding' && signal !== 'none') {
      subMessage = `Margins expanding (+${marginChange.toFixed(1)}pp) • ${last.marginPct!.toFixed(1)}% profit`;
    } else if (trend === 'compressing') {
      subMessage = `Margins tightening (${marginChange.toFixed(1)}pp) • ${last.marginPct!.toFixed(1)}% profit`;
    } else {
      subMessage = `${last.marginPct!.toFixed(1)}% potential profit`;
    }
    
    return {
      currentMargin: last.margin,
      currentMarginPct: last.marginPct,
      trend,
      signal,
      message,
      subMessage,
      sourcePrice: last.sourcePrice,
      marketPrice: last.marketPrice,
      firstMarginPct: first.marginPct,
    };
  }, [chartData]);

  // Price formatter
  const formatPrice = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
  
  // Calculate Y-axis domain
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 10000];
    const allPrices = chartData.flatMap(d => [d.sourcePrice, d.marketPrice].filter(Boolean) as number[]);
    if (allPrices.length === 0) return [0, 10000];
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const padding = (max - min) * 0.15;
    return [Math.floor((min - padding) / 1000) * 1000, Math.ceil((max + padding) / 1000) * 1000];
  }, [chartData]);

  // Empty state
  if (chartData.length === 0) {
    return (
      <div className="bg-brand-gray/5 border border-brand-gray/20 p-6 text-center" style={{ borderRadius: '0px' }}>
        <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-brand-gray/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-brand-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-brand-black/60 mb-1">No price history yet</p>
        <p className="text-xs text-brand-black/40">Price trends will appear as data is collected</p>
      </div>
    );
  }

  // Get signal colors
  const getSignalColors = (signal: string) => {
    switch (signal) {
      case 'strong':
        return { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700', icon: 'bg-green-500' };
      case 'moderate':
        return { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700', icon: 'bg-blue-500' };
      case 'weak':
        return { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-700', icon: 'bg-amber-500' };
      default:
        return { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700', icon: 'bg-red-500' };
    }
  };

  const colors = marginAnalysis ? getSignalColors(marginAnalysis.signal) : getSignalColors('weak');

  return (
    <div className="bg-brand-white" style={{ borderRadius: '0px' }}>
      {/* Info Note */}
      <div className="px-3 pt-3 pb-2 border-b border-brand-gray/10">
        <div className="flex items-start gap-2">
          <svg className="w-3.5 h-3.5 text-brand-black/40 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[10px] text-brand-black/60 leading-tight">
            Price history shows historical ranges (90d/30d) and current market state. Recent listing observations supplement the trend.
          </p>
        </div>
      </div>
      
      {/* HERO: Reseller Opportunity Summary */}
      {marginAnalysis && (
        <div className={`p-4 border-b-2 ${colors.bg} ${colors.border}`}>
          <div className="flex items-center justify-between gap-4">
            {/* Main Signal */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {/* Signal Icon */}
                <div className={`w-8 h-8 flex items-center justify-center ${colors.icon}`}>
                  {marginAnalysis.signal === 'strong' ? (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : marginAnalysis.signal === 'none' ? (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                </div>
                
                {/* Signal Text */}
                <div>
                  <p className={`text-lg font-bold leading-tight ${colors.text}`}>
                    {marginAnalysis.message}
                  </p>
                  <p className="text-xs text-brand-black/60">
                    {marginAnalysis.subMessage}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Margin Stats */}
            <div className="text-right flex-shrink-0">
              {marginAnalysis.sourcePrice && marginAnalysis.marketPrice && (
                <div className="space-y-0.5">
                  <div className="flex items-center justify-end gap-2 text-xs">
                    <span className="text-brand-black/50">Source:</span>
                    <span className="font-mono-numeric font-semibold text-green-600">
                      {formatPrice(marginAnalysis.sourcePrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2 text-xs">
                    <span className="text-brand-black/50">Sell at:</span>
                    <span className="font-mono-numeric font-semibold text-blue-600">
                      {formatPrice(marginAnalysis.marketPrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2 text-sm pt-1 border-t border-brand-black/10">
                    <span className="text-brand-black/50">Margin:</span>
                    <span className={`font-mono-numeric font-bold ${colors.text}`}>
                      {formatPrice(marginAnalysis.currentMargin || 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Margin Trend Indicator */}
          {marginAnalysis.trend !== 'unknown' && (
            <div className="mt-3 pt-3 border-t border-brand-black/10 flex items-center gap-3">
              <span className="text-[10px] text-brand-black/50 uppercase tracking-wide">Margin Trend:</span>
              <div className={`flex items-center gap-1 text-xs font-semibold ${
                marginAnalysis.trend === 'expanding' ? 'text-green-600' :
                marginAnalysis.trend === 'compressing' ? 'text-red-600' :
                'text-brand-black/60'
              }`}>
                {marginAnalysis.trend === 'expanding' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Expanding
                  </>
                ) : marginAnalysis.trend === 'compressing' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                    Compressing
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                    </svg>
                    Stable
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Chart: Source vs Market Price with Margin Area */}
      <div className="p-3">
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <defs>
              <linearGradient id="marginGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            
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
              width={55}
              domain={yDomain}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                
                const data = payload[0]?.payload as ChartDataPoint;
                if (!data) return null;
                
                return (
                  <div className="bg-white border border-brand-gray/20 p-3 shadow-lg" style={{ minWidth: '180px' }}>
                    <p className="font-semibold text-xs text-brand-black mb-2 pb-1 border-b border-brand-gray/10">{label}</p>
                    {data.sourcePrice && (
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-brand-black/60">Source (Buy):</span>
                        <span className="text-xs font-mono-numeric font-semibold text-green-600">{formatPrice(data.sourcePrice)}</span>
                      </div>
                    )}
                    {data.marketPrice && (
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-brand-black/60">Market (Sell):</span>
                        <span className="text-xs font-mono-numeric font-semibold text-blue-600">{formatPrice(data.marketPrice)}</span>
                      </div>
                    )}
                    {data.margin !== null && data.marginPct !== null && (
                      <div className="flex justify-between items-center pt-1 mt-1 border-t border-brand-gray/10">
                        <span className="text-xs text-brand-black/60">Margin:</span>
                        <span className={`text-xs font-mono-numeric font-bold ${data.marginPct > 10 ? 'text-green-600' : data.marginPct > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                          {formatPrice(data.margin)} ({data.marginPct.toFixed(1)}%)
                        </span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            
            {/* Retail price reference line */}
            {retailPrice && (
              <ReferenceLine 
                y={retailPrice} 
                stroke="#0c0c0c" 
                strokeDasharray="6 4" 
                strokeWidth={1.5}
                label={{ 
                  value: `Retail ${formatPrice(retailPrice)}`, 
                  position: "insideTopRight", 
                  fontSize: 10, 
                  fill: '#0c0c0c',
                  fontWeight: 600
                }}
              />
            )}
            
            {/* Margin area shading */}
            <Area
              type="monotone"
              dataKey="marketPrice"
              stroke="none"
              fill="url(#marginGradient)"
              fillOpacity={0.4}
            />
            
            {/* Source Price Line (Buy At) */}
            <Line 
              type="monotone" 
              dataKey="sourcePrice" 
              stroke="#10b981" 
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#10b981' }}
              name="Source (Buy)"
              connectNulls
            />
            
            {/* Source Trendline */}
            <Line 
              type="monotone" 
              dataKey="sourceTrend" 
              stroke="#10b981" 
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              connectNulls
            />
            
            {/* Market Price Line (Sell At) */}
            <Line 
              type="monotone" 
              dataKey="marketPrice" 
              stroke="#3b82f6" 
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#3b82f6' }}
              name="Market (Sell)"
              connectNulls
            />
            
            {/* Market Trendline */}
            <Line 
              type="monotone" 
              dataKey="marketTrend" 
              stroke="#3b82f6" 
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              connectNulls
            />
            
            {/* Margin bars at each point */}
            <Bar 
              dataKey="margin" 
              fill="#10b981" 
              fillOpacity={0.15}
              barSize={chartData.length > 5 ? 15 : 30}
              name="Margin"
            />
          </ComposedChart>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-2 pt-2 border-t border-brand-gray/10">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-green-500 rounded"></div>
            <span className="text-[10px] text-brand-black/60">Source Price (Buy)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-blue-500 rounded"></div>
            <span className="text-[10px] text-brand-black/60">Market Price (Sell)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-green-500/20 border border-green-500/30"></div>
            <span className="text-[10px] text-brand-black/60">Margin</span>
          </div>
        </div>
      </div>
      
      {/* Quick Reseller Stats */}
      <div className="px-3 pb-3 grid grid-cols-3 gap-2">
        <div className="bg-green-50 p-2 text-center border border-green-100">
          <div className="text-[9px] text-green-700/70 uppercase tracking-wide mb-0.5">Best Source</div>
          <div className="text-sm font-mono-numeric font-semibold text-green-700">
            {formatPrice(Math.min(...chartData.filter(d => d.sourcePrice).map(d => d.sourcePrice!)))}
          </div>
        </div>
        <div className="bg-blue-50 p-2 text-center border border-blue-100">
          <div className="text-[9px] text-blue-700/70 uppercase tracking-wide mb-0.5">Best Market</div>
          <div className="text-sm font-mono-numeric font-semibold text-blue-700">
            {formatPrice(Math.max(...chartData.filter(d => d.marketPrice).map(d => d.marketPrice!)))}
          </div>
        </div>
        <div className="bg-brand-gray/5 p-2 text-center border border-brand-gray/10">
          <div className="text-[9px] text-brand-black/50 uppercase tracking-wide mb-0.5">Best Margin</div>
          <div className="text-sm font-mono-numeric font-semibold text-brand-black">
            {Math.max(...chartData.filter(d => d.marginPct !== null).map(d => d.marginPct!)).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
};
