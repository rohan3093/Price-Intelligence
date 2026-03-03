"use strict";
/**
 * Shared types for the marketplace scraper framework.
 *
 * Every scraper (Shopify-based or custom) implements the MarketplaceScraper
 * interface.  The orchestrator calls `scrapeBysku()` for each tracked asset
 * and writes the results to a Firestore staging collection where analysts
 * review them before they go live.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=types.js.map