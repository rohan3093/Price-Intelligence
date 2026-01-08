import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { SearchPanel } from "./components/SearchPanel";
import { ResultsPanel } from "./components/ResultsPanel";
import { AssetDetailModal } from "./components/AssetDetailModal";
import { AssetDetailPanel } from "./components/AssetDetailPanel";
import { WatchlistView } from "./components/WatchlistView";
import { GettingStartedView } from "./components/GettingStartedView";
import { EducationHub } from "./components/EducationHub";
import { DropsView } from "./components/DropsView";
import { AnalystDashboard } from "./components/AnalystDashboard";
import { AnalystLogin } from "./components/AnalystLogin";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { View, Asset, PricePoint } from "./types";
import { storage } from "./utils/storage";
import { analytics } from "./utils/analytics";
import { fetchAllAssets } from "./utils/assetsApi";
import { auth } from "./utils/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";

const PriceDiscoveryApp: React.FC = () => {
  // Load assets from API (shared across all users) or localStorage fallback
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  // Per-device watchlist (asset IDs), persisted in localStorage
  const [watchlistIds, setWatchlistIds] = useState<number[]>(() => {
    const saved = storage.loadWatchlist();
    return saved || [];
  });
  const [query, setQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [selectedId, setSelectedId] = useState<number | null>(
    assets[0]?.id ?? null
  );
  const [view, setView] = useState<View>("home");
  const [detailOpen, setDetailOpen] = useState(false);
  const [isAnalystAuthenticated, setIsAnalystAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingAnalystView, setPendingAnalystView] = useState(false);

  // Fetch assets from Firebase on mount and set up real-time listener
  useEffect(() => {
    const loadAssets = async () => {
      setAssetsLoading(true);
      try {
        const fetchedAssets = await fetchAllAssets();
        setAssets(fetchedAssets);
        // Also save to localStorage as cache/fallback
        storage.saveAssets(fetchedAssets);
      } catch (error) {
        console.error("Failed to load assets:", error);
        // Fallback to localStorage
        const localAssets = storage.loadAssets();
        setAssets(localAssets || []);
      } finally {
        setAssetsLoading(false);
      }
    };
    loadAssets();

    // Set up real-time listener for assets (optional - uncomment if you want real-time updates)
    // This will automatically update when assets change in Firebase
    // const unsubscribe = onSnapshot(assetsCollection, (snapshot) => {
    //   const updatedAssets = snapshot.docs.map(doc => docToAsset(doc));
    //   setAssets(updatedAssets);
    //   storage.saveAssets(updatedAssets);
    // });
    // return () => unsubscribe();
  }, []);

  // Cache assets to localStorage when they change (for offline fallback)
  useEffect(() => {
    if (assets.length > 0) {
      storage.saveAssets(assets);
    }
  }, [assets]);

  // Persist watchlist when it changes
  useEffect(() => {
    storage.saveWatchlist(watchlistIds);
  }, [watchlistIds]);

  // Check authentication on mount and listen for auth state changes
  useEffect(() => {
    storage.checkVersion(); // Check for data migrations

    if (!auth) {
      // Firebase not configured, fallback to localStorage check
      const authenticated = localStorage.getItem("analyst_authenticated") === "true";
      setIsAnalystAuthenticated(authenticated);
      return;
    }

    // Listen for Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      setIsAnalystAuthenticated(!!user);
      if (user) {
        // Store email for display purposes
        localStorage.setItem("analyst_email", user.email || "");
      } else {
        localStorage.removeItem("analyst_email");
        localStorage.removeItem("analyst_authenticated");
      }
    });

    return () => unsubscribe();
  }, []);

  // Track page views
  useEffect(() => {
    analytics.trackPageView(view);
  }, [view]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search with "/" key (when not typing in an input)
      if (e.key === '/' && view === 'home' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        // Try to use ref first, fallback to querySelector
        const searchInputRef = (window as any).__searchInputRef;
        if (searchInputRef?.current) {
          searchInputRef.current.focus();
        } else {
          const searchInput = document.querySelector('input[placeholder*="Name or SKU"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
        }
      }
      // Escape to clear search
      if (e.key === 'Escape' && view === 'home' && query) {
        const searchInput = document.activeElement as HTMLInputElement;
        if (searchInput?.tagName === 'INPUT' && searchInput.placeholder?.includes('Name or SKU')) {
          setQuery('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, query]);

  // Check authentication when trying to access analyst view
  useEffect(() => {
    if (view === "analyst" && !isAnalystAuthenticated) {
      setShowLogin(true);
    } else if (view !== "analyst") {
      setShowLogin(false);
    }
  }, [view, isAnalystAuthenticated]);

  const handleAnalystLogin = () => {
    setIsAnalystAuthenticated(true);
    setShowLogin(false);
    // If user was trying to access analyst view, navigate there after login
    if (pendingAnalystView) {
      setView("analyst");
      setPendingAnalystView(false);
    }
  };

  const handleViewChange = (newView: View) => {
    if (newView === "analyst" && !isAnalystAuthenticated) {
      setPendingAnalystView(true);
      setShowLogin(true);
    } else {
      setView(newView);
      setPendingAnalystView(false);
    }
  };

  // Helper function to calculate best price for an asset
  // Uses pre-computed bestAvailablePrice when available, and falls back to deriving
  // the best price from channel price points (WhatsApp, marketplaces, international).
  const getAssetBestPrice = (asset: Asset): number | undefined => {
    // 1) Asset-level best price (precomputed)
    if (asset.bestAvailablePrice !== undefined) return asset.bestAvailablePrice;

    // 2) Size-level best price for default/primary size
    const defaultSize = asset.defaultSize || asset.size;
    const sizeVariant =
      asset.sizes?.find((s) => s.size === defaultSize) ?? asset.sizes?.[0];

    if (sizeVariant?.bestAvailablePrice !== undefined) {
      return sizeVariant.bestAvailablePrice;
    }

    // 3) Fallback: derive best price from available price points
    const allPrices: number[] = [];

    // Prefer size-level price points; fall back to asset-level legacy pricePoints
    const pricePoints = sizeVariant?.pricePoints || asset.pricePoints;

    if (pricePoints) {
      // WhatsApp prices
      const whatsapp = (
        "whatsapp" in pricePoints
          ? pricePoints.whatsapp
          : (pricePoints.b2b || [])
      ) as PricePoint[];
      if (whatsapp?.length) {
        allPrices.push(...whatsapp.map((p) => p.price));
      }

      // Marketplace prices
      const marketplace = (
        "marketplace" in pricePoints
          ? pricePoints.marketplace
          : (pricePoints.endCustomer || [])
      ) as PricePoint[];
      if (marketplace?.length) {
        allPrices.push(...marketplace.map((p) => p.price));
      }

      // International prices (include reshipping)
      const international = (
        "international" in pricePoints
          ? pricePoints.international
          : (pricePoints.stockxGoat || [])
      ) as PricePoint[];
      if (international?.length) {
        allPrices.push(
          ...international.map((p) => p.price + (p.reshippingCost || 0))
        );
      }
    }

    return allPrices.length ? Math.min(...allPrices) : undefined;
  };

  const filteredAssets = assets.filter((asset) => {
    // Text search filter
    const matchesSearch = 
      asset.name.toLowerCase().includes(query.toLowerCase()) ||
      asset.sku.toLowerCase().includes(query.toLowerCase()) ||
      asset.brand.toLowerCase().includes(query.toLowerCase());

    // Brand filter
    const matchesBrand = !selectedBrand || asset.brand === selectedBrand;

    // Price range filter
    let matchesPrice = true;
    if (priceRange.min !== null || priceRange.max !== null) {
      const bestPrice = getAssetBestPrice(asset);
      if (bestPrice !== undefined) {
        if (priceRange.min !== null && bestPrice < priceRange.min) {
          matchesPrice = false;
        }
        if (priceRange.max !== null && bestPrice > priceRange.max) {
          matchesPrice = false;
        }
      } else {
        // If no price available, exclude from price-filtered results
        matchesPrice = priceRange.min === null && priceRange.max === null;
      }
    }

    return matchesSearch && matchesBrand && matchesPrice;
  });

  // Auto-select first result when search results change
  useEffect(() => {
    if (filteredAssets.length > 0) {
      // Only auto-select if current selection is not in filtered results
      const currentSelected = filteredAssets.find(a => a.id === selectedId);
      if (!currentSelected) {
        setSelectedId(filteredAssets[0].id);
      }
    } else if (filteredAssets.length === 0 && query.trim()) {
      // Clear selection if search returns no results
      setSelectedId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAssets.length, query]);

  // Track search queries
  useEffect(() => {
    if (query.trim()) {
      const timeoutId = setTimeout(() => {
        analytics.trackSearch(query, filteredAssets.length);
      }, 500); // Debounce
      return () => clearTimeout(timeoutId);
    }
  }, [query, filteredAssets.length]);
  
  const selectedAsset =
    filteredAssets.find((a) => a.id === selectedId) ?? filteredAssets[0];

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-brand-white text-brand-black flex flex-col">
        <Header view={view} setView={handleViewChange} />
      {view === "home" ? (
        <main className="flex-1 bg-brand-white px-3 py-3 md:px-4 md:py-4 pb-20 md:pb-4 w-full max-w-7xl mx-auto">
          {/* Desktop layout: left list + right detail */}
          <div className="hidden md:grid md:grid-cols-3 gap-3" style={{ maxHeight: 'calc(100vh - 180px)' }}>
            {/* Left column: search + results list */}
            <div className="md:col-span-1 flex flex-col gap-2">
              <SearchPanel
                query={query}
                setQuery={setQuery}
                totalAssets={assets.length}
                assets={assets}
                selectedBrand={selectedBrand}
                onBrandChange={setSelectedBrand}
                priceRange={priceRange}
                onPriceRangeChange={setPriceRange}
                trending={assets.slice(0, 4).map((a) =>
                  a.defaultSize ? `${a.name} ${a.defaultSize}` : a.name
                )}
              />
              <ResultsPanel
                assets={filteredAssets}
                selectedId={selectedId}
                isLoading={assetsLoading}
                searchQuery={query}
                watchlistIds={watchlistIds}
                onToggleWatchlist={(assetId) => {
                  setWatchlistIds((prev) =>
                    prev.includes(assetId)
                      ? prev.filter((id) => id !== assetId)
                      : [...prev, assetId]
                  );
                }}
                setSelectedId={(id) => {
                  setSelectedId(id);
                  const asset = filteredAssets.find(a => a.id === id);
                  if (asset) {
                    analytics.trackAssetView(asset.id, asset.name);
                  }
                }}
              />
            </div>
            {/* Right column: detail panel */}
            <div className="md:col-span-2 border border-brand-gray/20 rounded-none bg-brand-white text-brand-black">
              {selectedAsset ? (
                <div className="overflow-y-auto text-brand-black bg-brand-white">
                  {/* Inline detail view for desktop */}
                  {/* We keep alerts toggling hooked into the sheet */}
                  {/* AssetDetailPanel is already used inside AssetDetailModal */}
                  {/* Importing it at top of file */}
                  <AssetDetailPanel
                    asset={selectedAsset}
                    watchlisted={watchlistIds.includes(selectedAsset.id)}
                    isLoading={assetsLoading}
                    onToggleWatchlist={() => {
                      setWatchlistIds((prev) =>
                        prev.includes(selectedAsset.id)
                          ? prev.filter((id) => id !== selectedAsset.id)
                          : [...prev, selectedAsset.id]
                      );
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center text-xs text-brand-black/70 p-4 min-h-[400px]">
                  Select an asset on the left to see full market data.
                </div>
              )}
            </div>
          </div>

          {/* Mobile layout: existing stacked view + modal detail */}
          <div className="md:hidden flex flex-col gap-2">
            <div className="border-b border-brand-gray/20 px-1 pb-1.5 text-[9px] font-body text-brand-black uppercase leading-tight">
              Market · 200 top sneakers (MVP scope)
            </div>
            <SearchPanel
              query={query}
              setQuery={setQuery}
              totalAssets={assets.length}
              assets={assets}
              selectedBrand={selectedBrand}
              onBrandChange={setSelectedBrand}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              trending={assets.slice(0, 4).map((a) =>
                a.defaultSize ? `${a.name} ${a.defaultSize}` : a.name
              )}
            />
            <ResultsPanel
              assets={filteredAssets}
              selectedId={selectedId}
              isLoading={assetsLoading}
              searchQuery={query}
              watchlistIds={watchlistIds}
              onToggleWatchlist={(assetId) => {
                setWatchlistIds((prev) =>
                  prev.includes(assetId)
                    ? prev.filter((id) => id !== assetId)
                    : [...prev, assetId]
                );
              }}
              setSelectedId={(id) => {
                setSelectedId(id);
                setDetailOpen(true);
                const asset = filteredAssets.find(a => a.id === id);
                if (asset) {
                  analytics.trackAssetView(asset.id, asset.name);
                }
              }}
            />
          </div>
        </main>
      ) : view === "getting-started" ? (
        <GettingStartedView assets={assets} />
      ) : view === "education" ? (
        <EducationHub />
      ) : view === "drops" ? (
        <DropsView />
      ) : view === "analyst" && isAnalystAuthenticated ? (
        <AnalystDashboard
          assets={assets}
          onAssetsChange={(newAssets) => {
            setAssets(newAssets);
            analytics.trackAnalystAction("assets_updated", { count: newAssets.length });
          }}
          onLogout={async () => {
            if (auth) {
              try {
                await signOut(auth);
              } catch (error) {
                console.error("Logout error:", error);
              }
            }
            // Clear localStorage as fallback
            localStorage.removeItem("analyst_authenticated");
            localStorage.removeItem("analyst_email");
            setIsAnalystAuthenticated(false);
            analytics.track("analyst_logout");
            setView("home");
          }}
        />
      ) : (
        <WatchlistView
          assets={assets}
          watchlistIds={watchlistIds}
          onRemoveFromWatchlist={(assetId) => {
            setWatchlistIds((prev) => prev.filter((id) => id !== assetId));
          }}
        />
      )}

      <MobileBottomNav view={view} setView={handleViewChange} />
      <AssetDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        asset={selectedAsset}
        watchlisted={selectedAsset ? watchlistIds.includes(selectedAsset.id) : false}
        onToggleWatchlist={() => {
          if (!selectedAsset) return;
          setWatchlistIds((prev) =>
            prev.includes(selectedAsset.id)
              ? prev.filter((id) => id !== selectedAsset.id)
              : [...prev, selectedAsset.id]
          );
        }}
      />
      {showLogin && (
        <AnalystLogin
          onLogin={handleAnalystLogin}
          onClose={() => {
            setShowLogin(false);
            setPendingAnalystView(false);
            if (view === "analyst") {
              setView("home");
            }
          }}
        />
      )}
    </div>
    </ErrorBoundary>
  );
};

export default PriceDiscoveryApp;

