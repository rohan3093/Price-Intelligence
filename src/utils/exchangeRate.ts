/**
 * Exchange rate utility for USD to INR conversion
 * Uses a free API to fetch current exchange rates
 */

interface ExchangeRateResponse {
  rates?: {
    INR?: number;
  };
  result?: number;
  success?: boolean;
}

// Cache for exchange rate to avoid excessive API calls
let cachedRate: number | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

/**
 * Fetches the current USD to INR exchange rate
 * Uses exchangerate-api.com (free tier) as primary, with fallback options
 */
export async function getUSDToINRRate(): Promise<number> {
  // Return cached rate if still valid
  const now = Date.now();
  if (cachedRate && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedRate;
  }

  try {
    // Try exchangerate-api.com first (free, no API key needed)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate');
    }

    const data: ExchangeRateResponse = await response.json();
    
    if (data.rates?.INR) {
      cachedRate = data.rates.INR;
      cacheTimestamp = now;
      return cachedRate;
    }
  } catch (error) {
    console.warn('Failed to fetch exchange rate from primary source:', error);
  }

  // Fallback: Try fixer.io (requires API key, but has free tier)
  // If you have a fixer.io API key, uncomment and add it:
  /*
  try {
    const FIXER_API_KEY = 'YOUR_API_KEY'; // Add your API key here
    const response = await fetch(`http://data.fixer.io/api/latest?access_key=${FIXER_API_KEY}&symbols=INR&base=USD`);
    const data = await response.json();
    if (data.success && data.rates?.INR) {
      cachedRate = data.rates.INR;
      cacheTimestamp = now;
      return cachedRate;
    }
  } catch (error) {
    console.warn('Failed to fetch exchange rate from fixer.io:', error);
  }
  */

  // Final fallback: Use a reasonable default rate (around 83 INR per USD as of 2024)
  // This ensures the app still works even if API calls fail
  const fallbackRate = 83.0;
  console.warn('Using fallback exchange rate:', fallbackRate);
  cachedRate = fallbackRate;
  cacheTimestamp = now;
  return fallbackRate;
}

/**
 * Converts USD to INR using current exchange rate
 */
export async function convertUSDToINR(usdAmount: number): Promise<number> {
  const rate = await getUSDToINRRate();
  return usdAmount * rate;
}

/**
 * Converts INR to USD using current exchange rate
 */
export async function convertINRToUSD(inrAmount: number): Promise<number> {
  const rate = await getUSDToINRRate();
  return inrAmount / rate;
}

