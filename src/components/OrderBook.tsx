import React, { useMemo } from 'react';
import { PricePoint } from '../types';

interface OrderBookProps {
  whatsappBuyPrices: PricePoint[];  // WTB quotes (bids)
  whatsappSellPrices: PricePoint[]; // WTS quotes (asks)
  marketplacePrices: PricePoint[];  // Marketplace listings (asks)
  internationalPrices: PricePoint[]; // International listings (asks)
}

interface PriceLevel {
  price: number;
  quantity: number;
  sources: string[]; // e.g., ["WhatsApp (3)", "Marketplace (2)"]
  channel: 'whatsapp' | 'marketplace' | 'international' | 'mixed';
}

interface OrderBookData {
  bids: PriceLevel[];  // Buy side (WTB)
  asks: PriceLevel[];  // Sell side (WTS + marketplace + international)
  spread: number;
  spreadPercent: number;
  midPrice: number;
  bestBid: number;
  bestAsk: number;
}

/**
 * Aggregate price points into price levels
 * Groups all listings at the same price into one level
 */
function aggregatePriceLevels(
  pricePoints: PricePoint[],
  channel: 'whatsapp' | 'marketplace' | 'international'
): PriceLevel[] {
  const levelMap = new Map<number, PriceLevel>();

  pricePoints.forEach((point) => {
    const price = channel === 'international' 
      ? point.price + (point.reshippingCost || 0)  // Use landed cost for international
      : point.price;
    
    const quantity = point.listingCount || 1;
    const sourceName = point.source || point.marketplaceName || point.sellerName || channel;

    if (levelMap.has(price)) {
      const level = levelMap.get(price)!;
      level.quantity += quantity;
      level.sources.push(sourceName);
      if (level.channel !== channel) {
        level.channel = 'mixed';
      }
    } else {
      levelMap.set(price, {
        price,
        quantity,
        sources: [sourceName],
        channel,
      });
    }
  });

  return Array.from(levelMap.values()).sort((a, b) => b.price - a.price);
}

/**
 * Process raw price data into order book structure
 */
function processOrderBook(
  whatsappBuy: PricePoint[],
  whatsappSell: PricePoint[],
  marketplace: PricePoint[],
  international: PricePoint[]
): OrderBookData {
  // Process buy side (bids)
  const bids = aggregatePriceLevels(whatsappBuy, 'whatsapp');

  // Process sell side (asks) - combine all sell sources
  const whatsappAsks = aggregatePriceLevels(whatsappSell, 'whatsapp');
  const marketplaceAsks = aggregatePriceLevels(marketplace, 'marketplace');
  const internationalAsks = aggregatePriceLevels(international, 'international');
  
  // Merge and sort all asks by price (lowest first)
  const asks = [...whatsappAsks, ...marketplaceAsks, ...internationalAsks]
    .sort((a, b) => a.price - b.price);

  const bestBid = bids.length > 0 ? bids[0].price : 0;
  const bestAsk = asks.length > 0 ? asks[0].price : 0;
  const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
  const midPrice = bestAsk > 0 && bestBid > 0 ? (bestAsk + bestBid) / 2 : bestAsk || bestBid;
  const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;

  return {
    bids,
    asks,
    spread,
    spreadPercent,
    midPrice,
    bestBid,
    bestAsk,
  };
}

export const OrderBook: React.FC<OrderBookProps> = ({
  whatsappBuyPrices,
  whatsappSellPrices,
  marketplacePrices,
  internationalPrices,
}) => {
  const orderBook = useMemo(
    () => processOrderBook(
      whatsappBuyPrices,
      whatsappSellPrices,
      marketplacePrices,
      internationalPrices
    ),
    [whatsappBuyPrices, whatsappSellPrices, marketplacePrices, internationalPrices]
  );

  const { bids, asks, spread, spreadPercent, bestBid, bestAsk } = orderBook;

  // Limit display to top 10 levels on each side for readability
  const displayBids = bids.slice(0, 10);
  const displayAsks = asks.slice(0, 10).reverse(); // Reverse to show highest price at top

  // Format price
  const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;

  // Empty state
  if (bids.length === 0 && asks.length === 0) {
    return (
      <div className="py-12 text-center">
        <svg className="w-12 h-12 mx-auto mb-3 text-brand-gray/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm font-semibold text-brand-black/60">No Order Book Data</p>
        <p className="text-xs text-brand-black/40 mt-1">No buy or sell quotes available for this asset</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-brand-background/30 border border-brand-gray/20 p-3 text-center" style={{ borderRadius: '8px' }}>
          <div className="text-[10px] text-brand-black/60 uppercase tracking-wider font-semibold mb-1">Lowest Ask</div>
          <div className="text-lg font-bold font-mono-numeric text-brand-black">{bestAsk > 0 ? formatPrice(bestAsk) : '—'}</div>
          <div className="text-xs text-brand-black/50 mt-1">{asks.length} selling</div>
        </div>
        <div className="bg-brand-background/30 border border-brand-gray/20 p-3 text-center" style={{ borderRadius: '8px' }}>
          <div className="text-[10px] text-brand-black/60 uppercase tracking-wider font-semibold mb-1">Spread</div>
          <div className="text-lg font-bold font-mono-numeric text-brand-black">
            {spread > 0 ? formatPrice(spread) : '—'}
          </div>
          {spread > 0 && (
            <div className="text-xs text-brand-black/50 mt-1">{spreadPercent.toFixed(1)}%</div>
          )}
        </div>
        <div className="bg-brand-background/30 border border-brand-gray/20 p-3 text-center" style={{ borderRadius: '8px' }}>
          <div className="text-[10px] text-brand-black/60 uppercase tracking-wider font-semibold mb-1">Highest Bid</div>
          <div className="text-lg font-bold font-mono-numeric text-brand-black">{bestBid > 0 ? formatPrice(bestBid) : '—'}</div>
          <div className="text-xs text-brand-black/50 mt-1">{bids.length} buying</div>
        </div>
      </div>

      {/* Order Book Table */}
      <div className="border border-brand-gray/20" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <table className="w-full font-mono-numeric text-sm table-fixed">
          <colgroup>
            <col style={{ width: '35%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '35%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>
          <thead className="bg-brand-background/50 border-b-2 border-brand-gray/20">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-brand-black/60">
                Sellers (Ask)
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-brand-black/60 border-r-2 border-brand-gray/20">
                Qty
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-brand-black/60">
                Buyers (Bid)
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-brand-black/60">
                Qty
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Render rows - pair up asks and bids */}
            {Array.from({ length: Math.max(displayAsks.length, displayBids.length, 1) }).map((_, i) => {
              const ask = displayAsks[i];
              const bid = displayBids[i];
              
              return (
                <tr key={i} className="border-b border-brand-gray/10 hover:bg-brand-background/50 transition-colors">
                  {/* Ask side */}
                  <td className="py-3 px-4">
                    {ask ? (
                      <span className="font-semibold text-brand-black" title={ask.sources.join(', ')}>
                        {formatPrice(ask.price)}
                      </span>
                    ) : (
                      <span className="text-brand-black/20">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center border-r-2 border-brand-gray/20">
                    {ask ? (
                      <span className="text-brand-black">{ask.quantity}</span>
                    ) : (
                      <span className="text-brand-black/20">—</span>
                    )}
                  </td>
                  
                  {/* Bid side */}
                  <td className="py-3 px-4">
                    {bid ? (
                      <span className="font-semibold text-brand-black" title={bid.sources.join(', ')}>
                        {formatPrice(bid.price)}
                      </span>
                    ) : (
                      <span className="text-brand-black/20">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {bid ? (
                      <span className="text-brand-black">{bid.quantity}</span>
                    ) : (
                      <span className="text-brand-black/20">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Help text */}
      <p className="text-xs text-brand-black/50 text-center">
        Sellers list items at <strong>Ask</strong> prices • Buyers offer <strong>Bid</strong> prices
      </p>
    </div>
  );
};

