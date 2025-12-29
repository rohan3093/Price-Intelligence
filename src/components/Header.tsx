import React from "react";
import { View } from "../types";

interface HeaderProps {
  view: View;
  setView: (view: View) => void;
}

export const Header: React.FC<HeaderProps> = ({ view, setView }) => {
  return (
    <header className="border-b border-brand-gray/30 px-6 md:px-8 py-4 md:py-5 flex items-center justify-between bg-brand-white" style={{ borderRadius: '0px' }}>
      <button
        onClick={() => setView("home")}
        className="flex items-center gap-4 hover:opacity-80 transition-opacity cursor-pointer"
      >
        <img
          src="/10HS_Logo_Primary_Black.png"
          alt="10 Hills Studio"
          className="h-8 md:h-10 w-auto"
        />
        <div className="h-6 w-px bg-brand-gray/30"></div>
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-normal uppercase tracking-wide text-brand-black">
            Price Intelligence
          </h1>
          <p className="text-xs text-brand-black/60 uppercase tracking-wide mt-0.5">
            Sneaker Market Data
          </p>
        </div>
      </button>
      <nav className="hidden md:flex items-center gap-2">
        <button
          onClick={() => setView("home")}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-all ${
            view === "home"
              ? "border-b-2 border-brand-black text-brand-black"
              : "text-brand-black/60 hover:text-brand-black border-b-2 border-transparent"
          }`}
        >
          Market
        </button>
        <button
          onClick={() => setView("watchlist")}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-all ${
            view === "watchlist"
              ? "border-b-2 border-brand-black text-brand-black"
              : "text-brand-black/60 hover:text-brand-black border-b-2 border-transparent"
          }`}
        >
          Watchlist
        </button>
        <button
          onClick={() => setView("education")}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-all ${
            view === "education"
              ? "border-b-2 border-brand-black text-brand-black"
              : "text-brand-black/60 hover:text-brand-black border-b-2 border-transparent"
          }`}
        >
          Learn
        </button>
        <div className="h-6 w-px bg-brand-gray/30 mx-2"></div>
        <button
          onClick={() => setView("analyst")}
          className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wide border transition-all ${
            view === "analyst"
              ? "border-brand-black bg-brand-black text-brand-white"
              : "border-brand-gray/30 bg-brand-white text-brand-black/50 hover:border-brand-gray/50 hover:text-brand-black"
          }`}
          style={{ borderRadius: '0px' }}
        >
          Admin
        </button>
      </nav>
    </header>
  );
};

