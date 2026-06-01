/**
 * Browser lifecycle for the Cloud Run instance.
 *
 * One Playwright Chromium process is launched lazily on first request and
 * reused for the lifetime of the Cloud Run instance. Each batch call gets
 * its own browser **context** (incognito-equivalent) so cookies, headers
 * and JS state don't leak between StockX and GOAT scrapes.
 *
 * Stealth plugin: `puppeteer-extra-plugin-stealth` is registered via
 * `playwright-extra`. This patches navigator.webdriver, plugins,
 * Permissions API, WebGL vendor, etc. — enough to defeat the off-the-shelf
 * Cloudflare bot fingerprinting we saw on stockx.com and goat.com.
 */

import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, BrowserContext } from "playwright";

chromium.use(StealthPlugin());

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";

let _browser: Browser | null = null;
let _launching: Promise<Browser> | null = null;

export async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) return _browser;
  if (_launching) return _launching;

  console.log("[browser] launching chromium…");
  const t0 = Date.now();

  // `PW_CHROMIUM_PATH` is a convenience override for local dev — point it
  // at your system Chrome to skip the playwright browser download.
  // In production (Cloud Run with mcr.microsoft.com/playwright image),
  // leave it unset; playwright resolves the bundled Chromium automatically.
  const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

  _launching = chromium
    .launch({
      headless: true,
      executablePath,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage", // Cloud Run /dev/shm is tiny
        "--no-sandbox", // required in most container envs
        "--disable-setuid-sandbox",
        "--lang=en-US",
      ],
    })
    .then((b) => {
      _browser = b;
      _launching = null;
      console.log(`[browser] launched in ${Date.now() - t0}ms`);
      // If Chromium crashes mid-flight, clear our cache so the next call relaunches.
      b.on("disconnected", () => {
        console.warn("[browser] disconnected — will relaunch on next request");
        _browser = null;
      });
      return b;
    });

  return _launching;
}

export async function newContext(): Promise<BrowserContext> {
  const browser = await getBrowser();
  // Kept intentionally minimal. Adding bypassCSP / deviceScaleFactor / a
  // non-default timezoneId all individually pass Cloudflare's challenge,
  // but in combination some interaction (likely the timezone vs IP
  // mismatch, since Cloud Run runs in US-Central and we declare ET) caused
  // the JS challenge to re-trigger for /api/v1/* even with a valid
  // cf_clearance cookie. Match real browser defaults here.
  return browser.newContext({
    userAgent: UA,
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
  });
}

/** Best-effort cleanup on SIGTERM (Cloud Run gives ~10s grace). */
export async function shutdown(): Promise<void> {
  if (_browser) {
    try {
      await _browser.close();
    } catch {
      /* noop */
    }
    _browser = null;
  }
}
