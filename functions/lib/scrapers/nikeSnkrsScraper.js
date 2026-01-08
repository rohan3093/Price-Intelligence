"use strict";
/**
 * Nike SNKRS India Scraper
 *
 * Scrapes upcoming drops from https://www.nike.com/in/launch/upcoming
 * Uses simple HTTP fetch + HTML parsing (no browser needed)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeNikeSnkrsIndia = scrapeNikeSnkrsIndia;
const NIKE_SNKRS_INDIA_URL = "https://www.nike.com/in/launch/upcoming";
/**
 * Parse release date and time from Nike's format
 * Format examples: "Available 08/01 at 4:31 am", "Available 13/01 at 4:00 am"
 */
function parseReleaseDateTime(dateTimeStr) {
    // Extract date (DD/MM format) and time
    const match = dateTimeStr.match(/(\d{2})\/(\d{2})\s+at\s+(\d{1,2}):(\d{2})\s+(am|pm)/i);
    if (!match) {
        // Fallback: try to extract just date
        const dateMatch = dateTimeStr.match(/(\d{2})\/(\d{2})/);
        if (dateMatch) {
            const day = dateMatch[1];
            const month = dateMatch[2];
            const currentYear = new Date().getFullYear();
            // Assume current year, adjust if month is in the past
            const releaseDate = new Date(currentYear, parseInt(month) - 1, parseInt(day));
            const now = new Date();
            if (releaseDate < now) {
                releaseDate.setFullYear(currentYear + 1);
            }
            return { date: releaseDate.toISOString().split('T')[0] };
        }
        return { date: new Date().toISOString().split('T')[0] };
    }
    const [, day, month, hour, minute, ampm] = match;
    const currentYear = new Date().getFullYear();
    let releaseYear = currentYear;
    // Create date
    const releaseDate = new Date(releaseYear, parseInt(month) - 1, parseInt(day));
    const now = new Date();
    // If date is in the past, assume next year
    if (releaseDate < now) {
        releaseYear = currentYear + 1;
        releaseDate.setFullYear(releaseYear);
    }
    // Format time
    let hour24 = parseInt(hour);
    if (ampm.toLowerCase() === 'pm' && hour24 !== 12) {
        hour24 += 12;
    }
    else if (ampm.toLowerCase() === 'am' && hour24 === 12) {
        hour24 = 0;
    }
    const timeStr = `${hour24.toString().padStart(2, '0')}:${minute} AM IST`;
    const dateStr = releaseDate.toISOString().split('T')[0];
    return { date: dateStr, time: timeStr };
}
/**
 * Generate a unique scrape ID from drop data
 */
function generateScrapeId(name, releaseDate) {
    return `nike-snkrs-${name.toLowerCase().replace(/\s+/g, '-')}-${releaseDate}`;
}
/**
 * Scrape Nike SNKRS India upcoming drops using simple HTTP fetch + HTML parsing
 */
async function scrapeNikeSnkrsIndia() {
    console.log("Fetching Nike SNKRS India page...");
    try {
        // Fetch the HTML page
        const response = await fetch(NIKE_SNKRS_INDIA_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        console.log(`Fetched ${html.length} bytes of HTML`);
        // Parse HTML using cheerio
        const cheerio = require('cheerio');
        const $ = cheerio.load(html);
        const drops = [];
        // Strategy 1: Parse product cards using actual HTML structure
        // Based on: <div class="css-fd2hlk"> with h3 (name), h2 (colorway), span.available-date-component (date)
        console.log("Looking for product cards with CSS selector...");
        // Try multiple selectors - Nike may use different class names
        const selectors = [
            'div.css-fd2hlk', // Specific class from HTML
            'div[class*="css-"]', // Any div with css- class
            'a.card-link', // Card link wrapper
            'span.available-date-component', // Date component (find parent)
        ];
        let productCards = null;
        for (const selector of selectors) {
            if (selector === 'span.available-date-component') {
                // Special case: find all date components and get their parent cards
                const dateSpans = $(selector);
                if (dateSpans.length > 0) {
                    console.log(`Found ${dateSpans.length} date components, using parent cards`);
                    productCards = dateSpans.map((_i, el) => $(el).closest('div[class*="css-"], a.card-link').first()[0] || el.parentElement);
                    break;
                }
            }
            else {
                const found = $(selector);
                if (found.length > 0) {
                    productCards = found;
                    console.log(`Found ${found.length} elements using selector: ${selector}`);
                    break;
                }
            }
        }
        if (!productCards || productCards.length === 0) {
            // Fallback: find elements containing "Available" date text
            console.log("Trying fallback: finding elements with 'Available' text...");
            const allDivs = $('div');
            productCards = allDivs.filter((_i, el) => {
                const text = $(el).text();
                return text.includes('Available') && text.match(/\d{2}\/\d{2}/);
            });
            console.log(`Found ${productCards.length} potential cards with 'Available' text`);
        }
        if (productCards && productCards.length > 0) {
            productCards.each((index, element) => {
                var _a;
                try {
                    const $card = $(element);
                    // Extract date/time from span.available-date-component (most reliable)
                    const dateEl = $card.find('span.available-date-component').first();
                    // If not found in card, check the card itself
                    const dateText = dateEl.length > 0
                        ? dateEl.text().trim()
                        : ((_a = $card.text().match(/Available\s+\d{2}\/\d{2}\s+at\s+\d{1,2}:\d{2}\s+(am|pm)/i)) === null || _a === void 0 ? void 0 : _a[0]) || '';
                    if (!dateText) {
                        console.log(`Card ${index}: No date found, skipping`);
                        return;
                    }
                    // Extract product name from h3
                    const nameEl = $card.find('h3').first();
                    let name = nameEl.text().trim();
                    // Extract colorway from h2 (optional)
                    const colorwayEl = $card.find('h2').first();
                    const colorway = colorwayEl.text().trim();
                    // If no h3, try to extract from link text or alt text
                    if (!name) {
                        const linkEl = $card.find('a.card-link, a.card-text-link').first();
                        name = linkEl.text().trim();
                        // Try image alt text as fallback
                        if (!name) {
                            const imgEl = $card.find('img').first();
                            name = imgEl.attr('alt') || '';
                        }
                    }
                    // Extract image
                    const imgEl = $card.find('img').first();
                    const image = imgEl.attr('src') || imgEl.attr('data-src') || '';
                    // Extract product link
                    const linkEl = $card.find('a.card-link, a.card-text-link').first();
                    const href = linkEl.attr('href') || '';
                    const productUrl = href && href.startsWith('http') ? href : (href ? `https://www.nike.com${href}` : NIKE_SNKRS_INDIA_URL);
                    if (name && dateText) {
                        const { date, time } = parseReleaseDateTime(dateText);
                        // Combine name and colorway for full product name (if colorway exists and is different)
                        const fullName = colorway && !name.includes(colorway)
                            ? `${name} ${colorway}`
                            : name;
                        const scrapeId = generateScrapeId(fullName, date);
                        const brand = name.toLowerCase().includes('jordan') || fullName.toLowerCase().includes('jordan') ? 'Jordan' : 'Nike';
                        console.log(`Extracted drop ${drops.length + 1}: "${fullName}" on ${dateText} -> ${date} ${time || ''}`);
                        drops.push({
                            id: 0,
                            name: fullName.trim(),
                            brand,
                            image: image || '',
                            releaseDate: date,
                            releaseTime: time,
                            retailers: [{
                                    name: 'nike-snkrs-india',
                                    displayName: 'Nike SNKRS India',
                                    url: productUrl,
                                    releaseTime: time,
                                    partnershipStatus: 'scraped',
                                }],
                            category: 'Sneakers',
                            status: 'pending_review',
                            verified: false,
                            source: {
                                type: 'nike-snkrs-scrape',
                                url: productUrl,
                                scrapeId,
                                confidence: 90, // High confidence with proper HTML structure
                            },
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                        });
                    }
                    else {
                        console.log(`Skipping card ${index}: name="${name}", dateText="${dateText}"`);
                    }
                }
                catch (error) {
                    console.error(`Error parsing product card ${index}:`, error);
                }
            });
            console.log(`Extracted ${drops.length} drops from HTML structure`);
        }
        // Strategy 2: Fallback - Text-based parsing if no cards found
        if (drops.length === 0) {
            console.log("Trying text-based parsing...");
            const bodyText = $('body').text();
            console.log(`Body text length: ${bodyText.length}`);
            // Find all "Available DD/MM at HH:MM am/pm" patterns
            const availablePattern = /Available\s+(\d{2})\/(\d{2})\s+at\s+(\d{1,2}):(\d{2})\s+(am|pm)/gi;
            const matches = [];
            let match;
            while ((match = availablePattern.exec(bodyText)) !== null) {
                matches.push(match);
            }
            console.log(`Found ${matches.length} date/time patterns in text`);
            // Log each match for debugging
            matches.forEach((m, idx) => {
                console.log(`Match ${idx + 1}: "${m[0]}" at position ${m.index}`);
            });
            if (matches.length > 0) {
                // For each match, try to find the product name nearby
                matches.forEach((match, index) => {
                    try {
                        const dateStr = `${match[1]}/${match[2]} at ${match[3]}:${match[4]} ${match[5]}`;
                        const matchIndex = match.index || 0;
                        // Look for product name before the "Available" text (within 200 chars - more precise)
                        const beforeText = bodyText.substring(Math.max(0, matchIndex - 200), matchIndex);
                        // More specific patterns - look for product names that are likely sneaker models
                        const namePatterns = [
                            /(Air Max\s+(?:Plus\s+)?[A-Z]+(?:\s+[A-Z]+)?)/i, // "Air Max Plus VII", "Air Max 90"
                            /(Air Max\s+\d+)/i, // "Air Max 90", "Air Max 95"
                            /(Jordan\s+\d+)/i, // "Jordan 1", "Jordan 4"
                            /(Kobe\s+\d+)/i, // "Kobe 6", "Kobe 8"
                            /(Astrograbber)/i,
                            /(Dunk\s+(?:Low|High)?)/i,
                            /([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z]+)/, // Three word product names
                        ];
                        let name = '';
                        for (const pattern of namePatterns) {
                            const nameMatch = beforeText.match(pattern);
                            if (nameMatch && nameMatch[1]) {
                                name = nameMatch[1].trim();
                                // Filter out common false positives
                                if (!name.match(/^(Available|Join|Log|Help|India|Visit|Nike SNKRS|Nike Air)$/i)) {
                                    // Limit name length to avoid grabbing too much
                                    if (name.length < 50) {
                                        break;
                                    }
                                }
                            }
                        }
                        // If no name found before, try after (but shorter range)
                        if (!name) {
                            const afterText = bodyText.substring(matchIndex, matchIndex + 100);
                            for (const pattern of namePatterns) {
                                const nameMatch = afterText.match(pattern);
                                if (nameMatch && nameMatch[1]) {
                                    name = nameMatch[1].trim();
                                    if (!name.match(/^(Available|Join|Log|Help|India|Visit|Nike SNKRS|Nike Air)$/i)) {
                                        if (name.length < 50) {
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        // Fallback: use a generic name if we found a date but no name
                        if (!name && dateStr) {
                            name = `Nike Drop ${index + 1}`;
                        }
                        if (name && dateStr) {
                            const { date, time } = parseReleaseDateTime(dateStr);
                            const scrapeId = generateScrapeId(name, date);
                            const brand = name.toLowerCase().includes('jordan') ? 'Jordan' : 'Nike';
                            console.log(`Extracted drop ${drops.length + 1}: "${name}" on ${dateStr} -> ${date} ${time || ''}`);
                            // Try to find image - look for img tags near this text
                            let image = '';
                            const allImages = $('img');
                            allImages.each((imgIndex, imgEl) => {
                                const imgSrc = $(imgEl).attr('src') || $(imgEl).attr('data-src') || '';
                                const imgAlt = $(imgEl).attr('alt') || '';
                                if (imgAlt && name.toLowerCase().includes(imgAlt.toLowerCase().substring(0, 10))) {
                                    image = imgSrc;
                                    return false; // break
                                }
                                return true;
                            });
                            drops.push({
                                id: 0,
                                name: name.trim(),
                                brand,
                                image: image || '',
                                releaseDate: date,
                                releaseTime: time,
                                retailers: [{
                                        name: 'nike-snkrs-india',
                                        displayName: 'Nike SNKRS India',
                                        url: NIKE_SNKRS_INDIA_URL,
                                        releaseTime: time,
                                        partnershipStatus: 'scraped',
                                    }],
                                category: 'Sneakers',
                                status: 'pending_review',
                                verified: false,
                                source: {
                                    type: 'nike-snkrs-scrape',
                                    url: NIKE_SNKRS_INDIA_URL,
                                    scrapeId,
                                    confidence: 70, // Lower confidence for text-based parsing
                                },
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                            });
                        }
                    }
                    catch (error) {
                        console.error(`Error processing match ${index}:`, error);
                    }
                });
            }
        }
        // Strategy 3: Try standard HTML selectors as fallback
        if (drops.length === 0) {
            console.log("Trying standard HTML selectors...");
            const productSelectors = [
                '[data-testid*="product"]',
                '[class*="ProductCard"]',
                '[class*="product-card"]',
                'article',
                '[role="article"]',
            ];
            for (const selector of productSelectors) {
                const products = $(selector);
                if (products.length > 0) {
                    console.log(`Found ${products.length} elements with selector: ${selector}`);
                    // Process them (similar to before)
                    break;
                }
            }
        }
        console.log(`Parsed ${drops.length} drops from HTML`);
        // Remove duplicates - same product name + date should only appear once
        const seen = new Map();
        for (const drop of drops) {
            // Create a unique key from normalized name and date
            const normalizedName = drop.name.toLowerCase().trim().replace(/\s+/g, ' ').substring(0, 50);
            const key = `${normalizedName}-${drop.releaseDate}`;
            // Keep the first occurrence, or the one with more complete data
            if (!seen.has(key)) {
                seen.set(key, drop);
            }
            else {
                const existing = seen.get(key);
                // Prefer drop with image or more complete data
                if ((!existing.image && drop.image) ||
                    (drop.name.length > existing.name.length)) {
                    seen.set(key, drop);
                }
                console.log(`Removing duplicate: ${drop.name} on ${drop.releaseDate}`);
            }
        }
        const uniqueDrops = Array.from(seen.values());
        console.log(`After deduplication: ${uniqueDrops.length} unique drops (removed ${drops.length - uniqueDrops.length} duplicates)`);
        return uniqueDrops;
    }
    catch (error) {
        console.error("Error scraping Nike SNKRS India:", error);
        throw error;
    }
}
//# sourceMappingURL=nikeSnkrsScraper.js.map