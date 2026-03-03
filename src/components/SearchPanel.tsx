import React, { useRef, useEffect, useState, useCallback } from "react";
import { Asset } from "../types";

// Search history storage key
const SEARCH_HISTORY_KEY = "intelligence_exchange_search_history";
const MAX_HISTORY_ITEMS = 10;

// Helper to get/set search history
const getSearchHistory = (): string[] => {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
};

const addToSearchHistory = (query: string): void => {
  try {
    const history = getSearchHistory();
    // Remove if already exists (to move to front)
    const filtered = history.filter(h => h.toLowerCase() !== query.toLowerCase());
    // Add to front
    const updated = [query, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail
  }
};

const clearSearchHistory = (): void => {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    // Silently fail
  }
};

interface SearchPanelProps {
  query: string;
  setQuery: (v: string) => void;
  totalAssets: number;
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
  assets = [],
  selectedBrand = null,
  onBrandChange,
  priceRange = { min: null, max: null },
  onPriceRangeChange,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => getSearchHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Expose ref to parent for keyboard shortcuts
  useEffect(() => {
    // Store ref in a way that can be accessed by keyboard shortcut handler
    if (searchInputRef.current) {
      (window as any).__searchInputRef = searchInputRef;
    }
  }, []);

  // Save search to history when user selects a suggestion or presses enter
  const saveToHistory = useCallback((searchTerm: string) => {
    if (searchTerm.trim().length >= 2) {
      addToSearchHistory(searchTerm.trim());
      setSearchHistory(getSearchHistory());
    }
  }, []);

  // Clear history handler
  const handleClearHistory = useCallback(() => {
    clearSearchHistory();
    setSearchHistory([]);
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

  const handleSuggestionClick = useCallback((suggestion: string) => {
    const cleanSuggestion = suggestion.replace(/^SKU: /, '');
    setQuery(cleanSuggestion);
    saveToHistory(cleanSuggestion);
    setShowSuggestions(false);
    setShowHistory(false);
    searchInputRef.current?.focus();
  }, [setQuery, saveToHistory]);

  const handleHistoryClick = useCallback((historyItem: string) => {
    setQuery(historyItem);
    setShowSuggestions(false);
    setShowHistory(false);
    searchInputRef.current?.focus();
  }, [setQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalItems = showHistory && !query.trim() ? searchHistory.length : suggestions.length;
    
    if (totalItems === 0 && e.key !== 'Enter') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < totalItems - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      if (selectedSuggestionIndex >= 0) {
        e.preventDefault();
        if (showHistory && !query.trim()) {
          handleHistoryClick(searchHistory[selectedSuggestionIndex]);
        } else if (suggestions.length > 0) {
          handleSuggestionClick(suggestions[selectedSuggestionIndex]);
        }
      } else if (query.trim()) {
        // Save current query to history on Enter
        saveToHistory(query);
        setShowSuggestions(false);
        setShowHistory(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setShowHistory(false);
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

  // Count active filters
  const activeFilterCount = (selectedBrand ? 1 : 0) + (priceRange.min !== null || priceRange.max !== null ? 1 : 0);

  return (
    <section className="border border-brand-gray/20 p-4 space-y-4 bg-white shadow-sm" style={{ borderRadius: '12px' }}>
      {/* Market Stats - more compact */}
      <div className="pb-3 border-b border-brand-gray/20">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-brand-black/60 uppercase tracking-wider font-semibold">Total Assets</span>
          <span className="text-2xl font-mono-numeric font-bold text-brand-black">
            {totalAssets.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Search input */}
      <div>
        <label className="block text-xs text-brand-black/60 uppercase tracking-wider mb-2 font-semibold">
          Search
        </label>
        <div className="relative">
          {/* Search icon */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-brand-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedSuggestionIndex(-1);
              setShowHistory(false);
            }}
            onFocus={() => {
              if (query.trim().length >= 2 && suggestions.length > 0) {
                setShowSuggestions(true);
              } else if (!query.trim() && searchHistory.length > 0) {
                setShowHistory(true);
              }
            }}
            onBlur={() => {
              // Delay to allow click on suggestion/history
              setTimeout(() => {
                setShowSuggestions(false);
                setShowHistory(false);
              }, 200);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Name or SKU... (Press / to focus)"
            aria-label="Search assets by name or SKU"
            aria-describedby="search-hint"
            aria-autocomplete="list"
            aria-expanded={showSuggestions || showHistory}
            className="w-full bg-white border border-brand-gray/30 py-3 pl-10 pr-10 text-sm font-body text-brand-black placeholder:text-brand-black/40 focus:outline-none focus:border-brand-black transition-all"
            style={{ borderRadius: '8px' }}
          />
          <span id="search-hint" className="sr-only">
            Type to search assets. Use arrow keys to navigate suggestions, Enter to select.
          </span>
          {/* Autocomplete Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div 
              ref={suggestionsRef}
              className="absolute z-50 w-full mt-2 bg-white border border-brand-gray/20 shadow-lg max-h-60 overflow-hidden" 
              style={{ borderRadius: '8px' }}
              role="listbox"
              aria-label="Search suggestions"
            >
              <div className="overflow-y-auto custom-scrollbar max-h-60">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                    onClick={() => handleSuggestionClick(suggestion)}
                    role="option"
                    aria-selected={index === selectedSuggestionIndex}
                    className={`w-full text-left px-4 py-3 text-sm text-brand-black hover:bg-brand-background/50 transition-all focus:outline-none ${
                      index === selectedSuggestionIndex ? 'bg-brand-background/50' : ''
                    } ${index > 0 ? 'border-t border-brand-gray/10' : ''}`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Search History Dropdown */}
          {showHistory && !query.trim() && searchHistory.length > 0 && (
            <div 
              className="absolute z-50 w-full mt-2 bg-white border border-brand-gray/20 shadow-lg max-h-60 overflow-hidden" 
              style={{ borderRadius: '8px' }}
              role="listbox"
              aria-label="Recent searches"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-brand-gray/20 bg-brand-background/30">
                <span className="text-xs text-brand-black/60 uppercase tracking-wider font-semibold">Recent</span>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleClearHistory}
                  className="text-xs text-brand-black/60 hover:text-brand-black transition-colors font-medium"
                >
                  Clear
                </button>
              </div>
              <div className="overflow-y-auto custom-scrollbar max-h-48">
                {searchHistory.map((historyItem, index) => (
                  <button
                    key={index}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleHistoryClick(historyItem)}
                    role="option"
                    aria-selected={index === selectedSuggestionIndex}
                    className={`w-full text-left px-4 py-3 text-sm text-brand-black hover:bg-brand-background/50 transition-all focus:outline-none flex items-center gap-2 ${
                      index === selectedSuggestionIndex ? 'bg-brand-background/50' : ''
                    } ${index > 0 ? 'border-t border-brand-gray/10' : ''}`}
                  >
                    <svg className="w-4 h-4 text-brand-black/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="truncate">{historyItem}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Clear button */}
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-brand-gray/10 transition-colors flex items-center justify-center"
              style={{ borderRadius: '6px' }}
              aria-label="Clear search"
            >
              <svg className="w-4 h-4 text-brand-black/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Active Filters & Filter Toggle */}
      <div className="space-y-3">
        {/* Active Filters Pills */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {selectedBrand && onBrandChange && (
              <button
                onClick={() => onBrandChange(null)}
                className="px-3 py-1.5 bg-brand-black text-white text-xs font-medium hover:bg-brand-black/90 transition-all flex items-center gap-1.5"
                style={{ borderRadius: '20px' }}
              >
                {selectedBrand}
                <span className="text-sm">✕</span>
              </button>
            )}
            {(priceRange.min !== null || priceRange.max !== null) && onPriceRangeChange && (
              <button
                onClick={() => onPriceRangeChange({ min: null, max: null })}
                className="px-3 py-1.5 bg-brand-black text-white text-xs font-medium hover:bg-brand-black/90 transition-all flex items-center gap-1.5"
                style={{ borderRadius: '20px' }}
              >
                ₹{priceRange.min?.toLocaleString("en-IN") || "0"} - ₹{priceRange.max?.toLocaleString("en-IN") || "∞"}
                <span className="text-sm">✕</span>
              </button>
            )}
          </div>
        )}

        {/* Filters Toggle Button */}
        {(onBrandChange || onPriceRangeChange) && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-4 py-2.5 border border-brand-gray/30 bg-white hover:bg-brand-background/50 text-sm font-semibold text-brand-black transition-all flex items-center justify-between"
            style={{ borderRadius: '8px' }}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 bg-brand-black text-white text-xs font-bold" style={{ borderRadius: '10px' }}>
                  {activeFilterCount}
                </span>
              )}
            </div>
            <svg 
              className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Collapsible Filters Section */}
      {showFilters && (onBrandChange || onPriceRangeChange) && (
        <div className="space-y-4 pt-2">
          {/* Brand Filter */}
          {onBrandChange && uniqueBrands.length > 0 && (
            <div>
              <label className="block text-xs text-brand-black/60 uppercase tracking-wider mb-2 font-semibold">
                Brand
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onBrandChange(null)}
                  className={`px-4 py-2 text-xs font-medium transition-all ${
                    !selectedBrand
                      ? "bg-brand-black text-white"
                      : "bg-white text-brand-black border border-brand-gray/30 hover:border-brand-black"
                  }`}
                  style={{ borderRadius: '20px' }}
                >
                  All
                </button>
                {uniqueBrands.slice(0, 6).map((brand) => (
                  <button
                    key={brand}
                    onClick={() => onBrandChange(brand)}
                    className={`px-4 py-2 text-xs font-medium transition-all ${
                      selectedBrand === brand
                        ? "bg-brand-black text-white"
                        : "bg-white text-brand-black border border-brand-gray/30 hover:border-brand-black"
                    }`}
                    style={{ borderRadius: '20px' }}
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
              <label className="block text-xs text-brand-black/60 uppercase tracking-wider mb-2 font-semibold">
                Price Range
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onPriceRangeChange({ min: null, max: null })}
                  className={`px-4 py-2 text-xs font-medium transition-all ${
                    !priceRange.min && !priceRange.max
                      ? "bg-brand-black text-white"
                      : "bg-white text-brand-black border border-brand-gray/30 hover:border-brand-black"
                  }`}
                  style={{ borderRadius: '20px' }}
                >
                  All
                </button>
                {pricePresets.map((preset) => {
                  const isActive = priceRange.min === preset.min && priceRange.max === preset.max;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => onPriceRangeChange({ min: preset.min, max: preset.max })}
                      className={`px-4 py-2 text-xs font-medium transition-all ${
                        isActive
                          ? "bg-brand-black text-white"
                          : "bg-white text-brand-black border border-brand-gray/30 hover:border-brand-black"
                      }`}
                      style={{ borderRadius: '20px' }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categories */}
          <div>
            <label className="block text-xs text-brand-black/60 uppercase tracking-wider mb-2 font-semibold">
              Categories
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  disabled={!cat.available}
                  className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-all ${
                    cat.available
                      ? "bg-brand-black text-white hover:bg-brand-black/90"
                      : "bg-white border border-brand-gray/30 text-brand-black/40 cursor-not-allowed"
                  }`}
                  style={{ borderRadius: '20px' }}
                >
                  {cat.name}
                  {!cat.available && <span className="ml-1.5 text-[9px]">🔒</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

