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
    <div className="space-y-5">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-brand-black mb-1">
            Drops Management
          </h2>
          <p className="text-sm text-brand-black/60">
            Review and manage upcoming sneaker releases
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-brand-black text-brand-white text-sm font-medium hover:bg-brand-black/90 transition-all"
          >
            + Add Drop
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-brand-white p-4 border border-brand-gray/20">
          <p className="text-xs text-brand-black/50 font-medium mb-1">
            Pending Review
          </p>
          <p className="text-xl font-mono-numeric font-semibold text-brand-black">
            {pendingDrops.length}
          </p>
        </div>
        <div className="bg-brand-white p-4 border border-brand-gray/20">
          <p className="text-xs text-brand-black/50 font-medium mb-1">
            Upcoming
          </p>
          <p className="text-xl font-mono-numeric font-semibold text-brand-black">
            {upcomingDrops.length}
          </p>
        </div>
        <div className="bg-brand-white p-4 border border-brand-gray/20">
          <p className="text-xs text-brand-black/50 font-medium mb-1">
            Total
          </p>
          <p className="text-xl font-mono-numeric font-semibold text-brand-black">
            {drops.length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search drops..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-brand-gray/20 bg-brand-white text-sm text-brand-black placeholder:text-brand-black/40 focus:outline-none focus:border-brand-black/40 transition-colors"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as DropStatus | "all")}
          className="px-3 py-2 border border-brand-gray/20 bg-brand-white text-sm text-brand-black focus:outline-none focus:border-brand-black/40 transition-colors"
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
        <div className="bg-brand-white border border-brand-gray/20 p-10 text-center">
          <p className="text-sm text-brand-black/50">Loading drops...</p>
        </div>
      ) : filteredDrops.length === 0 ? (
        <div className="bg-brand-white border border-brand-gray/20 p-10 text-center">
          <p className="text-sm text-brand-black/50">No drops found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDrops.map((drop, index) => (
            <div
              key={`drop-${drop.id}-${drop.name}-${index}`}
              className={`border p-4 bg-brand-white hover:border-brand-gray/40 transition-all ${
                drop.status === "pending_review"
                  ? "border-brand-black/20 bg-brand-black/[0.02]"
                  : "border-brand-gray/20"
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Drop Info */}
                <div className="md:col-span-5 flex items-center gap-3">
                  <div className="h-14 w-14 flex-shrink-0 border border-brand-gray/15 overflow-hidden">
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
                    <p className="text-sm font-semibold text-brand-black truncate mb-1">
                      {drop.name}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-brand-black/50">
                        {drop.brand}
                      </span>
                      {drop.source.type === "nike-snkrs-scrape" && (
                        <span className="text-[10px] px-2 py-0.5 bg-brand-black/5 text-brand-black/60">
                          Scraped
                        </span>
                      )}
                      {!drop.verified && (
                        <span className="text-[10px] px-2 py-0.5 bg-orange-50 text-orange-600">
                          Unverified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Release Date */}
                <div className="md:col-span-2 text-sm">
                  <p className="text-brand-black/60">
                    {new Date(drop.releaseDate).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  {drop.releaseTime && (
                    <p className="text-xs text-brand-black/40 mt-0.5">
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
                    className="w-full px-2.5 py-1.5 border border-brand-gray/20 bg-brand-white text-xs text-brand-black focus:outline-none focus:border-brand-black/40 transition-colors"
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
                <div className="md:col-span-3 flex gap-2">
                  {drop.status === "pending_review" && !drop.verified && (
                    <>
                      <button
                        onClick={() => handleVerifyDrop(drop)}
                        className="flex-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-all"
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => handleRejectDrop(drop)}
                        className="flex-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-all"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedDrop(drop)}
                    className="px-3 py-1.5 border border-brand-gray/20 bg-brand-white text-xs font-medium text-brand-black hover:border-brand-black/40 transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteDrop(drop.id)}
                    className="px-3 py-1.5 border border-brand-gray/20 bg-brand-white text-xs font-medium text-brand-black hover:border-red-400 hover:text-red-600 transition-all"
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-brand-white border border-brand-gray/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 12px 40px 0 rgba(0, 0, 0, 0.65)' }}>
        <div className="p-5 border-b border-brand-gray/15">
          <h3 className="text-base font-semibold text-brand-black">
            {drop ? "Edit Drop" : "Add New Drop"}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-brand-gray/20 bg-brand-white text-sm text-brand-black focus:outline-none focus:border-brand-black/40 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-black mb-1.5">
                Brand *
              </label>
              <input
                type="text"
                required
                value={formData.brand}
                onChange={(e) =>
                  setFormData({ ...formData, brand: e.target.value })
                }
                className="w-full px-3 py-2 border border-brand-gray/20 bg-brand-white text-sm text-brand-black focus:outline-none focus:border-brand-black/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-black mb-1.5">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-3 py-2 border border-brand-gray/20 bg-brand-white text-sm text-brand-black focus:outline-none focus:border-brand-black/40 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
              Image URL
            </label>
            <input
              type="url"
              value={formData.image}
              onChange={(e) =>
                setFormData({ ...formData, image: e.target.value })
              }
              className="w-full px-3 py-2 border border-brand-gray/20 bg-brand-white text-sm text-brand-black focus:outline-none focus:border-brand-black/40 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-black mb-1.5">
                Release Date *
              </label>
              <input
                type="date"
                required
                value={formData.releaseDate}
                onChange={(e) =>
                  setFormData({ ...formData, releaseDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-brand-gray/20 bg-brand-white text-sm text-brand-black focus:outline-none focus:border-brand-black/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-black mb-1.5">
                Release Time
              </label>
              <input
                type="text"
                placeholder="e.g., 4:31 AM IST"
                value={formData.releaseTime}
                onChange={(e) =>
                  setFormData({ ...formData, releaseTime: e.target.value })
                }
                className="w-full px-3 py-2 border border-brand-gray/20 bg-brand-white text-sm text-brand-black focus:outline-none focus:border-brand-black/40 placeholder:text-brand-black/30 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
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
              className="w-full px-3 py-2 border border-brand-gray/20 bg-brand-white text-sm text-brand-black focus:outline-none focus:border-brand-black/40 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-black mb-1.5">
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
              className="w-full px-3 py-2 border border-brand-gray/20 bg-brand-white text-sm text-brand-black focus:outline-none focus:border-brand-black/40 transition-colors"
            >
              <option value="">Not Set</option>
              <option value="low">Low Hype</option>
              <option value="medium">Medium Hype</option>
              <option value="high">High Hype</option>
              <option value="extreme">Extreme Hype</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-brand-black text-brand-white text-sm font-medium hover:bg-brand-black/90 transition-all"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-brand-gray/20 bg-brand-white text-brand-black text-sm font-medium hover:border-brand-black/40 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

