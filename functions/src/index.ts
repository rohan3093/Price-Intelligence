/**
 * Firebase Cloud Functions
 * 
 * Scheduled functions for:
 *  - Marketplace price scraping (Shopify stores + custom scrapers)
 *  - Drop data scraping (disabled for now)
 *  - FCM notifications for drop reminders
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import sgMail from "@sendgrid/mail";
// import { scrapeNikeSnkrsIndia } from "./scrapers/nikeSnkrsScraper"; // Disabled - scraping not in use
import { runDailyScrape, scrapeAsset, getScraperStatus } from "./scrapers/orchestrator";
import { discoverMarketplaceUrls, isShopifyStore } from "./scrapers/urlDiscovery";
import { runDailySnapshot } from "./priceHistory";

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

const sendgridApiKey = functions.config().sendgrid?.key || process.env.SENDGRID_API_KEY;
const sendgridFromEmail = functions.config().sendgrid?.from || process.env.SENDGRID_FROM_EMAIL;

// ── CORS helper ─────────────────────────────────────────────────────

function setCors(res: functions.Response): void {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.set("Access-Control-Max-Age", "3600");
}

function handleCors(req: functions.https.Request, res: functions.Response): boolean {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

// ── Analyst role management ──────────────────────────────────────────

let _analystEmailsCache: { emails: string[]; fetchedAt: number } | null = null;
const ANALYST_CACHE_TTL_MS = 60_000;

async function getAnalystEmails(): Promise<string[]> {
  if (_analystEmailsCache && Date.now() - _analystEmailsCache.fetchedAt < ANALYST_CACHE_TTL_MS) {
    return _analystEmailsCache.emails;
  }
  const snap = await db.collection("config").doc("analysts").get();
  const emails: string[] = snap.exists ? (snap.data()?.emails || []).map((e: string) => e.toLowerCase()) : [];
  _analystEmailsCache = { emails, fetchedAt: Date.now() };
  return emails;
}

async function verifyAnalystFromRequest(req: functions.https.Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = await admin.auth().verifyIdToken(authHeader.split("Bearer ")[1]);
    const email = token.email?.toLowerCase();
    if (!email) return null;
    const analysts = await getAnalystEmails();
    return analysts.includes(email) ? token.uid : null;
  } catch {
    return null;
  }
}

if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
}

const IST_OFFSET_MINUTES = 330;

const parseReleaseDateTimeIST = (drop: any): Date | null => {
  if (!drop?.releaseDate) return null;

  const dateStr = String(drop.releaseDate);
  const dateOnly = dateStr.split("T")[0];
  const [yearStr, monthStr, dayStr] = dateOnly.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const day = parseInt(dayStr);

  if (!year || !month || !day) {
    return null;
  }

  let hours = 0;
  let minutes = 0;

  if (drop.releaseTime) {
    const timeMatch = String(drop.releaseTime).match(/(\d{1,2}):(\d{2})\s+(AM|PM)/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1]);
      minutes = parseInt(timeMatch[2]);
      const ampm = timeMatch[3].toUpperCase();

      if (ampm === "PM" && hours !== 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
    }
  } else if (dateStr.includes("T")) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const utcMillis = Date.UTC(year, month - 1, day, hours, minutes) - IST_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMillis);
};

const canSendEmail = (email?: string | null, emailEnabled?: boolean): boolean => {
  if (!email || emailEnabled === false) {
    return false;
  }
  return !!(sendgridApiKey && sendgridFromEmail);
};

const sendDropReminderEmail = async (params: {
  to: string;
  dropName: string;
  reminderMinutes: number;
  releaseDateTime: Date;
}): Promise<boolean> => {
  if (!sendgridFromEmail) {
    return false;
  }

  const subject = `Drop Reminder: ${params.dropName}`;
  const releaseTimeText = params.releaseDateTime.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const text = `${params.dropName} drops in ${params.reminderMinutes} minutes.\n\nRelease time: ${releaseTimeText} IST`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.4;">
      <h2 style="margin: 0 0 8px;">Drop Reminder</h2>
      <p style="margin: 0 0 8px;"><strong>${params.dropName}</strong> drops in ${params.reminderMinutes} minutes.</p>
      <p style="margin: 0; color: #666;">Release time: ${releaseTimeText} IST</p>
    </div>
  `;

  try {
    await sgMail.send({
      to: params.to,
      from: sendgridFromEmail,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error("Error sending reminder email:", error);
    return false;
  }
};

/**
 * Scheduled function to scrape Nike SNKRS India drops
 * Runs daily at 2:00 AM IST (8:30 PM UTC previous day)
 * 
 * DISABLED: Scraping functionality is currently disabled.
 * Only manual drops are supported.
 */
/*
export const scrapeNikeSnkrsDrops = functions
  .region("asia-south1") // Mumbai region for better latency
  .pubsub.schedule("0 2 * * *") // 2 AM IST daily (cron format)
  .timeZone("Asia/Kolkata")
  .onRun(async (context) => {
    console.log("Starting Nike SNKRS India scrape...");
    
    try {
      const drops = await scrapeNikeSnkrsIndia();
      console.log(`Scraped ${drops.length} drops from Nike SNKRS India`);
      
      // Save to Firestore
      const db = admin.firestore();
      const batch = db.batch();
      let newCount = 0;
      let updatedCount = 0;
      
      for (const drop of drops) {
        // Check if drop already exists (by scrapeId or name + releaseDate)
        const existingQuery = await db
          .collection("drops")
          .where("source.scrapeId", "==", drop.source.scrapeId)
          .limit(1)
          .get();
        
        if (!existingQuery.empty) {
          // Update existing drop
          const existingDoc = existingQuery.docs[0];
          const existingData = existingDoc.data();
          
          // Only update if it's not manually verified
          if (!existingData.verified) {
            batch.update(existingDoc.ref, {
              ...drop,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            updatedCount++;
          }
        } else {
          // Create new drop - generate numeric ID
          // Get max ID from existing drops
          const existingDrops = await db.collection("drops").get();
          let maxId = 0;
          existingDrops.forEach((doc) => {
            const data = doc.data();
            const docId = parseInt(doc.id) || data.id || 0;
            if (docId > maxId) maxId = docId;
          });
          const nextId = maxId + 1;
          
          // Use numeric ID as document ID (like assets)
          const dropRef = db.collection("drops").doc(nextId.toString());
          batch.set(dropRef, {
            ...drop,
            id: nextId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          newCount++;
        }
      }
      
      await batch.commit();
      console.log(`Saved ${newCount} new drops, updated ${updatedCount} existing drops`);
      
      return { success: true, newCount, updatedCount };
    } catch (error) {
      console.error("Error scraping Nike SNKRS India:", error);
      throw error;
    }
  });
*/

/**
 * Manual trigger function for testing (can be called via HTTP or from console)
 * 
 * DISABLED: Scraping functionality is currently disabled.
 * Only manual drops are supported.
 */
/*
export const manualScrapeNikeSnkrs = functions
  .region("asia-south1")
  .https.onRequest(async (req, res) => {
    console.log("Manual scrape triggered");
    
    try {
      const drops = await scrapeNikeSnkrsIndia();
      console.log(`Scraped ${drops.length} drops`);
      
      // Log details of each drop found
      drops.forEach((drop, index) => {
        console.log(`Drop ${index + 1}: ${drop.name} - ${drop.releaseDate} ${drop.releaseTime || ''} - Brand: ${drop.brand}`);
      });
      
      const db = admin.firestore();
      const batch = db.batch();
      let newCount = 0;
      let updatedCount = 0;
      
      for (const drop of drops) {
        const existingQuery = await db
          .collection("drops")
          .where("source.scrapeId", "==", drop.source.scrapeId)
          .limit(1)
          .get();
        
        if (!existingQuery.empty) {
          const existingDoc = existingQuery.docs[0];
          const existingData = existingDoc.data();
          
          if (!existingData.verified) {
            batch.update(existingDoc.ref, {
              ...drop,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            updatedCount++;
          }
        } else {
          // Create new drop - generate numeric ID
          const existingDrops = await db.collection("drops").get();
          let maxId = 0;
          existingDrops.forEach((doc) => {
            const data = doc.data();
            const docId = parseInt(doc.id) || data.id || 0;
            if (docId > maxId) maxId = docId;
          });
          const nextId = maxId + 1;
          
          // Use numeric ID as document ID (like assets)
          const dropRef = db.collection("drops").doc(nextId.toString());
          batch.set(dropRef, {
            ...drop,
            id: nextId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          newCount++;
        }
      }
      
      await batch.commit();
      
      res.json({
        success: true,
        message: `Scraped ${drops.length} drops`,
        newCount,
        updatedCount,
        drops: drops.map(d => ({
          name: d.name,
          brand: d.brand,
          releaseDate: d.releaseDate,
          releaseTime: d.releaseTime,
          scrapeId: d.source.scrapeId,
        })),
      });
    } catch (error: any) {
      console.error("Error in manual scrape:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
      });
    }
  });
*/

/**
 * Scheduled function to send drop reminder notifications
 * Runs every minute to check for upcoming drops that need reminders
 */
export const sendDropReminders = functions
  .region("asia-south1")
  .pubsub.schedule("every 1 minutes")
  .onRun(async (context) => {
    console.log("Checking for drop reminders to send...");
    
    try {
      const now = new Date();
      const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);
      
      // Get all users with drop reminders
      const usersSnapshot = await db.collection("users").get();
      let notificationsSent = 0;
      let emailsSent = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const reminders = userData.dropReminders || [];
        const fcmTokens = userData.fcmTokens || [];
        const userEmail = userData.email || userData.notificationEmail || null;
        const emailEnabled = userData.emailRemindersEnabled !== false;
        
        if (reminders.length === 0 || fcmTokens.length === 0) {
          continue;
        }
        
        // Check each reminder
        for (const reminder of reminders) {
          const dropDoc = await db.collection("drops").doc(reminder.dropId.toString()).get();
          
          if (!dropDoc.exists) {
            continue;
          }
          
          const drop = dropDoc.data();
          if (!drop) continue;
          
          // Calculate drop release time (IST)
          const releaseDate = parseReleaseDateTimeIST(drop);
          if (!releaseDate) {
            continue;
          }
          
          // Calculate reminder time
          const reminderTime = new Date(releaseDate.getTime() - reminder.reminderMinutes * 60 * 1000);
          
          // Check if it's time to send the reminder (within the next minute)
          if (reminderTime >= now && reminderTime <= oneMinuteFromNow) {
            // Send notification to all user's devices
            const message = {
              notification: {
                title: "Drop Reminder",
                body: `${drop.name} drops in ${reminder.reminderMinutes} minutes!`,
              },
              data: {
                type: "drop_reminder",
                dropId: reminder.dropId.toString(),
                dropName: drop.name || "",
                releaseDate: drop.releaseDate || "",
              },
            };
            
            // Send to all user's FCM tokens
            const sendPromises = fcmTokens.map((token: string) =>
              admin.messaging().send({
                ...message,
                token: token,
              }).catch((error) => {
                console.error(`Error sending to token ${token.substring(0, 20)}...:`, error);
                // If token is invalid, remove it
                if (error.code === 'messaging/invalid-registration-token' || 
                    error.code === 'messaging/registration-token-not-registered') {
                  const updatedTokens = fcmTokens.filter((t: string) => t !== token);
                  return userDoc.ref.update({ fcmTokens: updatedTokens });
                }
                return null;
              })
            );
            
            await Promise.all(sendPromises);
            notificationsSent += fcmTokens.length;

            if (canSendEmail(userEmail, emailEnabled)) {
              const emailSent = await sendDropReminderEmail({
                to: userEmail,
                dropName: drop.name || "Drop",
                reminderMinutes: reminder.reminderMinutes,
                releaseDateTime: releaseDate,
              });
              if (emailSent) {
                emailsSent += 1;
              }
            }
            
            console.log(`Sent reminder for ${drop.name} to user ${userDoc.id}`);
          }
        }
      }
      
      console.log(`Sent ${notificationsSent} drop reminder notifications, ${emailsSent} emails`);
      return { success: true, notificationsSent, emailsSent };
    } catch (error) {
      console.error("Error sending drop reminders:", error);
      throw error;
    }
  });

/**
 * HTTP function to manually trigger drop reminder check (for testing)
 */
export const manualSendDropReminders = functions
  .region("asia-south1")
  .https.onRequest(async (req, res) => {
    if (handleCors(req, res)) return;

    const uid = await verifyAnalystFromRequest(req);
    if (!uid) { res.status(403).json({ error: "Analyst auth required" }); return; }
    console.log(`Manual drop reminder check triggered by uid=${uid}`);
    
    try {
      const force = String(req.query.force || "").toLowerCase() === "true";
      const now = new Date();
      const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);
      
      const usersSnapshot = await db.collection("users").get();
      let notificationsSent = 0;
      let emailsSent = 0;
      const results: any[] = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const reminders = userData.dropReminders || [];
        const fcmTokens = userData.fcmTokens || [];
        const userEmail = userData.email || userData.notificationEmail || null;
        const emailEnabled = userData.emailRemindersEnabled !== false;
        
        if (reminders.length === 0 || fcmTokens.length === 0) {
          continue;
        }
        
        for (const reminder of reminders) {
          const dropDoc = await db.collection("drops").doc(reminder.dropId.toString()).get();
          
          if (!dropDoc.exists) {
            continue;
          }
          
          const drop = dropDoc.data();
          if (!drop) continue;
          
          const releaseDate = parseReleaseDateTimeIST(drop);
          if (!releaseDate) {
            results.push({
              userId: userDoc.id,
              dropId: reminder.dropId,
              dropName: drop.name,
              error: "Invalid releaseDate",
            });
            continue;
          }
          
          const reminderTime = new Date(releaseDate.getTime() - reminder.reminderMinutes * 60 * 1000);
          
          const isDue = reminderTime >= now && reminderTime <= oneMinuteFromNow;
          const shouldSend = force || isDue;

          if (shouldSend) {
            const message = {
              notification: {
                title: "Drop Reminder",
                body: `${drop.name} drops in ${reminder.reminderMinutes} minutes!`,
              },
              data: {
                type: "drop_reminder",
                dropId: reminder.dropId.toString(),
                dropName: drop.name || "",
                releaseDate: drop.releaseDate || "",
              },
            };
            
            const sendPromises = fcmTokens.map((token: string) =>
              admin.messaging().send({
                ...message,
                token: token,
              }).catch((error) => {
                console.error(`Error sending to token:`, error);
                return null;
              })
            );
            
            await Promise.all(sendPromises);
            notificationsSent += fcmTokens.length;

            let emailSent = false;
            if (canSendEmail(userEmail, emailEnabled)) {
              emailSent = await sendDropReminderEmail({
                to: userEmail,
                dropName: drop.name || "Drop",
                reminderMinutes: reminder.reminderMinutes,
                releaseDateTime: releaseDate,
              });
              if (emailSent) {
                emailsSent += 1;
              }
            }
            
            results.push({
              userId: userDoc.id,
              dropId: reminder.dropId,
              dropName: drop.name,
              reminderTime: reminderTime.toISOString(),
              releaseDateTime: releaseDate.toISOString(),
              now: now.toISOString(),
              due: isDue,
              forced: force,
              tokens: fcmTokens.length,
              email: userEmail,
              emailEnabled: canSendEmail(userEmail, emailEnabled),
              emailSent,
              sent: true,
            });
          } else {
            results.push({
              userId: userDoc.id,
              dropId: reminder.dropId,
              dropName: drop.name,
              reminderTime: reminderTime.toISOString(),
              releaseDateTime: releaseDate.toISOString(),
              now: now.toISOString(),
              due: isDue,
              forced: force,
              tokens: fcmTokens.length,
              email: userEmail,
              emailEnabled: canSendEmail(userEmail, emailEnabled),
              emailSent: false,
              sent: false,
            });
          }
        }
      }
      
      res.json({
        success: true,
        notificationsSent,
        emailsSent,
        results,
      });
    } catch (error: any) {
      console.error("Error in manual reminder check:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

// ═══════════════════════════════════════════════════════════════════════
// Marketplace Price Scrapers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Scheduled function to scrape marketplace prices for all tracked assets.
 * Runs daily at 3:00 AM IST.
 *
 * Results are written to the "scraped_prices" collection with status
 * "pending_review" for analysts to approve in the morning.
 */
export const scrapeMarketplacePrices = functions
  .region("asia-south1")
  .runWith({
    timeoutSeconds: 540, // 9 minutes (max for scheduled functions)
    memory: "512MB",
  })
  .pubsub.schedule("0 3 * * *") // 3 AM IST daily
  .timeZone("Asia/Kolkata")
  .onRun(async () => {
    console.log("Starting scheduled marketplace price scrape...");

    try {
      // Scheduled runs skip discovery (uses static configs for speed)
      const result = await runDailyScrape(undefined, true);

      console.log(
        `Scheduled scrape complete: ${result.totalListings} listings, ` +
          `${result.errors.length} errors, ${result.durationMs}ms`
      );

      return result;
    } catch (error) {
      console.error("Scheduled marketplace scrape failed:", error);
      throw error;
    }
  });

/**
 * HTTP trigger to manually run the marketplace scraper.
 * Useful for testing and on-demand scraping.
 *
 * Query params:
 *   ?assetId=123       — scrape only a specific asset
 *   ?assetIds=1,2,3    — scrape specific assets
 *   (no params)        — scrape all assets
 *
 * Examples:
 *   GET /manualScrapeMarketplaces                    → scrape all
 *   GET /manualScrapeMarketplaces?assetId=5          → scrape asset 5
 *   GET /manualScrapeMarketplaces?assetIds=1,2,3     → scrape assets 1, 2, 3
 */
export const manualScrapeMarketplaces = functions
  .region("asia-south1")
  .runWith({
    timeoutSeconds: 540,
    memory: "512MB",
  })
  .https.onRequest(async (req, res) => {
    if (handleCors(req, res)) return;

    const uid = await verifyAnalystFromRequest(req);
    if (!uid) { res.status(403).json({ error: "Analyst auth required" }); return; }
    console.log(`Manual marketplace scrape triggered by uid=${uid}`);

    try {
      let assetIds: string[] | undefined;

      if (req.query.assetId) {
        assetIds = [String(req.query.assetId)];
      } else if (req.query.assetIds) {
        assetIds = String(req.query.assetIds)
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
      }

      const skipDiscovery = req.query.discover === "false";
      const result = await runDailyScrape(assetIds, skipDiscovery);

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error("Manual marketplace scrape failed:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

/**
 * HTTP trigger to scrape a single asset on-demand.
 * Returns the raw listings without writing to Firestore staging.
 * Useful for the analyst dashboard "preview scrape" feature.
 *
 * Query params:
 *   ?assetId=123  — (required) the asset to scrape
 */
export const scrapeAssetPrices = functions
  .region("asia-south1")
  .runWith({
    timeoutSeconds: 120,
    memory: "256MB",
  })
  .https.onRequest(async (req, res) => {
    if (handleCors(req, res)) return;

    const uid = await verifyAnalystFromRequest(req);
    if (!uid) { res.status(403).json({ error: "Analyst auth required" }); return; }

    const assetId = String(req.query.assetId || "");

    if (!assetId) {
      res.status(400).json({
        success: false,
        error: "assetId query parameter is required",
      });
      return;
    }

    try {
      const result = await scrapeAsset(assetId);

      res.json({
        success: true,
        assetId,
        totalListings: result.listings.length,
        listings: result.listings,
        errors: result.errors,
      });
    } catch (error: any) {
      console.error(`Scrape asset ${assetId} failed:`, error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

/**
 * HTTP trigger to get the status of all configured scrapers.
 * Useful for the admin/analyst dashboard.
 */
export const getScrapersStatus = functions
  .region("asia-south1")
  .https.onRequest(async (req, res) => {
    if (handleCors(req, res)) return;

    const uid = await verifyAnalystFromRequest(req);
    if (!uid) { res.status(403).json({ error: "Analyst auth required" }); return; }
    res.json({
      success: true,
      scrapers: await getScraperStatus(),
    });
  });

/**
 * Diagnostic endpoint — lists all assets in Firestore so you can verify
 * the scraper has something to work with.
 *
 * GET /scraperDiagnostics
 */
export const scraperDiagnostics = functions
  .region("asia-south1")
  .https.onRequest(async (req, res) => {
    if (handleCors(req, res)) return;

    const uid = await verifyAnalystFromRequest(req);
    if (!uid) { res.status(403).json({ error: "Analyst auth required" }); return; }
    try {
      const db = admin.firestore();

      // List all top-level collections
      const collections = await db.listCollections();
      const collectionNames = collections.map((c) => c.id);

      // Check assets collection
      const assetsSnap = await db.collection("assets").get();
      const assetsSummary = assetsSnap.docs.map((d) => {
        const data = d.data();
        return {
          docId: d.id,
          name: data.name || "(no name)",
          sku: data.sku || "(no sku)",
          brand: data.brand || "(no brand)",
          sizesCount: data.sizes?.length || 0,
        };
      });

      res.json({
        success: true,
        firestoreCollections: collectionNames,
        assetsCollection: {
          totalDocuments: assetsSnap.size,
          assets: assetsSummary,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

/**
 * Discover marketplace URLs from existing analyst-entered price points.
 *
 * Scans all assets → sizes → pricePoints.marketplace → url fields,
 * extracts base URLs, and checks which ones are Shopify stores.
 *
 * This is what makes the scraper self-configuring — no need to manually
 * enter store URLs. Analysts already enter them with every listing.
 *
 * GET /discoverMarketplaces
 * GET /discoverMarketplaces?verify=true  — also check if each URL is Shopify
 */
// ═══════════════════════════════════════════════════════════════════════
// Daily Price-History Snapshot
// ═══════════════════════════════════════════════════════════════════════

/**
 * Scheduled function to persist a daily mark-price snapshot per asset/size.
 * Runs once daily at 23:30 IST so it captures the day's approved updates.
 *
 * Writes priceHistory/{assetId}/days/{YYYY-MM-DD} (idempotent on the date key)
 * and back-fills change30d/90d on each asset from the accumulated history.
 * A point is written EVEN ON FLAT DAYS — a true daily series, decoupled from
 * scraping and from analyst approval.
 */
export const snapshotDailyPrices = functions
  .region("asia-south1")
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: "512MB",
  })
  .pubsub.schedule("30 23 * * *") // 11:30 PM IST daily
  .timeZone("Asia/Kolkata")
  .onRun(async () => {
    console.log("Starting daily price-history snapshot...");
    try {
      const result = await runDailySnapshot(db);
      console.log(
        `Snapshot ${result.dateKey} complete: ${result.daysWritten} day-docs, ` +
          `${result.assetsUpdated} assets updated, ${result.durationMs}ms`
      );
      return result;
    } catch (error) {
      console.error("Daily price-history snapshot failed:", error);
      throw error;
    }
  });

/**
 * HTTP trigger to run the daily snapshot on-demand (analyst auth).
 * Useful to seed today's point immediately after deploy, and for testing.
 * Idempotent: re-running the same day overwrites, never duplicates.
 *
 * GET /manualSnapshotPrices
 */
export const manualSnapshotPrices = functions
  .region("asia-south1")
  .runWith({
    timeoutSeconds: 540,
    memory: "512MB",
  })
  .https.onRequest(async (req, res) => {
    if (handleCors(req, res)) return;

    const uid = await verifyAnalystFromRequest(req);
    if (!uid) { res.status(403).json({ error: "Analyst auth required" }); return; }
    console.log(`Manual price-history snapshot triggered by uid=${uid}`);

    try {
      const result = await runDailySnapshot(db);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("Manual price-history snapshot failed:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

export const discoverMarketplaces = functions
  .region("asia-south1")
  .runWith({
    timeoutSeconds: 120,
    memory: "256MB",
  })
  .https.onRequest(async (req, res) => {
    if (handleCors(req, res)) return;

    const uid = await verifyAnalystFromRequest(req);
    if (!uid) { res.status(403).json({ error: "Analyst auth required" }); return; }
    try {
      const shouldVerify = req.query.verify === "true";

      const discovery = await discoverMarketplaceUrls();

      // Step 2: Optionally verify each as Shopify
      if (shouldVerify) {
        for (const marketplace of discovery.discovered) {
          try {
            marketplace.isShopify = await isShopifyStore(marketplace.baseUrl);
          } catch {
            marketplace.isShopify = false;
          }
        }
      }

      // Step 3: Compare with currently known stores (from asset URLs)
      const knownStores = await getScraperStatus();
      const knownIds = new Set(knownStores.map((s) => s.id));

      const comparison = discovery.discovered.map((d) => ({
        ...d,
        inCurrentData: knownIds.has(d.id),
      }));

      res.json({
        success: true,
        totalUrlsScanned: discovery.totalUrlsScanned,
        marketplacesDiscovered: discovery.discovered.length,
        durationMs: discovery.durationMs,
        marketplaces: comparison,
        knownStores,
        note:
          "Marketplaces are auto-discovered from analyst-entered listing URLs. " +
          "Add ?verify=true to also check which are Shopify stores.",
      });
    } catch (error: any) {
      console.error("Discovery failed:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

