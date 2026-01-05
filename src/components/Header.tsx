import React from "react";
import { View } from "../types";

interface HeaderProps {
  view: View;
  setView: (view: View) => void;
}

export const Header: React.FC<HeaderProps> = ({ view, setView }) => {
  return (
    <header className="border-b border-brand-gray/30 px-3 md:px-14 py-2 flex items-center justify-between bg-brand-white" style={{ borderRadius: '0px' }}>
      <button
        onClick={() => setView("home")}
        className="flex flex-col items-start hover:opacity-80 transition-opacity cursor-pointer"
      >
        <h1 className="text-xl md:text-2xl font-extrabold text-brand-black leading-tight uppercase" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900 }}>
          Sentria
        </h1>
        <p className="text-[9px] text-brand-black/60 uppercase tracking-wide leading-tight mt-0.5">
          Market Intelligence
        </p>
      </button>
      <nav className="hidden md:flex items-center gap-1 px-4">
        <button
          onClick={() => setView("home")}
          className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-all leading-tight ${
            view === "home"
              ? "border-b-2 border-brand-black text-brand-black"
              : "text-brand-black/60 hover:text-brand-black border-b-2 border-transparent"
          }`}
        >
          Market
        </button>
        <button
          onClick={() => setView("watchlist")}
          className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-all leading-tight ${
            view === "watchlist"
              ? "border-b-2 border-brand-black text-brand-black"
              : "text-brand-black/60 hover:text-brand-black border-b-2 border-transparent"
          }`}
        >
          Watchlist
        </button>
        <button
          onClick={() => setView("education")}
          className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-all leading-tight ${
            view === "education"
              ? "border-b-2 border-brand-black text-brand-black"
              : "text-brand-black/60 hover:text-brand-black border-b-2 border-transparent"
          }`}
        >
          Learn
        </button>
        <div className="h-4 w-px bg-brand-gray/30 mx-1"></div>
        <button
          onClick={() => setView("analyst")}
          className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide border transition-all leading-tight ${
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

