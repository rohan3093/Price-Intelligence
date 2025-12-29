import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Guide } from "../types";

const guides: Guide[] = [
  {
    id: 1,
    title: "What is Sneaker Investing?",
    category: 'basics',
    description: 'Learn the fundamentals of turning sneakers into investments',
    content: `Sneaker investing is the practice of purchasing limited-edition, rare, or high-demand sneakers with the intention of selling them later at a profit. Unlike traditional collecting, sneaker investing focuses on understanding market dynamics, price trends, and liquidity to generate returns.

## How It Works

The sneaker resale market operates similarly to stock markets or commodity trading. You buy sneakers at retail price (or below market value) and sell them when demand increases or supply decreases, capturing the price difference as profit.

## Key Concepts

### 1. Limited Supply

Brands like Nike, Adidas, and Jordan release limited quantities of certain models, creating scarcity that drives up resale prices. The more limited the release, the higher the potential resale value.

### 2. Market Demand

Popular collaborations, celebrity endorsements, and cultural moments can cause prices to spike. Understanding what drives demand is crucial for timing your investments.

### 3. Price Discovery

Unlike stocks with centralized exchanges, sneaker prices are discovered across multiple channels:

- **WhatsApp groups**: B2B reseller networks with the lowest prices
- **Marketplaces**: Instagram, Facebook Marketplace, and specialized apps
- **International platforms**: StockX and Goat provide global pricing data

### 4. Liquidity

Some sneakers sell quickly (high liquidity), while others may take months to find buyers. Understanding liquidity helps you manage cash flow and risk.

## The Indian Market Context

In India, sneaker investing has unique characteristics:

### B2B Channels

WhatsApp groups and local reseller networks offer the lowest prices but require relationships and trust. These are typically where serious investors source inventory.

### B2C Marketplaces

Platforms like Instagram, Facebook Marketplace, and specialized sneaker apps serve end customers at higher prices. This is where you typically sell to consumers.

### International Access

StockX and Goat provide global pricing data, but importing to India adds shipping, customs, and fees. Understanding landed costs is essential for profitable international sourcing.

## Why People Invest in Sneakers

- **Tangible Asset**: Unlike stocks, you physically own the product
- **Cultural Value**: Sneakers often appreciate due to cultural significance, not just scarcity
- **Diversification**: Can complement traditional investment portfolios
- **Accessibility**: Lower barrier to entry compared to other alternative investments

## Risks to Consider

- **Market Volatility**: Prices can drop as quickly as they rise
- **Counterfeits**: Fake sneakers are prevalent; authentication is essential
- **Storage Costs**: Physical storage and insurance add to costs
- **Liquidity Risk**: Some pairs may take time to sell at desired prices
- **Market Saturation**: Oversupply can crash prices

## Getting Started

Start small with **2-3 pairs** you understand well. Focus on:

1. Models with proven resale history
2. Sizes with high demand (typically UK 8-10 in India)
3. Brands with strong cultural relevance
4. Pairs with clear catalysts (collaborations, anniversaries, etc.)

> **Remember**: Never invest more than you can afford to lose. The sneaker market, like any market, involves risk.`,
    estimatedTime: '5 min read',
    difficulty: 'beginner',
  },
  {
    id: 2,
    title: "How to Buy Sneakers in India",
    category: 'buying',
    description: 'Step-by-step guide to purchasing sneakers for investment',
    content: `Buying sneakers for investment in India requires understanding multiple channels, each with different price points, risks, and requirements. Here's how to navigate each option.

## Primary Buying Channels

### 1. WhatsApp Groups (B2B)

**Best for**: Lowest prices, bulk buying, building relationships

**How it works**:
- Join reseller WhatsApp groups through referrals
- Sellers post inventory with prices and sizes
- Negotiate directly with sellers
- Payment typically via UPI or bank transfer
- Meet in person or arrange shipping

**Pros**:
- Lowest prices in the market
- Direct relationships with resellers
- Access to bulk deals
- Faster transactions

**Cons**:
- Requires trust and relationships
- Limited buyer protection
- Risk of counterfeits (verify authenticity)
- Cash flow requirements

**Tips**:
- Start with small purchases to build trust
- Always verify authenticity before paying
- Build relationships with reliable sellers
- Join multiple groups for price comparison

### 2. Indian Marketplaces (B2C)

**Best for**: End customer prices, verified sellers, convenience

**Platforms**: Instagram sellers, Facebook Marketplace, specialized sneaker apps

**How it works**:
- Browse listings on platforms
- Contact sellers directly
- Negotiate prices
- Arrange payment and delivery

**Pros**:
- Better buyer protection than WhatsApp
- Verified seller accounts
- Easier to find specific models
- Can see seller reviews

**Cons**:
- Higher prices than B2B channels
- Still need to verify authenticity
- Platform fees may apply
- Slower than direct WhatsApp

**Tips**:
- Check seller reviews and history
- Request detailed photos before buying
- Use secure payment methods
- Meet in person when possible

### 3. International Platforms (StockX/Goat)

**Best for**: Global pricing data, authentication, rare pairs

**How it works**:
- Browse listings on StockX or Goat
- Place bids or buy at asking price
- Platform authenticates the sneakers
- Ship to India (adds customs and fees)

**Pros**:
- Guaranteed authentication
- Access to rare international releases
- Transparent pricing data
- Buyer protection

**Cons**:
- Highest total cost (price + shipping + customs + fees)
- Longer delivery times
- Currency conversion costs
- Customs duties can be significant

**Calculating Landed Cost**:
- Base price (in USD)
- + Platform fees (~10-15%)
- + International shipping (~₹2,000-5,000)
- + Customs duty (~40-50% of CIF value)
- + GST (18% on CIF + duty)
- = Total landed cost

**Example**: A ₹20,000 sneaker from StockX might cost ₹35,000+ after all fees.

## Authentication Checklist

Before buying any sneaker, verify:

1. **Box and packaging**: Check for authentic box labels, tags, and packaging
2. **Shoe details**: Stitching, materials, logos, and overall quality
3. **Size tag**: Authentic size tags with proper formatting
4. **Seller reputation**: Reviews, history, and references
5. **Price reasonableness**: If it's too good to be true, it probably is

## Payment Methods

- **UPI**: Fastest, most common for local transactions
- **Bank Transfer**: Secure, traceable
- **Cash**: Only for in-person transactions with trusted sellers
- **Escrow Services**: Use for high-value purchases with unknown sellers

## Building Your Network

1. **Start small**: Make initial purchases to build reputation
2. **Be reliable**: Pay on time, communicate clearly
3. **Join communities**: Sneaker groups, forums, events
4. **Share knowledge**: Help others, build relationships
5. **Stay active**: Regular engagement builds trust

## Red Flags to Avoid

- Prices significantly below market
- Sellers refusing to provide detailed photos
- Pressure to pay quickly
- No references or reviews
- Suspicious payment requests
- Unwillingness to meet in person for high-value items

Remember: **Trust but verify**. Always authenticate before paying, especially for expensive pairs.`,
    estimatedTime: '8 min read',
    difficulty: 'beginner',
  },
  {
    id: 3,
    title: "When to Sell Your Sneakers",
    category: 'selling',
    description: 'Timing your exit strategy for maximum profit',
    content: `Timing your exit is one of the most critical decisions in sneaker investing. Sell too early and you leave money on the table. Sell too late and you might miss the peak. Here's how to make informed decisions.

## Key Factors to Consider

### 1. Price Trends

**Monitor price movements**:
- Track 30-day and 90-day price changes
- Look for consistent upward trends
- Identify price plateaus (may indicate peak)
- Watch for sudden spikes (could be temporary)

**When to sell**:
- ✅ Prices have increased 20%+ in 30 days
- ✅ Price has plateaued for 2-3 months
- ✅ Multiple size variants showing similar patterns
- ⚠️ Sudden spike (consider selling before correction)

### 2. Market Demand Indicators

**High demand signals**:
- Multiple buyers asking for the same size
- Quick sales at asking prices
- Low inventory across platforms
- Increased social media mentions

**Low demand signals**:
- Listings sitting unsold for weeks
- Sellers accepting lower offers
- High inventory levels
- Declining search interest

### 3. Market Catalysts

**Positive catalysts** (hold longer):
- Upcoming collaborations or releases
- Celebrity endorsements
- Cultural moments (movies, events)
- Brand anniversaries
- Limited restocks unlikely

**Negative catalysts** (consider selling):
- Mass restocks announced
- Brand losing popularity
- Negative press or controversies
- Market saturation
- Newer models replacing demand

## Exit Strategies

### Strategy 1: Profit Target

Set a **target profit percentage** and sell when reached.

**Example**: Buy at ₹25,000, target 30% profit = sell at ₹32,500

**Pros**: Clear, emotion-free decision
**Cons**: May miss further upside

### Strategy 2: Time-Based

Sell after a **specific holding period** regardless of price.

**Example**: Hold for 6 months, then sell

**Pros**: Prevents over-holding
**Cons**: May sell during growth phase

### Strategy 3: Technical Indicators

Use **price patterns and metrics** to decide.

**Signals to sell**:
- Price above 90-day average by 25%+
- Liquidity decreasing (harder to sell)
- Confidence score dropping
- Multiple negative indicators aligning

### Strategy 4: Rebalancing

Sell to **rebalance your portfolio**.

**When**:
- One asset becomes too large a % of portfolio
- Need cash for better opportunities
- Diversifying across categories

## Where to Sell

### B2C Marketplaces (Highest Prices)

**Best for**: End customers willing to pay premium

- Instagram sellers
- Facebook Marketplace
- Specialized sneaker apps
- Your own network

**Expected margin**: 15-30% above B2B prices

### B2B Channels (Fastest Sales)

**Best for**: Quick exits, high liquidity

- WhatsApp groups
- Reseller networks
- Bulk buyers

**Expected margin**: Lower prices but faster sales

### International Platforms

**Best for**: Rare pairs, global demand

- StockX
- Goat
- eBay

**Consider**: Shipping costs, authentication fees, currency conversion

## Common Mistakes to Avoid

1. **Emotional attachment**: Don't hold because you "like" the shoe
2. **FOMO selling**: Don't panic sell during temporary dips
3. **Greed**: Don't wait for "perfect" price - take profits
4. **Ignoring costs**: Factor in storage, time, and opportunity cost
5. **No exit plan**: Always have a strategy before buying

## Tax Considerations

In India, profits from sneaker resale may be subject to:

- **Capital gains tax** (if held as investment)
- **Business income tax** (if trading regularly)
- **GST** (if registered as business)

**Tip**: Consult a tax advisor for your specific situation.

## The Golden Rule

> **"Bulls make money, bears make money, pigs get slaughtered."**

Take profits at reasonable levels. A 20-30% gain is excellent. Don't wait for the "perfect" exit—consistency beats perfection.`,
    estimatedTime: '6 min read',
    difficulty: 'intermediate',
  },
  {
    id: 4,
    title: "Understanding Price Ranges",
    category: 'basics',
    description: 'B2B, B2C, and global pricing explained',
    content: `Sneaker prices vary dramatically across different channels in India. Understanding these price ranges is essential for making profitable investment decisions.

## The Three Price Tiers

### 1. B2B Market Price (Lowest)

**What it is**: Prices from WhatsApp groups and reseller networks

**Who buys here**: Other resellers, investors, bulk buyers

**Typical range**: 15-25% above retail price

**Example**: 
- Retail: ₹10,000
- B2B: ₹12,000 - ₹13,000

**Characteristics**:
- Lowest prices in the market
- Requires relationships and trust
- Cash flow and bulk buying advantages
- Fast transactions
- Limited buyer protection

### 2. End Customer Market Price (Middle)

**What it is**: Prices on Indian marketplaces and consumer platforms

**Who buys here**: End customers, collectors, enthusiasts

**Typical range**: 30-50% above retail price

**Example**:
- Retail: ₹10,000
- End Customer: ₹13,500 - ₹15,500

**Characteristics**:
- Higher margins for sellers
- Better buyer protection
- More accessible to general public
- Slower sales velocity
- Platform fees may apply

### 3. StockX/Goat Price (Highest)

**What it is**: International platform prices (before India costs)

**Who buys here**: Global customers, Indian buyers importing

**Typical range**: 40-80% above retail (before India costs)

**Example**:
- Retail: ₹10,000
- StockX: ₹14,500 - ₹16,000 (before shipping/customs)

**After India costs** (shipping + customs + fees):
- Total: ₹20,000 - ₹25,000

**Characteristics**:
- Guaranteed authentication
- Global pricing data
- Highest total cost to India
- Access to rare pairs
- Transparent pricing

## Price Spread Analysis

The **spread** between B2B and End Customer prices represents your potential profit margin.

**Example**:
- B2B buy: ₹12,000
- End Customer sell: ₹15,000
- **Spread**: ₹3,000 (25% margin)

**Factors affecting spread**:
- **Liquidity**: High liquidity = tighter spreads
- **Rarity**: Rare pairs = wider spreads
- **Size**: Popular sizes = tighter spreads
- **Market conditions**: Bull market = wider spreads

## Fair Value Range

The **Fair Value Range** represents where a sneaker "should" trade based on:
- Historical pricing
- Current market conditions
- Supply and demand
- Comparable sales

**How to use it**:
- **Below fair range**: Potential buying opportunity
- **Within fair range**: Fair price, neutral
- **Above fair range**: May be overpriced, consider selling

## Price Discovery Process

Sneaker prices are discovered through:

1. **Initial release**: Retail price set by brand
2. **Early resale**: First transactions establish market
3. **Market stabilization**: Prices settle based on demand
4. **Catalyst events**: News, restocks, collaborations move prices
5. **Long-term trend**: Prices evolve based on cultural relevance

## Understanding Price Points

**Price Points** are granular data points showing:
- Individual listing prices
- Number of listings at each price
- Source (WhatsApp, marketplace, StockX)
- Last seen date

**Why it matters**:
- Shows price distribution (not just average)
- Identifies best available prices
- Tracks market depth
- Reveals pricing trends

## Practical Application

**For Buyers**:
- Compare B2B vs End Customer prices
- Calculate if importing makes sense
- Identify fair value opportunities
- Avoid overpaying

**For Sellers**:
- Understand where to sell for best price
- Know your target margins
- Price competitively but profitably
- Monitor price trends

## Key Takeaway

> **The same sneaker can have very different prices across channels. Understanding these ranges helps you buy low and sell high, maximizing your investment returns.**`,
    estimatedTime: '4 min read',
    difficulty: 'beginner',
  },
  {
    id: 5,
    title: "Risk Management Strategies",
    category: 'risks',
    description: 'How to protect your investments',
    content: `Sneaker investing, like any investment, involves risk. Smart risk management separates successful investors from those who lose money. Here's how to protect your capital.

## Core Principles

### 1. Never Invest More Than You Can Afford to Lose

This is the **golden rule** of investing.

**What it means**:
- Only use disposable income
- Don't borrow money to invest
- Don't use emergency funds
- Don't invest money needed for essentials

**Why it matters**: Markets can crash, pairs can sit unsold, and prices can drop. You need to be able to hold or take a loss without financial stress.

### 2. Diversification

**Don't put all your eggs in one basket.**

**Diversify across**:
- **Brands**: Nike, Adidas, Jordan, New Balance, etc.
- **Categories**: High-tops, low-tops, runners, lifestyle
- **Price points**: Mix of affordable and premium
- **Sizes**: Popular sizes (UK 8-10) and niche sizes
- **Risk levels**: Safe bets and growth opportunities

**Example portfolio**:
- 40% Safe bets (proven resale history)
- 40% Growth opportunities (emerging trends)
- 20% Speculative plays (high risk, high reward)

### 3. Position Sizing

**Limit individual position size** to 10-20% of total portfolio.

**Why**:
- Limits damage from a single bad investment
- Allows for multiple opportunities
- Reduces emotional attachment
- Enables better decision-making

## Specific Risk Mitigation

### Counterfeit Risk

**The threat**: Fake sneakers are prevalent and sophisticated.

**Protection strategies**:
1. **Buy from trusted sources**: Build relationships with verified sellers
2. **Learn authentication**: Study authentic pairs, know key details
3. **Use authentication services**: For high-value purchases
4. **Request detailed photos**: Before buying, especially online
5. **Meet in person**: When possible, inspect before paying

**Red flags**:
- Prices too good to be true
- Sellers refusing detailed photos
- Poor quality materials or stitching
- Suspicious packaging or tags

### Market Volatility Risk

**The threat**: Prices can drop 30-50% quickly.

**Protection strategies**:
1. **Set stop-losses**: Decide exit price before buying
2. **Take profits**: Don't be greedy—20-30% gains are excellent
3. **Monitor trends**: Watch for negative catalysts
4. **Diversify timing**: Don't buy everything at once
5. **Keep cash reserves**: For opportunities during dips

### Liquidity Risk

**The threat**: Can't sell when you need cash.

**Protection strategies**:
1. **Focus on liquid pairs**: Popular models, common sizes
2. **Maintain cash buffer**: Don't tie up all capital
3. **Know exit channels**: Have multiple selling options ready
4. **Avoid ultra-rare pairs**: Unless you can hold long-term
5. **Monitor liquidity metrics**: Track how quickly pairs sell

### Storage and Damage Risk

**The threat**: Physical damage reduces value.

**Protection strategies**:
1. **Proper storage**: Climate-controlled, away from sunlight
2. **Original packaging**: Keep boxes, tags, everything
3. **Insurance**: For high-value collections
4. **Documentation**: Photos, receipts, authentication
5. **Regular inspection**: Check for damage, yellowing, etc.

### Market Saturation Risk

**The threat**: Oversupply crashes prices.

**Protection strategies**:
1. **Avoid overhyped releases**: Often restock or saturate
2. **Focus on limited releases**: True scarcity holds value
3. **Monitor brand strategies**: Watch for mass production
4. **Exit before saturation**: Sell when supply increases
5. **Diversify across brands**: Don't rely on one brand

## Risk Assessment Framework

Before any investment, ask:

1. **What's my maximum loss?** Can I afford it?
2. **What's my exit strategy?** When and how will I sell?
3. **What could go wrong?** List potential risks
4. **What's my time horizon?** How long can I hold?
5. **What's the opportunity cost?** Better uses for this capital?

## Portfolio Health Metrics

**Monitor regularly**:
- **Total portfolio value**: Track overall performance
- **Individual position performance**: Identify winners/losers
- **Liquidity ratio**: % of portfolio in liquid assets
- **Concentration risk**: % in single brand/category
- **Cash position**: Available for opportunities

## When to Cut Losses

**Sell even at a loss when**:
- Price drops 30%+ with no recovery signs
- Better opportunities available (opportunity cost)
- Need cash for emergencies
- Market fundamentals changed (brand issues, etc.)
- Holding period exceeded with no progress

**Remember**: A realized loss is better than a larger unrealized loss.

## Building Risk Management Habits

1. **Start small**: Learn with small positions
2. **Document decisions**: Track what worked and why
3. **Review regularly**: Monthly portfolio reviews
4. **Stay informed**: Follow market news and trends
5. **Learn from mistakes**: Every loss is a lesson

## The Bottom Line

> **Risk management isn't about avoiding risk—it's about understanding and managing it. The goal isn't to never lose money, but to ensure losses don't derail your investment journey.**`,
    estimatedTime: '7 min read',
    difficulty: 'intermediate',
  },
  {
    id: 6,
    title: "Building Your First Portfolio",
    category: 'strategy',
    description: 'Creating a balanced sneaker investment portfolio',
    content: `Building your first sneaker investment portfolio is exciting but requires careful planning. Here's a step-by-step guide to creating a balanced, profitable portfolio.

## Starting Principles

### Start Small

**Begin with 2-3 pairs** totaling ₹50,000 - ₹1,00,000.

**Why**:
- Learn the market with lower risk
- Build relationships with sellers
- Understand your own risk tolerance
- Make mistakes with smaller amounts
- Gain confidence before scaling

### Focus on What You Know

**Start with**:
- Brands you understand
- Models with proven resale history
- Sizes you know are in demand
- Categories you're familiar with

**Avoid**:
- Hype-driven purchases
- Brands you don't understand
- Ultra-rare pairs (harder to value)
- Speculative plays (until you have experience)

## Portfolio Allocation Strategy

### The 60-30-10 Rule

**60% - Core Holdings (Safe Bets)**
- Proven resale models
- High liquidity
- Stable price history
- Lower risk, steady returns

**Examples**: Jordan 1s, Dunk Lows, Yeezy 350s in popular sizes

**30% - Growth Opportunities**
- Emerging trends
- New collaborations
- Undervalued models
- Medium risk, higher potential

**Examples**: New Balance collaborations, ASICS releases, limited colorways

**10% - Speculative Plays**
- High-risk, high-reward
- New brands or models
- Experimental purchases
- Can afford to lose this portion

**Examples**: New brand releases, experimental designs, cultural moments

## Size Strategy

### Focus on High-Demand Sizes

**In India, prioritize**:
- **UK 8-10**: Highest demand, fastest sales
- **UK 7**: Good demand, slightly lower than 8-10
- **UK 11-12**: Lower demand but less competition

**Avoid** (initially):
- Very small sizes (UK 5-6): Limited market
- Very large sizes (UK 13+): Niche market
- Half sizes: Can be harder to sell

### Size Diversification

Once you have 5+ pairs, diversify:
- 50% in UK 8-10 (high liquidity)
- 30% in UK 7 or 11 (good demand)
- 20% in other sizes (if you see opportunities)

## Brand Diversification

### Start with Established Brands

**Tier 1 (Safest)**:
- Nike (Jordan, Dunk, Air Max)
- Adidas (Yeezy, Samba, Gazelle)

**Tier 2 (Good balance)**:
- New Balance
- ASICS
- Puma

**Tier 3 (More speculative)**:
- Emerging brands
- Luxury collaborations
- Niche brands

### Portfolio Brand Mix

- **50%**: Nike/Adidas (proven, liquid)
- **30%**: New Balance/ASICS (growing, good margins)
- **20%**: Other brands (diversification, opportunities)

## Price Point Strategy

### Mix Across Price Ranges

**Entry Level (₹8,000 - ₹15,000)**:
- Lower risk per pair
- Easier to sell
- Good for learning
- 40% of portfolio

**Mid-Tier (₹15,000 - ₹30,000)**:
- Better profit potential
- Still manageable risk
- 40% of portfolio

**Premium (₹30,000+)**:
- Highest profit potential
- Higher risk
- Lower liquidity
- 20% of portfolio

## Building Your First Portfolio: Step-by-Step

### Step 1: Set Your Budget

**Determine**:
- Total capital available
- Maximum per pair
- Reserve cash (20% for opportunities)
- Emergency fund (separate from investment)

### Step 2: Research and Identify

**Research**:
- Models with 6+ months of resale history
- Consistent price appreciation
- Good liquidity metrics
- Positive market sentiment

**Create a watchlist** of 10-15 potential pairs.

### Step 3: Make Your First Purchase

**Start with**:
- 1 safe bet (proven model, popular size)
- Buy at B2B price if possible
- Set profit target (20-30%)
- Set exit timeline (3-6 months)

### Step 4: Monitor and Learn

**Track**:
- Price movements
- Time to sell
- Actual vs expected returns
- What worked and what didn't

### Step 5: Add Second Pair

**After 1-2 months**, add:
- Different brand or category
- Different price point
- Continue learning

### Step 6: Build to 3-5 Pairs

**Gradually expand**:
- Diversify across brands
- Mix of safe bets and growth
- Different sizes
- Vary price points

## Portfolio Management

### Regular Reviews

**Monthly check-ins**:
- Review each position's performance
- Identify winners and losers
- Adjust strategy based on learnings
- Consider rebalancing

### Rebalancing

**When to rebalance**:
- One position becomes too large (% of portfolio)
- Market conditions changed
- Better opportunities available
- Need to take profits

### Taking Profits

**Sell when**:
- Profit target reached (20-30%)
- Price plateaued for 2+ months
- Better opportunity available
- Need to rebalance portfolio

## Common First-Portfolio Mistakes

1. **Too much too soon**: Starting with 10+ pairs
2. **All hype**: Only buying trending pairs
3. **No diversification**: All one brand or size
4. **Emotional buying**: Buying what you "like" not what's profitable
5. **No exit plan**: Buying without knowing when to sell
6. **Ignoring costs**: Not factoring in storage, time, opportunity cost

## Sample First Portfolio

**Portfolio Value**: ₹75,000

1. **Jordan 1 Low (UK 9)** - ₹25,000
   - Safe bet, high liquidity
   - Target: 25% profit in 4 months

2. **New Balance 550 (UK 8)** - ₹20,000
   - Growth opportunity, emerging trend
   - Target: 30% profit in 6 months

3. **Dunk Low (UK 10)** - ₹30,000
   - Mid-tier, proven model
   - Target: 20% profit in 3 months

**Total**: ₹75,000
**Expected return**: 20-25% over 4-6 months
**Risk level**: Low to medium

## Scaling Your Portfolio

**Once comfortable with 3-5 pairs**:

1. **Increase position sizes**: But keep individual limits (10-20% of portfolio)
2. **Add more pairs**: Gradually to 10-15 pairs
3. **Explore new categories**: After mastering basics
4. **Increase speculative allocation**: As you gain experience
5. **Build relationships**: For better B2B access

## Key Metrics to Track

- **Total portfolio value**: Overall performance
- **Average holding period**: Time to profit
- **Win rate**: % of profitable sales
- **Average profit margin**: Per pair and overall
- **Liquidity ratio**: % that can sell quickly

## The Journey

> **Building a portfolio is a journey, not a destination. Start small, learn continuously, and scale gradually. Every pair teaches you something new about the market.**

Remember: **Consistency beats perfection**. Small, consistent gains compound over time.`,
    estimatedTime: '10 min read',
    difficulty: 'beginner',
  },
];

export const EducationHub: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);

  const categories = ['all', 'basics', 'buying', 'selling', 'strategy', 'risks'];
  const filteredGuides = selectedCategory === 'all' 
    ? guides 
    : guides.filter(g => g.category === selectedCategory);

  if (selectedGuide) {
    return (
      <main className="flex-1 bg-brand-white px-6 py-6 md:px-8 md:py-8 pb-20 md:pb-8 max-w-7xl mx-auto">
        <button
          onClick={() => setSelectedGuide(null)}
          className="mb-6 text-sm font-medium text-brand-black/70 hover:text-brand-black flex items-center gap-2 transition"
        >
          ← Back to Guides
        </button>
        <article className="border border-brand-gray/30 p-8 bg-brand-white" style={{ borderRadius: '0px' }}>
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-brand-gray/20">
            <span
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
              selectedGuide.difficulty === 'beginner' 
                  ? 'bg-green-500/10 text-green-700 border border-green-500/30'
                : selectedGuide.difficulty === 'intermediate'
                  ? 'bg-yellow-500/10 text-yellow-700 border border-yellow-500/30'
                  : 'bg-brand-gray/10 text-brand-black border border-brand-gray/30'
              }`}
              style={{ borderRadius: '0px' }}
            >
              {selectedGuide.difficulty}
            </span>
            <span className="text-xs text-brand-black/60 uppercase tracking-wide">{selectedGuide.estimatedTime}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-heading font-normal text-brand-black mb-4">
            {selectedGuide.title}
          </h1>
          <p className="text-base text-brand-black/70 mb-8">{selectedGuide.description}</p>
          <div className="prose prose-sm max-w-none text-sm font-body text-brand-black leading-relaxed">
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold text-brand-black mt-8 mb-4 uppercase tracking-wide">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold text-brand-black mt-6 mb-3">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-sm text-brand-black leading-relaxed mb-4">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-4 space-y-2 text-sm text-brand-black ml-4">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-4 space-y-2 text-sm text-brand-black ml-4">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-sm text-brand-black leading-relaxed">
                    {children}
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-brand-black">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-brand-black">
                    {children}
                  </em>
                ),
                code: ({ children }) => (
                  <code className="bg-brand-gray/10 px-1.5 py-0.5 text-xs font-mono text-brand-black">
                    {children}
                  </code>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-brand-black pl-4 py-2 my-4 bg-brand-gray/5 italic text-brand-black">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {selectedGuide.content}
            </ReactMarkdown>
          </div>
        </article>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-brand-white px-6 py-6 md:px-8 md:py-8 pb-20 md:pb-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-brand-gray/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-normal text-brand-black mb-2">
          Education Hub
        </h1>
            <p className="text-sm text-brand-black/70">
          Learn everything you need to know about sneaker investing in India
        </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-1">Total Guides</p>
            <p className="text-2xl font-semibold text-brand-black">
              {guides.length}
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-8">
        <label className="block text-xs text-brand-black/60 uppercase tracking-wide mb-3">
          Categories
        </label>
        <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 border text-xs font-semibold uppercase tracking-wide transition-all ${
              selectedCategory === cat
                  ? "border-brand-black bg-brand-black text-brand-white hover:bg-brand-black/90"
                  : "border-brand-gray/30 bg-brand-white text-brand-black hover:border-brand-black hover:bg-brand-black hover:text-brand-white"
            }`}
              style={{ borderRadius: '0px' }}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
        </div>
      </div>

      {/* Guides Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGuides.map((guide) => (
          <button
            key={guide.id}
            onClick={() => setSelectedGuide(guide)}
            className="border border-brand-gray/30 p-6 bg-brand-white hover:border-brand-black hover:bg-brand-gray/5 text-left transition-all"
            style={{ borderRadius: '0px' }}
          >
            <div className="flex items-start justify-between mb-4">
              <span
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                guide.difficulty === 'beginner' 
                    ? 'bg-green-500/10 text-green-700 border border-green-500/30'
                  : guide.difficulty === 'intermediate'
                    ? 'bg-yellow-500/10 text-yellow-700 border border-yellow-500/30'
                    : 'bg-brand-gray/10 text-brand-black border border-brand-gray/30'
                }`}
                style={{ borderRadius: '0px' }}
              >
                {guide.difficulty}
              </span>
              <span className="text-xs text-brand-black/60 uppercase tracking-wide">{guide.estimatedTime}</span>
            </div>
            <h3 className="text-lg font-semibold text-brand-black mb-2">
              {guide.title}
            </h3>
            <p className="text-sm text-brand-black/70 leading-relaxed">{guide.description}</p>
          </button>
        ))}
      </div>
    </main>
  );
};

