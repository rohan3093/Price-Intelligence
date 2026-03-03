/**
 * WhatsApp Chat Export Parser (v2 — Multi-Asset)
 *
 * Parses WhatsApp's "Export Chat → Without Media" .txt format and extracts
 * structured sneaker listing data (WTS/WTB, asset name, sizes, prices, contacts).
 *
 * v2 handles the real-world pattern where a SINGLE message lists MULTIPLE assets:
 *   "WTS
 *    Yeezy 350 Bone UK10.5
 *    Yeezy 350 Cream White UK10
 *    Kentucky Dunk Low UK8"
 *
 * WhatsApp export format (auto-detects M/D/Y vs D/M/Y):
 *   D/M/YYYY, HH:MM am/pm - SenderName: MessageContent    (Android, Indian locale)
 *   [M/D/YY, HH:MM:SS AM/PM] SenderName: MessageContent   (iOS, US locale)
 */

import { Asset, PricePoint } from "../types";

// ── Parsed types ──────────────────────────────────────────────────────

export interface ParsedWhatsAppMessage {
  timestamp: string; // ISO string
  sender: string;
  rawMessage: string;
  // Extracted listings (plural — one message can have many items)
  listings: ParsedListing[];
}

export interface ParsedListing {
  side: "WTS" | "WTB";
  assetText: string; // Raw asset name extracted from message
  sizes: string[]; // e.g., ["UK 9", "UK 10"]
  price: number | null; // In INR
  contact: string | null; // Phone number if found
  location: string | null; // City if detected
  notes: string; // Any remaining text
}

export interface MatchedListing extends ParsedListing {
  // From the parsed message
  timestamp: string;
  sender: string;
  rawMessage: string;
  // Asset matching
  matchedAsset: Asset | null;
  matchConfidence: number; // 0-100
  matchCandidates: Array<{ asset: Asset; score: number }>; // Top 5 alternatives
  // For review UI
  selected: boolean; // Whether analyst wants to import this
  manualAssetId: number | null; // If analyst overrides the match
  manualSize: string | null; // If analyst overrides size
}

// ── Constants ─────────────────────────────────────────────────────────

const INDIAN_CITIES = [
  "delhi",
  "mumbai",
  "bangalore",
  "bengaluru",
  "hyderabad",
  "chennai",
  "kolkata",
  "pune",
  "ahmedabad",
  "jaipur",
  "lucknow",
  "chandigarh",
  "gurgaon",
  "gurugram",
  "noida",
  "goa",
  "kochi",
  "indore",
  "surat",
  "nagpur",
  "bhopal",
  "coimbatore",
  "vadodara",
  "navi mumbai",
  "thane",
];

// Words to strip from asset text when matching
const NOISE_WORDS = new Set([
  "wts", "wtb", "want", "to", "sell", "buy", "selling", "buying",
  "for", "sale", "available", "dm", "message", "contact", "call",
  "whatsapp", "details", "price", "negotiable", "nego", "fixed", "firm",
  "brand", "new", "deadstock", "ds", "bnib", "vnds", "dswt", "pads",
  "condition", "condo", "shipped", "shipping", "free", "included",
  "cod", "cash", "delivery", "urgent", "asap", "quick", "fast", "today",
  "check", "anyone", "interested", "looking", "need", "have", "got",
  "with", "box", "without", "receipt", "bill", "original", "authentic",
  "legit", "100%", "pair", "pairs", "set", "combo", "only", "each",
  "per", "inr", "rs", "rupees", "₹", "/-", "-/", "pm", "lowest",
  "ask", "revert", "hand", "inhand", "ready", "ship", "steal", "deal",
  "taking", "orders", "single", "bulk", "colours", "colors",
  "size", "sizes", "in", "dswt",
]);

// Lines that are pure noise (not asset names)
const NOISE_LINE_PATTERNS = [
  /^\s*$/,
  /^[\p{Emoji}\s\u200d\ufe0f]+$/u,                          // Only emojis
  /^(?:dm|pm)\b/i,                                          // "DM with ask"
  /^(?:in\s+hand|inhand)\b/i,                               // "In hand Delhi"
  /^(?:cash\s+ready|cashready)\b/i,
  /^(?:location|loc)\b/i,
  /^(?:all\s+(?:colours?|colors?|sizes?|cities))\b/i,       // "All colours and sizes available"
  /^(?:delivery|shipping|shipped)\b/i,
  /^(?:only\s+dm|no\s+time\s+pass|revert|guaranteed)\b/i,
  /^(?:read\s+more|‎read\s+more)\b/i,                       // WhatsApp "Read more"
  /^https?:\/\//i,                                           // URLs
  /^(?:below|on)\s+mrp/i,                                   // "Below Mrp"
  /^(?:no\s+extra\s+taxes|tickets\s+will)\b/i,
  /^(?:\d+\+?\s*vouches?)/i,                                // "100+ vouches"
  /^(?:p\.?s\.?|note)\b/i,
  /^(?:if\s+you|if\s+anyone|anyone)\b/i,
  /^(?:dustbag|receipt|bill)\b/i,
  /^in\s+transit\b/i,
  /^\(in\s+hand\b/i,                                        // "(In hand ready to ship)"
  /^\(dswt\b/i,                                             // "(dswt | Inhand...)"
  /^(?:dswt|ds|bnib|vnds)\b/i,                             // Condition-only lines
  /^(?:condo|condition)\s*[-–:]/i,                          // "Condo - PADS"
  /^(?:going\s+with|closing\s+now)\b/i,
  /^(?:last\s+few|limited)\b/i,
  /^(?:send|revert)\b/i,
  /^(?:looking|need)\s+in\b/i,                              // "Need in Chennai/Blr"
];

// ── Message line parser ───────────────────────────────────────────────

// Android format: "18/02/2026, 10:32 am - Sender Name: message"
const ANDROID_LINE_REGEX =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)\s*[-–]\s*([^:]+?):\s*(.+)$/;

// iOS format: "[18/02/2026, 10:32:45 AM] Sender Name: message"
const IOS_LINE_REGEX =
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)\]\s*([^:]+?):\s*(.+)$/;

function parseWhatsAppLine(
  line: string
): { date: string; time: string; sender: string; message: string } | null {
  let match = line.match(ANDROID_LINE_REGEX);
  if (!match) {
    match = line.match(IOS_LINE_REGEX);
  }
  if (!match) return null;

  return {
    date: match[1],
    time: match[2],
    sender: match[3].trim(),
    message: match[4].trim(),
  };
}

/**
 * Date format: "M/D/YY" (iOS US) vs "D/M/YY" (Android India).
 * Auto-detected per chat by scanning all dates.
 */
type DateFormat = "MDY" | "DMY";

/**
 * Auto-detect the date format of a WhatsApp chat export.
 * If any date has a second number > 12 it must be M/D/Y (since months can't exceed 12).
 * If any date has a first number > 12 it must be D/M/Y.
 * Default: "MDY" (iOS format, more common in exports).
 */
function detectDateFormat(rawLines: string[]): DateFormat {
  for (const line of rawLines) {
    const parsed = parseWhatsAppLine(line);
    if (!parsed) continue;
    const parts = parsed.date.split("/");
    const a = parseInt(parts[0]);
    const b = parseInt(parts[1]);
    // If first number > 12, it can't be a month → must be D/M/Y
    if (a > 12) return "DMY";
    // If second number > 12, it can't be a month → must be M/D/Y
    if (b > 12) return "MDY";
  }
  // Ambiguous (all values ≤ 12) — default to MDY (iOS) since the user's export uses it
  return "MDY";
}

function toISOTimestamp(dateStr: string, timeStr: string, format: DateFormat): string {
  try {
    const parts = dateStr.split("/");
    let day: number, month0: number, year: number;

    if (format === "MDY") {
      // M/D/YY — iOS US format (e.g., 2/18/26 = Feb 18, 2026)
      month0 = parseInt(parts[0]) - 1; // 0-indexed
      day = parseInt(parts[1]);
      year = parseInt(parts[2]);
    } else {
      // D/M/YY — Android India format (e.g., 18/02/26 = Feb 18, 2026)
      day = parseInt(parts[0]);
      month0 = parseInt(parts[1]) - 1;
      year = parseInt(parts[2]);
    }

    if (year < 100) year += 2000;

    const timeLower = timeStr.toLowerCase().trim();
    const isPM = timeLower.includes("pm");
    const isAM = timeLower.includes("am");
    const timeClean = timeLower.replace(/\s*(am|pm)\s*/i, "");
    const timeParts = timeClean.split(":");
    let hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]) || 0;

    if (isPM && hours !== 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    const d = new Date(year, month0, day, hours, minutes);
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// ── Extraction helpers ────────────────────────────────────────────────

function detectSide(text: string): "WTS" | "WTB" | null {
  const lower = text.toLowerCase();

  if (/\bwts\b/.test(lower) || /\bw\.t\.s\b/.test(lower)) return "WTS";
  if (/\bwtb\b/.test(lower) || /\bw\.t\.b\b/.test(lower)) return "WTB";

  if (/\bselling\b/.test(lower) || /\bfor\s+sale\b/.test(lower)) return "WTS";
  if (
    /\blooking\s+(for|to\s+buy)\b/.test(lower) ||
    /\bneed\b/.test(lower) ||
    /\bbuying\b/.test(lower) ||
    /\bwant\s+to\s+buy\b/.test(lower)
  )
    return "WTB";

  return null;
}

/**
 * Extract sizes from text.
 * Handles:
 *   UK9, UK 9, uk-9, Uk-6/7/8/9, UK 10/10.5/11, 9UK
 *   US10, US 10, EU 42, eu40
 *   Size - UK8  (with dash separator)
 */
function extractSizes(text: string): string[] {
  const sizes: string[] = [];

  // UK sizes with slash/and-separated multiples: "Uk-6/7/8/9", "UK 10/10.5/11", "uk 10 and 12.5"
  const ukSlashPattern = /\buk[\s-]*(\d+(?:\.\d+)?(?:\s*(?:\/|and)\s*\d+(?:\.\d+)?)+)/gi;
  let match;
  while ((match = ukSlashPattern.exec(text)) !== null) {
    const nums = match[1].split(/(?:\/|and)/).map((s) => s.trim()).filter(Boolean);
    for (const num of nums) {
      sizes.push(`UK ${num}`);
    }
  }

  // Single UK sizes: "UK9", "UK 9", "uk-9", "Uk9.5"
  const ukSinglePattern = /\buk[\s-]*(\d+(?:\.\d+)?)\b/gi;
  while ((match = ukSinglePattern.exec(text)) !== null) {
    sizes.push(`UK ${match[1]}`);
  }

  // Reverse: "9UK"
  const ukReversePattern = /\b(\d+(?:\.\d+?))\s*uk\b/gi;
  while ((match = ukReversePattern.exec(text)) !== null) {
    sizes.push(`UK ${match[1]}`);
  }

  // US sizes
  const usPattern = /\bus[\s-]*(\d+(?:\.\d+)?)\b/gi;
  while ((match = usPattern.exec(text)) !== null) {
    // Don't match "us" in words like "dusty", "ocus" etc.
    sizes.push(`US ${match[1]}`);
  }

  // EU sizes: "eu40", "EU 42", "eu 40"
  const euPattern = /\beu[\s-]*(\d+(?:\.\d+)?)\b/gi;
  while ((match = euPattern.exec(text)) !== null) {
    sizes.push(`EU ${match[1]}`);
  }

  // Deduplicate
  return [...new Set(sizes)];
}

function extractPrice(text: string): number | null {
  // ₹/Rs/INR prefixed
  const currencyPattern = /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(?:k\b|\/[-–])?/gi;
  let match = currencyPattern.exec(text);
  if (match) {
    const base = parsePrice(match[1]);
    if (base) return base;
  }

  // "k" suffix: "12k", "8.5k"
  const kPattern = /\b(\d+(?:\.\d+)?)\s*k\b/gi;
  match = kPattern.exec(text);
  if (match) {
    return Math.round(parseFloat(match[1]) * 1000);
  }

  // Standalone 4-7 digit numbers (prices ≥1000)
  const numberPattern = /\b([\d,]{4,7})\s*(?:\/[-–])?\b/g;
  const candidates: number[] = [];
  while ((match = numberPattern.exec(text)) !== null) {
    const val = parsePrice(match[1]);
    if (val && val >= 1000 && val <= 500000) {
      candidates.push(val);
    }
  }
  return candidates.length > 0 ? candidates[0] : null;
}

function parsePrice(str: string): number | null {
  const cleaned = str.replace(/,/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : Math.round(val);
}

function extractPhone(text: string): string | null {
  const phonePattern = /(?:\+?91[\s-]?)?([6-9]\d{4}[\s-]?\d{5})\b/;
  const match = text.match(phonePattern);
  if (match) {
    const digits = match[0].replace(/[\s-]/g, "");
    return digits.startsWith("+")
      ? digits
      : digits.startsWith("91") && digits.length > 10
      ? `+${digits}`
      : `+91${digits.slice(-10)}`;
  }
  return null;
}

function extractLocation(text: string): string | null {
  const lower = text.toLowerCase();
  for (const city of INDIAN_CITIES) {
    const regex = new RegExp(`\\b${city}\\b`, "i");
    if (regex.test(lower)) {
      return city.charAt(0).toUpperCase() + city.slice(1);
    }
  }
  return null;
}

/**
 * Clean a line of text to extract just the asset name portion
 */
function cleanAssetText(text: string): string {
  let cleaned = text;

  // Remove WTS/WTB tags
  cleaned = cleaned.replace(/\b(?:wts|wtb|w\.t\.s|w\.t\.b)\b/gi, "");

  // Remove size patterns (including slash/and-separated multiples)
  cleaned = cleaned.replace(/\buk[\s-]*\d+(?:\.\d+)?(?:\s*(?:\/|and)\s*\d+(?:\.\d+)?)*/gi, "");
  cleaned = cleaned.replace(/\b\d+(?:\.\d+)?\s*uk\b/gi, "");
  cleaned = cleaned.replace(/\bus[\s-]*\d+(?:\.\d+)?/gi, "");
  cleaned = cleaned.replace(/\beu[\s-]*\d+(?:\.\d+)?/gi, "");
  cleaned = cleaned.replace(/\(eu\s*\d+\)/gi, ""); // "(eu40)"
  cleaned = cleaned.replace(/\(us\s*w?\s*\d+(?:\.\d+)?\)/gi, ""); // "(US W 5.5)"

  // Remove price patterns
  cleaned = cleaned.replace(/(?:₹|rs\.?|inr)\s*[\d,]+(?:\.\d+)?\s*(?:k\b|\/[-–])?/gi, "");
  cleaned = cleaned.replace(/\b\d+(?:\.\d+)?\s*k\b/gi, "");

  // Remove phone numbers
  cleaned = cleaned.replace(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/g, "");

  // Remove city names
  for (const city of INDIAN_CITIES) {
    cleaned = cleaned.replace(new RegExp(`\\b${city}\\b`, "gi"), "");
  }

  // Remove parenthesized metadata like "(dswt | Inhand in Delhi)", "(In hand ready to ship)"
  cleaned = cleaned.replace(/\([^)]*\)/g, "");

  // Remove leading bullets, dashes, dots, numbers with dots
  cleaned = cleaned.replace(/^[\s•\-–—·*→►▪▸‣⁠]+/, "");

  // Remove noise words
  const words = cleaned.split(/\s+/);
  const meaningful = words.filter((w) => {
    const lower = w.toLowerCase().replace(/[^a-z0-9]/g, "");
    return lower.length > 0 && !NOISE_WORDS.has(lower);
  });

  return meaningful
    .join(" ")
    .replace(/[-–—]+/g, " ")
    .replace(/[,;|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if a line is purely a size line (no asset name)
 * e.g., "Uk-6/7/8/9", "UK 10", "uk9.5", "Size - UK8"
 */
function isSizeOnlyLine(line: string): boolean {
  const cleaned = line
    .replace(/^[\s•\-–—·*→►▪▸‣⁠]+/, "") // strip leading bullets
    .trim();
  // Strip "Size" / "Size -" prefix
  const withoutSizePrefix = cleaned.replace(/^size\s*[-–:]?\s*/i, "");
  // After removing sizes, is there anything meaningful left?
  const withoutSizes = withoutSizePrefix
    .replace(/\buk[\s-]*\d+(?:\.\d+)?(?:\s*(?:\/|and)\s*\d+(?:\.\d+)?)*/gi, "")
    .replace(/\b\d+(?:\.\d+)?\s*uk\b/gi, "")
    .replace(/\bus[\s-]*\d+(?:\.\d+)?/gi, "")
    .replace(/\beu[\s-]*\d+(?:\.\d+)?/gi, "")
    .replace(/\((?:eu|us)\s*w?\s*\d+(?:\.\d+)?\)/gi, "")
    .replace(/^[\s\-–—·,/()]+$/, "")
    .trim();
  return extractSizes(cleaned).length > 0 && withoutSizes.length < 3;
}

/**
 * Check if a line is noise (not an asset listing)
 */
function isNoiseLine(line: string): boolean {
  const cleaned = line.replace(/^[\s•\-–—·*→►▪▸‣⁠]+/, "").trim();
  if (cleaned.length < 2) return true;
  for (const pattern of NOISE_LINE_PATTERNS) {
    if (pattern.test(cleaned)) return true;
  }
  return false;
}

// ── Multi-asset extraction ────────────────────────────────────────────

interface ItemLine {
  assetText: string;
  sizes: string[];
  price: number | null;
  rawLine: string;
}

/**
 * Split a multi-line message into individual (asset + sizes) groups.
 *
 * Handles patterns like:
 *   "WTS\nYeezy 350 Bone UK10\nYeezy 350 Cream UK10"
 *   "J4 military black\nUk9.5"                          (size on next line)
 *   "-Yeezy 350v2 Slate UK10\n-Yeezy 350v2 MX Oat UK10" (dash prefix)
 *   "Azure slide\nUk-6/7/8/9"                           (slash sizes)
 */
function splitMessageIntoItems(messageText: string): ItemLine[] {
  // Split on real newlines (the chat parser joins continuation lines with \n in rawMessage,
  // but we split the ORIGINAL multi-line message body).
  // Since parseWhatsAppChat joins continuations with " ", we need to use
  // the original line breaks. Let's split on common line-break indicators.
  const lines = messageText.split(/\n/).map((l) => l.trim()).filter(Boolean);

  const items: ItemLine[] = [];
  let pendingAsset: { text: string; rawLine: string } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip noise lines
    if (isNoiseLine(line)) {
      // If we have a pending asset with no sizes yet, finalize it
      if (pendingAsset) {
        items.push({
          assetText: cleanAssetText(pendingAsset.text),
          sizes: [],
          price: extractPrice(pendingAsset.text),
          rawLine: pendingAsset.rawLine,
        });
        pendingAsset = null;
      }
      continue;
    }

    // Is this a size-only line? → attach to previous asset
    if (isSizeOnlyLine(line)) {
      const sizes = extractSizes(line);
      if (pendingAsset) {
        // Attach sizes to the pending asset and finalize
        items.push({
          assetText: cleanAssetText(pendingAsset.text),
          sizes,
          price: extractPrice(pendingAsset.text),
          rawLine: pendingAsset.rawLine,
        });
        pendingAsset = null;
      } else if (items.length > 0) {
        // Sizes for the last finalized item (rare, but handles edge cases)
        const last = items[items.length - 1];
        if (last.sizes.length === 0) {
          last.sizes = sizes;
        }
      }
      continue;
    }

    // This line has meaningful text → it's an asset line
    // First, finalize any pending asset (it had no dedicated size line)
    if (pendingAsset) {
      const pendingSizes = extractSizes(pendingAsset.text);
      items.push({
        assetText: cleanAssetText(pendingAsset.text),
        sizes: pendingSizes,
        price: extractPrice(pendingAsset.text),
        rawLine: pendingAsset.rawLine,
      });
      pendingAsset = null;
    }

    // Check if this line already has sizes embedded (e.g., "Yeezy 350 Bone UK10")
    const inlineSizes = extractSizes(line);
    if (inlineSizes.length > 0) {
      // Line has both asset name and size → finalize immediately
      items.push({
        assetText: cleanAssetText(line),
        sizes: inlineSizes,
        price: extractPrice(line),
        rawLine: line,
      });
    } else {
      // Asset name without size → might have size on the next line
      pendingAsset = { text: line, rawLine: line };
    }
  }

  // Finalize any remaining pending asset
  if (pendingAsset) {
    items.push({
      assetText: cleanAssetText(pendingAsset.text),
      sizes: extractSizes(pendingAsset.text),
      price: extractPrice(pendingAsset.text),
      rawLine: pendingAsset.rawLine,
    });
  }

  // Filter out items with empty asset text
  return items.filter((item) => item.assetText.length >= 2);
}

/**
 * Extract listings from a single WhatsApp message.
 * Returns multiple listings if the message lists multiple assets.
 */
function extractListings(message: string): ParsedListing[] {
  const side = detectSide(message);
  if (!side) return [];

  // Message-level metadata
  const contact = extractPhone(message);
  const location = extractLocation(message);
  const messagePrice = extractPrice(message);

  // Split into individual items
  const items = splitMessageIntoItems(message);

  if (items.length === 0) {
    // Single-item fallback: try the whole message as one listing
    const assetText = cleanAssetText(message);
    if (assetText.length < 3) return [];
    return [
      {
        side,
        assetText,
        sizes: extractSizes(message),
        price: messagePrice,
        contact,
        location,
        notes: "",
      },
    ];
  }

  // For single-item messages, use message-level price if item has no price
  // For multi-item messages, only use item-level prices (message-level price is ambiguous)
  const isSingleItem = items.length === 1;

  return items.map((item) => ({
    side,
    assetText: item.assetText,
    sizes: item.sizes,
    price: item.price || (isSingleItem ? messagePrice : null),
    contact,
    location,
    notes: "",
  }));
}

// ── Full chat parser ──────────────────────────────────────────────────

/**
 * Parse an entire WhatsApp chat export and extract listings.
 * Each message can produce multiple listings (multi-asset messages).
 */
export function parseWhatsAppChat(chatText: string): ParsedWhatsAppMessage[] {
  // Split into raw lines, preserving original line breaks for multi-line messages
  const rawLines = chatText.split("\n");

  // Auto-detect date format (M/D/Y vs D/M/Y) by scanning all dates
  const dateFormat = detectDateFormat(rawLines);

  const messages: ParsedWhatsAppMessage[] = [];

  let currentParsed: {
    date: string;
    time: string;
    sender: string;
    messageLines: string[]; // Preserve original lines for multi-asset parsing
  } | null = null;

  for (const line of rawLines) {
    const parsed = parseWhatsAppLine(line);

    if (parsed) {
      // Finalize previous message
      if (currentParsed) {
        const timestamp = toISOTimestamp(currentParsed.date, currentParsed.time, dateFormat);
        const fullMessage = currentParsed.messageLines.join("\n");
        const listings = extractListings(fullMessage);
        messages.push({
          timestamp,
          sender: currentParsed.sender,
          rawMessage: fullMessage,
          listings,
        });
      }
      currentParsed = {
        ...parsed,
        messageLines: [parsed.message],
      };
    } else if (currentParsed) {
      // Continuation line (multi-line message) — preserve as separate line
      if (line.trim()) {
        currentParsed.messageLines.push(line.trim());
      }
    }
  }

  // Don't forget the last message
  if (currentParsed) {
    const timestamp = toISOTimestamp(currentParsed.date, currentParsed.time, dateFormat);
    const fullMessage = currentParsed.messageLines.join("\n");
    const listings = extractListings(fullMessage);
    messages.push({
      timestamp,
      sender: currentParsed.sender,
      rawMessage: fullMessage,
      listings,
    });
  }

  // Return only messages that have at least one listing
  return messages.filter((m) => m.listings.length > 0);
}

// ── Fuzzy asset matching ──────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter((w) => w.length > 0);
}

function matchScore(assetText: string, asset: Asset): number {
  const queryTokens = tokenize(assetText);
  if (queryTokens.length === 0) return 0;

  const nameTokens = tokenize(asset.name);
  const skuNorm = normalize(asset.sku);
  const brandNorm = normalize(asset.brand);

  // Exact SKU match
  const queryNorm = normalize(assetText);
  if (skuNorm && queryNorm.includes(skuNorm)) return 95;
  if (skuNorm && skuNorm.includes(queryNorm) && queryNorm.length > 5) return 90;

  // Token overlap
  let matchedTokens = 0;
  let weightedScore = 0;

  for (const qt of queryTokens) {
    const nameMatch = nameTokens.some(
      (nt) => nt === qt || nt.includes(qt) || qt.includes(nt)
    );
    if (nameMatch) {
      matchedTokens++;
      weightedScore += 20;
      continue;
    }
    if (brandNorm.includes(qt) || qt.includes(brandNorm)) {
      matchedTokens++;
      weightedScore += 10;
      continue;
    }
    if (skuNorm.includes(qt)) {
      matchedTokens++;
      weightedScore += 15;
    }
  }

  const coverage = matchedTokens / queryTokens.length;
  const reverseMatched = nameTokens.filter((nt) =>
    queryTokens.some((qt) => nt === qt || nt.includes(qt) || qt.includes(nt))
  ).length;
  const reverseCoverage = nameTokens.length > 0 ? reverseMatched / nameTokens.length : 0;

  return Math.min(100, Math.round(weightedScore * 0.4 + coverage * 40 + reverseCoverage * 30));
}

/**
 * Match parsed listings against the asset catalog.
 * Flattens multi-listing messages into individual MatchedListing items.
 */
export function matchListingsToAssets(
  parsedMessages: ParsedWhatsAppMessage[],
  assets: Asset[]
): MatchedListing[] {
  const results: MatchedListing[] = [];

  for (const msg of parsedMessages) {
    for (const listing of msg.listings) {
      // Score against all assets
      const scored = assets
        .map((asset) => ({ asset, score: matchScore(listing.assetText, asset) }))
        .filter((s) => s.score > 15)
        .sort((a, b) => b.score - a.score);

      const topMatch = scored.length > 0 ? scored[0] : null;

      // Auto-match size
      let autoSize: string | null = null;
      if (topMatch && listing.sizes.length > 0) {
        const assetSizeLabels = topMatch.asset.sizes?.map((s) => s.size) || [];
        for (const extractedSize of listing.sizes) {
          const matched = assetSizeLabels.find(
            (as) => normalize(as) === normalize(extractedSize)
          );
          if (matched) {
            autoSize = matched;
            break;
          }
        }
        if (!autoSize) {
          autoSize = listing.sizes[0];
        }
      }

      results.push({
        ...listing,
        timestamp: msg.timestamp,
        sender: msg.sender,
        rawMessage: msg.rawMessage,
        matchedAsset: topMatch?.asset || null,
        matchConfidence: topMatch?.score || 0,
        matchCandidates: scored.slice(0, 5),
        selected: (topMatch?.score || 0) >= 50,
        manualAssetId: null,
        manualSize: autoSize,
      });
    }
  }

  return results;
}

// ── Convert to PricePoints ────────────────────────────────────────────

export function matchedListingToPricePoint(
  listing: MatchedListing,
  size: string
): PricePoint {
  return {
    price: listing.price || 0,
    listingCount: 1,
    channel: "whatsapp",
    size,
    lastSeen: listing.timestamp || new Date().toISOString(),
    source: "whatsapp-import",
    transactionType: listing.side === "WTS" ? "buy" : "sell",
    sellerName: listing.sender,
    sellerContact: listing.contact || undefined,
    sellerLocation: listing.location || undefined,
  };
}
