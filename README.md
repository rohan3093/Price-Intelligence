# Rare Asset Intelligence - Price Discovery Platform

A Bloomberg-style price intelligence platform for limited-edition assets (sneakers, watches, collectibles). Built with React, TypeScript, and Tailwind CSS.

## Features

- **Market Search**: Search and filter assets by name, SKU, or category with terminal-style data layout
- **Asset Details**: Comprehensive price discovery with B2B (buy) and B2C (sell) price bands, size variants, and market insights
- **Watchlist**: Track your favorite assets in an institutional-style table view
- **Alerts**: Configure price and liquidity alerts (UI ready)
- **Analyst Dashboard**: 
  - Daily price updates from multiple sources (StockX/Goat, Indian marketplaces, WhatsApp groups)
  - B2B listings management (WTS/WTB quotes)
  - Asset management (CRUD operations)
  - Design system customization
- **Education Hub**: Learning resources and guides for beginners
- **Responsive Design**: Optimized for both desktop (1/3-2/3 column layout) and mobile devices
- **Design System**: Customizable brand colors and typography via analyst dashboard

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The production build will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # React components
│   ├── Header.tsx
│   ├── SearchPanel.tsx
│   ├── ResultsPanel.tsx
│   ├── AssetDetailPanel.tsx
│   ├── WatchlistView.tsx
│   ├── MobileBottomNav.tsx
│   └── AlertsSheet.tsx
├── data/               # Mock data
│   └── mockData.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── App.tsx             # Main app component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## Current Status

This is an **MVP implementation** ready for demo/testing. The application is frontend-only with mock data.

### What's Working
- ✅ All core features functional
- ✅ Responsive design (mobile + desktop)
- ✅ Analyst authentication (hardcoded credentials for MVP)
- ✅ Design system customization
- ✅ Asset management (CRUD operations)
- ✅ Price tracking UI with B2B/B2C bands

### Known Limitations
- ⚠️ No backend API (all data is client-side mock data)
- ⚠️ Data not persisted across page refreshes (except design settings)
- ⚠️ Hardcoded analyst credentials (should be replaced with proper auth for production)
- ⚠️ No real-time price updates

### Future Enhancements
- Backend API integration for data persistence
- Real-time price updates via WebSocket
- Proper user authentication (OAuth/JWT)
- Persistent watchlists and alerts
- Advanced filtering and sorting
- Price trend charts and analytics
- More asset categories (watches, bags, collectibles)
- User accounts and profiles

## License

Private project - All rights reserved

