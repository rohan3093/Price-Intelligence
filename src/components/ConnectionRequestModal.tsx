/**
 * ConnectionRequestModal - Request introduction to seller/buyer
 * Part of the trade coordination layer (pre-exchange phase)
 */

import React, { useState } from "react";
import { Asset, ConnectionType } from "../types";
import { User } from "firebase/auth";

interface ConnectionRequestModalProps {
  asset: Asset;
  selectedSize?: string;
  currentUser: User | null;
  targetUserEmail?: string; // If connecting to specific seller
  targetUserName?: string;
  targetUserId?: string;
  connectionType: ConnectionType; // 'buy' or 'sell'
  onClose: () => void;
  onSubmit: (data: {
    targetId: string;
    targetEmail: string;
    targetName?: string;
    proposedPrice?: number;
    quantity: number;
    message?: string;
  }) => Promise<void>;
}

export const ConnectionRequestModal: React.FC<ConnectionRequestModalProps> = ({
  asset,
  selectedSize,
  currentUser,
  targetUserEmail,
  targetUserName,
  targetUserId,
  connectionType,
  onClose,
  onSubmit
}) => {
  const [proposedPrice, setProposedPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [message, setMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError("You must be logged in to request introductions");
      return;
    }

    if (!targetUserId || !targetUserEmail) {
      setError("Target user information is missing");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        targetId: targetUserId,
        targetEmail: targetUserEmail,
        targetName: targetUserName,
        proposedPrice: proposedPrice ? parseFloat(proposedPrice) : undefined,
        quantity,
        message: message.trim() || undefined
      });
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send request");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-brand-white border-2 border-brand-black w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-modal animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 bg-brand-white border-b-2 border-brand-black px-4 md:px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-black">
            Request Introduction
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center border-2 border-brand-gray hover:border-brand-black hover:bg-brand-gray/10 transition-all active:scale-95"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          {/* Asset Info */}
          <div className="flex gap-4 p-4 bg-brand-background border border-brand-gray/30 mb-6">
            <img 
              src={asset.image} 
              alt={asset.name}
              className="w-20 h-20 object-contain border border-brand-gray/30"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-brand-black mb-1">{asset.name}</h3>
              <p className="text-sm text-brand-black/60">{asset.brand} • SKU {asset.sku}</p>
              {selectedSize && (
                <p className="text-sm text-brand-black/80 mt-1">Size: {selectedSize}</p>
              )}
            </div>
          </div>

          {/* Important Notice */}
          <div className="border-l-4 border-blue-500 bg-blue-50 p-4 mb-6">
            <p className="text-sm font-semibold text-blue-900 mb-2">⚠️ How This Works</p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Sentria facilitates introductions only</li>
              <li>• We do NOT handle payments or inventory</li>
              <li>• Transaction happens off-platform (WhatsApp/Email)</li>
              <li>• Trade at your own risk - verify authenticity</li>
            </ul>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Connecting To */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-brand-black mb-2">
                Connecting With
              </label>
              <div className="p-3 bg-brand-gray/10 border border-brand-gray/30">
                <p className="text-sm font-medium text-brand-black">
                  {targetUserName || targetUserEmail || "Anonymous Seller"}
                </p>
                <p className="text-xs text-brand-black/60 mt-1">
                  {connectionType === 'buy' ? 'Seller' : 'Buyer'}
                </p>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-brand-black mb-2">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2.5 border border-brand-gray/30 text-sm focus:outline-none focus:border-brand-black"
                required
              />
            </div>

            {/* Proposed Price (Optional) */}
            {connectionType === 'buy' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-brand-black mb-2">
                  Your Offer (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-brand-black/60">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={proposedPrice}
                    onChange={(e) => setProposedPrice(e.target.value)}
                    placeholder="e.g., 12500"
                    className="w-full pl-8 pr-3 py-2.5 border border-brand-gray/30 text-sm focus:outline-none focus:border-brand-black"
                  />
                </div>
                <p className="text-xs text-brand-black/60 mt-1">
                  Optional: What you're willing to pay
                </p>
              </div>
            )}

            {/* Message (Optional) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-brand-black mb-2">
                Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Introduce yourself and why you're interested in ${connectionType === 'buy' ? 'buying' : 'selling'} this item...`}
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2.5 border border-brand-gray/30 text-sm focus:outline-none focus:border-brand-black resize-none"
              />
              <p className="text-xs text-brand-black/60 mt-1">
                {message.length}/500 characters
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="border-l-4 border-red-500 bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 border border-brand-gray text-sm font-semibold uppercase tracking-wide text-brand-black hover:bg-brand-gray/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !currentUser}
                className="flex-1 px-4 py-3 border border-brand-gray bg-brand-black text-white text-sm font-semibold uppercase tracking-wide hover:bg-brand-black/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Sending..." : "Send Request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

