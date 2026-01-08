import React, { useState, useEffect } from "react";
import { Drop, DropStatus } from "../types";
import {
  fetchAllDrops,
  fetchDropsByStatus,
  createDrop,
  updateDrop,
  deleteDrop,
} from "../utils/dropsApi";
import { auth } from "../utils/firebase";

interface DropsManagementProps {
  onDropsChange?: (drops: Drop[]) => void;
}

export const DropsManagement: React.FC<DropsManagementProps> = ({
  onDropsChange,
}) => {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<DropStatus | "all">("all");
  const [selectedDrop, setSelectedDrop] = useState<Drop | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadDrops();
  }, [filterStatus]);

  const loadDrops = async () => {
    setLoading(true);
    try {
      const allDrops =
        filterStatus === "all"
          ? await fetchAllDrops()
          : await fetchDropsByStatus(filterStatus);
      setDrops(allDrops);
      onDropsChange?.(allDrops);
    } catch (error) {
      console.error("Failed to load drops:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDrop = async (drop: Drop) => {
    // Check authentication
    if (auth && !auth.currentUser) {
      alert("You must be logged in to verify drops. Please log in via the Analyst Dashboard.");
      return;
    }

    try {
      console.log("Verifying drop:", drop.id, drop.name);
      console.log("Current auth user:", auth?.currentUser?.email || "Not authenticated");
      
      const updated: Drop = {
        ...drop,
        verified: true,
        status: "upcoming" as DropStatus,
        verifiedAt: new Date().toISOString(),
        verifiedBy: auth?.currentUser?.email || localStorage.getItem("analyst_email") || "analyst",
        updatedAt: new Date().toISOString(),
      };
      
      // Update Firestore first
      await updateDrop(updated);
      console.log("Drop verified successfully");
      
      // Update local state after successful Firestore update
      setDrops(prevDrops => 
        prevDrops.map(d => d.id === drop.id ? updated : d)
      );
      
      // Wait a moment for Firestore to propagate, then reload to ensure sync
      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadDrops();
      
      // Show success feedback
      alert(`Drop "${drop.name}" has been verified and set to upcoming.`);
    } catch (error: any) {
      console.error("Failed to verify drop:", error);
      const errorMsg = error.message || 'Unknown error';
      
      // Check if it's a permissions error
      if (error.code === 'permission-denied' || errorMsg.includes('permission')) {
        alert(`Permission denied. Please make sure you're logged in via Firebase Authentication. Error: ${errorMsg}`);
      } else {
        alert(`Failed to verify drop: ${errorMsg}. Please try again.`);
      }
      
      // Reload to restore correct state
      await loadDrops();
    }
  };

  const handleRejectDrop = async (drop: Drop) => {
    // Check authentication
    if (auth && !auth.currentUser) {
      alert("You must be logged in to reject drops. Please log in via the Analyst Dashboard.");
      return;
    }

    if (confirm("Are you sure you want to reject this drop?")) {
      try {
        console.log("Rejecting drop:", drop.id, drop.name);
        console.log("Current auth user:", auth?.currentUser?.email || "Not authenticated");
        
        const updated: Drop = {
          ...drop,
          status: "rejected" as DropStatus,
          updatedAt: new Date().toISOString(),
        };
        
        // Update Firestore first
        await updateDrop(updated);
        console.log("Drop rejected successfully");
        
        // Update local state after successful Firestore update
        setDrops(prevDrops => 
          prevDrops.map(d => d.id === drop.id ? updated : d)
        );
        
        // Wait a moment for Firestore to propagate, then reload to ensure sync
        await new Promise(resolve => setTimeout(resolve, 1000));
        await loadDrops();
        
        // Show success feedback
        alert(`Drop "${drop.name}" has been rejected.`);
      } catch (error: any) {
        console.error("Failed to reject drop:", error);
        const errorMsg = error.message || 'Unknown error';
        
        // Check if it's a permissions error
        if (error.code === 'permission-denied' || errorMsg.includes('permission')) {
          alert(`Permission denied. Please make sure you're logged in via Firebase Authentication. Error: ${errorMsg}`);
        } else {
          alert(`Failed to reject drop: ${errorMsg}. Please try again.`);
        }
        
        // Reload to restore correct state
        await loadDrops();
      }
    }
  };

  const handleDeleteDrop = async (id: number) => {
    // Check authentication
    if (auth && !auth.currentUser) {
      alert("You must be logged in to delete drops. Please log in via the Analyst Dashboard.");
      return;
    }

    if (confirm("Are you sure you want to delete this drop?")) {
      try {
        console.log("Deleting drop with ID:", id);
        console.log("Current auth user:", auth?.currentUser?.email || "Not authenticated");
        await deleteDrop(id);
        console.log("Drop deleted, refreshing list...");
        await loadDrops();
        if (selectedDrop?.id === id) {
          setSelectedDrop(null);
        }
      } catch (error: any) {
        console.error("Failed to delete drop:", error);
        const errorMsg = error.message || 'Unknown error';
        
        // Check if it's a permissions error
        if (error.code === 'permission-denied' || errorMsg.includes('permission')) {
          alert(`Permission denied. Please make sure you're logged in via Firebase Authentication. Error: ${errorMsg}`);
        } else {
          alert(`Failed to delete drop: ${errorMsg}. Check console for details.`);
        }
      }
    }
  };

  const handleUpdateStatus = async (drop: Drop, newStatus: DropStatus) => {
    try {
      const updated: Drop = {
        ...drop,
        status: newStatus,
      };
      await updateDrop(updated);
      await loadDrops();
      if (selectedDrop?.id === drop.id) {
        setSelectedDrop(updated);
      }
    } catch (error) {
      console.error("Failed to update drop status:", error);
      alert("Failed to update drop status. Please try again.");
    }
  };

  // Filter drops by search query
  const filteredDrops = drops.filter((drop) => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        drop.name.toLowerCase().includes(query) ||
        drop.brand.toLowerCase().includes(query) ||
        drop.sku?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Group drops by status for review queue
  const pendingDrops = drops.filter((d) => d.status === "pending_review");
  const upcomingDrops = drops.filter((d) => d.status === "upcoming" || d.status === "live");

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-brand-black mb-1 leading-tight">
            Drops Management
          </h2>
          <p className="text-xs text-brand-black/70 leading-tight">
            Review and manage upcoming sneaker releases
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1.5 border border-brand-black bg-brand-black text-brand-white text-xs font-medium hover:bg-brand-black/90 transition leading-tight"
            style={{ borderRadius: '0px' }}
          >
            Add Drop
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-brand-gray/30 p-2 bg-brand-white">
          <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1 leading-tight">
            Pending Review
          </p>
          <p className="text-lg font-mono-numeric font-semibold text-brand-black leading-tight">
            {pendingDrops.length}
          </p>
        </div>
        <div className="border border-brand-gray/30 p-2 bg-brand-white">
          <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1 leading-tight">
            Upcoming
          </p>
          <p className="text-lg font-mono-numeric font-semibold text-brand-black leading-tight">
            {upcomingDrops.length}
          </p>
        </div>
        <div className="border border-brand-gray/30 p-2 bg-brand-white">
          <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1 leading-tight">
            Total
          </p>
          <p className="text-lg font-mono-numeric font-semibold text-brand-black leading-tight">
            {drops.length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Search drops..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-2 py-1 border border-brand-gray/30 bg-brand-white text-xs text-brand-black placeholder:text-brand-black/40 focus:outline-none focus:border-brand-black leading-tight"
          style={{ borderRadius: '0px' }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as DropStatus | "all")}
          className="px-2 py-1 border border-brand-gray/30 bg-brand-white text-xs text-brand-black focus:outline-none focus:border-brand-black leading-tight"
          style={{ borderRadius: '0px' }}
        >
          <option value="all">All Status</option>
          <option value="pending_review">Pending Review</option>
          <option value="upcoming">Upcoming</option>
          <option value="live">Live</option>
          <option value="sold-out">Sold Out</option>
          <option value="cancelled">Cancelled</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Drops List */}
      {loading ? (
        <div className="border border-brand-gray/30 p-8 text-center bg-brand-white">
          <p className="text-sm text-brand-black/70">Loading drops...</p>
        </div>
      ) : filteredDrops.length === 0 ? (
        <div className="border border-brand-gray/30 p-8 text-center bg-brand-white">
          <p className="text-sm text-brand-black/70">No drops found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDrops.map((drop, index) => (
            <div
              key={`drop-${drop.id}-${drop.name}-${index}`}
              className={`border p-3 bg-brand-white hover:border-brand-gray/50 transition ${
                drop.status === "pending_review"
                  ? "border-brand-black/30 bg-brand-black/5"
                  : "border-brand-gray/30"
              }`}
              style={{ borderRadius: '0px' }}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Drop Info */}
                <div className="md:col-span-5 flex items-center gap-2">
                  <div className="h-12 w-12 flex-shrink-0 border border-brand-gray/20 overflow-hidden">
                    {drop.image ? (
                      <img
                        src={drop.image}
                        alt={drop.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-brand-gray/10" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-brand-black truncate mb-0.5 leading-tight">
                      {drop.name}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-brand-black/60">
                        {drop.brand}
                      </span>
                      {drop.source.type === "nike-snkrs-scrape" && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-brand-black/10 text-brand-black/70">
                          Scraped
                        </span>
                      )}
                      {!drop.verified && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700">
                          Unverified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Release Date */}
                <div className="md:col-span-2 text-xs">
                  <p className="text-brand-black/70 leading-tight">
                    {new Date(drop.releaseDate).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  {drop.releaseTime && (
                    <p className="text-[10px] text-brand-black/60 leading-tight">
                      {drop.releaseTime}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div className="md:col-span-2">
                  <select
                    value={drop.status}
                    onChange={(e) =>
                      handleUpdateStatus(drop, e.target.value as DropStatus)
                    }
                    className="w-full px-2 py-1 border border-brand-gray/30 bg-brand-white text-xs text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                    style={{ borderRadius: '0px' }}
                  >
                    <option value="pending_review">Pending Review</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live</option>
                    <option value="sold-out">Sold Out</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="md:col-span-3 flex gap-1.5">
                  {drop.status === "pending_review" && !drop.verified && (
                    <>
                      <button
                        onClick={() => handleVerifyDrop(drop)}
                        className="flex-1 px-2 py-1 border border-green-600 bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition leading-tight"
                        style={{ borderRadius: '0px' }}
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => handleRejectDrop(drop)}
                        className="flex-1 px-2 py-1 border border-red-600 bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition leading-tight"
                        style={{ borderRadius: '0px' }}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedDrop(drop)}
                    className="px-2 py-1 border border-brand-gray/30 bg-brand-white text-xs font-medium text-brand-black hover:border-brand-black transition leading-tight"
                    style={{ borderRadius: '0px' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteDrop(drop.id)}
                    className="px-2 py-1 border border-brand-gray/30 bg-brand-white text-xs font-medium text-brand-black hover:border-red-600 hover:text-red-600 transition leading-tight"
                    style={{ borderRadius: '0px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Drop Modal */}
      {(showAddForm || selectedDrop) && (
        <DropFormModal
          drop={selectedDrop}
          onClose={() => {
            setShowAddForm(false);
            setSelectedDrop(null);
          }}
          onSave={async (dropData) => {
            try {
              if (selectedDrop) {
                await updateDrop({ ...selectedDrop, ...dropData });
              } else {
                await createDrop(dropData);
              }
              await loadDrops();
              setShowAddForm(false);
              setSelectedDrop(null);
            } catch (error) {
              console.error("Failed to save drop:", error);
              alert("Failed to save drop. Please try again.");
            }
          }}
        />
      )}
    </div>
  );
};

// Drop Form Modal Component
interface DropFormModalProps {
  drop?: Drop | null;
  onClose: () => void;
  onSave: (drop: Omit<Drop, "id">) => void;
}

const DropFormModal: React.FC<DropFormModalProps> = ({
  drop,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Omit<Drop, "id">>({
    name: drop?.name || "",
    brand: drop?.brand || "Nike",
    image: drop?.image || "",
    releaseDate: drop?.releaseDate || new Date().toISOString().split("T")[0],
    releaseTime: drop?.releaseTime || "",
    retailPrice: drop?.retailPrice,
    retailers: drop?.retailers || [
      {
        name: "nike-snkrs-india",
        displayName: "Nike SNKRS India",
        partnershipStatus: "manual",
      },
    ],
    category: drop?.category || "Sneakers",
    status: drop?.status || "pending_review",
    hypeLevel: drop?.hypeLevel,
    verified: drop?.verified || false,
    source: drop?.source || {
      type: "manual",
      confidence: 100,
    },
    createdAt: drop?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-white border border-brand-gray/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-brand-gray/30">
          <h3 className="text-sm font-semibold text-brand-black">
            {drop ? "Edit Drop" : "Add New Drop"}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-brand-black mb-1">
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-2 py-1 border border-brand-gray/30 bg-brand-white text-xs text-brand-black focus:outline-none focus:border-brand-black"
              style={{ borderRadius: '0px' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-brand-black mb-1">
                Brand *
              </label>
              <input
                type="text"
                required
                value={formData.brand}
                onChange={(e) =>
                  setFormData({ ...formData, brand: e.target.value })
                }
                className="w-full px-2 py-1 border border-brand-gray/30 bg-brand-white text-xs text-brand-black focus:outline-none focus:border-brand-black"
                style={{ borderRadius: '0px' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-black mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-2 py-1 border border-brand-gray/30 bg-brand-white text-xs text-brand-black focus:outline-none focus:border-brand-black"
                style={{ borderRadius: '0px' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-black mb-1">
              Image URL
            </label>
            <input
              type="url"
              value={formData.image}
              onChange={(e) =>
                setFormData({ ...formData, image: e.target.value })
              }
              className="w-full px-2 py-1 border border-brand-gray/30 bg-brand-white text-xs text-brand-black focus:outline-none focus:border-brand-black"
              style={{ borderRadius: '0px' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-brand-black mb-1">
                Release Date *
              </label>
              <input
                type="date"
                required
                value={formData.releaseDate}
                onChange={(e) =>
                  setFormData({ ...formData, releaseDate: e.target.value })
                }
                className="w-full px-2 py-1 border border-brand-gray/30 bg-brand-white text-xs text-brand-black focus:outline-none focus:border-brand-black"
                style={{ borderRadius: '0px' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-black mb-1">
                Release Time
              </label>
              <input
                type="text"
                placeholder="e.g., 4:31 AM IST"
                value={formData.releaseTime}
                onChange={(e) =>
                  setFormData({ ...formData, releaseTime: e.target.value })
                }
                className="w-full px-2 py-1 border border-brand-gray/30 bg-brand-white text-xs text-brand-black focus:outline-none focus:border-brand-black"
                style={{ borderRadius: '0px' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-black mb-1">
              Retail Price (₹)
            </label>
            <input
              type="number"
              value={formData.retailPrice || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  retailPrice: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className="w-full px-2 py-1 border border-brand-gray/30 bg-brand-white text-xs text-brand-black focus:outline-none focus:border-brand-black"
              style={{ borderRadius: '0px' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-black mb-1">
              Hype Level
            </label>
            <select
              value={formData.hypeLevel || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  hypeLevel: e.target.value ? (e.target.value as 'low' | 'medium' | 'high' | 'extreme') : undefined,
                })
              }
              className="w-full px-2 py-1 border border-brand-gray/30 bg-brand-white text-xs text-brand-black focus:outline-none focus:border-brand-black"
              style={{ borderRadius: '0px' }}
            >
              <option value="">Not Set</option>
              <option value="low">Low Hype</option>
              <option value="medium">Medium Hype</option>
              <option value="high">High Hype</option>
              <option value="extreme">Extreme Hype</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-3 py-1.5 border border-brand-black bg-brand-black text-brand-white text-xs font-medium hover:bg-brand-black/90 transition"
              style={{ borderRadius: '0px' }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-1.5 border border-brand-gray/30 bg-brand-white text-brand-black text-xs font-medium hover:border-brand-black transition"
              style={{ borderRadius: '0px' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

