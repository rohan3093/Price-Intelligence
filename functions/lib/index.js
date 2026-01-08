"use strict";
/**
 * Firebase Cloud Functions
 *
 * Scheduled functions for scraping drop data from various sources
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// import * as functions from "firebase-functions"; // Disabled - no functions exported
const admin = __importStar(require("firebase-admin"));
// import { scrapeNikeSnkrsIndia } from "./scrapers/nikeSnkrsScraper"; // Disabled - scraping not in use
// Initialize Firebase Admin
admin.initializeApp();
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
//# sourceMappingURL=index.js.map