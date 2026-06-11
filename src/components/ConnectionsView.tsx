/**
 * ConnectionsView - Manage trade connection requests
 * Shows sent and received connection requests with status tracking
 */

import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { ConnectionRequest } from "../types";
import { 
  getUserConnections, 
  updateConnectionStatus,
  reportTransactionComplete 
} from "../utils/connectionsApi";
import { TableRowSkeleton } from "./LoadingSkeleton";

interface ConnectionsViewProps {
  currentUser: User | null;
  onSignInClick?: () => void;
}

export const ConnectionsView: React.FC<ConnectionsViewProps> = ({ currentUser, onSignInClick }) => {
  const [connections, setConnections] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [selectedConnection, setSelectedConnection] = useState<ConnectionRequest | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Load connections
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    loadConnections();
  }, [currentUser, activeTab]);

  const loadConnections = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    const data = await getUserConnections(currentUser.uid, activeTab);
    setConnections(data);
    setLoading(false);
  };

  const handleAccept = async (requestId: string) => {
    const success = await updateConnectionStatus(requestId, 'accepted');
    if (success) {
      loadConnections();
      alert('Connection accepted! You can now coordinate via WhatsApp or email.');
    }
  };

  const handleDecline = async (requestId: string) => {
    const success = await updateConnectionStatus(requestId, 'declined');
    if (success) {
      loadConnections();
    }
  };

  const handleMarkComplete = (connection: ConnectionRequest) => {
    setSelectedConnection(connection);
    setShowCompletionModal(true);
  };

  if (!currentUser) {
    return (
      <main className="flex-1 flex flex-col bg-brand-background px-2 py-2 md:px-3 md:py-3 pb-20 md:pb-4 w-full max-w-8xl mx-auto overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-heading font-normal text-brand-black mb-2">
            Trade Connections
          </h1>
          <p className="text-sm text-brand-black/60">
            Manage your connection requests with other traders
          </p>
        </div>
        <div className="border border-brand-gray/20 p-8 text-center bg-white">
          <svg className="w-12 h-12 mx-auto text-brand-black/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <p className="text-sm font-medium text-brand-black mb-1.5 leading-tight">
            Sign in to view your trade connections
          </p>
          <p className="text-xs text-brand-black/70 mb-4 leading-tight">
            Track all your buy/sell connection requests in one place
          </p>
          <button
            onClick={onSignInClick}
            className="px-4 py-2 bg-brand-black text-white text-xs font-semibold hover:bg-brand-black/90 transition leading-tight"
          >
            Sign In
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col bg-brand-background px-2 py-2 md:px-3 md:py-3 pb-20 md:pb-4 w-full max-w-8xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-heading font-normal text-brand-black mb-2">Trade Connections</h1>
        <p className="text-sm text-brand-black/60">
          Manage your connection requests with other traders
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-brand-gray/20">
        <button
          onClick={() => setActiveTab('received')}
          className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-all ${
            activeTab === 'received'
              ? 'border-b-2 border-brand-black text-brand-black'
              : 'text-brand-gray-dark hover:text-brand-black'
          }`}
        >
          Received ({connections.filter(c => c.targetId === currentUser.uid).length})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-all ${
            activeTab === 'sent'
              ? 'border-b-2 border-brand-black text-brand-black'
              : 'text-brand-gray-dark hover:text-brand-black'
          }`}
        >
          Sent ({connections.filter(c => c.requesterId === currentUser.uid).length})
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <TableRowSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Connections List */}
      {!loading && connections.length === 0 && (
        <div className="text-center py-12 border border-brand-gray/20 bg-white">
          <p className="text-sm text-brand-black/60">
            {activeTab === 'received' 
              ? "No connection requests received yet"
              : "You haven't sent any connection requests yet"}
          </p>
        </div>
      )}

      {!loading && connections.length > 0 && (
        <div className="space-y-4">
          {connections.map((connection) => (
            <ConnectionCard
              key={connection.id}
              connection={connection}
              currentUserId={currentUser.uid}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onMarkComplete={handleMarkComplete}
            />
          ))}
        </div>
      )}

      {/* Completion Modal */}
      {showCompletionModal && selectedConnection && (
        <CompletionModal
          connection={selectedConnection}
          onClose={() => {
            setShowCompletionModal(false);
            setSelectedConnection(null);
          }}
          onSubmit={async (actualPrice, feedback, rating) => {
            const success = await reportTransactionComplete(
              selectedConnection.id,
              actualPrice,
              feedback,
              rating
            );
            if (success) {
              loadConnections();
              setShowCompletionModal(false);
              setSelectedConnection(null);
            }
          }}
        />
      )}
    </main>
  );
};

// Connection Card Component
interface ConnectionCardProps {
  connection: ConnectionRequest;
  currentUserId: string;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onMarkComplete: (connection: ConnectionRequest) => void;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  currentUserId,
  onAccept,
  onDecline,
  onMarkComplete
}) => {
  const isReceived = connection.targetId === currentUserId;
  const isPending = connection.status === 'pending';
  const isAccepted = connection.status === 'accepted';
  const isCompleted = connection.status === 'completed';

  const statusColors = {
    pending: 'text-yellow-600 bg-yellow-50',
    accepted: 'text-green-600 bg-green-50',
    completed: 'text-blue-600 bg-blue-50',
    declined: 'text-red-600 bg-red-50',
    cancelled: 'text-gray-600 bg-gray-50'
  };

  return (
    <div className="border border-brand-gray/20 bg-white p-4 transition-shadow">
      {/* Asset Info */}
      <div className="flex gap-4 mb-4">
        <img 
          src={connection.assetImage} 
          alt={connection.assetName}
          className="w-16 h-16 object-contain border border-brand-gray/30"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-brand-black">{connection.assetName}</h3>
          <p className="text-sm text-brand-black/60">SKU {connection.assetSku}</p>
          {connection.size && (
            <p className="text-sm text-brand-black/80 mt-1">Size: {connection.size}</p>
          )}
        </div>
        <span className={`px-3 py-1 text-xs font-semibold uppercase ${statusColors[connection.status]} self-start`}>
          {connection.status}
        </span>
      </div>

      {/* Connection Details */}
      <div className="border-t border-brand-gray/20 pt-3 mb-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-brand-black/60 text-xs mb-1">
              {isReceived ? 'From' : 'To'}
            </p>
            <p className="font-medium text-brand-black">
              {isReceived 
                ? (connection.requesterName || maskEmail(connection.requesterEmail))
                : (connection.targetName || maskEmail(connection.targetEmail))}
            </p>
          </div>
          <div>
            <p className="text-brand-black/60 text-xs mb-1">Type</p>
            <p className="font-medium text-brand-black capitalize">{connection.connectionType}</p>
          </div>
          {connection.quantity && (
            <div>
              <p className="text-brand-black/60 text-xs mb-1">Quantity</p>
              <p className="font-medium text-brand-black">{connection.quantity}</p>
            </div>
          )}
          {connection.proposedPrice && (
            <div>
              <p className="text-brand-black/60 text-xs mb-1">Offered Price</p>
              <p className="font-medium text-brand-black">₹{connection.proposedPrice.toLocaleString('en-IN')}</p>
            </div>
          )}
        </div>
        
        {connection.message && (
          <div className="mt-3 p-2 bg-brand-background border-l-2 border-brand-gray">
            <p className="text-xs text-brand-black/60 mb-1">Message</p>
            <p className="text-sm text-brand-black">{connection.message}</p>
          </div>
        )}
      </div>

      {/* Transaction Outcome (if completed) */}
      {isCompleted && connection.actualPrice && (
        <div className="border-t border-brand-gray/20 pt-3 mb-3">
          <p className="text-xs text-brand-black/60 mb-2">Transaction Completed</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-black">
                Final Price: ₹{connection.actualPrice.toLocaleString('en-IN')}
              </p>
              {connection.rating && (
                <p className="text-xs text-brand-black/60 mt-1">
                  Rating: {'⭐'.repeat(connection.rating)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {isReceived && isPending && (
          <>
            <button
              onClick={() => onAccept(connection.id)}
              className="flex-1 px-4 py-2 bg-brand-black text-white text-xs font-semibold uppercase tracking-wide hover:bg-brand-black/80 transition-all"
            >
              Accept
            </button>
            <button
              onClick={() => onDecline(connection.id)}
              className="flex-1 px-4 py-2 border border-brand-gray text-brand-black text-xs font-semibold uppercase tracking-wide hover:bg-brand-gray/10 transition-all"
            >
              Decline
            </button>
          </>
        )}
        
        {isAccepted && (
          <button
            onClick={() => onMarkComplete(connection)}
            className="flex-1 px-4 py-2 border border-green-600 text-green-600 text-xs font-semibold uppercase tracking-wide hover:bg-green-50 transition-all"
          >
            Mark as Completed
          </button>
        )}
        
        {(isPending || isAccepted) && (
          <button
            className="px-4 py-2 border border-brand-gray text-brand-black text-xs font-semibold uppercase tracking-wide hover:bg-brand-gray/10 transition-all"
          >
            Contact
          </button>
        )}
      </div>

      <p className="text-xs text-brand-black/40 mt-3">
        Requested {new Date(connection.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
};

// Completion Modal Component
interface CompletionModalProps {
  connection: ConnectionRequest;
  onClose: () => void;
  onSubmit: (actualPrice: number, feedback?: string, rating?: number) => void;
}

const CompletionModal: React.FC<CompletionModalProps> = ({
  connection,
  onClose,
  onSubmit
}) => {
  const [actualPrice, setActualPrice] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [rating, setRating] = useState<number>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualPrice) return;
    
    onSubmit(
      parseFloat(actualPrice),
      feedback.trim() || undefined,
      rating || undefined
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white border border-brand-gray/20 w-full max-w-md shadow-dropdown">
        <div className="border-b border-brand-gray/20 px-4 py-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide">Complete Transaction</h3>
          <button onClick={onClose} className="text-brand-black hover:text-brand-black/60">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-brand-black/60">
            Record the final transaction details for {connection.assetName}
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-brand-black mb-2">
              Final Price (Required)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-brand-black/60">₹</span>
              <input
                type="number"
                value={actualPrice}
                onChange={(e) => setActualPrice(e.target.value)}
                placeholder="e.g., 12500"
                className="w-full pl-8 pr-3 py-2.5 border border-brand-gray/30 text-sm focus:outline-none focus:border-brand-black"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-brand-black mb-2">
              Rate Your Experience (Optional)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="text-2xl hover:scale-110 transition-transform"
                >
                  {star <= rating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-brand-black mb-2">
              Feedback (Optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="How was the trade?"
              rows={3}
              className="w-full px-3 py-2.5 border border-brand-gray/30 text-sm focus:outline-none focus:border-brand-black resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-brand-gray/30 text-sm font-semibold uppercase tracking-wide text-brand-black hover:bg-brand-gray/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-brand-black text-white text-sm font-semibold uppercase tracking-wide hover:bg-brand-black/80 transition-all"
            >
              Complete Trade
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

