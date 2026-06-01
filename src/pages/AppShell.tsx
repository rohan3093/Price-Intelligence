import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { Header } from "../components/Header";
import { SearchPanel } from "../components/SearchPanel";
import { ResultsPanel } from "../components/ResultsPanel";
import { AssetDetailModal } from "../components/AssetDetailModal";
import { AssetDetailPanel } from "../components/AssetDetailPanel";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ToastContainer } from "../components/Toast";
import { useToast } from "../hooks/useToast";
import { MarketOverview } from "../components/MarketOverview";
import { SignInModal } from "../components/SignInModal";
import { View, Asset, PricePoint, PortfolioPosition } from "../types";
import { storage } from "../utils/storage";
import { analytics } from "../utils/analytics";
import { fetchAllAssets } from "../utils/assetsApi";
import { loadUserWatchlist, saveUserWatchlist } from "../utils/watchlistApi";
import { loadUserPortfolio, saveUserPortfolio } from "../utils/portfolioApi";
import { auth, db } from "../utils/firebase";
import { signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const WatchlistView = lazy(() => import("../components/WatchlistView").then(m => ({ default: m.WatchlistView })));
const GettingStartedView = lazy(() => import("../components/GettingStartedView").then(m => ({ default: m.GettingStartedView })));
const EducationHub = lazy(() => import("../components/EducationHub").then(m => ({ default: m.EducationHub })));
const DropsView = lazy(() => import("../components/DropsView").then(m => ({ default: m.DropsView })));
const AnalystDashboard = lazy(() => import("../components/AnalystDashboard").then(m => ({ default: m.AnalystDashboard })));
const AnalystLogin = lazy(() => import("../components/AnalystLogin").then(m => ({ default: m.AnalystLogin })));
const PortfolioView = lazy(() => import("../components/PortfolioView").then(m => ({ default: m.PortfolioView })));
const ConnectionsView = lazy(() => import("../components/ConnectionsView").then(m => ({ default: m.ConnectionsView })));

const ViewLoadingFallback: React.FC = () => (
  <div className="flex-1 flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-3">
      <svg className="w-6 h-6 animate-spin text-brand-black/60" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="text-sm text-brand-black/60">Loading...</p>
    </div>
  </div>
);

interface AppShellProps {
  currentUser: User | null;
  authInitialized: boolean;
  onSignInClick: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ currentUser, authInitialized, onSignInClick: _onSignInClick }) => {
  const { toasts, toast, removeToast } = useToast();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [watchlistIds, setWatchlistIds] = useState<number[]>([]);
  const [, setWatchlistLoading] = useState(true);
  const [watchlistInitialized, setWatchlistInitialized] = useState(false);
  const [portfolioPositions, setPortfolioPositions] = useState<PortfolioPosition[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [portfolioInitialized, setPortfolioInitialized] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [view, setView] = useState<View>("home");
  const [detailOpen, setDetailOpen] = useState(false);
  const [isAnalystAuthenticated, setIsAnalystAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingAnalystView, setPendingAnalystView] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [previousUserId, setPreviousUserId] = useState<string | null>(null);
  const [, setIsSigningOut] = useState(false);

  const hasLoadedOnceRef = useRef(false);
  const isLoadingRef = useRef(false);

  const loadAssets = async (isRetry = false) => {
    // Stale-while-revalidate: hydrate from cache synchronously so the UI is
    // interactive in ~50ms, then continue with the network fetch in the background.
    const cachedAssets = !isRetry ? storage.loadAssets() : null;
    const hadCache = !!(cachedAssets && cachedAssets.length > 0);
    if (hadCache) {
      setAssets(cachedAssets!);
      setAssetsLoading(false);
    }

    if (isRetry) {
      setIsRetrying(true);
    } else if (!hadCache) {
      setAssetsLoading(true);
    }
    setIsRefreshing(true);
    setAssetsError(null);
    try {
      const fetchedAssets = await fetchAllAssets();
      setAssets(fetchedAssets);
      storage.saveAssets(fetchedAssets);
      // Silent update — only nudge the user if the asset count actually changed.
      if (hadCache && fetchedAssets.length !== cachedAssets!.length) {
        toast.success("Market data updated");
      }
    } catch (error) {
      console.error("Failed to load assets:", error);
      const localAssets = storage.loadAssets();
      if (localAssets && localAssets.length > 0) {
        if (!hadCache) {
          setAssets(localAssets);
          toast.warning("Couldn't reach server — showing cached data");
        }
        setAssetsError("Using cached data. Pull to refresh for latest.");
      } else {
        setAssetsError(error instanceof Error ? error.message : "Failed to load assets. Please try again.");
        toast.error("Failed to load market data. Check your connection and retry.");
      }
    } finally {
      setAssetsLoading(false);
      setIsRetrying(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    if (assets.length > 0) {
      storage.saveAssets(assets);
    }
  }, [assets]);

  useEffect(() => {
    if (!authInitialized) return;
    const loadWatchlist = async () => {
      setWatchlistLoading(true);
      setWatchlistInitialized(false);
      isLoadingRef.current = true;
      hasLoadedOnceRef.current = false;
      try {
        if (currentUser) {
          const userWatchlist = await loadUserWatchlist(currentUser.uid);
          setWatchlistIds(userWatchlist);
          setPreviousUserId(currentUser.uid);
          setIsSigningOut(false);
        } else {
          if (previousUserId) {
            setWatchlistIds([]);
          }
          setPreviousUserId(null);
        }
      } catch (error) {
        console.error("Error loading watchlist:", error);
        setWatchlistIds([]);
        toast.error("Couldn't load your watchlist. Please refresh.");
      } finally {
        setWatchlistLoading(false);
        setWatchlistInitialized(true);
        isLoadingRef.current = false;
      }
    };
    loadWatchlist();
  }, [currentUser, authInitialized]);

  useEffect(() => {
    if (!authInitialized) return;
    const loadPortfolio = async () => {
      setPortfolioLoading(true);
      setPortfolioInitialized(false);
      try {
        if (currentUser) {
          const userPortfolio = await loadUserPortfolio(currentUser.uid);
          setPortfolioPositions(userPortfolio);
        } else {
          const localPortfolio = storage.loadPortfolio();
          setPortfolioPositions(localPortfolio || []);
        }
      } catch (error) {
        console.error("Error loading portfolio:", error);
        setPortfolioPositions([]);
        toast.error("Couldn't load your portfolio. Please refresh.");
      } finally {
        setPortfolioLoading(false);
        setPortfolioInitialized(true);
      }
    };
    loadPortfolio();
  }, [currentUser, authInitialized]);

  useEffect(() => {
    if (!portfolioInitialized || portfolioLoading || !currentUser) return;
    saveUserPortfolio(currentUser.uid, portfolioPositions).catch((error) => {
      console.error("Error saving portfolio to Firestore:", error);
      toast.error("Failed to save portfolio changes");
    });
  }, [portfolioPositions, currentUser, portfolioInitialized, portfolioLoading]);

  useEffect(() => {
    if (portfolioInitialized) {
      storage.savePortfolio(portfolioPositions);
    }
  }, [portfolioPositions, portfolioInitialized]);

  useEffect(() => {
    if (!isLoadingRef.current && watchlistInitialized && currentUser) {
      const timer = setTimeout(() => {
        hasLoadedOnceRef.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [watchlistIds, watchlistInitialized, currentUser]);

  useEffect(() => {
    storage.checkVersion();
    if (!auth || !db) {
      const authenticated = localStorage.getItem("analyst_authenticated") === "true";
      setIsAnalystAuthenticated(authenticated);
      return;
    }
    if (!currentUser?.email) {
      setIsAnalystAuthenticated(false);
      return;
    }
    getDoc(doc(db, "config", "analysts")).then((snap) => {
      const emails: string[] = snap.exists() ? (snap.data().emails || []) : [];
      setIsAnalystAuthenticated(emails.map((e: string) => e.toLowerCase()).includes(currentUser.email!.toLowerCase()));
    }).catch(() => setIsAnalystAuthenticated(false));
  }, [currentUser]);

  useEffect(() => {
    analytics.trackPageView(view);
  }, [view]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && view === 'home' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const searchInputRef = (window as any).__searchInputRef;
        if (searchInputRef?.current) {
          searchInputRef.current.focus();
        } else {
          const searchInput = document.querySelector('input[placeholder*="Name or SKU"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
        }
      }
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

  const handleToggleWatchlist = (assetId: number) => {
    if (!currentUser) {
      setShowSignInModal(true);
      return;
    }
    setWatchlistIds((prev) => {
      const newWatchlist = prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId];
      saveUserWatchlist(currentUser.uid, newWatchlist).catch((error) => {
        console.error('Error saving watchlist:', error);
        toast.error("Failed to save watchlist");
      });
      return newWatchlist;
    });
  };

  const getAssetBestPrice = (asset: Asset): number | undefined => {
    if (asset.bestAvailablePrice !== undefined) return asset.bestAvailablePrice;
    const defaultSize = asset.defaultSize || asset.size;
    const sizeVariant = asset.sizes?.find((s) => s.size === defaultSize) ?? asset.sizes?.[0];
    if (sizeVariant?.bestAvailablePrice !== undefined) return sizeVariant.bestAvailablePrice;
    const allPrices: number[] = [];
    const pricePoints = sizeVariant?.pricePoints || asset.pricePoints;
    if (pricePoints) {
      const whatsapp = ("whatsapp" in pricePoints ? pricePoints.whatsapp : (pricePoints.b2b || [])) as PricePoint[];
      if (whatsapp?.length) allPrices.push(...whatsapp.map((p) => p.price));
      const marketplace = ("marketplace" in pricePoints ? pricePoints.marketplace : (pricePoints.endCustomer || [])) as PricePoint[];
      if (marketplace?.length) allPrices.push(...marketplace.map((p) => p.price));
      const international = ("international" in pricePoints ? pricePoints.international : (pricePoints.stockxGoat || [])) as PricePoint[];
      if (international?.length) allPrices.push(...international.map((p) => p.price + (p.reshippingCost || 0)));
    }
    return allPrices.length ? Math.min(...allPrices) : undefined;
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(query.toLowerCase()) ||
      asset.sku.toLowerCase().includes(query.toLowerCase()) ||
      asset.brand.toLowerCase().includes(query.toLowerCase());
    const matchesBrand = !selectedBrand || asset.brand === selectedBrand;
    let matchesPrice = true;
    if (priceRange.min !== null || priceRange.max !== null) {
      const bestPrice = getAssetBestPrice(asset);
      if (bestPrice !== undefined) {
        if (priceRange.min !== null && bestPrice < priceRange.min) matchesPrice = false;
        if (priceRange.max !== null && bestPrice > priceRange.max) matchesPrice = false;
      } else {
        matchesPrice = priceRange.min === null && priceRange.max === null;
      }
    }
    return matchesSearch && matchesBrand && matchesPrice;
  });

  useEffect(() => {
    if (filteredAssets.length > 0) {
      const currentSelected = filteredAssets.find(a => a.id === selectedId);
      if (!currentSelected) setSelectedId(filteredAssets[0].id);
    } else if (filteredAssets.length === 0 && query.trim()) {
      setSelectedId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAssets.length, query]);

  useEffect(() => {
    if (query.trim()) {
      const timeoutId = setTimeout(() => {
        analytics.trackSearch(query, filteredAssets.length);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [query, filteredAssets.length]);

  const selectedAsset = filteredAssets.find((a) => a.id === selectedId) ?? filteredAssets[0];

  return (
    <ErrorBoundary>
      <>
        <ToastContainer toasts={toasts} onClose={removeToast} />
        <div className="min-h-screen md:h-screen md:overflow-hidden bg-brand-background text-brand-black flex flex-col">
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" id="aria-live-region">
            {assetsLoading ? "Loading assets..." : `${filteredAssets.length} assets displayed`}
          </div>

          <Header
            view={view}
            setView={handleViewChange}
            user={currentUser}
            isAnalyst={isAnalystAuthenticated}
            onSignInClick={() => setShowSignInModal(true)}
            onSignOutClick={async () => {
              if (auth && currentUser) {
                try {
                  setIsSigningOut(true);
                  if (watchlistIds.length > 0) {
                    const saveResult = await saveUserWatchlist(currentUser.uid, watchlistIds);
                    if (!saveResult) {
                      setIsSigningOut(false);
                      alert('Failed to save watchlist before signing out. Please try again.');
                      return;
                    }
                    await new Promise(resolve => setTimeout(resolve, 500));
                  }
                  await signOut(auth);
                  analytics.track("user_signed_out");
                } catch (error) {
                  setIsSigningOut(false);
                  console.error("Sign out error:", error);
                  alert('Error during sign-out: ' + (error instanceof Error ? error.message : 'Unknown error'));
                }
              } else if (auth) {
                await signOut(auth);
                analytics.track("user_signed_out");
              }
            }}
          />

          {view === "home" ? (
            <main id="main-content" className="flex-1 bg-brand-white pb-20 md:pb-0 w-full overflow-y-auto flex flex-col">
              {assetsError && !assetsLoading && (
                <div className={`px-2 md:px-3 py-2 border-b flex items-center justify-between gap-3 ${
                  assets.length > 0 ? "border-yellow-300 bg-yellow-50" : "border-red-300 bg-red-50"
                }`}>
                  <div className="flex items-center gap-2">
                    {assets.length > 0 ? (
                      <svg className="w-4 h-4 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <p className={`text-xs ${assets.length > 0 ? "text-yellow-800" : "text-red-800"}`}>
                      {assetsError}
                    </p>
                  </div>
                  <button
                    onClick={() => loadAssets(true)}
                    disabled={isRetrying}
                    className={`px-3 py-1 text-xs font-medium border whitespace-nowrap transition-colors ${
                      isRetrying
                        ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                        : assets.length > 0
                        ? "border-yellow-600 text-yellow-700 hover:bg-yellow-100 active:scale-95"
                        : "border-red-600 bg-red-600 text-white hover:bg-red-700 active:scale-95"
                    }`}
                    style={{ borderRadius: '0px' }}
                  >
                    {isRetrying ? "Retrying..." : "Refresh"}
                  </button>
                </div>
              )}

              <div className="flex-shrink-0">
                <MarketOverview
                  assets={assets}
                  onSelectAsset={(id) => setSelectedId(id)}
                  isRefreshing={isRefreshing}
                />
              </div>

              <div className="hidden md:flex flex-1 min-h-0">
                <div className="w-[340px] lg:w-[380px] xl:w-[460px] flex-shrink-0 border-r border-brand-gray/20 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto overscroll-y-contain custom-scrollbar p-2 space-y-2">
                    <SearchPanel
                      query={query}
                      setQuery={setQuery}
                      totalAssets={assets.length}
                      assets={assets}
                      selectedBrand={selectedBrand}
                      onBrandChange={setSelectedBrand}
                      priceRange={priceRange}
                      onPriceRangeChange={setPriceRange}
                    />
                    <ResultsPanel
                      assets={filteredAssets}
                      selectedId={selectedId}
                      isLoading={assetsLoading}
                      searchQuery={query}
                      watchlistIds={watchlistIds}
                      onToggleWatchlist={handleToggleWatchlist}
                      setSelectedId={(id) => {
                        setSelectedId(id);
                        const asset = filteredAssets.find(a => a.id === id);
                        if (asset) analytics.trackAssetView(asset.id, asset.name);
                      }}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-y-contain custom-scrollbar bg-brand-white">
                  {selectedAsset ? (
                    <AssetDetailPanel
                      asset={selectedAsset}
                      watchlisted={watchlistIds.includes(selectedAsset.id)}
                      isLoading={assetsLoading}
                      onToggleWatchlist={() => handleToggleWatchlist(selectedAsset.id)}
                      currentUser={currentUser}
                      portfolioPositions={portfolioPositions}
                    />
                  ) : (
                    <div className="flex items-center justify-center text-xs text-brand-black/70 p-4 min-h-[400px]">
                      Select an asset on the left to see full market data.
                    </div>
                  )}
                </div>
              </div>

              <div className="md:hidden flex flex-col gap-2">
                <SearchPanel
                  query={query}
                  setQuery={setQuery}
                  totalAssets={assets.length}
                  assets={assets}
                  selectedBrand={selectedBrand}
                  onBrandChange={setSelectedBrand}
                  priceRange={priceRange}
                  onPriceRangeChange={setPriceRange}
                />
                <ResultsPanel
                  assets={filteredAssets}
                  selectedId={selectedId}
                  isLoading={assetsLoading}
                  searchQuery={query}
                  watchlistIds={watchlistIds}
                  onToggleWatchlist={handleToggleWatchlist}
                  setSelectedId={(id) => {
                    setSelectedId(id);
                    setDetailOpen(true);
                    const asset = filteredAssets.find(a => a.id === id);
                    if (asset) analytics.trackAssetView(asset.id, asset.name);
                  }}
                />
              </div>
            </main>
          ) : view === "getting-started" ? (
            <Suspense fallback={<ViewLoadingFallback />}>
              <GettingStartedView assets={assets} />
            </Suspense>
          ) : view === "education" ? (
            <Suspense fallback={<ViewLoadingFallback />}>
              <EducationHub />
            </Suspense>
          ) : view === "drops" ? (
            <Suspense fallback={<ViewLoadingFallback />}>
              <DropsView currentUser={currentUser} />
            </Suspense>
          ) : view === "portfolio" ? (
            currentUser ? (
              <Suspense fallback={<ViewLoadingFallback />}>
                <PortfolioView
                  assets={assets}
                  currentUser={currentUser}
                  positions={portfolioPositions}
                  onPositionsChange={setPortfolioPositions}
                />
              </Suspense>
            ) : (
              <main className="flex-1 flex flex-col bg-brand-white px-2 py-2 md:px-3 md:py-3 pb-20 md:pb-4 w-full max-w-8xl mx-auto overflow-y-auto">
                <div className="mb-6">
                  <h1 className="text-2xl md:text-3xl font-heading font-normal text-brand-black mb-2">Portfolio</h1>
                  <p className="text-sm text-brand-black/60">Sign in to build and track your inventory portfolio using live market data.</p>
                </div>
                <div className="border border-brand-gray/30 p-8 text-center bg-brand-white">
                  <svg className="w-12 h-12 mx-auto text-brand-black/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p className="text-sm font-medium text-brand-black mb-1.5 leading-tight">Portfolio is available for signed-in users only</p>
                  <p className="text-xs text-brand-black/70 mb-4 leading-tight">Create an account or sign in to save your inventory, track value, and see portfolio-level insights.</p>
                  <button
                    onClick={() => setShowSignInModal(true)}
                    className="px-4 py-2 border border-brand-black bg-brand-black text-brand-white text-xs font-medium hover:bg-brand-black/90 transition leading-tight"
                    style={{ borderRadius: "0px" }}
                  >
                    Sign In to Access Portfolio
                  </button>
                </div>
              </main>
            )
          ) : view === "connections" ? (
            <Suspense fallback={<ViewLoadingFallback />}>
              <ConnectionsView currentUser={currentUser} onSignInClick={() => setShowSignInModal(true)} />
            </Suspense>
          ) : view === "analyst" && isAnalystAuthenticated ? (
            <Suspense fallback={<ViewLoadingFallback />}>
              <AnalystDashboard
                assets={assets}
                onAssetsChange={(newAssets) => {
                  setAssets(newAssets);
                  analytics.trackAnalystAction("assets_updated", { count: newAssets.length });
                }}
                onLogout={async () => {
                  if (auth) {
                    try { await signOut(auth); } catch (error) { console.error("Logout error:", error); }
                  }
                  localStorage.removeItem("analyst_authenticated");
                  localStorage.removeItem("analyst_email");
                  setIsAnalystAuthenticated(false);
                  analytics.track("analyst_logout");
                  setView("home");
                }}
              />
            </Suspense>
          ) : (
            <Suspense fallback={<ViewLoadingFallback />}>
              <WatchlistView
                assets={assets}
                watchlistIds={watchlistIds}
                onBrowseMarket={() => setView("home")}
                onRemoveFromWatchlist={(assetId) => {
                  if (!currentUser) return;
                  setWatchlistIds((prev) => {
                    const newWatchlist = prev.filter((id) => id !== assetId);
                    saveUserWatchlist(currentUser.uid, newWatchlist).catch((error) => {
                      console.error('Error saving watchlist:', error);
                      toast.error("Failed to save watchlist");
                    });
                    return newWatchlist;
                  });
                }}
                currentUser={currentUser}
                onSignInClick={() => setShowSignInModal(true)}
              />
            </Suspense>
          )}

          <MobileBottomNav view={view} setView={handleViewChange} isAnalyst={isAnalystAuthenticated} />
          <AssetDetailModal
            open={detailOpen}
            onClose={() => setDetailOpen(false)}
            asset={selectedAsset}
            watchlisted={selectedAsset ? watchlistIds.includes(selectedAsset.id) : false}
            onToggleWatchlist={() => {
              if (!selectedAsset) return;
              handleToggleWatchlist(selectedAsset.id);
            }}
            currentUser={currentUser}
            portfolioPositions={portfolioPositions}
          />
          {showLogin && (
            <Suspense fallback={<ViewLoadingFallback />}>
              <AnalystLogin
                onLogin={handleAnalystLogin}
                onClose={() => {
                  setShowLogin(false);
                  setPendingAnalystView(false);
                  if (view === "analyst") setView("home");
                }}
              />
            </Suspense>
          )}
          {showSignInModal && (
            <SignInModal
              onClose={() => setShowSignInModal(false)}
              onSignIn={(user) => {
                setShowSignInModal(false);
                analytics.track("user_signed_in_modal", {
                  method: user.providerData[0]?.providerId || "unknown"
                });
              }}
            />
          )}
        </div>
      </>
    </ErrorBoundary>
  );
};

export default AppShell;
