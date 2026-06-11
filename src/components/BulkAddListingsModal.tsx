import React, { useState, useEffect } from "react";
import { PricePoint, MarketChannel } from "../types";
import { convertUSDToINR, getUSDToINRRate } from "../utils/exchangeRate";

interface BulkAddListingsModalProps {
  selectedSize: string | null;
  onAddListings: (listings: PricePoint[]) => void;
  onClose: () => void;
}

type EntryMode = "csv" | "form";

interface ListingFormData {
  channel: MarketChannel;
  price: string;
  priceUSD: string;
  listingCount: string;
  transactionType?: "buy" | "sell";
  sellerName: string;
  sellerLocation: string;
  sellerContact: string;
  source: string;
  marketplaceName: string;
  platform: string;
  reshippingCost: string;
  url: string;
}

const marketplaceOptions = [
  { value: 'crepdogcrew', label: 'CrepdogCrew' },
  { value: 'mainstreet', label: 'Mainstreet Marketplace' },
  { value: 'culturecircle', label: 'Culture Circle' },
  { value: 'hypefly', label: 'Hypefly' },
  { value: 'dawntown', label: 'Dawntown' },
  { value: '10hillsstudio', label: '10 Hills Studio' },
  { value: 'hustleculture', label: 'Hustle Culture' },
  { value: 'findyourkicks', label: 'Find your Kicks' },
  { value: 'instagram', label: 'Instagram Seller' },
  { value: 'facebook', label: 'Facebook Marketplace' },
  { value: 'other', label: 'Other' },
];

const platformOptions = [
  { value: 'stockx', label: 'StockX' },
  { value: 'goat', label: 'Goat' },
  { value: 'ebay', label: 'eBay' },
  { value: 'other', label: 'Other' },
];

export const BulkAddListingsModal: React.FC<BulkAddListingsModalProps> = ({
  selectedSize,
  onAddListings,
  onClose,
}) => {
  const [entryMode, setEntryMode] = useState<EntryMode>("csv");
  const [csvText, setCsvText] = useState("");
  const [formEntries, setFormEntries] = useState<ListingFormData[]>([
    {
      channel: "whatsapp",
      price: "",
      priceUSD: "",
      listingCount: "",
      transactionType: "buy",
      sellerName: "",
      sellerLocation: "",
      sellerContact: "",
      source: "whatsapp-group-mumbai",
      marketplaceName: "crepdogcrew",
      platform: "stockx",
      reshippingCost: "",
      url: "",
    },
  ]);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Load exchange rate
  useEffect(() => {
    getUSDToINRRate()
      .then(rate => setExchangeRate(rate))
      .catch(console.error);
  }, []);

  const parseCSV = (text: string): ListingFormData[] => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Expected CSV format:
    // Channel,Price,Quantity,TransactionType,SellerName,Location,Contact,Source/Marketplace/Platform,URL,ReshippingCost
    // whatsapp,12000,2,buy,John Doe,Delhi,+91 98765 43210,whatsapp-group-mumbai,,
    // marketplace,15000,1,,,CrepdogCrew,,https://example.com,,
    // international,150,1,,,stockx,,https://stockx.com,2000

    const entries: ListingFormData[] = [];
    const csvErrors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const row = i + 1;
      const parts = line.split(',').map(p => p.trim());

      if (parts.length < 3) {
        csvErrors.push(`Row ${row}: Insufficient columns. Need at least: Channel, Price, Quantity`);
        continue;
      }

      const channel = parts[0].toLowerCase() as MarketChannel;
      if (!['whatsapp', 'marketplace', 'international'].includes(channel)) {
        csvErrors.push(`Row ${row}: Invalid channel "${parts[0]}". Must be: whatsapp, marketplace, or international`);
        continue;
      }

      const entry: ListingFormData = {
        channel,
        price: channel === "international" ? "" : parts[1],
        priceUSD: channel === "international" ? parts[1] : "",
        listingCount: parts[2],
        transactionType: channel === "whatsapp" ? (parts[3] === "sell" ? "sell" : "buy") : undefined,
        sellerName: channel === "whatsapp" ? (parts[4] || "") : "",
        sellerLocation: channel === "whatsapp" ? (parts[5] || "") : "",
        sellerContact: channel === "whatsapp" ? (parts[6] || "") : "",
        source: channel === "whatsapp" ? (parts[7] || "whatsapp-group") : 
                channel === "marketplace" ? (parts[4] || "crepdogcrew") : 
                (parts[4] || "stockx"),
        marketplaceName: channel === "marketplace" ? (parts[4] || "crepdogcrew") : "",
        platform: channel === "international" ? (parts[4] || "stockx") : "",
        url: parts[8] || "",
        reshippingCost: channel === "international" ? (parts[9] || "") : "",
      };

      entries.push(entry);
    }

    if (csvErrors.length > 0) {
      setErrors(csvErrors);
    } else {
      setErrors([]);
    }

    return entries;
  };

  const convertFormDataToPricePoints = async (entries: ListingFormData[]): Promise<PricePoint[]> => {
    const pricePoints: PricePoint[] = [];
    const conversionErrors: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const row = i + 1;

      if (!selectedSize) {
        conversionErrors.push(`Row ${row}: No size selected`);
        continue;
      }

      let finalPrice: number;
      if (entry.channel === "international") {
        const usd = parseFloat(entry.priceUSD);
        if (isNaN(usd) || usd <= 0) {
          conversionErrors.push(`Row ${row}: Invalid USD price`);
          continue;
        }
        try {
          finalPrice = await convertUSDToINR(usd);
        } catch (error) {
          const fallbackRate = exchangeRate || 83;
          finalPrice = usd * fallbackRate;
        }
      } else {
        const inr = parseFloat(entry.price);
        if (isNaN(inr) || inr <= 0) {
          conversionErrors.push(`Row ${row}: Invalid INR price`);
          continue;
        }
        finalPrice = inr;
      }

      const count = parseInt(entry.listingCount);
      if (isNaN(count) || count <= 0) {
        conversionErrors.push(`Row ${row}: Invalid quantity`);
        continue;
      }

      const pricePoint: PricePoint = {
        price: finalPrice,
        listingCount: count,
        channel: entry.channel,
        size: selectedSize,
        lastSeen: new Date(),
      };

      if (entry.channel === "whatsapp") {
        pricePoint.transactionType = entry.transactionType || "buy";
        pricePoint.sellerName = entry.sellerName || undefined;
        pricePoint.sellerLocation = entry.sellerLocation || undefined;
        pricePoint.sellerContact = entry.sellerContact || undefined;
        pricePoint.source = entry.source || "whatsapp-group";
      } else if (entry.channel === "marketplace") {
        const selected = marketplaceOptions.find(opt => opt.value === entry.marketplaceName);
        pricePoint.marketplaceName = selected?.label;
        pricePoint.source = entry.marketplaceName;
        pricePoint.url = entry.url || undefined;
      } else {
        const selected = platformOptions.find(opt => opt.value === entry.platform);
        pricePoint.marketplaceName = selected?.label;
        pricePoint.source = entry.platform;
        pricePoint.reshippingCost = entry.reshippingCost ? parseFloat(entry.reshippingCost) : undefined;
        pricePoint.url = entry.url || undefined;
      }

      pricePoints.push(pricePoint);
    }

    if (conversionErrors.length > 0) {
      setErrors(prev => [...prev, ...conversionErrors]);
    }

    return pricePoints;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSize) {
      alert("Please select a size first");
      return;
    }

    setErrors([]);

    let entries: ListingFormData[];
    if (entryMode === "csv") {
      if (!csvText.trim()) {
        setErrors(["Please enter CSV data"]);
        return;
      }
      entries = parseCSV(csvText);
      if (entries.length === 0) {
        setErrors(["No valid entries found in CSV"]);
        return;
      }
    } else {
      // Filter out empty entries
      entries = formEntries.filter(e => e.price || e.priceUSD);
      if (entries.length === 0) {
        setErrors(["Please add at least one listing"]);
        return;
      }
    }

    if (errors.length > 0) {
      return;
    }

    try {
      const pricePoints = await convertFormDataToPricePoints(entries);
      if (pricePoints.length === 0) {
        alert("No valid listings could be created. Please check your data.");
        return;
      }

      onAddListings(pricePoints);
      onClose();
    } catch (error) {
      console.error("Failed to add listings:", error);
      alert(`Failed to add listings: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const addFormEntry = () => {
    setFormEntries([
      ...formEntries,
      {
        channel: "whatsapp",
        price: "",
        priceUSD: "",
        listingCount: "",
        transactionType: "buy",
        sellerName: "",
        sellerLocation: "",
        sellerContact: "",
        source: "whatsapp-group-mumbai",
        marketplaceName: "crepdogcrew",
        platform: "stockx",
        reshippingCost: "",
        url: "",
      },
    ]);
  };

  const removeFormEntry = (index: number) => {
    setFormEntries(formEntries.filter((_, i) => i !== index));
  };

  const updateFormEntry = (index: number, field: keyof ListingFormData, value: any) => {
    const updated = [...formEntries];
    updated[index] = { ...updated[index], [field]: value };
    setFormEntries(updated);
  };

  const csvExample = `whatsapp,12000,2,buy,John Doe,Delhi,+91 98765 43210,whatsapp-group-mumbai,,
whatsapp,12500,1,sell,Jane Smith,Mumbai,+91 98765 43211,whatsapp-group-delhi,,
marketplace,15000,1,,,crepdogcrew,,https://example.com,,
international,150,1,,,stockx,,https://stockx.com,2000`;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start md:items-center justify-center overflow-y-auto p-3">
      <div className="relative w-full md:max-w-4xl max-h-[90vh] overflow-y-auto bg-brand-white border border-brand-gray/30 shadow-2xl">
        <div className="sticky top-0 z-10 flex justify-between items-center px-3 py-2 bg-brand-white border-b border-brand-gray/30">
          <h2 className="text-base font-heading font-normal text-brand-black uppercase tracking-wide leading-tight">
            Bulk Add Listings
          </h2>
          <button
            onClick={onClose}
            className="text-brand-black hover:text-brand-black text-base px-2 py-1 leading-tight"
          >
            ✕
          </button>
        </div>
        <div className="p-3 md:p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Entry Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setEntryMode("csv")}
                className={`px-3 py-1.5 border text-xs font-semibold uppercase tracking-wide transition ${
                  entryMode === "csv"
                    ? "border-brand-black bg-brand-black text-white"
                    : "border-brand-gray/30 bg-white text-brand-black hover:bg-brand-gray/10"
                }`}
              >
                CSV Paste
              </button>
              <button
                type="button"
                onClick={() => setEntryMode("form")}
                className={`px-3 py-1.5 border text-xs font-semibold uppercase tracking-wide transition ${
                  entryMode === "form"
                    ? "border-brand-black bg-brand-black text-white"
                    : "border-brand-gray/30 bg-white text-brand-black hover:bg-brand-gray/10"
                }`}
              >
                Form Entry
              </button>
            </div>

            {/* Size Display */}
            <div>
              <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                Size <span className="text-red-600 font-normal">*</span>
              </label>
              <input
                type="text"
                value={selectedSize || ""}
                disabled
                className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black bg-brand-gray/10 leading-tight"
              />
            </div>

            {/* CSV Mode */}
            {entryMode === "csv" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                    CSV Data <span className="text-red-600 font-normal">*</span>
                  </label>
                  <textarea
                    value={csvText}
                    onChange={(e) => {
                      setCsvText(e.target.value);
                      setErrors([]);
                    }}
                    className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-mono text-brand-black focus:outline-none focus:border-brand-black leading-tight resize-none"
                    rows={10}
                    placeholder="Paste CSV data here..."
                  />
                  <p className="text-[9px] text-brand-black/50 mt-1 leading-tight">
                    Format: Channel,Price,Quantity,TransactionType,SellerName,Location,Contact,Source/Marketplace/Platform,URL,ReshippingCost
                  </p>
                </div>
                <div className="border border-brand-gray/20 bg-brand-gray/5 p-2">
                  <p className="text-[9px] font-semibold text-brand-black uppercase tracking-wide mb-1">Example:</p>
                  <pre className="text-[9px] font-mono text-brand-black/70 whitespace-pre-wrap leading-tight">{csvExample}</pre>
                </div>
              </div>
            )}

            {/* Form Mode */}
            {entryMode === "form" && (
              <div className="space-y-4">
                {formEntries.map((entry, index) => (
                  <div key={index} className="border border-brand-gray/20 p-3 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-brand-black uppercase tracking-wide">
                        Listing {index + 1}
                      </span>
                      {formEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFormEntry(index)}
                          className="text-red-600 text-xs hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                          Channel <span className="text-red-600 font-normal">*</span>
                        </label>
                        <select
                          value={entry.channel}
                          onChange={(e) => updateFormEntry(index, "channel", e.target.value as MarketChannel)}
                          className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                        >
                          <option value="whatsapp">WhatsApp & Reseller</option>
                          <option value="marketplace">Indian Marketplaces</option>
                          <option value="international">International (StockX/Goat)</option>
                        </select>
                      </div>

                      {entry.channel === "international" ? (
                        <div>
                          <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                            Price ($) <span className="text-red-600 font-normal">*</span>
                          </label>
                          <input
                            type="number"
                            value={entry.priceUSD}
                            onChange={(e) => updateFormEntry(index, "priceUSD", e.target.value)}
                            className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                            placeholder="150"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                            Price (₹) <span className="text-red-600 font-normal">*</span>
                          </label>
                          <input
                            type="number"
                            value={entry.price}
                            onChange={(e) => updateFormEntry(index, "price", e.target.value)}
                            className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                            placeholder="12000"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                          Quantity <span className="text-red-600 font-normal">*</span>
                        </label>
                        <input
                          type="number"
                          value={entry.listingCount}
                          onChange={(e) => updateFormEntry(index, "listingCount", e.target.value)}
                          className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                          placeholder="2"
                        />
                      </div>

                      {entry.channel === "whatsapp" && (
                        <div>
                          <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                            Type
                          </label>
                          <select
                            value={entry.transactionType}
                            onChange={(e) => updateFormEntry(index, "transactionType", e.target.value)}
                            className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                          >
                            <option value="buy">WTS (Want to Sell)</option>
                            <option value="sell">WTB (Want to Buy)</option>
                          </select>
                        </div>
                      )}

                      {entry.channel === "marketplace" && (
                        <div>
                          <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                            Marketplace
                          </label>
                          <select
                            value={entry.marketplaceName}
                            onChange={(e) => updateFormEntry(index, "marketplaceName", e.target.value)}
                            className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                          >
                            {marketplaceOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {entry.channel === "international" && (
                        <>
                          <div>
                            <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                              Platform
                            </label>
                            <select
                              value={entry.platform}
                              onChange={(e) => updateFormEntry(index, "platform", e.target.value)}
                              className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                            >
                              {platformOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                              Reshipping (₹)
                            </label>
                            <input
                              type="number"
                              value={entry.reshippingCost}
                              onChange={(e) => updateFormEntry(index, "reshippingCost", e.target.value)}
                              className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                              placeholder="2000"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {entry.channel === "whatsapp" && (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                            Seller Name
                          </label>
                          <input
                            type="text"
                            value={entry.sellerName}
                            onChange={(e) => updateFormEntry(index, "sellerName", e.target.value)}
                            className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                            Location
                          </label>
                          <input
                            type="text"
                            value={entry.sellerLocation}
                            onChange={(e) => updateFormEntry(index, "sellerLocation", e.target.value)}
                            className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                            placeholder="Delhi"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                            Contact
                          </label>
                          <input
                            type="text"
                            value={entry.sellerContact}
                            onChange={(e) => updateFormEntry(index, "sellerContact", e.target.value)}
                            className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                            placeholder="+91 98765 43210"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                            Source/Group
                          </label>
                          <input
                            type="text"
                            value={entry.source}
                            onChange={(e) => updateFormEntry(index, "source", e.target.value)}
                            className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                            placeholder="whatsapp-group-mumbai"
                          />
                        </div>
                      </div>
                    )}

                    {(entry.channel === "marketplace" || entry.channel === "international") && (
                      <div>
                        <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                          URL
                        </label>
                        <input
                          type="url"
                          value={entry.url}
                          onChange={(e) => updateFormEntry(index, "url", e.target.value)}
                          className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                          placeholder="https://..."
                        />
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addFormEntry}
                  className="w-full px-3 py-1.5 border border-brand-gray/30 text-brand-black text-xs font-semibold uppercase tracking-wide hover:bg-brand-gray/10 transition leading-tight"
                >
                  + Add Another Listing
                </button>
              </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <div className="border border-red-500/30 bg-red-500/5 p-3">
                <h3 className="text-[10px] font-semibold text-red-700 mb-1.5 uppercase leading-tight">Errors <span className="font-mono-numeric">({errors.length})</span></h3>
                <ul className="list-disc list-inside space-y-0.5">
                  {errors.map((error, i) => (
                    <li key={i} className="text-[10px] text-red-600 leading-tight">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-brand-gray/20">
              <button
                type="submit"
                className="px-3 py-1.5 border border-brand-black bg-brand-black text-brand-white text-xs font-semibold uppercase tracking-wide hover:bg-brand-black/90 transition leading-tight"
              >
                Add {entryMode === "csv" ? "All Listings" : `${formEntries.filter(e => e.price || e.priceUSD).length} Listing(s)`}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 border border-brand-gray/30 text-brand-black text-xs font-semibold uppercase tracking-wide hover:bg-brand-gray/10 transition leading-tight"
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

