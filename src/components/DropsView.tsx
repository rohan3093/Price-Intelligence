import React, { useState, useEffect, useCallback } from "react";
import { Drop } from "../types";
import { fetchUpcomingDrops } from "../utils/dropsApi";
import {
  loadUserDropReminders,
  addDropReminder,
  removeDropReminder,
  hasDropReminder,
  DropReminder,
} from "../utils/dropRemindersApi";
import {
  registerFCMToken,
  isFCMSupported,
  onForegroundMessage,
} from "../utils/fcmService";
import { User } from "firebase/auth";

// Error State Component with Retry
interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry, isRetrying = false }) => (
  <div className="border border-down/40 bg-down/10 p-6 text-center">
    <div className="inline-flex items-center justify-center w-12 h-12 bg-down/10 mb-3" style={{ borderRadius: '50%' }}>
      <svg className="w-6 h-6 text-down" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <p className="text-sm font-medium text-down mb-1.5 leading-tight">
      Failed to load data
    </p>
    <p className="text-xs text-down mb-4 leading-tight">
      {message}
    </p>
    <button
      onClick={onRetry}
      disabled={isRetrying}
      className={`px-4 py-2 text-xs font-medium border transition-colors ${
        isRetrying 
          ? "border-down/40 bg-down/10 text-down cursor-not-allowed"
          : "border-down/40 bg-down text-white hover:bg-down/90 active:scale-95"
      }`}
      aria-label={isRetrying ? "Retrying..." : "Retry loading data"}
    >
      {isRetrying ? (
        <span className="flex items-center gap-2">
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Retrying...
        </span>
      ) : (
        "Try Again"
      )}
    </button>
  </div>
);

// Countdown Timer Component
interface CountdownTimerProps {
  releaseDate: string;
  releaseTime?: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ releaseDate, releaseTime }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isLive: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isLive: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      let release = new Date(releaseDate);
      
      if (releaseTime) {
        // Parse time (e.g., "4:31 AM IST")
        const timeMatch = releaseTime.match(/(\d{1,2}):(\d{2})\s+(AM|PM)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const ampm = timeMatch[3].toUpperCase();
          
          if (ampm === 'PM' && hours !== 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          
          release.setHours(hours, minutes, 0, 0);
        }
      }
      
      const diff = release.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isLive: true });
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds, isLive: false });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [releaseDate, releaseTime]);

  if (timeLeft.isLive) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-block px-2.5 py-1 bg-terminal-surface-raised text-terminal-text text-xs font-semibold uppercase tracking-wide">
          Live Now
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {timeLeft.days > 0 && (
        <div className="text-center">
          <div className="text-lg md:text-xl font-mono-numeric font-bold text-brand-black leading-tight">
            {timeLeft.days.toString().padStart(2, '0')}
          </div>
          <div className="text-[8px] text-brand-black/60 uppercase tracking-wide leading-tight">
            Days
          </div>
        </div>
      )}
      <div className="text-center">
        <div className="text-lg md:text-xl font-mono-numeric font-bold text-brand-black leading-tight">
          {timeLeft.hours.toString().padStart(2, '0')}
        </div>
        <div className="text-[8px] text-brand-black/60 uppercase tracking-wide leading-tight">
          Hours
        </div>
      </div>
      <div className="text-center">
        <div className="text-lg md:text-xl font-mono-numeric font-bold text-brand-black leading-tight">
          {timeLeft.minutes.toString().padStart(2, '0')}
        </div>
        <div className="text-[8px] text-brand-black/60 uppercase tracking-wide leading-tight">
          Min
        </div>
      </div>
      <div className="text-center">
        <div className="text-lg md:text-xl font-mono-numeric font-bold text-brand-black leading-tight">
          {timeLeft.seconds.toString().padStart(2, '0')}
        </div>
        <div className="text-[8px] text-brand-black/60 uppercase tracking-wide leading-tight">
          Sec
        </div>
      </div>
    </div>
  );
};

// Hype Indicator Component
interface HypeIndicatorProps {
  hypeLevel?: 'low' | 'medium' | 'high' | 'extreme';
}

const HypeIndicator: React.FC<HypeIndicatorProps> = ({ hypeLevel }) => {
  if (!hypeLevel) return null;

  const config = {
    low: { label: 'Low Hype', color: 'bg-terminal-surface-raised text-terminal-text-dim', bars: 1 },
    medium: { label: 'Medium Hype', color: 'bg-blue-100 text-blue-700', bars: 2 },
    high: { label: 'High Hype', color: 'bg-orange-100 text-orange-700', bars: 3 },
    extreme: { label: 'Extreme Hype', color: 'bg-down/10 text-down', bars: 4 },
  };

  const { label, color, bars } = config[hypeLevel];

  return (
    <div className="flex items-center gap-1.5">
      <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${color}`}>
        {label}
      </span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 w-1.5 ${
              i <= bars ? 'bg-terminal-text' : 'bg-brand-gray/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

interface DropsViewProps {
  currentUser?: User | null;
}

export const DropsView: React.FC<DropsViewProps> = ({ currentUser }) => {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [reminders, setReminders] = useState<DropReminder[]>([]);
  const [fcmTokenRegistered, setFcmTokenRegistered] = useState(false);

  const loadDrops = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setIsRetrying(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const upcomingDrops = await fetchUpcomingDrops();
      setDrops(upcomingDrops);
    } catch (err) {
      console.error("Failed to load drops:", err);
      setError(err instanceof Error ? err.message : "Unable to connect. Please check your internet connection.");
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, []);

  // Register FCM token when user signs in
  useEffect(() => {
    const registerToken = async () => {
      if (!currentUser || !isFCMSupported()) {
        return;
      }

      try {
        const token = await registerFCMToken(currentUser.uid);
        if (token) {
          setFcmTokenRegistered(true);
          console.log('FCM token registered successfully');
        }
      } catch (error) {
        console.error('Error registering FCM token:', error);
      }
    };

    registerToken();
  }, [currentUser]);

  // Listen for foreground FCM messages
  useEffect(() => {
    if (!isFCMSupported()) {
      return;
    }

    const unsubscribe = onForegroundMessage((payload) => {
      // Show notification when app is in foreground
      if (payload.notification) {
        new Notification(payload.notification.title || 'Drop Reminder', {
          body: payload.notification.body,
          icon: '/favicon.ico',
        });
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Load reminders on mount
  useEffect(() => {
    const loadReminders = async () => {
      const userId = currentUser?.uid || null;
      const userReminders = await loadUserDropReminders(userId);
      setReminders(userReminders);
    };
    loadReminders();
  }, [currentUser]);

  useEffect(() => {
    loadDrops();
  }, [loadDrops]);
  
  const handleRetry = useCallback(() => {
    loadDrops(true);
  }, [loadDrops]);

  // Get unique brands for filter
  const brands = Array.from(new Set(drops.map((d) => d.brand))).sort();

  // Filter drops
  const filteredDrops = drops.filter((drop) => {
    if (selectedBrand) {
      return drop.brand === selectedBrand;
    }
    return true;
  });

  // Handle reminder toggle
  const handleToggleReminder = async (dropId: number) => {
    // Check if user is signed in
    if (!currentUser) {
      alert('Please sign in to set drop reminders');
      return;
    }

    // Check if FCM is supported
    if (!isFCMSupported()) {
      alert('Push notifications are not supported in this browser');
      return;
    }

    // Register FCM token if not already registered
    if (!fcmTokenRegistered) {
      try {
        const token = await registerFCMToken(currentUser.uid);
        if (!token) {
          alert('Failed to register for notifications. Please allow notifications when prompted.');
          return;
        }
        setFcmTokenRegistered(true);
      } catch (error) {
        console.error('Error registering FCM token:', error);
        alert('Failed to set up notifications. Please try again.');
        return;
      }
    }

    const userId = currentUser.uid;
    const hasReminder = await hasDropReminder(userId, dropId);

    if (hasReminder) {
      // Remove reminder
      await removeDropReminder(userId, dropId);
    } else {
      // Add reminder (default: 1 hour before)
      await addDropReminder(userId, dropId, 60);
    }

    // Reload reminders
    const updatedReminders = await loadUserDropReminders(userId);
    setReminders(updatedReminders);
  };

  // Check if a drop has a reminder
  const checkHasReminder = (dropId: number): boolean => {
    return reminders.some((r) => r.dropId === dropId);
  };

  // Format release date and time prominently
  const formatReleaseDateTime = (dateStr: string, time?: string): { date: string; time: string } => {
    const date = new Date(dateStr);
    const dateFormatted = date.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return {
      date: dateFormatted,
      time: time || 'TBA',
    };
  };

  return (
    <main className="flex-1 min-h-0 flex flex-col bg-brand-background px-2 py-2 md:px-3 md:py-3 pb-20 md:pb-4 w-full max-w-8xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-heading font-normal text-brand-black mb-2">
              Upcoming Drops
            </h1>
            <p className="text-sm text-brand-black/60">
              India-specific sneaker release calendar
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-brand-black/50 uppercase tracking-wider mb-1">
              Upcoming
            </p>
            <p className="text-2xl font-mono-numeric font-bold text-brand-black">
              {filteredDrops.length}
            </p>
          </div>
        </div>
      </div>

      {/* Brand Filter */}
      {brands.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedBrand(null)}
            className={`px-3 py-1 text-xs font-medium border transition leading-tight ${
              selectedBrand === null
                ? "bg-terminal-surface-raised text-terminal-text"
                : "border-brand-gray/30 bg-terminal-surface text-brand-black/70 hover:border-terminal-border-strong"
            }`}
          >
            All Brands
          </button>
          {brands.map((brand) => (
            <button
              key={brand}
              onClick={() => setSelectedBrand(brand)}
              className={`px-3 py-1 text-xs font-medium border transition leading-tight ${
                selectedBrand === brand
                  ? "bg-terminal-surface-raised text-terminal-text"
                  : "border-brand-gray/30 bg-terminal-surface text-brand-black/70 hover:border-terminal-border-strong"
              }`}
            >
              {brand}
            </button>
          ))}
        </div>
      )}

      {/* Drops List */}
      {loading ? (
        <div className="border border-brand-gray/20 p-8 text-center bg-terminal-surface">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin text-brand-black/60" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-brand-black/70">Loading drops...</p>
          </div>
        </div>
      ) : error ? (
        <ErrorState 
          message={error} 
          onRetry={handleRetry} 
          isRetrying={isRetrying}
        />
      ) : filteredDrops.length === 0 ? (
        <div className="border border-brand-gray/20 p-8 bg-terminal-surface">
          <div className="text-center mb-6">
            <svg className="w-12 h-12 mx-auto mb-3 text-brand-black/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium text-brand-black mb-1.5 leading-tight">
              No upcoming drops right now
            </p>
            <p className="text-xs text-brand-black/60 leading-tight max-w-sm mx-auto">
              We track India-specific sneaker releases from Nike SNKRS, Adidas Confirmed, and other retailers. New drops are added as they're announced.
            </p>
          </div>
          {/* Placeholder calendar grid */}
          <div className="grid grid-cols-7 gap-1 max-w-xs mx-auto">
            {["S","M","T","W","T","F","S"].map((day, i) => (
              <div key={i} className="text-[9px] text-center text-brand-black/40 font-semibold uppercase pb-1">{day}</div>
            ))}
            {Array.from({ length: 28 }, (_, i) => (
              <div
                key={i}
                className="aspect-square flex items-center justify-center text-[10px] text-brand-black/30 border border-brand-gray/10 bg-brand-background/30"
              >
                {i + 1}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-brand-black/40 text-center mt-3">Drops will appear on the calendar as they are announced</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDrops.map((drop) => {
            const { date, time } = formatReleaseDateTime(drop.releaseDate, drop.releaseTime);
            
            return (
              <div
                key={drop.id}
                className="border border-brand-gray/20 p-4 bg-terminal-surface transition"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  {/* Drop Image & Info */}
                  <div className="md:col-span-5 flex items-start gap-3">
                    <div className="h-20 w-20 flex-shrink-0 border border-brand-gray/20 overflow-hidden">
                      {drop.image ? (
                        <img
                          src={drop.image}
                          alt={drop.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect fill='%23f0f0f0' width='64' height='64'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='10'%3ENo Image%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      ) : (
                        <div className="h-full w-full bg-brand-gray/10 flex items-center justify-center">
                          <span className="text-[8px] text-brand-black/40">No Image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-brand-black mb-1.5 leading-tight">
                        {drop.name}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-[10px] text-brand-black/60 uppercase tracking-wide font-medium">
                          {drop.brand}
                        </span>
                        {drop.retailPrice && (
                          <span className="text-xs text-brand-black font-medium">
                            ₹{drop.retailPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      <HypeIndicator hypeLevel={drop.hypeLevel} />
                    </div>
                  </div>

                  {/* Release Date & Time - More Prominent */}
                  <div className="md:col-span-4">
                    <div className="mb-2">
                      <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1 leading-tight">
                        Release Date
                      </p>
                      <p className="text-sm font-semibold text-brand-black mb-0.5 leading-tight">
                        {date}
                      </p>
                      <p className="text-xs font-medium text-brand-black/80 leading-tight">
                        {time}
                      </p>
                    </div>
                  </div>

                  {/* Countdown Timer & Reminder */}
                  <div className="md:col-span-3">
                    <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-2 leading-tight">
                      Time Remaining
                    </p>
                    <CountdownTimer
                      releaseDate={drop.releaseDate}
                      releaseTime={drop.releaseTime}
                    />
                    {/* Reminder Toggle Button */}
                    <button
                      onClick={() => handleToggleReminder(drop.id)}
                      className={`mt-3 flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium border transition leading-tight ${
                        checkHasReminder(drop.id)
                          ? "bg-terminal-surface-raised text-terminal-text"
                          : "border-brand-gray/30 bg-terminal-surface text-brand-black/70 hover:border-terminal-border-strong"
                      }`}
                      title={
                        checkHasReminder(drop.id)
                          ? "Remove reminder"
                          : "Set reminder (1 hour before drop)"
                      }
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {checkHasReminder(drop.id) ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                          />
                        )}
                      </svg>
                      {checkHasReminder(drop.id) ? "Reminder Set" : "Set Reminder"}
                    </button>
                  </div>
                </div>

                {/* Retailers */}
                {drop.retailers.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-brand-gray/20">
                    <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-1.5 leading-tight">
                      Available At
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {drop.retailers.map((retailer, idx) => (
                        <a
                          key={idx}
                          href={retailer.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-2.5 py-1 border border-brand-gray/30 bg-terminal-surface text-[10px] font-medium text-brand-black/70 hover:border-terminal-border-strong hover:text-brand-black transition leading-tight"
                        >
                          {retailer.displayName}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
};
