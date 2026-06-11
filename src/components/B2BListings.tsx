import React, { useState, useEffect } from "react";
import { storage } from "../utils/storage";
import { analytics } from "../utils/analytics";
import { fetchAllB2BListings, createB2BListing } from "../utils/b2bListingsApi";

export type B2BSide = "WTS" | "WTB";

export interface B2BListing {
  id: number;
  assetName: string;
  sku?: string;
  size?: string;
  side: B2BSide;
  price?: number;
  groupName?: string;
  contact?: string;
  notes?: string;
  createdAt: string; // ISO string
}

export const B2BListings: React.FC = () => {
  const [listings, setListings] = useState<B2BListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [sideFilter, setSideFilter] = useState<"all" | B2BSide>("all");
  const [textFilter, setTextFilter] = useState("");

  const [assetName, setAssetName] = useState("");
  const [sku, setSku] = useState("");
  const [size, setSize] = useState("");
  const [side, setSide] = useState<B2BSide>("WTS");
  const [price, setPrice] = useState("");
  const [groupName, setGroupName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch listings from Firebase on mount
  useEffect(() => {
    const loadListings = async () => {
      setListingsLoading(true);
      try {
        const fetchedListings = await fetchAllB2BListings();
        setListings(fetchedListings);
        // Also save to localStorage as cache/fallback
        storage.saveB2BListings(fetchedListings);
      } catch (error) {
        console.error("Failed to load B2B listings:", error);
        // Fallback to localStorage
        const localListings = storage.loadB2BListings();
        setListings(localListings || []);
      } finally {
        setListingsLoading(false);
      }
    };
    loadListings();
  }, []);

  // Cache listings to localStorage when they change (for offline fallback)
  useEffect(() => {
    if (listings.length > 0) {
      storage.saveB2BListings(listings);
    }
  }, [listings]);

  const handleAddListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim()) return;

    const now = new Date().toISOString();
    const newListingData: Omit<B2BListing, "id"> = {
      assetName: assetName.trim(),
      sku: sku.trim() || undefined,
      size: size.trim() || undefined,
      side,
      price: price ? Number(price) : undefined,
      groupName: groupName.trim() || undefined,
      contact: contact.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: now,
    };

    try {
      const newListing = await createB2BListing(newListingData);
      setListings([newListing, ...listings]);
      analytics.trackAnalystAction("b2b_listing_added", {
        side: newListing.side,
        assetName: newListing.assetName,
      });
      setAssetName("");
      setSku("");
      setSize("");
      setPrice("");
      setGroupName("");
      setContact("");
      setNotes("");
    } catch (error) {
      console.error("Failed to create B2B listing:", error);
      alert("Failed to save listing. Please try again.");
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} · ${d
      .toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      .toLowerCase()}`;
  };

  const filteredListings = listings.filter((listing) => {
    if (sideFilter !== "all" && listing.side !== sideFilter) return false;
    if (!textFilter.trim()) return true;
    const haystack = `${listing.assetName} ${listing.sku ?? ""} ${listing.groupName ?? ""} ${
      listing.contact ?? ""
    } ${listing.notes ?? ""}`.toLowerCase();
    return haystack.includes(textFilter.toLowerCase());
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Listings table */}
      <div className="lg:col-span-2 border border-brand-gray/20 rounded-none p-4 bg-brand-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-body font-normal text-brand-black mb-1">
              B2B WhatsApp listings
            </h2>
            <p className="text-xs text-brand-black">
              Daily WTS / WTB quotes captured from reseller WhatsApp groups.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm font-body">
            <select
              value={sideFilter}
              onChange={(e) => setSideFilter(e.target.value as any)}
              className="border border-brand-gray/20 rounded-none px-2 py-1 bg-brand-white text-brand-black text-sm"
            >
              <option value="all">All</option>
              <option value="WTS">WTS (sellers)</option>
              <option value="WTB">WTB (buyers)</option>
            </select>
            <input
              value={textFilter}
              onChange={(e) => setTextFilter(e.target.value)}
              placeholder="Filter by asset, group, contact…"
              className="border border-brand-gray/20 rounded-none px-2 py-1 bg-brand-white text-sm text-brand-black placeholder:text-brand-gray"
            />
          </div>
        </div>

        {listingsLoading ? (
          <div className="py-8 text-center text-sm text-brand-black/70">
            Loading B2B listings...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-brand-black border-separate border-spacing-y-1">
              <thead>
                <tr className="text-left">
                  <th className="font-normal pb-2">When</th>
                  <th className="font-normal pb-2">Asset</th>
                  <th className="font-normal pb-2">Side</th>
                  <th className="font-normal pb-2">Size</th>
                  <th className="font-normal pb-2">Price (₹)</th>
                  <th className="font-normal pb-2">Group</th>
                  <th className="font-normal pb-2">Contact</th>
                  <th className="font-normal pb-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-sm text-brand-black/70">
                      No B2B listings added yet. Start by logging WTS / WTB quotes from your WhatsApp groups.
                    </td>
                  </tr>
                ) : (
                  filteredListings.map((listing) => (
                    <tr key={listing.id} className="align-top">
                      <td className="py-1 pr-2 whitespace-nowrap text-brand-black/80">
                        {formatDateTime(listing.createdAt)}
                      </td>
                      <td className="py-1 pr-2">
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[160px]">{listing.assetName}</span>
                          {listing.sku && (
                            <span className="text-xs text-brand-black/70">{listing.sku}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-1 pr-2">
                        <span
                          className={`px-1.5 py-0.5 text-xs rounded-none border font-medium ${
                            listing.side === "WTS"
                              ? "border-down/40 text-down"
                              : "border-up/40 text-up"
                          }`}
                        >
                          {listing.side}
                        </span>
                      </td>
                      <td className="py-1 pr-2">{listing.size || "—"}</td>
                      <td className="py-1 pr-2">
                        {listing.price ? `₹${listing.price.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="py-1 pr-2">{listing.groupName || "—"}</td>
                      <td className="py-1 pr-2">{listing.contact || "—"}</td>
                      <td className="py-1 pr-2 max-w-[180px]">
                        <span className="line-clamp-2">{listing.notes || "—"}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add listing form */}
      <div className="lg:col-span-1 border border-brand-gray/20 rounded-none p-4 bg-brand-white">
        <h2 className="text-lg font-body font-normal text-brand-black mb-2">
          Add B2B listing
        </h2>
        <p className="text-xs text-brand-black mb-4">
          Log individual WTS / WTB messages from your WhatsApp groups. Keep it simple and fast.
        </p>

        <form onSubmit={handleAddListing} className="space-y-3 text-sm">
          <div>
            <label className="block mb-1 text-brand-black">Asset name *</label>
            <input
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              className="w-full border border-brand-gray/20 rounded-none px-2 py-1.5 bg-brand-white text-brand-black"
              placeholder="e.g. Jordan 4 Military Black UK9"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block mb-1 text-brand-black">SKU</label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full border border-brand-gray/20 rounded-none px-2 py-1.5 bg-brand-white text-brand-black"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block mb-1 text-brand-black">Size</label>
              <input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full border border-brand-gray/20 rounded-none px-2 py-1.5 bg-brand-white text-brand-black"
                placeholder="e.g. UK 9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block mb-1 text-brand-black">Side</label>
              <select
                value={side}
                onChange={(e) => setSide(e.target.value as B2BSide)}
                className="w-full border border-brand-gray/20 rounded-none px-2 py-1.5 bg-brand-white text-brand-black"
              >
                <option value="WTS">WTS (seller)</option>
                <option value="WTB">WTB (buyer)</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 text-brand-black">Price (₹)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-brand-gray/20 rounded-none px-2 py-1.5 bg-brand-white text-brand-black"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 text-brand-black">WhatsApp group</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full border border-brand-gray/20 rounded-none px-2 py-1.5 bg-brand-white text-brand-black"
              placeholder="e.g. Sneaker B2B India"
            />
          </div>

          <div>
            <label className="block mb-1 text-brand-black">Reseller contact</label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full border border-brand-gray/20 rounded-none px-2 py-1.5 bg-brand-white text-brand-black"
              placeholder="Name or handle"
            />
          </div>

          <div>
            <label className="block mb-1 text-brand-black">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-brand-gray/20 rounded-none px-2 py-1.5 bg-brand-white text-brand-black min-h-[60px]"
              placeholder="Any special conditions, bundle offers, etc."
            />
          </div>

          <button
            type="submit"
            className="mt-1 w-full py-2 rounded-none border border-accent bg-accent text-terminal-bg text-sm font-medium hover:bg-accent/90"
          >
            Save listing
          </button>
        </form>
      </div>
    </div>
  );
};

