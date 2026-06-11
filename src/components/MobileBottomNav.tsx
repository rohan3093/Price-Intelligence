import React from "react";
import { View } from "../types";

interface MobileBottomNavProps {
  view: View;
  setView: (view: View) => void;
  isAnalyst?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  view,
  setView,
  isAnalyst,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-brand-gray bg-brand-white px-0.5 py-1.5 flex items-stretch justify-around safe-area-inset-bottom">
      {/* Market */}
      <button
        onClick={() => setView("home")}
        className={`flex flex-col items-center gap-0.5 flex-1 min-w-0 px-0.5 py-0.5 transition-colors ${
          view === "home" ? "text-accent" : "text-brand-black/55"
        }`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4.5 h-4.5"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span className="text-[9px] leading-tight font-medium uppercase tracking-tight truncate w-full text-center">Market</span>
      </button>
      
      {/* Portfolio */}
      <button
        onClick={() => setView("portfolio")}
        className={`flex flex-col items-center gap-0.5 flex-1 min-w-0 px-0.5 py-0.5 transition-colors ${
          view === "portfolio" ? "text-accent" : "text-brand-black/55"
        }`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4.5 h-4.5"
        >
          <rect x="3" y="4" width="18" height="14" rx="2" ry="2" />
          <path d="M16 2H8a2 2 0 0 0-2 2v2" />
        </svg>
        <span className="text-[9px] leading-tight font-medium uppercase tracking-tight truncate w-full text-center">Portfolio</span>
      </button>
      
      {/* Connections */}
      <button
        onClick={() => setView("connections")}
        className={`flex flex-col items-center gap-0.5 flex-1 min-w-0 px-0.5 py-0.5 transition-colors ${
          view === "connections" ? "text-accent" : "text-brand-black/55"
        }`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4.5 h-4.5"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span className="text-[9px] leading-tight font-medium uppercase tracking-tight truncate w-full text-center">Connect</span>
      </button>
      
      {/* Watchlist */}
      <button
        onClick={() => setView("watchlist")}
        className={`flex flex-col items-center gap-0.5 flex-1 min-w-0 px-0.5 py-0.5 transition-colors ${
          view === "watchlist" ? "text-accent" : "text-brand-black/55"
        }`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4.5 h-4.5"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span className="text-[9px] leading-tight font-medium uppercase tracking-tight truncate w-full text-center">Watch</span>
      </button>
      
      {/* Drops */}
      <button
        onClick={() => setView("drops")}
        className={`flex flex-col items-center gap-0.5 flex-1 min-w-0 px-0.5 py-0.5 transition-colors ${
          view === "drops" ? "text-accent" : "text-brand-black/55"
        }`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4.5 h-4.5"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="text-[9px] leading-tight font-medium uppercase tracking-tight truncate w-full text-center">Drops</span>
      </button>
      
      {/* Learn / Education */}
      <button
        onClick={() => setView("education")}
        className={`flex flex-col items-center gap-0.5 flex-1 min-w-0 px-0.5 py-0.5 transition-colors ${
          view === "education" ? "text-accent" : "text-brand-black/55"
        }`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4.5 h-4.5"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span className="text-[9px] leading-tight font-medium uppercase tracking-tight truncate w-full text-center">Learn</span>
      </button>
      
      {isAnalyst && (
        <button
          onClick={() => setView("analyst")}
          className={`flex flex-col items-center gap-0.5 flex-1 min-w-0 px-0.5 py-0.5 transition-colors ${
            view === "analyst" ? "text-accent" : "text-brand-black/55"
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4.5 h-4.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <line x1="9" y1="9" x2="21" y2="9" />
          </svg>
          <span className="text-[9px] leading-tight font-medium uppercase tracking-tight truncate w-full text-center">Admin</span>
        </button>
      )}
    </nav>
  );
};

