import React from "react";
import { View } from "../types";

interface MobileBottomNavProps {
  view: View;
  setView: (view: View) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  view,
  setView,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-brand-gray/30 bg-brand-white px-1 py-1.5 flex items-center justify-around safe-area-inset-bottom">
      {/* Market */}
      <button
        onClick={() => setView("home")}
        className={`flex flex-col items-center gap-0.5 flex-1 py-0.5 transition-colors ${
          view === "home" ? "text-brand-black" : "text-brand-black/60"
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
        <span className="text-[9px] leading-tight font-medium uppercase tracking-wide">Market</span>
      </button>
      
      {/* Watchlist */}
      <button
        onClick={() => setView("watchlist")}
        className={`flex flex-col items-center gap-0.5 flex-1 py-0.5 transition-colors ${
          view === "watchlist" ? "text-brand-black" : "text-brand-black/60"
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
        <span className="text-[9px] leading-tight font-medium uppercase tracking-wide">Watch</span>
      </button>
      
      {/* Learn / Education */}
      <button
        onClick={() => setView("education")}
        className={`flex flex-col items-center gap-0.5 flex-1 py-0.5 transition-colors ${
          view === "education" ? "text-brand-black" : "text-brand-black/60"
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
        <span className="text-[9px] leading-tight font-medium uppercase tracking-wide">Learn</span>
      </button>
      
      {/* Admin */}
      <button
        onClick={() => setView("analyst")}
        className={`flex flex-col items-center gap-0.5 flex-1 py-0.5 transition-colors ${
          view === "analyst" ? "text-brand-black" : "text-brand-black/60"
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
        <span className="text-[9px] leading-tight font-medium uppercase tracking-wide">Admin</span>
      </button>
    </nav>
  );
};

