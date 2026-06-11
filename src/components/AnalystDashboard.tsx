import React, { useState, useEffect } from "react";
import { Asset, SizeVariant } from "../types";
import { DailyPriceUpdates } from "./DailyPriceUpdates";
import { DesignSettings } from "./DesignSettings";
import { AnalyticsView } from "./AnalyticsView";
import { DropsManagement } from "./DropsManagement";
import { ScrapedPricesReview } from "./ScrapedPricesReview";
import { WhatsAppImport } from "./WhatsAppImport";
import { createAsset, updateAsset, deleteAsset, batchCreateAssets } from "../utils/assetsApi";
import { convertUSDToINR, getUSDToINRRate } from "../utils/exchangeRate";
import { sortSizesByValue } from "../utils/sizeSort";
import { enrichAssetWithMetrics, backfillAllAssetMetrics } from "../utils/priceMetrics";

type DashboardTab = "assets" | "market-data" | "whatsapp-import" | "scraped-prices" | "drops" | "analytics" | "settings";

interface AnalystDashboardProps {
  assets: Asset[];
  onAssetsChange: (next: Asset[]) => void;
  onLogout?: () => void;
}

export const AnalystDashboard: React.FC<AnalystDashboardProps> = ({
  assets,
  onAssetsChange,
}) => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showNewAssetForm, setShowNewAssetForm] = useState(false);
  const [showBulkAddForm, setShowBulkAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("assets");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSaveAsset = async (asset: Asset) => {
    try {
      console.log("handleSaveAsset called with asset:", asset.id, "sizes:", asset.sizes?.length);
      
      // Enrich asset with calculated metrics before saving
      const enrichedAsset = enrichAssetWithMetrics(asset);
      console.log("Asset enriched with metrics:", {
        id: enrichedAsset.id,
        change30d: enrichedAsset.change30d,
        change90d: enrichedAsset.change90d,
        bestAvailablePrice: enrichedAsset.bestAvailablePrice,
      });
      
      if (isEditing && selectedAsset) {
        // Update existing asset via API
        const updatedAsset = await updateAsset(enrichedAsset);
        console.log("Asset updated, reloading from Firebase...");
        // Reload all assets to ensure we have the latest from Firebase
        const { fetchAllAssets } = await import("../utils/assetsApi");
        const allAssets = await fetchAllAssets();
        console.log("Reloaded assets, sizes for updated asset:", allAssets.find(a => a.id === updatedAsset.id)?.sizes?.length);
        onAssetsChange(allAssets);
        const refreshedAsset = allAssets.find(a => a.id === updatedAsset.id) || updatedAsset;
        setIsEditing(false);
        setSelectedAsset(refreshedAsset);
      } else {
        // Create new asset via API
        const { id, ...assetWithoutId } = enrichedAsset;
        const newAsset = await createAsset(assetWithoutId);
        // Reload all assets to ensure we have the latest from Firebase
        const { fetchAllAssets } = await import("../utils/assetsApi");
        const allAssets = await fetchAllAssets();
        onAssetsChange(allAssets);
        const refreshedAsset = allAssets.find(a => a.id === newAsset.id) || newAsset;
        setSelectedAsset(refreshedAsset);
      }
      setShowNewAssetForm(false);
    } catch (error) {
      console.error("Failed to save asset:", error);
      alert("Failed to save asset. Please try again.");
    }
  };

  const handleCloseModal = () => {
    setShowNewAssetForm(false);
    setIsEditing(false);
    if (!isEditing) {
      // Only clear selected asset if we were creating new, not editing
      setSelectedAsset(null);
    }
  };

  const handleDeleteAsset = async (id: number) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      try {
        await deleteAsset(id);
        // Update local state
        onAssetsChange(assets.filter((a) => a.id !== id));
        if (selectedAsset?.id === id) {
          setSelectedAsset(null);
          setIsEditing(false);
        }
      } catch (error) {
        console.error("Failed to delete asset:", error);
        alert("Failed to delete asset. Please try again.");
      }
    }
  };

  return (
    <main className="flex-1 min-h-0 bg-brand-background px-2 py-2 md:px-4 md:py-4 pb-20 md:pb-4 w-full max-w-8xl mx-auto overflow-y-auto">
      {/* Page Header */}
      <div className="mb-5">
        <h1 className="text-2xl md:text-3xl font-heading font-normal text-brand-black mb-1">
          Admin Dashboard
        </h1>
        <p className="text-sm text-brand-black/60">
          Portfolio management • Market data capture • Price intelligence
        </p>
      </div>

      {/* Tab Navigation — pill-style matching the main app */}
      <div className="flex flex-wrap gap-2 mb-5">
        {([
          { key: "assets", label: "Assets" },
          { key: "market-data", label: "Market Data" },
          { key: "whatsapp-import", label: "WhatsApp Import" },
          { key: "scraped-prices", label: "Scraped Prices" },
          { key: "drops", label: "Drops" },
          { key: "analytics", label: "Analytics" },
          { key: "settings", label: "Settings" },
        ] as { key: DashboardTab; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-brand-black text-white"
                : "bg-white text-brand-black border border-brand-gray/30 hover:border-brand-black"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="bg-white border border-brand-gray/20 shadow-sm p-4 md:p-5">
        {activeTab === "market-data" ? (
          <DailyPriceUpdates
            assets={assets}
            onUpdateAsset={async (updatedAsset) => {
              try {
                console.log("onUpdateAsset called with:", updatedAsset.id, updatedAsset.name);
                console.log("Updated sizes:", updatedAsset.sizes);
                
                // Enrich asset with calculated metrics (change30d, change90d, bestAvailablePrice, etc.)
                const enrichedAsset = enrichAssetWithMetrics(updatedAsset);
                console.log("Asset enriched with metrics:", {
                  id: enrichedAsset.id,
                  change30d: enrichedAsset.change30d,
                  change90d: enrichedAsset.change90d,
                  bestAvailablePrice: enrichedAsset.bestAvailablePrice,
                });
                
                // Save to Firebase
                const savedAsset = await updateAsset(enrichedAsset);
                console.log("Asset saved to Firebase:", savedAsset.id);
                console.log("Saved sizes:", savedAsset.sizes);
                
                // Update local state with the saved asset (ensures we have the latest from Firebase)
                const updatedAssets = assets.map((a) => 
                  a.id === savedAsset.id ? savedAsset : a
                );
                onAssetsChange(updatedAssets);
                console.log("Local state updated. Total assets:", updatedAssets.length);
              } catch (error) {
                console.error("Failed to update asset:", error);
                alert(`Failed to update asset: ${error instanceof Error ? error.message : String(error)}. Please check the console for details.`);
              }
            }}
          />
        ) : activeTab === "whatsapp-import" ? (
          <WhatsAppImport
            assets={assets}
            onUpdateAsset={async (updatedAsset) => {
              try {
                const enrichedAsset = enrichAssetWithMetrics(updatedAsset);
                const savedAsset = await updateAsset(enrichedAsset);
                const updatedAssets = assets.map((a) =>
                  a.id === savedAsset.id ? savedAsset : a
                );
                onAssetsChange(updatedAssets);
              } catch (error) {
                console.error("Failed to update asset from WhatsApp import:", error);
                alert(`Failed to save: ${error instanceof Error ? error.message : String(error)}`);
              }
            }}
          />
        ) : activeTab === "scraped-prices" ? (
          <ScrapedPricesReview />
        ) : activeTab === "assets" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Asset List */}
            <div className="lg:col-span-1">
              <div className="border border-brand-gray/20 bg-white shadow-sm p-4">
              <div className="mb-4 pb-3 border-b border-brand-gray/20">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-brand-black mb-1">
                      Instrument Universe
                    </h2>
                    <p className="text-xs text-brand-black/50 font-mono-numeric">
                      {assets.length} {assets.length === 1 ? 'instrument' : 'instruments'} tracked
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowBulkAddForm(true);
                      }}
                      className="px-3 py-1.5 border border-brand-gray/30 bg-white text-brand-black text-xs font-semibold hover:border-brand-black transition-all flex-shrink-0"
                    >
                      Bulk
                    </button>
                    <button
                      onClick={() => {
                        setShowNewAssetForm(true);
                        setIsEditing(false);
                        setSelectedAsset(null);
                      }}
                      className="px-3 py-1.5 bg-brand-black text-white text-xs font-semibold hover:bg-brand-black/90 transition-all flex-shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                </div>
                {/* Search Bar */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, SKU, or brand..."
                  className="w-full border border-brand-gray/20 px-3 py-2 text-sm text-brand-black focus:outline-none focus:border-brand-black bg-brand-background"
                />
              </div>
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto custom-scrollbar">
                {(() => {
                  const filteredAssets = searchQuery.trim()
                    ? assets.filter(asset => {
                        const query = searchQuery.toLowerCase();
                        return (
                          asset.name.toLowerCase().includes(query) ||
                          asset.sku.toLowerCase().includes(query) ||
                          asset.brand.toLowerCase().includes(query) ||
                          asset.category.toLowerCase().includes(query)
                        );
                      })
                    : assets;

                  if (filteredAssets.length === 0) {
                    return (
                      <div className="text-center py-8 text-sm text-brand-black/50">
                        {searchQuery.trim() ? 'No instruments found matching your search' : 'No instruments'}
                      </div>
                    );
                  }

                  return filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className={`border p-3 cursor-pointer transition-all ${
                      selectedAsset?.id === asset.id
                        ? "border-brand-black bg-brand-black text-white shadow-sm"
                        : "border-brand-gray/20 hover:border-brand-gray/40 hover:shadow-soft bg-white"
                    }`}
                    onClick={() => {
                      setSelectedAsset(asset);
                      setIsEditing(false);
                      setShowNewAssetForm(false);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold mb-0.5 truncate ${
                          selectedAsset?.id === asset.id ? "text-white" : "text-brand-black"
                        }`}>
                          {asset.name}
                        </p>
                        <p className={`text-xs ${
                          selectedAsset?.id === asset.id ? "text-white/70" : "text-brand-black/50"
                        }`}>
                          {asset.sku}
                        </p>
                      </div>
                      <div className="flex gap-1.5 ml-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAsset(asset);
                            setIsEditing(true);
                            setShowNewAssetForm(true);
                          }}
                          className={`text-xs px-2 py-1 border transition-all ${
                            selectedAsset?.id === asset.id
                              ? "border-white/30 text-white hover:bg-white/10"
                              : "border-brand-gray/30 text-brand-black hover:border-brand-black"
                          }`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAsset(asset.id);
                          }}
                          className="text-xs px-2 py-1 border border-red-200 text-red-600 hover:border-red-500 hover:bg-red-50 transition-all"
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  </div>
                  ));
                })()}
              </div>
              </div>
            </div>

            {/* Asset Details View */}
            <div className="lg:col-span-2">
              {selectedAsset ? (
                <AssetDetailsView asset={selectedAsset} />
              ) : (
                <div className="border border-brand-gray/20 p-8 bg-white text-center shadow-sm">
                  <p className="text-sm font-medium text-brand-black/60 mb-1">
                    No Instrument Selected
                  </p>
                  <p className="text-xs text-brand-black/40">
                    Select an instrument from the list or create a new one
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "drops" ? (
          <DropsManagement />
        ) : activeTab === "analytics" ? (
          <AnalyticsView />
        ) : (
          <div className="space-y-6">
            {/* Data Maintenance Section */}
            <div className="border border-brand-gray/20 bg-white shadow-sm p-5">
              <h3 className="text-sm font-semibold text-brand-black mb-3">
                Data Maintenance
              </h3>
              <p className="text-sm text-brand-black/60 mb-4">
                Calculate and populate market metrics (price changes, best available prices) for all assets.
                This is useful after bulk updates or when onboarding historical data.
              </p>
              <BackfillMetricsButton assets={assets} onAssetsChange={onAssetsChange} />
            </div>

            {/* Design Settings */}
            <DesignSettings />
          </div>
        )}
      </div>

      {/* Asset Form Modal */}
      {(showNewAssetForm || (isEditing && selectedAsset)) && (
        <AssetFormModal
          asset={isEditing ? selectedAsset : null}
          assets={assets}
          onSave={handleSaveAsset}
          onClose={handleCloseModal}
        />
      )}

      {/* Bulk Add Modal */}
      {showBulkAddForm && (
        <BulkAddModal
          existingAssets={assets}
          onSave={async (newAssets, onProgress) => {
            try {
                const { fetchAllAssets } = await import("../utils/assetsApi");
                
                // Remove IDs (they'll be generated)
                const assetsWithoutIds = newAssets.map(({ id, ...asset }) => asset);
                
                // Batch create assets with progress callback
                const createdAssets = await batchCreateAssets(
                  assetsWithoutIds,
                  onProgress
                );
                
                // Reload all assets
                const allAssets = await fetchAllAssets();
                onAssetsChange(allAssets);
                setShowBulkAddForm(false);
                alert(`Successfully created ${createdAssets.length} asset(s)`);
              } catch (error) {
                console.error("Failed to bulk create assets:", error);
                alert("Failed to create some assets. Please check the console for details.");
              }
          }}
          onClose={() => setShowBulkAddForm(false)}
        />
      )}
    </main>
  );
};

// Asset Form Modal Component
interface AssetFormModalProps {
  asset: Asset | null;
  assets: Asset[];
  onSave: (asset: Asset) => void;
  onClose: () => void;
}

const AssetFormModal: React.FC<AssetFormModalProps> = ({ asset, assets, onSave, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start md:items-center justify-center overflow-y-auto p-4">
      <div className="relative w-full md:max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-brand-gray/20 shadow-modal">
        <div className="sticky top-0 z-10 flex justify-between items-center px-5 py-3.5 bg-white border-b border-brand-gray/20">
          <h2 className="text-lg font-heading font-normal text-brand-black">
            {asset ? "Edit Instrument" : "New Instrument"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-brand-black/60 hover:text-brand-black hover:bg-brand-gray/10 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-5 md:p-6">
          <AssetForm
            asset={asset}
            assets={assets}
            onSave={onSave}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
};

// Asset Form Component
interface AssetFormProps {
  asset: Asset | null;
  assets: Asset[];
  onSave: (asset: Asset) => void;
  onCancel: () => void;
}

const AssetForm: React.FC<AssetFormProps> = ({ asset, assets, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Asset>>(
    asset || {
      name: "",
      sku: "",
      brand: "",
      category: "Sneakers",
      image: "",
      sizes: [],
      defaultSize: "",
    }
  );

  // Check for duplicates
  const checkDuplicates = () => {
    if (!formData.name && !formData.sku) return null;
    
    const duplicates = assets.filter(existingAsset => {
      // Skip the current asset if editing
      if (asset && existingAsset.id === asset.id) return false;
      
      const nameMatch = formData.name && existingAsset.name.toLowerCase() === formData.name.toLowerCase();
      const skuMatch = formData.sku && existingAsset.sku.toLowerCase() === formData.sku.toLowerCase();
      
      return nameMatch || skuMatch;
    });
    
    return duplicates.length > 0 ? duplicates : null;
  };

  const duplicateAssets = checkDuplicates();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if the event came from the size variant form - if so, don't submit the parent form
    const target = e.target as HTMLElement;
    if (target.closest('.size-variant-form-container')) {
      return;
    }
    
    if (!formData.name || !formData.sku || !formData.brand) {
      alert("Please fill in required fields: Name, SKU, and Brand");
      return;
    }
    
    // Check for duplicates before submitting
    const duplicates = checkDuplicates();
    if (duplicates && duplicates.length > 0) {
      const duplicateNames = duplicates.map(d => `"${d.name}" (SKU: ${d.sku})`).join(', ');
      const proceed = confirm(
        `Warning: This instrument may be a duplicate!\n\n` +
        `Found existing instrument(s) with matching name or SKU:\n${duplicateNames}\n\n` +
        `Do you want to proceed anyway?`
      );
      if (!proceed) return;
    }
    
    // Require at least one size variant since market data is size-dependent
    if (!formData.sizes || formData.sizes.length === 0) {
      alert("Please add at least one size variant. Market data is size-dependent.");
      return;
    }
    
    // Ensure all sizes have pricePoints initialized with new channel-based structure
    const sizesWithPricePoints = (formData.sizes || []).map(size => ({
      ...size,
      pricePoints: size.pricePoints || {
        whatsapp: [],
        marketplace: [],
        international: [],
      },
    }));
    
    const assetToSave: Asset = {
      ...formData,
      sizes: sizesWithPricePoints,
    } as Asset;
    
    console.log("AssetForm handleSubmit - Saving asset with", assetToSave.sizes?.length, "sizes");
    console.log("Sizes details:", assetToSave.sizes);
    onSave(assetToSave);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="border-b border-brand-gray/20 pb-2">
            <h3 className="text-sm font-semibold text-brand-black mb-1">
              Basic Information
            </h3>
            <p className="text-xs text-brand-black/50">
              Core asset details and metadata
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-brand-black mb-1.5">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full border px-3 py-2.5 text-sm text-brand-black focus:outline-none ${
                  duplicateAssets && duplicateAssets.some(d => d.name.toLowerCase() === formData.name?.toLowerCase())
                    ? "border-red-400 focus:border-red-500"
                    : "border-brand-gray/30 focus:border-brand-black"
                }`}
                required
              />
              {duplicateAssets && duplicateAssets.some(d => d.name.toLowerCase() === formData.name?.toLowerCase()) && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <span>⚠</span> Duplicate name found
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-black mb-1.5">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.sku || ""}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className={`w-full border px-3 py-2.5 text-sm text-brand-black focus:outline-none ${
                  duplicateAssets && duplicateAssets.some(d => d.sku.toLowerCase() === formData.sku?.toLowerCase())
                    ? "border-red-400 focus:border-red-500"
                    : "border-brand-gray/30 focus:border-brand-black"
                }`}
                required
              />
              {duplicateAssets && duplicateAssets.some(d => d.sku.toLowerCase() === formData.sku?.toLowerCase()) && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <span>⚠</span> Duplicate SKU found
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-black mb-1.5">
                Brand <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.brand || ""}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full border border-brand-gray/30 px-3 py-2.5 text-sm text-brand-black focus:outline-none focus:border-brand-black"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-black mb-1.5">
                Category
              </label>
              <select
                value={formData.category || "Sneakers"}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full border border-brand-gray/30 px-3 py-2.5 text-sm text-brand-black focus:outline-none focus:border-brand-black"
              >
                <option value="Sneakers">Sneakers</option>
                <option value="Watches">Watches</option>
                <option value="Bags">Bags</option>
                <option value="Collectibles">Collectibles</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-brand-black mb-1.5">
                Image URL
              </label>
              <input
                type="url"
                value={formData.image || ""}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="w-full border border-brand-gray/30 px-3 py-2.5 text-sm text-brand-black focus:outline-none focus:border-brand-black"
                placeholder="https://..."
              />
            </div>
          </div>
          
          {/* Duplicate Warning Banner */}
          {duplicateAssets && duplicateAssets.length > 0 && (
            <div className="border border-yellow-300 bg-yellow-50 p-3">
              <div className="flex items-start gap-2">
                <span className="text-yellow-600 text-sm mt-0.5">⚠</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-yellow-800 mb-0.5">Potential Duplicate Detected</p>
                  <p className="text-xs text-yellow-700">
                    Found {duplicateAssets.length} existing instrument{duplicateAssets.length !== 1 ? 's' : ''} with matching name or SKU:
                  </p>
                  <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside">
                    {duplicateAssets.map(dup => (
                      <li key={dup.id}>{dup.name} (SKU: {dup.sku})</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Retail Prices (Anchors) */}
        <PriceAnchorsForm
          priceAnchors={formData.priceAnchors}
          onChange={(anchors) => setFormData({ ...formData, priceAnchors: anchors })}
        />

        {/* Size Variants - Main pricing structure */}
        <SizeVariantsManager
          sizes={formData.sizes || []}
          defaultSize={formData.defaultSize}
          onChange={(sizes, defaultSize) => {
            console.log("AssetForm - SizeVariantsManager onChange called with sizes:", sizes);
            console.log("AssetForm - Current formData.sizes before update:", formData.sizes);
            setFormData((prev) => {
              const updated = { ...prev, sizes, defaultSize };
              console.log("AssetForm - Updated formData with sizes:", updated.sizes);
              return updated;
            });
          }}
        />

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-brand-gray/20">
          <button
            type="submit"
            className="px-5 py-2.5 bg-brand-black text-white text-sm font-semibold hover:bg-brand-black/90 transition"
          >
            {asset ? "Update" : "Create"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 border border-brand-gray/30 text-brand-black text-sm font-semibold hover:bg-brand-gray/10 transition"
          >
            Cancel
          </button>
        </div>
      </form>
  );
};

// Price Anchors Form
interface PriceAnchorsFormProps {
  priceAnchors?: Asset["priceAnchors"];
  onChange: (anchors: Asset["priceAnchors"]) => void;
}

const PriceAnchorsForm: React.FC<PriceAnchorsFormProps> = ({ priceAnchors, onChange }) => {
  const [anchors, setAnchors] = useState(priceAnchors || {});
  const [retailGlobalUSD, setRetailGlobalUSD] = useState<string>("");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  // Load exchange rate on mount and convert existing retailGlobal (INR) to USD for display
  useEffect(() => {
    const loadExchangeRate = async () => {
      setIsLoadingRate(true);
      try {
        const rate = await getUSDToINRRate();
        setExchangeRate(rate);
        
        // Convert existing retailGlobal (stored in INR) to USD for display
        if (anchors.retailGlobal) {
          const usdValue = anchors.retailGlobal / rate;
          setRetailGlobalUSD(usdValue.toFixed(2));
        }
      } catch (error) {
        console.error("Failed to load exchange rate:", error);
      } finally {
        setIsLoadingRate(false);
      }
    };
    
    loadExchangeRate();
  }, []);

  // Update retail India (stored in INR)
  const updateRetailIndia = (value: number) => {
    const newAnchors = { ...anchors, retailIndia: value };
    setAnchors(newAnchors);
    onChange(newAnchors);
  };

  // Update retail Global (input in USD, convert to INR for storage)
  const updateRetailGlobal = async (usdValue: string) => {
    setRetailGlobalUSD(usdValue);
    
    if (!usdValue || usdValue.trim() === "") {
      const newAnchors = { ...anchors };
      delete newAnchors.retailGlobal;
      setAnchors(newAnchors);
      onChange(newAnchors);
      return;
    }

    const usd = parseFloat(usdValue);
    if (isNaN(usd) || usd <= 0) {
      return;
    }

    try {
      // Convert USD to INR
      const inrValue = await convertUSDToINR(usd);
      const newAnchors = { ...anchors, retailGlobal: inrValue };
      setAnchors(newAnchors);
      onChange(newAnchors);
    } catch (error) {
      console.error("Failed to convert USD to INR:", error);
      // Fallback: use approximate rate if conversion fails
      const fallbackRate = exchangeRate || 83;
      const inrValue = usd * fallbackRate;
      const newAnchors = { ...anchors, retailGlobal: inrValue };
      setAnchors(newAnchors);
      onChange(newAnchors);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-brand-gray/20 pb-2">
        <h3 className="text-sm font-semibold text-brand-black mb-1">
          Retail Prices
        </h3>
        <p className="text-xs text-brand-black/50">
          Original launch prices. Used to calculate spread percentage (current price vs retail).
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-brand-black mb-1.5">
            Retail (India) ₹
          </label>
          <input
            type="number"
            value={anchors.retailIndia || ""}
            onChange={(e) => updateRetailIndia(parseFloat(e.target.value) || 0)}
            className="w-full border border-brand-gray/30 px-3 py-2.5 text-sm font-mono-numeric text-brand-black focus:outline-none focus:border-brand-black"
            placeholder="e.g., 12,999"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-black mb-1.5">
            Retail (Global) $
            {exchangeRate && (
              <span className="text-xs text-brand-black/40 font-normal ml-1">
                (≈₹{exchangeRate.toFixed(2)}/USD)
              </span>
            )}
          </label>
          <input
            type="number"
            value={retailGlobalUSD}
            onChange={(e) => updateRetailGlobal(e.target.value)}
            className="w-full border border-brand-gray/30 px-3 py-2.5 text-sm font-mono-numeric text-brand-black focus:outline-none focus:border-brand-black"
            placeholder="e.g., 150"
            disabled={isLoadingRate}
          />
          {retailGlobalUSD && !isNaN(parseFloat(retailGlobalUSD)) && exchangeRate && (
            <p className="text-xs text-brand-black/40 mt-1">
              ≈ ₹{(parseFloat(retailGlobalUSD) * exchangeRate).toLocaleString('en-IN', { maximumFractionDigits: 0 })} INR
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Size Variants Manager
interface SizeVariantsManagerProps {
  sizes: SizeVariant[];
  defaultSize?: string;
  onChange: (sizes: SizeVariant[], defaultSize?: string) => void;
}

const SizeVariantsManager: React.FC<SizeVariantsManagerProps> = ({ sizes, defaultSize, onChange }) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [quickAddInput, setQuickAddInput] = useState("");

  const handleQuickAddSubmit = () => {
    if (!quickAddInput.trim()) {
      return;
    }

    // Parse sizes from input - support comma-separated or newline-separated
    const sizeStrings = quickAddInput
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Create size variants for each unique size
    const existingSizes = new Set(sizes.map(s => s.size));
    const newSizeVariants: SizeVariant[] = sizeStrings
      .filter(size => !existingSizes.has(size))
      .map(size => ({
        size,
        b2bMarketPrice: "",
        endCustomerMarketPrice: "",
        stockxGoatPrice: "",
        fairRange: "",
        confidence: 0,
        change30d: "",
        change90d: "",
        liquidity: "",
        volumeLabel: "",
        pricePoints: {
          whatsapp: [],
          marketplace: [],
          international: [],
        },
      }));

    if (newSizeVariants.length > 0) {
      const updatedSizes = [...sizes, ...newSizeVariants];
      onChange(updatedSizes, defaultSize || newSizeVariants[0].size);
    }

    setQuickAddInput("");
  };

  const handleSaveSize = (sizeVariant: SizeVariant) => {
    console.log("SizeVariantsManager - handleSaveSize called with:", sizeVariant);
    const newSizes = editingIndex !== null
      ? sizes.map((s, i) => i === editingIndex ? sizeVariant : s)
      : [...sizes, sizeVariant];
    console.log("SizeVariantsManager - New sizes array:", newSizes);
    onChange(newSizes, defaultSize);
    setShowForm(false);
    setEditingIndex(null);
  };

  const handleDeleteSize = (index: number) => {
    const newSizes = sizes.filter((_, i) => i !== index);
    onChange(newSizes, defaultSize);
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-brand-gray/20 pb-2">
        <h3 className="text-sm font-semibold text-brand-black mb-1">
          Size Variants <span className="font-mono-numeric text-brand-black/50">({sizes.length})</span> <span className="text-red-500 font-normal">*</span>
        </h3>
        <p className="text-xs text-brand-black/50">
          Define size-specific pricing ranges for each market channel. At least one size is required.
        </p>
      </div>

      <div className="border border-brand-gray/20 p-4 bg-brand-background">
        <div className="mb-3">
          <label className="block text-xs font-medium text-brand-black mb-1.5">
            Add Sizes <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-brand-black/50 mb-2">
            Enter sizes separated by commas or new lines. You can edit individual sizes later.
          </p>
          <textarea
            value={quickAddInput}
            onChange={(e) => setQuickAddInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleQuickAddSubmit();
              }
            }}
            className="w-full border border-brand-gray/30 px-3 py-2.5 text-sm text-brand-black focus:outline-none focus:border-brand-black resize-none bg-white"
            placeholder="UK 7, UK 8, UK 9, UK 10"
            rows={2}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleQuickAddSubmit}
            className="px-4 py-2 bg-brand-black text-white text-sm font-semibold hover:bg-brand-black/90 transition"
          >
            Add Sizes
          </button>
          <button
            type="button"
            onClick={() => setQuickAddInput("")}
            className="px-4 py-2 border border-brand-gray/30 text-brand-black text-sm font-semibold hover:bg-brand-gray/10 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {showForm && (
        <SizeVariantForm
          sizeVariant={editingIndex !== null ? sizes[editingIndex] : null}
          onSave={handleSaveSize}
          onCancel={() => {
            setShowForm(false);
            setEditingIndex(null);
          }}
        />
      )}

      <div className="space-y-2">
        {sortSizesByValue(sizes).map((size) => {
          const originalIndex = sizes.findIndex(s => s.size === size.size);
          return (
          <div
            key={size.size}
            className="border border-brand-gray/20 p-3 bg-white shadow-soft"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-brand-black">{size.size}</span>
                  {size.size === defaultSize && (
                    <span className="text-xs px-2 py-0.5 bg-brand-gray/15 text-brand-black/70">Default</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs text-brand-black">
                  <div>
                    <span className="text-brand-black/50">WhatsApp:</span> {size.b2bMarketPrice || "—"}
                    {(() => {
                      const pricePoints = size.pricePoints || size.legacyPricePoints;
                      const count = pricePoints ? ('whatsapp' in pricePoints ? pricePoints.whatsapp?.length : pricePoints.b2b?.length) || 0 : 0;
                      return count > 0 ? <span className="text-brand-black/40 ml-1 font-mono-numeric">({count})</span> : null;
                    })()}
                  </div>
                  <div>
                    <span className="text-brand-black/50">Marketplace:</span> {size.endCustomerMarketPrice || "—"}
                    {(() => {
                      const pricePoints = size.pricePoints || size.legacyPricePoints;
                      const count = pricePoints ? ('marketplace' in pricePoints ? pricePoints.marketplace?.length : pricePoints.endCustomer?.length) || 0 : 0;
                      return count > 0 ? <span className="text-brand-black/40 ml-1 font-mono-numeric">({count})</span> : null;
                    })()}
                  </div>
                  <div>
                    <span className="text-brand-black/50">International:</span> {size.stockxGoatPrice || "—"}
                    {(() => {
                      const pricePoints = size.pricePoints || size.legacyPricePoints;
                      const count = pricePoints ? ('international' in pricePoints ? pricePoints.international?.length : pricePoints.stockxGoat?.length) || 0 : 0;
                      return count > 0 ? <span className="text-brand-black/40 ml-1 font-mono-numeric">({count})</span> : null;
                    })()}
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 ml-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingIndex(originalIndex);
                    setShowForm(true);
                  }}
                  className="text-xs px-2.5 py-1 border border-brand-gray/30 hover:border-brand-black text-brand-black transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSize(originalIndex)}
                  className="text-xs px-2.5 py-1 border border-red-200 hover:border-red-500 hover:bg-red-50 text-red-600 transition"
                >
                  Del
                </button>
              </div>
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
};

// Size Variant Form
interface SizeVariantFormProps {
  sizeVariant: SizeVariant | null;
  onSave: (sizeVariant: SizeVariant) => void;
  onCancel: () => void;
}

const SizeVariantForm: React.FC<SizeVariantFormProps> = ({ sizeVariant, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<SizeVariant>>(
    sizeVariant || {
      size: "",
      b2bMarketPrice: "",
      endCustomerMarketPrice: "",
      stockxGoatPrice: "",
      volumeLabel: "",
      pricePoints: {
        whatsapp: [],
        marketplace: [],
        international: [],
      },
    }
  );

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!formData.size) {
      alert("Size is required");
      return;
    }
    // Ensure pricePoints is initialized
    const sizeVariantToSave: SizeVariant = {
      ...formData,
      size: formData.size!,
      b2bMarketPrice: formData.b2bMarketPrice || "",
      endCustomerMarketPrice: formData.endCustomerMarketPrice || "",
      stockxGoatPrice: formData.stockxGoatPrice || "",
      volumeLabel: formData.volumeLabel || "",
      pricePoints: formData.pricePoints || {
        whatsapp: [],
        marketplace: [],
        international: [],
      },
    } as SizeVariant;
    console.log("SizeVariantForm - Saving size variant:", sizeVariantToSave);
    onSave(sizeVariantToSave);
  };

  return (
    <div className="border border-brand-gray/20 p-4 bg-white shadow-sm size-variant-form-container" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <div className="mb-4 pb-2 border-b border-brand-gray/20">
        <h4 className="text-sm font-semibold text-brand-black mb-1">
          {sizeVariant ? "Edit Size Variant" : "New Size Variant"}
        </h4>
        <p className="text-xs text-brand-black/50">
          Define size structure and liquidity. Pricing data and metrics are calculated dynamically.
        </p>
      </div>
      
      <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
        <div>
          <label className="block text-xs font-medium text-brand-black mb-1.5">
            Size <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.size || ""}
            onChange={(e) => {
              e.stopPropagation();
              setFormData({ ...formData, size: e.target.value });
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className="w-full border border-brand-gray/30 px-3 py-2.5 text-sm text-brand-black focus:outline-none focus:border-brand-black"
            placeholder="e.g., UK 9"
            required
            autoFocus
          />
          <p className="text-xs text-brand-black/40 mt-1.5">
            Liquidity and other metrics will be calculated automatically from market data.
          </p>
        </div>

        <div className="flex gap-3 pt-3 border-t border-brand-gray/20">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit();
            }}
            className="px-4 py-2 bg-brand-black text-white text-sm font-semibold hover:bg-brand-black/90 transition"
          >
            Save Size
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-brand-gray/30 text-brand-black text-sm font-semibold hover:bg-brand-gray/10 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Asset Details View (Read-only)
interface AssetDetailsViewProps {
  asset: Asset;
}

const AssetDetailsView: React.FC<AssetDetailsViewProps> = ({ asset }) => {
  const lastUpdated = asset.lastUpdated 
    ? new Date(asset.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Never';

  return (
    <div className="border border-brand-gray/20 bg-white shadow-sm p-5">
      <div className="mb-4 pb-3 border-b border-brand-gray/20">
        <h2 className="text-base font-semibold text-brand-black mb-1">
          {asset.name}
        </h2>
        <div className="flex items-center gap-2 text-xs text-brand-black/50">
          <span className="font-medium">{asset.sku}</span>
          <span>•</span>
          <span>{asset.brand}</span>
          <span>•</span>
          <span>{asset.category}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-brand-background p-3">
          <p className="text-xs text-brand-black/50 mb-1">Size Variants</p>
          <p className="text-lg font-mono-numeric font-semibold text-brand-black">{asset.sizes?.length || 0}</p>
        </div>
        <div className="bg-brand-background p-3">
          <p className="text-xs text-brand-black/50 mb-1">Last Updated</p>
          <p className="text-sm font-mono-numeric font-medium text-brand-black">{lastUpdated}</p>
        </div>
        {asset.volatility && (
          <div className="bg-brand-background p-3">
            <p className="text-xs text-brand-black/50 mb-1">Volatility</p>
            <p className="text-sm font-medium text-brand-black capitalize">{asset.volatility}</p>
          </div>
        )}
        {asset.priceAnchors?.retailIndia && (
          <div className="bg-brand-background p-3">
            <p className="text-xs text-brand-black/50 mb-1">Retail (IN)</p>
            <p className="text-sm font-mono-numeric font-semibold text-brand-black">₹{asset.priceAnchors.retailIndia.toLocaleString('en-IN')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Bulk Add Modal Component
interface BulkAddModalProps {
  existingAssets: Asset[];
  onSave: (assets: Asset[], onProgress?: (created: number, total: number) => void) => Promise<void>;
  onClose: () => void;
}

const BulkAddModal: React.FC<BulkAddModalProps> = ({ existingAssets, onSave, onClose }) => {
  const [bulkInput, setBulkInput] = useState("");
  const [parsedAssets, setParsedAssets] = useState<Partial<Asset>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [duplicateWarnings, setDuplicateWarnings] = useState<Map<number, Asset[]>>(new Map());
  const [fileName, setFileName] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState({ created: 0, total: 0 });

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current.trim());
    return result;
  };

  const parseBulkInput = (inputText?: string) => {
    const textToParse = inputText || bulkInput;
    const lines = textToParse.split('\n').filter(line => line.trim().length > 0);
    const assets: Partial<Asset>[] = [];
    const parseErrors: string[] = [];

    // Check if first line is a header (skip it if it looks like headers)
    let startIndex = 0;
    if (lines.length > 0) {
      const firstLine = lines[0].toLowerCase();
      if (firstLine.includes('name') && (firstLine.includes('sku') || firstLine.includes('brand'))) {
        startIndex = 1; // Skip header row
      }
    }

    lines.slice(startIndex).forEach((line, index) => {
      const lineNum = index + startIndex + 1;
      const trimmed = line.trim();
      
      if (!trimmed) return;
      
      // Parse CSV line (handles quoted fields with commas)
      const parts = parseCSVLine(trimmed);
      
      if (parts.length < 3) {
        parseErrors.push(`Line ${lineNum}: Insufficient data. Need at least Name, SKU, and Brand.`);
        return;
      }

      const name = parts[0] || "";
      const sku = parts[1] || "";
      const brand = parts[2] || "";
      const category = (parts[3] || "Sneakers").trim();
      const image = (parts[4] || "").trim();
      
      // Parse retail prices (optional) - dynamically detect retail prices after image field
      // Scan forward from index 5 to find numeric values that could be retail prices
      // Retail prices are numbers that don't start with letters (to distinguish from sizes like "UK 7")
      let retailIndia: number | undefined = undefined;
      let retailGlobal: number | undefined = undefined;
      let sizeStartIndex = 5; // Default: sizes start after image
      
      // Helper function to check if a value looks like a number (retail price) vs a size
      const isRetailPrice = (value: string): boolean => {
        if (!value || !value.trim()) return false;
        const trimmed = value.trim();
        // If it starts with a letter, it's likely a size (e.g., "UK 7", "US 9")
        if (/^[A-Za-z]/.test(trimmed)) return false;
        // Try to parse as number
        const num = parseFloat(trimmed.replace(/,/g, ''));
        return !isNaN(num) && isFinite(num);
      };
      
      // Scan from index 5 onwards to find retail prices
      // Look for 1-2 consecutive numeric values that could be retail prices
      let currentIndex = 5;
      
      // Skip empty fields after image
      while (currentIndex < parts.length && !parts[currentIndex]?.trim()) {
        currentIndex++;
      }
      
      // Check if current field could be retail India
      if (currentIndex < parts.length) {
        const candidate1 = (parts[currentIndex] || "").trim();
        if (isRetailPrice(candidate1)) {
          retailIndia = parseFloat(candidate1.replace(/,/g, ''));
          sizeStartIndex = currentIndex + 1;
          
          // Skip empty fields
          while (sizeStartIndex < parts.length && !parts[sizeStartIndex]?.trim()) {
            sizeStartIndex++;
          }
          
          // Check if next field could be retail Global (in USD, will convert to INR)
          if (sizeStartIndex < parts.length) {
            const candidate2 = (parts[sizeStartIndex] || "").trim();
            if (isRetailPrice(candidate2)) {
              const usdValue = parseFloat(candidate2.replace(/,/g, ''));
              // Convert USD to INR asynchronously - we'll handle this in the asset creation
              // For now, store a flag that this needs conversion
              retailGlobal = usdValue; // Will be converted to INR below
              sizeStartIndex = sizeStartIndex + 1;
            }
          }
        }
      }
      
      // Handle sizes: collect all parts from sizeStartIndex onwards
      // This handles both cases:
      // 1. "UK 9, UK 10, UK 11" in one column
      // 2. UK 9, UK 10, UK 11 as separate columns
      const sizeParts = parts.slice(sizeStartIndex).filter(p => p.trim().length > 0);
      
      if (!name || !sku || !brand) {
        parseErrors.push(`Line ${lineNum}: Missing required fields (Name, SKU, or Brand).`);
        return;
      }

      // Parse sizes: split each part by comma/semicolon, then combine all
      const sizeValues: string[] = [];
      sizeParts.forEach(part => {
        const splitSizes = part.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0);
        sizeValues.push(...splitSizes);
      });
      
      // Remove duplicates and create size objects
      const uniqueSizes = Array.from(new Set(sizeValues));
      const sizes = uniqueSizes.map(size => ({
        size,
        b2bMarketPrice: "",
        endCustomerMarketPrice: "",
        stockxGoatPrice: "",
        fairRange: "",
        confidence: 0,
        change30d: "",
        change90d: "",
        liquidity: "",
        volumeLabel: "",
        pricePoints: {
          whatsapp: [],
          marketplace: [],
          international: [],
        },
      }));

      if (sizes.length === 0) {
        parseErrors.push(`Line ${lineNum}: No sizes provided. At least one size is required.`);
        return;
      }

      // Store retailGlobalUSD separately - will be converted to INR when creating assets
      assets.push({
        name,
        sku,
        brand,
        category: category as string,
        image,
        sizes,
        defaultSize: sizes[0].size,
        // Store retail prices - retailGlobal is in USD, will be converted to INR in handleSubmit
        ...(retailIndia !== undefined || retailGlobal !== undefined ? {
          priceAnchors: {
            ...(retailIndia !== undefined ? { retailIndia } : {}),
            // Store USD value temporarily - will convert to INR
            ...(retailGlobal !== undefined ? { _retailGlobalUSD: retailGlobal } : {}),
          }
        } : {}),
      });
    });

    // Check for duplicates against existing assets
    const duplicateMap = new Map<number, Asset[]>();
    assets.forEach((asset, index) => {
      const duplicates = existingAssets.filter(existing => {
        const nameMatch = asset.name && existing.name.toLowerCase() === asset.name.toLowerCase();
        const skuMatch = asset.sku && existing.sku.toLowerCase() === asset.sku.toLowerCase();
        return nameMatch || skuMatch;
      });
      
      if (duplicates.length > 0) {
        duplicateMap.set(index, duplicates);
      }
    });

    setParsedAssets(assets);
    setErrors(parseErrors);
    setDuplicateWarnings(duplicateMap);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBulkInput(text);
      parseBulkInput(text);
    };
    reader.onerror = () => {
      alert("Failed to read file. Please try again.");
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (parsedAssets.length === 0) {
      alert("Please parse the input first to validate the data.");
      return;
    }

    if (errors.length > 0) {
      const proceed = confirm(
        `There are ${errors.length} error(s) in the input. Do you want to proceed with the valid assets only?`
      );
      if (!proceed) return;
    }

    // Check for duplicates
    if (duplicateWarnings.size > 0) {
      const duplicateCount = duplicateWarnings.size;
      const duplicateList = Array.from(duplicateWarnings.entries())
        .map(([index, dups]) => {
          const asset = parsedAssets[index];
          const dupNames = dups.map(d => `"${d.name}" (SKU: ${d.sku})`).join(', ');
          return `  • "${asset.name}" (SKU: ${asset.sku}) - matches: ${dupNames}`;
        })
        .join('\n');
      
      const proceed = confirm(
        `Warning: ${duplicateCount} potential duplicate(s) detected!\n\n` +
        `Found existing instruments with matching names or SKUs:\n${duplicateList}\n\n` +
        `Do you want to proceed anyway?`
      );
      if (!proceed) return;
    }

    // Convert to full Asset objects (without IDs, they'll be generated)
    // Also convert retailGlobal from USD to INR
    const assetsToSavePromises = parsedAssets.map(async (asset) => {
      const assetCopy: any = { ...asset };
      
      // Convert retailGlobal from USD to INR if present
      if (assetCopy.priceAnchors?._retailGlobalUSD !== undefined) {
        try {
          const usdValue = assetCopy.priceAnchors._retailGlobalUSD as number;
          const inrValue = await convertUSDToINR(usdValue);
          const { _retailGlobalUSD, ...restAnchors } = assetCopy.priceAnchors;
          assetCopy.priceAnchors = {
            ...restAnchors,
            retailGlobal: inrValue,
          };
        } catch (error) {
          console.error("Failed to convert USD to INR for asset:", asset.name, error);
          // Fallback: use approximate rate
          const fallbackRate = 83;
          const usdValue = assetCopy.priceAnchors._retailGlobalUSD as number;
          const inrValue = usdValue * fallbackRate;
          const { _retailGlobalUSD, ...restAnchors } = assetCopy.priceAnchors;
          assetCopy.priceAnchors = {
            ...restAnchors,
            retailGlobal: inrValue,
          };
        }
      }
      
      return {
        ...assetCopy,
      id: 0, // Will be generated by createAsset
      } as Asset;
    });
    
    const assetsToSave = await Promise.all(assetsToSavePromises);

    setIsCreating(true);
    setCreationProgress({ created: 0, total: assetsToSave.length });
    
    try {
      await onSave(assetsToSave, (created, total) => {
        setCreationProgress({ created, total });
      });
    } finally {
      setIsCreating(false);
      setCreationProgress({ created: 0, total: 0 });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start md:items-center justify-center overflow-y-auto p-4">
      <div className="relative w-full md:max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-brand-gray/20 shadow-modal">
        <div className="sticky top-0 z-10 flex justify-between items-center px-5 py-3.5 bg-white border-b border-brand-gray/20">
          <h2 className="text-lg font-heading font-normal text-brand-black">
            Bulk Add Instruments
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-brand-black/60 hover:text-brand-black hover:bg-brand-gray/10 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-5 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-brand-black mb-1.5">
                Upload CSV or Enter Data
              </label>
              <p className="text-xs text-brand-black/50 mb-3 leading-relaxed">
                Upload a CSV file or paste data. Format: <strong>Name, SKU, Brand, Category, Image URL, [Retail India ₹], [Retail Global $], Sizes</strong>
                <br />
                Category and Image URL are optional. Retail India is in ₹ (INR). Retail Global is in $ (USD) — auto-converted to INR.
              </p>
              
              {/* File Upload */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-brand-black mb-1.5">
                  Upload CSV File
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 border border-brand-gray/30 bg-white text-brand-black text-xs font-semibold hover:border-brand-black transition cursor-pointer">
                    Choose File
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {fileName && (
                    <span className="text-xs text-brand-black/50">
                      {fileName}
                    </span>
                  )}
                </div>
              </div>

              {/* Text Input */}
              <div>
                <label className="block text-xs font-medium text-brand-black mb-1.5">
                  Or Paste Data
                </label>
                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  className="w-full border border-brand-gray/30 px-3 py-2.5 text-sm font-mono text-brand-black focus:outline-none focus:border-brand-black resize-none"
                  placeholder="Name, SKU, Brand, Category, Image URL, Retail India (₹), Retail Global ($), Sizes&#10;Nike Dunk Low Panda, DN1234, Nike, Sneakers, https://example.com/image.jpg, 12999, 150, UK 7, UK 8, UK 9"
                  rows={8}
                />
                <button
                  type="button"
                  onClick={() => parseBulkInput()}
                  className="mt-3 px-4 py-2 border border-brand-gray/30 bg-white text-brand-black text-sm font-semibold hover:border-brand-black transition"
                >
                  Parse & Validate
                </button>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="border border-red-200 bg-red-50 p-4">
                <h3 className="text-xs font-semibold text-red-800 mb-2">Errors <span className="font-mono-numeric">({errors.length})</span></h3>
                <ul className="space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="text-xs text-red-600">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {parsedAssets.length > 0 && (
              <div className="border border-brand-gray/20 p-4">
                <h3 className="text-sm font-semibold text-brand-black mb-3">
                  Preview — <span className="font-mono-numeric">{parsedAssets.length}</span> asset{parsedAssets.length !== 1 ? 's' : ''} ready
                  {duplicateWarnings.size > 0 && (
                    <span className="ml-2 text-yellow-600 font-mono-numeric text-xs">
                      ({duplicateWarnings.size} duplicate{duplicateWarnings.size !== 1 ? 's' : ''})
                    </span>
                  )}
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {parsedAssets.map((asset, index) => {
                    const duplicates = duplicateWarnings.get(index);
                    return (
                      <div 
                        key={index} 
                        className={`border p-3 ${
                          duplicates ? 'border-yellow-300 bg-yellow-50' : 'border-brand-gray/20 bg-brand-background'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-brand-black">{asset.name}</p>
                              {duplicates && (
                                <span className="text-xs text-yellow-600">⚠</span>
                              )}
                            </div>
                            <p className="text-xs text-brand-black/50 mt-0.5">{asset.sku} • {asset.brand} • {asset.category}</p>
                            {(asset.priceAnchors?.retailIndia || (asset.priceAnchors as any)?._retailGlobalUSD || asset.priceAnchors?.retailGlobal) && (
                              <p className="text-xs text-brand-black/40 mt-1">
                                Retail: {asset.priceAnchors?.retailIndia ? `₹${asset.priceAnchors.retailIndia.toLocaleString('en-IN')} (IN)` : ''}
                                {asset.priceAnchors?.retailIndia && ((asset.priceAnchors as any)?._retailGlobalUSD || asset.priceAnchors?.retailGlobal) ? ' • ' : ''}
                                {(asset.priceAnchors as any)?._retailGlobalUSD 
                                  ? `$${(asset.priceAnchors as any)._retailGlobalUSD} (Global, will convert to INR)` 
                                  : asset.priceAnchors?.retailGlobal 
                                    ? `₹${asset.priceAnchors.retailGlobal.toLocaleString('en-IN')} (Global)` 
                                    : ''}
                              </p>
                            )}
                            <p className="text-xs text-brand-black/40 mt-0.5">
                              Sizes: {asset.sizes?.map(s => s.size).join(', ') || 'None'}
                            </p>
                            {duplicates && duplicates.length > 0 && (
                              <p className="text-xs text-yellow-600 mt-1">
                                Duplicate: matches {duplicates.map(d => `"${d.name}"`).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isCreating && (
              <div className="border border-brand-gray/20 bg-brand-background p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-brand-black border-t-transparent"></div>
                  <span className="text-sm font-semibold text-brand-black">
                    Creating Assets...
                  </span>
                </div>
                <div className="w-full bg-brand-gray/20 h-2 mb-2">
                  <div 
                    className="bg-brand-black h-2 transition-all duration-300"
                    style={{ 
                      width: `${creationProgress.total > 0 ? (creationProgress.created / creationProgress.total) * 100 : 0}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-brand-black/50 font-mono-numeric">
                  {creationProgress.created} of {creationProgress.total} assets created
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-brand-gray/20">
              <button
                type="submit"
                disabled={parsedAssets.length === 0 || isCreating}
                className="px-5 py-2.5 bg-brand-black text-white text-sm font-semibold hover:bg-brand-black/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    Create {parsedAssets.length > 0 ? <span className="font-mono-numeric">{parsedAssets.length}</span> : ''} Asset{parsedAssets.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="px-5 py-2.5 border border-brand-gray/30 text-brand-black text-sm font-semibold hover:bg-brand-gray/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/**
 * Backfill Metrics Button Component
 * Allows analysts to calculate and populate metrics for all assets
 */
interface BackfillMetricsButtonProps {
  assets: Asset[];
  onAssetsChange: (assets: Asset[]) => void;
}

const BackfillMetricsButton: React.FC<BackfillMetricsButtonProps> = ({
  assets,
  onAssetsChange,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleBackfill = async () => {
    if (!confirm(
      `This will calculate and update metrics for all ${assets.length} assets. This includes:\n\n` +
      `• Price changes (30d, 90d)\n` +
      `• Best available prices\n` +
      `• Confidence scores\n` +
      `• Liquidity levels\n\n` +
      `Continue?`
    )) {
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setProgress({ current: 0, total: assets.length });

    try {
      console.log(`Starting backfill for ${assets.length} assets...`);
      
      // Enrich all assets with calculated metrics
      const enrichedAssets = backfillAllAssetMetrics(assets);
      
      // Update assets one by one (with progress tracking)
      const updatedAssets: Asset[] = [];
      for (let i = 0; i < enrichedAssets.length; i++) {
        const asset = enrichedAssets[i];
        setProgress({ current: i + 1, total: enrichedAssets.length });
        
        try {
          const savedAsset = await updateAsset(asset);
          updatedAssets.push(savedAsset);
          console.log(`Backfilled asset ${i + 1}/${enrichedAssets.length}: ${asset.name}`);
        } catch (error) {
          console.error(`Failed to backfill asset ${asset.name}:`, error);
          // Continue with other assets even if one fails
          updatedAssets.push(asset);
        }
      }
      
      // Update local state
      onAssetsChange(updatedAssets);
      
      setResult({
        success: true,
        message: `Successfully updated ${updatedAssets.length} assets with calculated metrics.`,
      });
      
      console.log(`Backfill complete! Updated ${updatedAssets.length} assets.`);
    } catch (error) {
      console.error("Backfill failed:", error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to backfill metrics",
      });
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleBackfill}
        disabled={isProcessing || assets.length === 0}
        className="px-5 py-2.5 bg-brand-black text-white text-sm font-semibold hover:bg-brand-black/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
            <span>Calculating Metrics...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Calculate Metrics for All Assets</span>
          </>
        )}
      </button>

      {/* Progress Bar */}
      {isProcessing && progress.total > 0 && (
        <div className="border border-brand-gray/20 bg-white shadow-sm p-4">
          <div className="mb-2">
            <div className="w-full bg-brand-gray/20 h-2">
              <div
                className="bg-brand-black h-2 transition-all duration-300"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                }}
              ></div>
            </div>
          </div>
          <p className="text-xs text-brand-black/50 font-mono-numeric">
            Processing {progress.current} of {progress.total} assets...
          </p>
        </div>
      )}

      {/* Result Message */}
      {result && (
        <div
          className={`border p-4 ${
            result.success
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <p
            className={`text-xs font-medium ${
              result.success ? "text-green-700" : "text-red-700"
            }`}
          >
            {result.success ? "✓ " : "✗ "}
            {result.message}
          </p>
        </div>
      )}
    </div>
  );
};

