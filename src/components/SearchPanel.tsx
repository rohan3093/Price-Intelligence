import React, { useRef, useEffect, useState } from "react";
import { Asset } from "../types";

interface SearchPanelProps {
  query: string;
  setQuery: (v: string) => void;
  totalAssets: number;
  trending: string[];
  assets?: Asset[];
  selectedBrand?: string | null;
  onBrandChange?: (brand: string | null) => void;
  priceRange?: { min: number | null; max: number | null };
  onPriceRangeChange?: (range: { min: number | null; max: number | null }) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  query,
  setQuery,
  totalAssets,
  trending,
  assets = [],
  selectedBrand = null,
  onBrandChange,
  priceRange = { min: null, max: null },
  onPriceRangeChange,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Expose ref to parent for keyboard shortcuts
  useEffect(() => {
    // Store ref in a way that can be accessed by keyboard shortcut handler
    if (searchInputRef.current) {
      (window as any).__searchInputRef = searchInputRef;
    }
  }, []);

  // Generate autocomplete suggestions
  useEffect(() => {
    if (query.trim().length >= 2 && assets.length > 0) {
      const queryLower = query.toLowerCase();
      const matches: string[] = [];
      
      // Get unique matches from names, brands, and SKUs
      const seen = new Set<string>();
      assets.forEach(asset => {
        if (asset.name.toLowerCase().includes(queryLower) && !seen.has(asset.name)) {
          matches.push(asset.name);
          seen.add(asset.name);
        }
        if (asset.brand.toLowerCase().includes(queryLower) && !seen.has(asset.brand)) {
          matches.push(asset.brand);
          seen.add(asset.brand);
        }
        if (asset.sku.toLowerCase().includes(queryLower) && !seen.has(asset.sku)) {
          matches.push(`SKU: ${asset.sku}`);
          seen.add(asset.sku);
        }
      });
      
      setSuggestions(matches.slice(0, 5));
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, assets]);

  const handleSuggestionClick = (suggestion: string) => {
    const cleanSuggestion = suggestion.replace(/^SKU: /, '');
    setQuery(cleanSuggestion);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };
  const categories = [
    { name: "Sneakers", available: true },
    { name: "Watches", available: false },
    { name: "Bags", available: false },
    { name: "Collectibles", available: false },
  ];

  // Get unique brands from assets
  const uniqueBrands = Array.from(new Set(assets.map(a => a.brand).filter(Boolean))).sort();

  // Quick price range presets
  const pricePresets = [
    { label: "Under ₹10k", min: 0, max: 10000 },
    { label: "₹10k - ₹25k", min: 10000, max: 25000 },
    { label: "₹25k - ₹50k", min: 25000, max: 50000 },
    { label: "₹50k+", min: 50000, max: null },
  ];

  return (
    <section className="border border-brand-gray/30 p-3 space-y-3 bg-brand-white" style={{ borderRadius: '0px' }}>
      {/* Market Stats - more compact */}
      <div className="pb-2 border-b border-brand-gray/20">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] text-brand-black/60 uppercase tracking-wide">Total Assets</span>
          <span className="text-lg font-mono-numeric font-semibold text-brand-black">
            {totalAssets.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Search input - more compact */}
      <div>
        <label className="block text-[10px] text-brand-black/60 uppercase tracking-wide mb-1.5">
          Search
        </label>
        <div className="relative">
          {/* Search icon */}
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-3.5 h-3.5 text-brand-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedSuggestionIndex(-1);
            }}
            onFocus={() => query.trim().length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Name or SKU..."
            className="w-full bg-brand-white border border-brand-gray/30 py-2 pl-9 pr-9 text-xs font-body text-brand-black placeholder:text-brand-black/40 focus:outline-none focus:border-brand-black leading-tight"
            style={{ borderRadius: '0px' }}
          />
          {/* Autocomplete Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-brand-white border border-brand-gray/30 shadow-lg max-h-60 overflow-y-auto" style={{ borderRadius: '0px' }}>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full text-left px-4 py-2.5 text-sm text-brand-black hover:bg-brand-gray/10 transition-colors ${
                    index === selectedSuggestionIndex ? 'bg-brand-gray/10' : ''
                  }`}
                  style={{ borderRadius: '0px' }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          {/* Clear button */}
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-brand-gray/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4 text-brand-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Quick Filters - more compact */}
      {(onBrandChange || onPriceRangeChange) && (
        <div className="space-y-2.5">
          {/* Brand Filter */}
          {onBrandChange && uniqueBrands.length > 0 && (
            <div>
              <label className="block text-[10px] text-brand-black/60 uppercase tracking-wide mb-1.5">
                Brand
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => onBrandChange(null)}
                  className={`px-2 py-1 border text-[10px] font-medium transition-all leading-tight ${
                    !selectedBrand
                      ? "border-brand-black bg-brand-black text-brand-white"
                      : "border-brand-gray/30 bg-brand-white text-brand-black hover:bg-brand-gray/10"
                  }`}
                  style={{ borderRadius: '0px' }}
                >
                  All
                </button>
                {uniqueBrands.slice(0, 6).map((brand) => (
                  <button
                    key={brand}
                    onClick={() => onBrandChange(brand)}
                    className={`px-2 py-1 border text-[10px] font-medium transition-all leading-tight ${
                      selectedBrand === brand
                        ? "border-brand-black bg-brand-black text-brand-white"
                        : "border-brand-gray/30 bg-brand-white text-brand-black hover:bg-brand-gray/10"
                    }`}
                    style={{ borderRadius: '0px' }}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price Range Filter */}
          {onPriceRangeChange && (
            <div>
              <label className="block text-[10px] text-brand-black/60 uppercase tracking-wide mb-1.5">
                Price Range
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => onPriceRangeChange({ min: null, max: null })}
                  className={`px-2 py-1 border text-[10px] font-medium transition-all leading-tight ${
                    !priceRange.min && !priceRange.max
                      ? "border-brand-black bg-brand-black text-brand-white"
                      : "border-brand-gray/30 bg-brand-white text-brand-black hover:bg-brand-gray/10"
                  }`}
                  style={{ borderRadius: '0px' }}
                >
                  All
                </button>
                {pricePresets.map((preset) => {
                  const isActive = priceRange.min === preset.min && priceRange.max === preset.max;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => onPriceRangeChange({ min: preset.min, max: preset.max })}
                      className={`px-2 py-1 border text-[10px] font-medium transition-all leading-tight ${
                        isActive
                          ? "border-brand-black bg-brand-black text-brand-white"
                          : "border-brand-gray/30 bg-brand-white text-brand-black hover:bg-brand-gray/10"
                      }`}
                      style={{ borderRadius: '0px' }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Categories - more compact */}
      <div>
        <label className="block text-[10px] text-brand-black/60 uppercase tracking-wide mb-1.5">
          Categories
        </label>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.name}
              disabled={!cat.available}
              className={`px-2.5 py-1.5 border text-[10px] font-semibold uppercase tracking-wide transition-all leading-tight ${
                cat.available
                  ? "border-brand-black bg-brand-black text-brand-white hover:bg-brand-black/90 active:bg-brand-black/80"
                  : "border-brand-gray/30 bg-brand-white text-brand-black/40 cursor-not-allowed"
              }`}
              style={{ borderRadius: '0px' }}
            >
              {cat.name}
              {!cat.available && <span className="ml-1 text-[9px]">🔒</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Trending searches - more compact */}
      {trending.length > 0 && (
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="text-[9px] text-brand-black/50 uppercase tracking-wide flex-shrink-0">
            Trending:
          </span>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            {trending.slice(0, 3).map((item) => (
              <button
                key={item}
                onClick={() => setQuery(item)}
                className="text-[9px] text-brand-black/70 hover:text-brand-black underline decoration-brand-black/30 hover:decoration-brand-black/60 transition-all py-0.5 px-1"
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

