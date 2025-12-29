import React, { useState } from "react";
import { Asset, SizeVariant } from "../types";
import { DailyPriceUpdates } from "./DailyPriceUpdates";
import { DesignSettings } from "./DesignSettings";
import { AnalyticsView } from "./AnalyticsView";
import { createAsset, updateAsset, deleteAsset, batchCreateAssets } from "../utils/assetsApi";

type DashboardTab = "assets" | "market-data" | "analytics" | "settings";

interface AnalystDashboardProps {
  assets: Asset[];
  onAssetsChange: (next: Asset[]) => void;
  onLogout?: () => void;
}

export const AnalystDashboard: React.FC<AnalystDashboardProps> = ({
  assets,
  onAssetsChange,
  onLogout,
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
      if (isEditing && selectedAsset) {
        // Update existing asset via API
        const updatedAsset = await updateAsset(asset);
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
        const { id, ...assetWithoutId } = asset;
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
    <main className="flex-1 bg-brand-white px-6 py-6 md:px-8 md:py-8 pb-20 md:pb-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-brand-gray/30">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-normal text-brand-black mb-2 uppercase tracking-wide">
              Market Intelligence Console
            </h1>
            <p className="text-sm text-brand-black/60 font-medium">
              Portfolio management • Market data capture • Price intelligence
            </p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-4 py-2 border border-brand-gray/30 bg-brand-white text-sm font-medium text-brand-black hover:border-brand-black hover:bg-brand-black hover:text-brand-white transition-all"
              style={{ borderRadius: '0px' }}
            >
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-brand-gray/30">
        <button
          onClick={() => setActiveTab("assets")}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "assets"
              ? "border-brand-black text-brand-black"
              : "border-transparent text-brand-black/50 hover:text-brand-black/80"
          }`}
        >
          Portfolio
        </button>
        <button
          onClick={() => setActiveTab("market-data")}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "market-data"
              ? "border-brand-black text-brand-black"
              : "border-transparent text-brand-black/50 hover:text-brand-black/80"
          }`}
        >
          Market Data
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "analytics"
              ? "border-brand-black text-brand-black"
              : "border-transparent text-brand-black/50 hover:text-brand-black/80"
          }`}
        >
          Analytics
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ml-auto ${
            activeTab === "settings"
              ? "border-brand-black text-brand-black"
              : "border-transparent text-brand-black/40 hover:text-brand-black/60"
          }`}
        >
          Settings
        </button>
      </div>

      {/* Locked content container so all tabs share the same visual width */}
      <div className="border border-brand-gray/30 bg-brand-white p-6 md:p-8" style={{ borderRadius: '0px' }}>
        {activeTab === "market-data" ? (
          <DailyPriceUpdates
            assets={assets}
            onUpdateAsset={async (updatedAsset) => {
              try {
                console.log("onUpdateAsset called with:", updatedAsset.id, updatedAsset.name);
                console.log("Updated sizes:", updatedAsset.sizes);
                
                // Save to Firebase
                const savedAsset = await updateAsset(updatedAsset);
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
        ) : activeTab === "assets" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Asset List */}
            <div className="lg:col-span-1">
              <div className="border border-brand-gray/30 p-5 bg-brand-white" style={{ borderRadius: '0px' }}>
              <div className="mb-5 pb-4 border-b border-brand-gray/20">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-brand-black uppercase tracking-wide mb-2">
                      Instrument Universe
                    </h2>
                    <p className="text-xs text-brand-black/60 font-medium">
                      {assets.length} {assets.length === 1 ? 'instrument' : 'instruments'} tracked
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowBulkAddForm(true);
                      }}
                      className="px-4 py-2 border border-brand-black bg-brand-white text-brand-black text-xs font-semibold uppercase tracking-wide hover:bg-brand-black hover:text-brand-white transition-all flex-shrink-0"
                      style={{ borderRadius: '0px' }}
                    >
                      Bulk Add
                    </button>
                    <button
                      onClick={() => {
                        setShowNewAssetForm(true);
                        setIsEditing(false);
                        setSelectedAsset(null);
                      }}
                      className="px-4 py-2 border border-brand-black bg-brand-black text-brand-white text-xs font-semibold uppercase tracking-wide hover:bg-brand-black/90 transition-all flex-shrink-0"
                      style={{ borderRadius: '0px' }}
                    >
                      + Add
                    </button>
                  </div>
                </div>
                {/* Search Bar */}
                <div className="mt-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, SKU, or brand..."
                    className="w-full border border-brand-gray/30 px-3 py-2 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black"
                    style={{ borderRadius: '0px' }}
                  />
                </div>
              </div>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {(() => {
                  // Filter assets based on search query
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
                      <div className="text-center py-8 text-xs text-brand-black/50">
                        {searchQuery.trim() ? 'No instruments found matching your search' : 'No instruments'}
                      </div>
                    );
                  }

                  return filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className={`border p-3 cursor-pointer transition-all ${
                      selectedAsset?.id === asset.id
                        ? "border-brand-black bg-brand-black text-brand-white"
                        : "border-brand-gray/30 hover:border-brand-gray/50 hover:bg-brand-gray/5"
                    }`}
                    style={{ borderRadius: '0px' }}
                    onClick={() => {
                      setSelectedAsset(asset);
                      setIsEditing(false);
                      setShowNewAssetForm(false);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`text-xs font-semibold mb-1 ${
                          selectedAsset?.id === asset.id ? "text-brand-white" : "text-brand-black"
                        }`}>
                          {asset.name}
                        </p>
                        <p className={`text-xs ${
                          selectedAsset?.id === asset.id ? "text-brand-white/70" : "text-brand-black/60"
                        }`}>
                          {asset.sku}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAsset(asset);
                            setIsEditing(true);
                            setShowNewAssetForm(true);
                          }}
                          className={`text-xs px-2 py-1 border transition-all ${
                            selectedAsset?.id === asset.id
                              ? "border-brand-white/30 text-brand-white hover:bg-brand-white/10"
                              : "border-brand-gray/30 text-brand-black hover:border-brand-black hover:bg-brand-black hover:text-brand-white"
                          }`}
                          style={{ borderRadius: '0px' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAsset(asset.id);
                          }}
                          className="text-xs px-2 py-1 border border-red-500/30 text-red-600 hover:border-red-600 hover:bg-red-600 hover:text-brand-white transition-all"
                          style={{ borderRadius: '0px' }}
                        >
                          Delete
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
                <div className="border border-brand-gray/30 p-12 bg-brand-white text-center" style={{ borderRadius: '0px' }}>
                  <p className="text-sm font-medium text-brand-black/60 mb-1">
                    No Instrument Selected
                  </p>
                  <p className="text-xs text-brand-black/50">
                    Select an instrument from the list or create a new one
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "analytics" ? (
          <AnalyticsView />
        ) : (
          <DesignSettings />
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start md:items-center justify-center overflow-y-auto p-4">
      <div className="relative w-full md:max-w-4xl max-h-[90vh] overflow-y-auto bg-brand-white border border-brand-gray/30 shadow-2xl" style={{ borderRadius: '0px' }}>
        <div className="sticky top-0 z-10 flex justify-between items-center px-6 py-4 bg-brand-white border-b border-brand-gray/30">
          <h2 className="text-xl font-heading font-normal text-brand-black uppercase tracking-wide">
            {asset ? "Edit Instrument" : "New Instrument"}
          </h2>
          <button
            onClick={onClose}
            className="text-brand-black hover:text-brand-black text-lg px-2 py-1"
          >
            ✕
          </button>
        </div>
        <div className="p-6 md:p-8">
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
    <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="border-b border-brand-gray/20 pb-3">
            <h3 className="text-sm font-semibold text-brand-black uppercase tracking-wide mb-1">
              Basic Information
            </h3>
            <p className="text-xs text-brand-black/60">
              Core asset details and metadata
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-black uppercase tracking-wide mb-2">
                Name <span className="text-red-600 font-normal">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full border rounded-none px-3 py-2 text-xs font-medium text-brand-black focus:outline-none ${
                  duplicateAssets && duplicateAssets.some(d => d.name.toLowerCase() === formData.name?.toLowerCase())
                    ? "border-red-500 focus:border-red-600"
                    : "border-brand-gray/30 focus:border-brand-black"
                }`}
                required
              />
              {duplicateAssets && duplicateAssets.some(d => d.name.toLowerCase() === formData.name?.toLowerCase()) && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <span>⚠</span> Duplicate name found
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-black uppercase tracking-wide mb-2">
                SKU <span className="text-red-600 font-normal">*</span>
              </label>
              <input
                type="text"
                value={formData.sku || ""}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className={`w-full border rounded-none px-3 py-2 text-xs font-medium text-brand-black focus:outline-none ${
                  duplicateAssets && duplicateAssets.some(d => d.sku.toLowerCase() === formData.sku?.toLowerCase())
                    ? "border-red-500 focus:border-red-600"
                    : "border-brand-gray/30 focus:border-brand-black"
                }`}
                required
              />
              {duplicateAssets && duplicateAssets.some(d => d.sku.toLowerCase() === formData.sku?.toLowerCase()) && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <span>⚠</span> Duplicate SKU found
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-black uppercase tracking-wide mb-2">
                Brand <span className="text-red-600 font-normal">*</span>
              </label>
              <input
                type="text"
                value={formData.brand || ""}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full border border-brand-gray/30 rounded-none px-3 py-2 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-black uppercase tracking-wide mb-2">
                Category
              </label>
              <select
                value={formData.category || "Sneakers"}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full border border-brand-gray/30 rounded-none px-3 py-2 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black"
              >
                <option value="Sneakers">Sneakers</option>
                <option value="Watches">Watches</option>
                <option value="Bags">Bags</option>
                <option value="Collectibles">Collectibles</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-black uppercase tracking-wide mb-2">
                Image URL
              </label>
              <input
                type="url"
                value={formData.image || ""}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="w-full border border-brand-gray/30 rounded-none px-3 py-2 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black"
                placeholder="https://..."
              />
            </div>
          </div>
          
          {/* Duplicate Warning Banner */}
          {duplicateAssets && duplicateAssets.length > 0 && (
            <div className="border border-yellow-500/50 bg-yellow-500/10 p-3" style={{ borderRadius: '0px' }}>
              <div className="flex items-start gap-2">
                <span className="text-yellow-600 text-sm">⚠</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-yellow-700 mb-1">Potential Duplicate Detected</p>
                  <p className="text-xs text-yellow-600">
                    Found {duplicateAssets.length} existing instrument{duplicateAssets.length !== 1 ? 's' : ''} with matching name or SKU:
                  </p>
                  <ul className="text-xs text-yellow-600 mt-1 list-disc list-inside">
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
            className="px-6 py-2 rounded-none border border-brand-black bg-brand-black text-brand-white text-xs font-semibold uppercase tracking-wide hover:bg-brand-black/90 transition"
          >
            {asset ? "Update Instrument" : "Create Instrument"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 rounded-none border border-brand-gray/30 text-brand-black text-xs font-semibold uppercase tracking-wide hover:bg-brand-gray/10 transition"
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

  const updateAnchor = (key: string, value: number) => {
    const newAnchors = { ...anchors, [key]: value };
    setAnchors(newAnchors);
    onChange(newAnchors);
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-brand-gray/20 pb-3">
        <h3 className="text-sm font-semibold text-brand-black uppercase tracking-wide mb-1">
          Retail Prices
        </h3>
        <p className="text-xs text-brand-black/60">
          Original launch prices. Used to calculate spread percentage (current price vs retail).
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-brand-black uppercase tracking-wide mb-2">
            Retail (India) ₹
          </label>
          <input
            type="number"
            value={anchors.retailIndia || ""}
            onChange={(e) => updateAnchor("retailIndia", parseFloat(e.target.value) || 0)}
            className="w-full border border-brand-gray/30 rounded-none px-3 py-2 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black"
            placeholder="e.g., 12,999"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-brand-black uppercase tracking-wide mb-2">
            Retail (Global) ₹
          </label>
          <input
            type="number"
            value={anchors.retailGlobal || ""}
            onChange={(e) => updateAnchor("retailGlobal", parseFloat(e.target.value) || 0)}
            className="w-full border border-brand-gray/30 rounded-none px-3 py-2 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black"
            placeholder="e.g., 150"
          />
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
      <div className="flex items-center justify-between border-b border-brand-gray/20 pb-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-brand-black uppercase tracking-wide mb-1">
            Size Variants ({sizes.length}) <span className="text-red-600 font-normal">*</span>
          </h3>
          <p className="text-xs text-brand-black/60">
            Define size-specific pricing ranges for each market channel. At least one size is required since market data is size-dependent.
          </p>
        </div>
      </div>

      <div className="border border-brand-gray/30 rounded-none p-4 bg-brand-white">
        <div className="mb-3">
          <label className="block text-xs font-semibold text-brand-black uppercase tracking-wide mb-2">
            Add Sizes <span className="text-red-600 font-normal">*</span>
          </label>
          <p className="text-xs text-brand-black/60 mb-2">
            Enter sizes separated by commas or new lines (e.g., "UK 7, UK 8, UK 9" or one per line). You can edit individual sizes later. At least one size is required.
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
            className="w-full border border-brand-gray/30 rounded-none px-3 py-2 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black resize-none"
            placeholder="UK 7, UK 8, UK 9, UK 10"
            rows={3}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleQuickAddSubmit}
            className="px-4 py-2 rounded-none border border-brand-black bg-brand-black text-brand-white text-xs font-semibold uppercase tracking-wide hover:bg-brand-black/90"
          >
            Add Sizes
          </button>
          <button
            type="button"
            onClick={() => setQuickAddInput("")}
            className="px-4 py-2 rounded-none border border-brand-gray/30 text-brand-black text-xs font-semibold uppercase tracking-wide hover:bg-brand-gray/10"
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
        {sizes.map((size, index) => (
          <div
            key={index}
            className="border border-brand-gray/30 rounded-none p-4 bg-brand-white"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-brand-black">{size.size}</span>
                  {size.size === defaultSize && (
                    <span className="text-xs px-2 py-0.5 bg-brand-gray/20 text-brand-black">Default</span>
                  )}
                </div>
        <div className="grid grid-cols-3 gap-2 text-xs text-brand-black">
                  <div>
                    <span className="text-brand-black/60">WhatsApp/Reseller:</span> {size.b2bMarketPrice || "—"}
                    {(() => {
                      const pricePoints = size.pricePoints || size.legacyPricePoints;
                      const count = pricePoints ? ('whatsapp' in pricePoints ? pricePoints.whatsapp?.length : pricePoints.b2b?.length) || 0 : 0;
                      return count > 0 ? <span className="text-brand-black/50 ml-1">({count} listings)</span> : null;
                    })()}
                  </div>
                  <div>
                    <span className="text-brand-black/60">Indian Marketplaces:</span> {size.endCustomerMarketPrice || "—"}
                    {(() => {
                      const pricePoints = size.pricePoints || size.legacyPricePoints;
                      const count = pricePoints ? ('marketplace' in pricePoints ? pricePoints.marketplace?.length : pricePoints.endCustomer?.length) || 0 : 0;
                      return count > 0 ? <span className="text-brand-black/50 ml-1">({count} listings)</span> : null;
                    })()}
                  </div>
                  <div>
                    <span className="text-brand-black/60">International:</span> {size.stockxGoatPrice || "—"}
                    {(() => {
                      const pricePoints = size.pricePoints || size.legacyPricePoints;
                      const count = pricePoints ? ('international' in pricePoints ? pricePoints.international?.length : pricePoints.stockxGoat?.length) || 0 : 0;
                      return count > 0 ? <span className="text-brand-black/50 ml-1">({count} listings)</span> : null;
                    })()}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingIndex(index);
                    setShowForm(true);
                  }}
                  className="text-xs px-3 py-1.5 border border-brand-gray/30 hover:border-brand-black text-brand-black font-medium uppercase tracking-wide transition"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSize(index)}
                  className="text-xs px-3 py-1.5 border border-red-500/30 hover:border-red-600 hover:bg-red-600 hover:text-white text-red-600 font-medium uppercase tracking-wide transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
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
    <div className="border border-brand-gray/30 rounded-none p-5 bg-brand-white size-variant-form-container" style={{ borderRadius: '0px' }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <div className="mb-4 pb-3 border-b border-brand-gray/20">
        <h4 className="text-sm font-semibold text-brand-black uppercase tracking-wide mb-1">
          {sizeVariant ? "Edit Size Variant" : "New Size Variant"}
        </h4>
        <p className="text-xs text-brand-black/60">
          Define size structure and liquidity. All pricing data and metrics are calculated dynamically from market data.
        </p>
      </div>
      
      <div className="space-y-5" onClick={(e) => e.stopPropagation()}>
        {/* Basic Info */}
        <div className="border-b border-brand-gray/20 pb-4" style={{ borderRadius: '0px' }}>
          <h5 className="text-xs font-semibold text-brand-black uppercase tracking-wide mb-3">Basic Information</h5>
          <div>
            <label className="block text-xs font-semibold text-brand-black uppercase tracking-wide mb-2">
              Size <span className="text-red-600 font-normal">*</span>
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
              className="w-full border border-brand-gray/30 rounded-none px-3 py-2 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black"
              placeholder="e.g., UK 9"
              required
              autoFocus
            />
            <p className="text-xs text-brand-black/50 mt-2">
              Liquidity and other metrics will be calculated automatically from market data.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-brand-gray/20">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit();
            }}
            className="px-5 py-2 rounded-none border border-brand-black bg-brand-black text-brand-white text-xs font-semibold uppercase tracking-wide hover:bg-brand-black/90 transition"
          >
            Save Size
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 rounded-none border border-brand-gray/30 text-brand-black text-xs font-semibold uppercase tracking-wide hover:bg-brand-gray/10 transition"
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
    <div className="border border-brand-gray/30 rounded-none p-6 bg-brand-white">
      <div className="mb-6 pb-4 border-b border-brand-gray/20">
        <h2 className="text-xl font-semibold text-brand-black mb-2 uppercase tracking-wide">
          {asset.name}
        </h2>
        <div className="flex items-center gap-4 text-xs text-brand-black/60">
          <span className="font-medium">{asset.sku}</span>
          <span>•</span>
          <span>{asset.brand}</span>
          <span>•</span>
          <span className="uppercase">{asset.category}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold text-brand-black/60 uppercase tracking-wide mb-2">Size Variants</p>
          <p className="text-lg font-semibold text-brand-black">{asset.sizes?.length || 0}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-brand-black/60 uppercase tracking-wide mb-2">Last Updated</p>
          <p className="text-sm font-medium text-brand-black">{lastUpdated}</p>
        </div>
        {asset.volatility && (
          <div>
            <p className="text-xs font-semibold text-brand-black/60 uppercase tracking-wide mb-2">Volatility</p>
            <p className="text-sm font-medium text-brand-black capitalize">{asset.volatility}</p>
          </div>
        )}
        {asset.priceAnchors?.retailIndia && (
          <div>
            <p className="text-xs font-semibold text-brand-black/60 uppercase tracking-wide mb-2">Retail (IN)</p>
            <p className="text-sm font-medium text-brand-black">₹{asset.priceAnchors.retailIndia.toLocaleString('en-IN')}</p>
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
      
      // Handle sizes: collect all parts from index 5 onwards
      // This handles both cases:
      // 1. "UK 9, UK 10, UK 11" in one column (parts[5])
      // 2. UK 9, UK 10, UK 11 as separate columns (parts[5], parts[6], parts[7])
      const sizeParts = parts.slice(5).filter(p => p.trim().length > 0);
      
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

      assets.push({
        name,
        sku,
        brand,
        category: category as string,
        image,
        sizes,
        defaultSize: sizes[0].size,
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
    const assetsToSave: Asset[] = parsedAssets.map(asset => ({
      ...asset,
      id: 0, // Will be generated by createAsset
    })) as Asset[];

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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start md:items-center justify-center overflow-y-auto p-4">
      <div className="relative w-full md:max-w-4xl max-h-[90vh] overflow-y-auto bg-brand-white border border-brand-gray/30 shadow-2xl" style={{ borderRadius: '0px' }}>
        <div className="sticky top-0 z-10 flex justify-between items-center px-6 py-4 bg-brand-white border-b border-brand-gray/30">
          <h2 className="text-xl font-heading font-normal text-brand-black uppercase tracking-wide">
            Bulk Add Instruments
          </h2>
          <button
            onClick={onClose}
            className="text-brand-black hover:text-brand-black text-lg px-2 py-1"
          >
            ✕
          </button>
        </div>
        <div className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-brand-black uppercase tracking-wide mb-2">
                Upload CSV or Enter Data
              </label>
              <p className="text-xs text-brand-black/60 mb-3">
                Upload a CSV file or paste data. Format: <strong>Name, SKU, Brand, Category, Image URL, Sizes</strong>
                <br />
                Example: <code className="bg-brand-gray/10 px-1">Nike Dunk Low Panda, DN1234, Nike, Sneakers, https://..., UK 7, UK 8, UK 9</code>
                <br />
                Category and Image URL are optional. Sizes should be comma or semicolon separated.
              </p>
              
              {/* File Upload */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-brand-black uppercase tracking-wide mb-2">
                  Upload CSV File
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 border border-brand-black bg-brand-white text-brand-black text-xs font-semibold uppercase tracking-wide hover:bg-brand-black hover:text-brand-white transition cursor-pointer" style={{ borderRadius: '0px' }}>
                    Choose File
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {fileName && (
                    <span className="text-xs text-brand-black/60">
                      {fileName}
                    </span>
                  )}
                </div>
              </div>

              {/* Text Input */}
              <div>
                <label className="block text-xs font-semibold text-brand-black uppercase tracking-wide mb-2">
                  Or Paste Data
                </label>
                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  className="w-full border border-brand-gray/30 px-3 py-2 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black resize-none font-mono"
                  placeholder="Name, SKU, Brand, Category, Image URL, Sizes&#10;Nike Dunk Low Panda, DN1234, Nike, Sneakers, https://example.com/image.jpg, UK 7, UK 8, UK 9&#10;Jordan 1 High OG, J1-5678, Jordan, Sneakers, https://example.com/jordan.jpg, UK 8, UK 9, UK 10"
                  rows={12}
                  style={{ borderRadius: '0px' }}
                />
                <button
                  type="button"
                  onClick={() => parseBulkInput()}
                  className="mt-2 px-4 py-2 border border-brand-gray/30 bg-brand-white text-brand-black text-xs font-semibold uppercase tracking-wide hover:bg-brand-gray/10 transition"
                  style={{ borderRadius: '0px' }}
                >
                  Parse & Validate
                </button>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="border border-red-500/30 bg-red-500/5 p-4" style={{ borderRadius: '0px' }}>
                <h3 className="text-xs font-semibold text-red-700 mb-2 uppercase">Errors ({errors.length})</h3>
                <ul className="space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="text-xs text-red-600">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {parsedAssets.length > 0 && (
              <div className="border border-brand-gray/30 p-4" style={{ borderRadius: '0px' }}>
                <h3 className="text-xs font-semibold text-brand-black mb-3 uppercase tracking-wide">
                  Preview ({parsedAssets.length} asset{parsedAssets.length !== 1 ? 's' : ''} ready)
                  {duplicateWarnings.size > 0 && (
                    <span className="ml-2 text-yellow-600">
                      • {duplicateWarnings.size} potential duplicate{duplicateWarnings.size !== 1 ? 's' : ''}
                    </span>
                  )}
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {parsedAssets.map((asset, index) => {
                    const duplicates = duplicateWarnings.get(index);
                    return (
                      <div 
                        key={index} 
                        className={`border p-3 ${
                          duplicates ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-brand-gray/20 bg-brand-gray/5'
                        }`}
                        style={{ borderRadius: '0px' }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-brand-black">{asset.name}</p>
                              {duplicates && (
                                <span className="text-xs text-yellow-600">⚠</span>
                              )}
                            </div>
                            <p className="text-xs text-brand-black/60">{asset.sku} • {asset.brand} • {asset.category}</p>
                            <p className="text-xs text-brand-black/50 mt-1">
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
              <div className="border border-brand-gray/30 bg-brand-gray/5 p-4" style={{ borderRadius: '0px' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-black border-t-transparent"></div>
                  <span className="text-xs font-semibold text-brand-black uppercase tracking-wide">
                    Creating Assets...
                  </span>
                </div>
                <div className="w-full bg-brand-gray/20 h-2 mb-2" style={{ borderRadius: '0px' }}>
                  <div 
                    className="bg-brand-black h-2 transition-all duration-300"
                    style={{ 
                      width: `${creationProgress.total > 0 ? (creationProgress.created / creationProgress.total) * 100 : 0}%`,
                      borderRadius: '0px'
                    }}
                  ></div>
                </div>
                <p className="text-xs text-brand-black/60">
                  {creationProgress.created} of {creationProgress.total} assets created
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-brand-gray/20">
              <button
                type="submit"
                disabled={parsedAssets.length === 0 || isCreating}
                className="px-6 py-2 border border-brand-black bg-brand-black text-brand-white text-xs font-semibold uppercase tracking-wide hover:bg-brand-black/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ borderRadius: '0px' }}
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    Create {parsedAssets.length > 0 ? `${parsedAssets.length} ` : ''}Asset{parsedAssets.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="px-6 py-2 border border-brand-gray/30 text-brand-black text-xs font-semibold uppercase tracking-wide hover:bg-brand-gray/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: '0px' }}
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

