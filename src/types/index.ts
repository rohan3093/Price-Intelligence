/**
 * Data model aligned with Google Sheet structure:
 * 
 * Google Sheet Columns:
 * - WhatsApp groups (data source indicator - B2B prices come from WhatsApp groups)
 * - B2B Market price
 * - End customer market price
 * - StockX or Goat Price (reshipping to India)
 * 
 * The Asset interface uses the new field names that directly map to Google Sheet columns.
 * Legacy fields (b2bRange, b2cRange, globalRange) are kept for backward compatibility
 * and will be removed in a future version.
 */
export interface Asset {
  id: number;
  name: string;
  sku: string;
  brand: string;
  category: string;
  image: string;
  
  // Size variants - each size has its own pricing
  sizes: SizeVariant[];
  
  // Retail prices (original launch prices)
  priceAnchors?: {
    retailIndia?: number; // Original retail price in India
    retailGlobal?: number; // Original retail price globally
    historical30d?: { min: number; max: number };
    historical90d?: { min: number; max: number };
  };

  // Listing snapshots (for quick liquidity read)
  listingsSnapshot?: {
    b2bCount?: number;
    consumerCount?: number;
    intlCount?: number;
  };

  volatility?: 'low' | 'medium' | 'high';

  // Default/primary size (for backward compatibility and quick display)
  // This could be the most popular size or the size with most data
  defaultSize?: string;
  
  // Legacy fields for backward compatibility
  // These map to the default size or first size in the array
  size?: string; // Maps to defaultSize or sizes[0].size
  b2bMarketPrice?: string; // Maps to selected/default size
  endCustomerMarketPrice?: string;
  stockxGoatPrice?: string;
  pricePoints?: {
    b2b: PricePoint[];
    endCustomer: PricePoint[];
    stockxGoat: PricePoint[];
  };
  lastUpdated?: Date | string;
  dataPoints?: number;
  fairRange?: string;
  confidence?: number;
  change30d?: string;
  change90d?: string;
  liquidity?: string;
  volumeLabel?: string;
  insight?: MarketInsight;
  bestAvailablePrice?: number;
  b2bRange?: string;
  b2cRange?: string;
  globalRange?: string;
}

// Channel types for market segmentation
export type MarketChannel = 'whatsapp' | 'marketplace' | 'international';

// Transaction type (for WhatsApp groups - can be mixed B2B/B2C)
export type TransactionType = 'buy' | 'sell' | 'both';

// Seller type (for context)
export type SellerType = 'reseller' | 'end-customer' | 'unknown';

// Indian marketplace names
export type IndianMarketplace = 
  | 'crepdogcrew'
  | 'mainstreet'
  | 'culturecircle'
  | 'hypefly'
  | 'dawntown'
  | '10hillsstudio'
  | 'findyourkicks'
  | 'instagram'
  | 'facebook'
  | 'other';

// Price point with listing count for granular market data
export interface PricePoint {
  price: number; // Specific price in rupees
  listingCount: number; // How many listings at this price (quantity available)
  lastSeen?: Date | string; // When this price was last observed
  
  // Channel identification
  channel: MarketChannel;
  
  // Source details
  source?: string; // e.g., 'whatsapp-group-mumbai', 'crepdogcrew', 'stockx'
  marketplaceName?: string; // Human-readable: 'CrepdogCrew', 'Mainstreet Marketplace'
  
  // Transaction type (for WhatsApp - can be mixed)
  transactionType?: TransactionType;
  
  // Seller information (for WhatsApp listings - like HYPESCAN)
  sellerName?: string; // e.g., 'Mayankk_01', 'KICKSSCAPE'
  sellerContact?: string; // WhatsApp number or contact info
  sellerLocation?: string; // e.g., 'Delhi', 'Mumbai', 'Bangalore'
  sellerProfileImage?: string; // Optional: profile picture URL
  
  // Additional metadata
  size?: string;
  url?: string; // Link to listing
  condition?: 'new' | 'used' | 'deadstock';
  sellerType?: SellerType; // For WhatsApp context
  
  // International platform specific
  reshippingCost?: number; // Reshipping cost to India (in rupees) - excludes customs duties
  
  // Legacy support
  legacySource?: 'whatsapp' | 'marketplace' | 'stockx' | 'goat' | 'instagram';
}

// Size-specific pricing data
export interface SizeVariant {
  size: string; // e.g., "UK 7", "UK 8", "UK 9", "UK 10"
  // Direct mapping from Google Sheet columns (ranges)
  b2bMarketPrice: string; // B2B Market price for this size
  endCustomerMarketPrice: string; // End customer market price for this size
  stockxGoatPrice: string; // StockX or Goat price for this size
  
  // Channel-based price data (new structure)
  pricePoints?: {
    whatsapp: PricePoint[]; // WhatsApp groups & reseller networks
    marketplace: PricePoint[]; // Indian marketplaces
    international: PricePoint[]; // StockX, Goat, eBay
  };
  
  // Legacy price points (for backward compatibility)
  legacyPricePoints?: {
    b2b: PricePoint[];
    endCustomer: PricePoint[];
    stockxGoat: PricePoint[];
  };
  
  // Calculated/derived fields for this size
  fairRange: string;
  confidence: number;
  change30d: string;
  change90d: string;
  liquidity: string;
  volumeLabel: string;
  
  // Actionable insights for this size
  insight?: MarketInsight;
  bestAvailablePrice?: number;
  
  // Data freshness for this size
  lastUpdated?: Date | string;
  dataPoints?: number;
}

// Market insight for actionable recommendations
export interface MarketInsight {
  recommendation: 'buy' | 'sell' | 'hold' | 'watch';
  reasoning: string;
  confidence: number;
  bestPrice?: number; // Best available price right now
  expectedMovement?: string; // "Likely to increase 5-8% in next 2 weeks"
}

export type View = "home" | "watchlist" | "getting-started" | "education" | "portfolio" | "analyst" | "drops";

// User profile for investment tracking
export interface UserProfile {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  budget: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  investmentGoals: string[];
  portfolioValue?: number;
}

// Investment opportunity for beginners
export interface InvestmentOpportunity {
  id: number;
  asset: Asset;
  whyGoodForBeginners: string[];
  riskLevel: 'low' | 'medium' | 'high';
  minimumInvestment: number;
  expectedReturn: string; // e.g., "15-25% in 6 months"
  timeHorizon: string; // e.g., "3-6 months"
  liquidity: string;
  learningValue: string; // What they'll learn from this investment
}

// Educational content
export interface Guide {
  id: number;
  title: string;
  category: 'basics' | 'buying' | 'selling' | 'strategy' | 'risks';
  description: string;
  content: string;
  estimatedTime: string; // e.g., "5 min read"
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface Category {
  name: string;
  available: boolean;
}

// Drop/Release types for upcoming sneaker releases
export type DropStatus = 'pending_review' | 'upcoming' | 'live' | 'sold-out' | 'cancelled' | 'rejected';
export type DropSourceType = 'nike-snkrs-scrape' | 'house-of-heat-scrape' | 'manual' | 'api';
export type DropRetailerName = 'nike-snkrs-india' | 'vnv' | 'superkicks' | 'limited-edition' | 'footlocker-india' | 'adidas-confirmed' | 'puma' | 'other';
export type RetailerPartnershipStatus = 'scraped' | 'manual' | 'api-partner' | 'feed-partner' | 'webhook-partner';

export interface DropRetailer {
  name: DropRetailerName;
  displayName: string;
  url?: string;
  releaseTime?: string; // e.g., "4:31 AM IST"
  isExclusive?: boolean; // Only available at this retailer
  status?: 'available' | 'sold-out' | 'not-live-yet';
  partnershipStatus: RetailerPartnershipStatus;
  apiSource?: string; // API endpoint if available
}

export interface Drop {
  id: number;
  name: string;
  sku?: string;
  brand: string;
  image: string;
  
  // Release date/time
  releaseDate: string; // ISO date string
  releaseTime?: string; // e.g., "4:31 AM IST"
  retailPrice?: number; // INR
  
  // Multiple retailers - key for India market
  retailers: DropRetailer[];
  
  // Link to existing asset (if already in your system)
  linkedAssetId?: number;
  
  // Additional info
  description?: string;
  category: string;
  sizes?: string[]; // Available sizes
  
  // Status workflow: pending_review → upcoming → live → sold-out
  status: DropStatus;
  
  // Hype level indicator (optional - can be set manually or calculated)
  hypeLevel?: 'low' | 'medium' | 'high' | 'extreme';
  
  // Source tracking for automation
  source: {
    type: DropSourceType;
    url?: string; // Original source URL
    lastScraped?: string; // When last fetched from source
    scrapeId?: string; // Unique ID from source (for deduplication)
    confidence?: number; // How confident we are in the data (0-100)
  };
  
  // Verification
  verified: boolean; // Manually verified by analyst
  verifiedBy?: string; // Analyst email/ID
  verifiedAt?: string; // ISO timestamp
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // Analyst who added/verified
}

