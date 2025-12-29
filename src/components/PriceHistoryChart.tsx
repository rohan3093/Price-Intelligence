import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
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
  size?: string;
}

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  pricePoints,
  historical30d,
  historical90d,
  bestAvailablePrice,
  size,
}) => {
  // Prepare chart data from pricePoints
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

  const chartData = prepareChartData();

  if (chartData.length === 0) {
    return (
      <div className="border border-brand-gray/30 p-8 bg-brand-white text-center" style={{ borderRadius: '0px' }}>
        <p className="text-sm text-brand-black/70">No price history data available</p>
      </div>
    );
  }

  const formatPrice = (value: number) => {
    return `₹${Math.round(value).toLocaleString("en-IN")}`;
  };

  return (
    <div className="border border-brand-gray/30 p-5 bg-brand-white" style={{ borderRadius: '0px' }}>
      <div className="mb-5 pb-4 border-b border-brand-gray/20">
        <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">
          Price History {size && `(${size})`}
        </p>
        <p className="text-sm text-brand-black">
          Price trends over time across different market segments
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
          <XAxis 
            dataKey="period" 
            stroke="#666"
            tick={{ fontSize: 11, fill: '#666' }}
            axisLine={{ stroke: '#e5e5e5' }}
          />
          <YAxis 
            stroke="#666"
            tick={{ fontSize: 11, fill: '#666' }}
            tickFormatter={formatPrice}
            axisLine={{ stroke: '#e5e5e5' }}
          />
          <Tooltip 
            formatter={(value: number | undefined) => value !== undefined ? formatPrice(value) : '—'}
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e5e5',
              borderRadius: '0',
              fontSize: '11px',
              padding: '8px 12px'
            }}
            labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }}
            iconType="line"
          />
          {chartData.some(d => d.b2b) && (
            <Line 
              type="monotone" 
              dataKey="b2b" 
              stroke="#10b981" 
              strokeWidth={2.5}
              name="B2B (Resellers)"
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
              name="End Customer"
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
              name="StockX/Goat"
              dot={{ r: 4, fill: '#8b5cf6' }}
              activeDot={{ r: 6 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

