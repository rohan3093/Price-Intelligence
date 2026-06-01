# Headless Scraper — Cloud Run container.
#
# Uses Microsoft's official Playwright image which bundles Chromium + all
# system deps (libnss, libatk, fonts, etc.). This avoids the long apt-get
# dance of installing Chromium dependencies manually.
#
# The image is ~1.4 GB. Cloud Run pulls once and caches per region.

FROM mcr.microsoft.com/playwright:v1.49.0-jammy AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Runtime image ────────────────────────────────────────────────────
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# Cloud Run sends SIGTERM with a 10s grace period.
# Express's default shutdown is fine, but Chromium needs cleanup — server.ts handles it.
EXPOSE 8080
CMD ["node", "dist/server.js"]
