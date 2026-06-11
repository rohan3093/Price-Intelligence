import React, { useState, useEffect } from "react";
import { PricePoint, MarketChannel } from "../types";
import { convertUSDToINR, getUSDToINRRate } from "../utils/exchangeRate";

interface AddListingModalProps {
  selectedSize: string | null;
  onAddListing: (listing: PricePoint) => void;
  onClose: () => void;
}

export const AddListingModal: React.FC<AddListingModalProps> = ({
  selectedSize,
  onAddListing,
  onClose,
}) => {
  const [channel, setChannel] = useState<MarketChannel>("whatsapp");
  const [price, setPrice] = useState("");
  const [listingCount, setListingCount] = useState("");
  
  // WhatsApp specific
  const [transactionType, setTransactionType] = useState<"buy" | "sell">("buy");
  const [sellerName, setSellerName] = useState("");
  const [sellerLocation, setSellerLocation] = useState("");
  const [sellerContact, setSellerContact] = useState("");
  const [source, setSource] = useState("whatsapp-group-mumbai");
  
  // Marketplace specific
  const [marketplaceName, setMarketplaceName] = useState("crepdogcrew");
  const [url, setUrl] = useState("");
  
  // International specific
  const [platform, setPlatform] = useState("stockx");
  const [reshippingCost, setReshippingCost] = useState("");
  const [priceUSD, setPriceUSD] = useState("");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);

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

  // Load exchange rate for international
  useEffect(() => {
    if (channel === "international") {
      setIsLoadingRate(true);
      getUSDToINRRate()
        .then(rate => setExchangeRate(rate))
        .catch(console.error)
        .finally(() => setIsLoadingRate(false));
    }
  }, [channel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSize) {
      alert("Please select a size first");
      return;
    }

    let finalPrice: number;
    if (channel === "international") {
      const usd = parseFloat(priceUSD);
      if (isNaN(usd) || usd <= 0) {
        alert("Please enter a valid price in USD");
        return;
      }
      try {
        finalPrice = await convertUSDToINR(usd);
      } catch (error) {
        console.error("Failed to convert USD to INR:", error);
        const fallbackRate = exchangeRate || 83;
        finalPrice = usd * fallbackRate;
      }
    } else {
      const inr = parseFloat(price);
      if (isNaN(inr) || inr <= 0) {
        alert("Please enter a valid price");
        return;
      }
      finalPrice = inr;
    }

    const count = parseInt(listingCount);
    if (isNaN(count) || count <= 0) {
      alert("Please enter a valid listing count");
      return;
    }

    const newListing: PricePoint = {
      price: finalPrice,
      listingCount: count,
      channel,
      size: selectedSize,
      lastSeen: new Date(),
    };

    if (channel === "whatsapp") {
      newListing.transactionType = transactionType;
      newListing.sellerName = sellerName || undefined;
      newListing.sellerLocation = sellerLocation || undefined;
      newListing.sellerContact = sellerContact || undefined;
      newListing.source = source || "whatsapp-group";
    } else if (channel === "marketplace") {
      const selected = marketplaceOptions.find(opt => opt.value === marketplaceName);
      newListing.marketplaceName = selected?.label;
      newListing.source = marketplaceName;
      newListing.url = url || undefined;
    } else {
      const selected = platformOptions.find(opt => opt.value === platform);
      newListing.marketplaceName = selected?.label;
      newListing.source = platform;
      newListing.reshippingCost = reshippingCost ? parseFloat(reshippingCost) : undefined;
      newListing.url = url || undefined;
    }

    onAddListing(newListing);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start md:items-center justify-center overflow-y-auto p-3">
      <div className="relative w-full md:max-w-2xl max-h-[90vh] overflow-y-auto bg-brand-white border border-brand-gray/30 shadow-modal">
        <div className="sticky top-0 z-10 flex justify-between items-center px-3 py-2 bg-brand-white border-b border-brand-gray/30">
          <h2 className="text-base font-heading font-normal text-brand-black uppercase tracking-wide leading-tight">
            Add Listing
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
            {/* Channel Selector */}
            <div>
              <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                Channel <span className="text-red-600 font-normal">*</span>
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as MarketChannel)}
                className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
              >
                <option value="whatsapp">WhatsApp & Reseller</option>
                <option value="marketplace">Indian Marketplaces</option>
                <option value="international">International (StockX/Goat)</option>
              </select>
            </div>

            {/* Size */}
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

            {/* Price - different for international */}
            {channel === "international" ? (
              <div>
                <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                  Platform Price ($) <span className="text-red-600 font-normal">*</span>
                </label>
                <input
                  type="number"
                  value={priceUSD}
                  onChange={(e) => setPriceUSD(e.target.value)}
                  className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                  placeholder="e.g., 150"
                  required
                  disabled={isLoadingRate}
                />
                {exchangeRate && priceUSD && !isNaN(parseFloat(priceUSD)) && (
                  <p className="text-[10px] text-brand-black/50 mt-0.5 leading-tight">
                    ≈ ₹{(parseFloat(priceUSD) * exchangeRate).toLocaleString('en-IN', { maximumFractionDigits: 0 })} INR
                  </p>
                )}
                {exchangeRate && (
                  <p className="text-[9px] text-brand-black/40 mt-0.5 leading-tight">
                    Rate: ₹{exchangeRate.toFixed(2)}/USD
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                  Price (₹) <span className="text-red-600 font-normal">*</span>
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                  placeholder="e.g., 12000"
                  required
                />
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                Quantity <span className="text-red-600 font-normal">*</span>
              </label>
              <input
                type="number"
                value={listingCount}
                onChange={(e) => setListingCount(e.target.value)}
                className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                placeholder="e.g., 2"
                required
              />
            </div>

            {/* WhatsApp Specific Fields */}
            {channel === "whatsapp" && (
              <>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                    Transaction Type <span className="text-red-600 font-normal">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTransactionType("buy")}
                      className={`flex-1 px-3 py-1.5 border text-xs font-semibold uppercase tracking-wide transition ${
                        transactionType === "buy"
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-green-600 bg-white text-green-600 hover:bg-green-50"
                      }`}
                    >
                      WTS (Want to Sell)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransactionType("sell")}
                      className={`flex-1 px-3 py-1.5 border text-xs font-semibold uppercase tracking-wide transition ${
                        transactionType === "sell"
                          ? "border-red-600 bg-red-600 text-white"
                          : "border-red-600 bg-white text-red-600 hover:bg-red-50"
                      }`}
                    >
                      WTB (Want to Buy)
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                    Seller Name
                  </label>
                  <input
                    type="text"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                    placeholder="e.g., John Doe"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                    Location
                  </label>
                  <input
                    type="text"
                    value={sellerLocation}
                    onChange={(e) => setSellerLocation(e.target.value)}
                    className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                    placeholder="e.g., Delhi"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                    Contact
                  </label>
                  <input
                    type="text"
                    value={sellerContact}
                    onChange={(e) => setSellerContact(e.target.value)}
                    className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                    placeholder="e.g., +91 98765 43210"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                    Source/Group
                  </label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                    placeholder="e.g., whatsapp-group-mumbai"
                  />
                </div>
              </>
            )}

            {/* Marketplace Specific Fields */}
            {channel === "marketplace" && (
              <>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                    Marketplace
                  </label>
                  <select
                    value={marketplaceName}
                    onChange={(e) => setMarketplaceName(e.target.value)}
                    className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                  >
                    {marketplaceOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                    Listing URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                    placeholder="https://..."
                  />
                </div>
              </>
            )}

            {/* International Specific Fields */}
            {channel === "international" && (
              <>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                    Platform
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                  >
                    {platformOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                    Reshipping Cost (₹)
                  </label>
                  <input
                    type="number"
                    value={reshippingCost}
                    onChange={(e) => setReshippingCost(e.target.value)}
                    className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                    placeholder="e.g., 2000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-black uppercase tracking-wide mb-1 leading-tight">
                    Listing URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full border border-brand-gray/30 rounded-none px-2 py-1.5 text-xs font-medium text-brand-black focus:outline-none focus:border-brand-black leading-tight"
                    placeholder="https://..."
                  />
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-brand-gray/20">
              <button
                type="submit"
                className="px-3 py-1.5 border border-brand-black bg-brand-black text-brand-white text-xs font-semibold uppercase tracking-wide hover:bg-brand-black/90 transition leading-tight"
              >
                Add Listing
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

