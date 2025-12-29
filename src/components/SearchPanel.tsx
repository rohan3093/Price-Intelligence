import React from "react";

interface SearchPanelProps {
  query: string;
  setQuery: (v: string) => void;
  totalAssets: number;
  trending: string[];
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  query,
  setQuery,
  totalAssets,
  trending,
}) => {
  const categories = [
    { name: "Sneakers", available: true },
    { name: "Watches", available: false },
    { name: "Bags", available: false },
    { name: "Collectibles", available: false },
  ];

  return (
    <section className="border border-brand-gray/30 p-5 space-y-5 bg-brand-white" style={{ borderRadius: '0px' }}>
      {/* Market Stats */}
      <div className="pb-4 border-b border-brand-gray/20">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-brand-black/60 uppercase tracking-wide">Total Assets</span>
          <span className="text-2xl font-semibold text-brand-black">
            {totalAssets.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Search input */}
      <div>
        <label className="block text-xs text-brand-black/60 uppercase tracking-wide mb-2">
          Search
        </label>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or SKU..."
            className="w-full bg-brand-white border border-brand-gray/30 py-2.5 px-3 text-sm font-body text-brand-black placeholder:text-brand-black/40 focus:outline-none focus:border-brand-black"
            style={{ borderRadius: '0px' }}
          />
        </div>
      </div>

      {/* Categories */}
      <div>
        <label className="block text-xs text-brand-black/60 uppercase tracking-wide mb-3">
          Categories
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.name}
              disabled={!cat.available}
              className={`px-4 py-2 border text-xs font-semibold uppercase tracking-wide transition-all ${
                cat.available
                  ? "border-brand-black bg-brand-black text-brand-white hover:bg-brand-black/90 active:bg-brand-black/80"
                  : "border-brand-gray/30 bg-brand-white text-brand-black/40 cursor-not-allowed"
              }`}
              style={{ borderRadius: '0px' }}
            >
              {cat.name}
              {!cat.available && <span className="ml-1.5 text-[10px]">🔒</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Trending searches */}
      {trending.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[10px] text-brand-black/50 uppercase tracking-wide flex-shrink-0">
            Trending:
          </span>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {trending.slice(0, 3).map((item) => (
              <button
                key={item}
                onClick={() => setQuery(item)}
                className="text-[10px] text-brand-black/70 hover:text-brand-black underline decoration-brand-black/30 hover:decoration-brand-black/60 transition-all"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

