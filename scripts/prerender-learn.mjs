/**
 * Pre-renders /learn routes to static HTML at build time.
 * Uses esbuild (bundled with Vite) to compile the TypeScript guide data,
 * then generates static HTML files with correct meta tags and article content.
 *
 * Run after `vite build`: node scripts/prerender-learn.mjs
 */

import * as esbuild from "esbuild";
import { writeFileSync, mkdirSync, readFileSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");
const TEMP = join(ROOT, ".prerender-temp");

function mdToHtml(md) {
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/^(?!<[hblou])/gm, "")
    .replace(/<\/p><p><h/g, "<h")
    .replace(/<\/h(\d)><\/p>/g, "</h$1>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

async function main() {
  console.log("[prerender] Compiling guide data...");

  mkdirSync(TEMP, { recursive: true });

  await esbuild.build({
    entryPoints: [join(ROOT, "src/data/guides.ts")],
    bundle: true,
    outfile: join(TEMP, "guides.mjs"),
    format: "esm",
    platform: "node",
    external: [],
    logLevel: "silent",
  });

  const { guides } = await import(join(TEMP, "guides.mjs"));
  const template = readFileSync(join(DIST, "index.html"), "utf-8");

  console.log(`[prerender] Generating ${guides.length + 1} static pages...`);

  // /learn index page
  const learnIndexHtml = template
    .replace(
      /<title>.*?<\/title>/,
      "<title>Learn Sneaker Investing in India — Free Guides | Sentria</title>"
    )
    .replace(
      /<meta name="description" content=".*?"\s*\/?>/,
      '<meta name="description" content="Free guides on sneaker investing in India. Learn how to buy, sell, manage risk, and build a profitable sneaker portfolio." />'
    )
    .replace(
      /<meta property="og:title" content=".*?"\s*\/?>/,
      '<meta property="og:title" content="Learn Sneaker Investing in India — Free Guides | Sentria" />'
    )
    .replace(
      /<meta property="og:description" content=".*?"\s*\/?>/,
      '<meta property="og:description" content="Free guides on sneaker investing in India. Learn how to buy, sell, manage risk, and build a profitable portfolio." />'
    )
    .replace(
      '<div id="root"></div>',
      `<div id="root"><div><h1>Learn Sneaker Investing</h1><p>Everything you need to know about buying, selling, and profiting from sneakers in India's resale market.</p>${guides.map((g) => `<article><h2><a href="/learn/${g.slug}">${g.title}</a></h2><p>${g.description}</p><span>${g.difficulty} · ${g.estimatedTime}</span></article>`).join("")}</div></div>`
    );

  mkdirSync(join(DIST, "learn"), { recursive: true });
  writeFileSync(join(DIST, "learn", "index.html"), learnIndexHtml);
  console.log("[prerender]   /learn");

  // Individual article pages
  for (const guide of guides) {
    const articleHtml = template
      .replace(/<title>.*?<\/title>/, `<title>${guide.seoTitle}</title>`)
      .replace(
        /<meta name="description" content=".*?"\s*\/?>/,
        `<meta name="description" content="${guide.seoDescription}" />`
      )
      .replace(
        /<meta property="og:type" content=".*?"\s*\/?>/,
        '<meta property="og:type" content="article" />'
      )
      .replace(
        /<meta property="og:title" content=".*?"\s*\/?>/,
        `<meta property="og:title" content="${guide.seoTitle}" />`
      )
      .replace(
        /<meta property="og:description" content=".*?"\s*\/?>/,
        `<meta property="og:description" content="${guide.seoDescription}" />`
      )
      .replace(
        '<div id="root"></div>',
        `<div id="root"><article><h1>${guide.title}</h1><p>${guide.description}</p>${mdToHtml(guide.content)}<a href="/app">Open Sentria</a></article><script type="application/ld+json">${JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.title,
          description: guide.seoDescription,
          author: { "@type": "Organization", name: "Sentria" },
          publisher: { "@type": "Organization", name: "Sentria" },
          mainEntityOfPage: `https://sentria.co/learn/${guide.slug}`,
        })}</script></div>`
      );

    const dir = join(DIST, "learn", guide.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), articleHtml);
    console.log(`[prerender]   /learn/${guide.slug}`);
  }

  // Cleanup temp
  rmSync(TEMP, { recursive: true, force: true });

  console.log("[prerender] Done.");
}

main().catch((err) => {
  console.error("[prerender] Failed:", err);
  process.exit(1);
});
