import React, { useState, useEffect } from "react";
import { Drop } from "../types";
import { fetchUpcomingDrops } from "../utils/dropsApi";

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
        <span className="inline-block px-2.5 py-1 bg-brand-black text-brand-white text-xs font-semibold uppercase tracking-wide">
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
    low: { label: 'Low Hype', color: 'bg-gray-200 text-gray-700', bars: 1 },
    medium: { label: 'Medium Hype', color: 'bg-blue-100 text-blue-700', bars: 2 },
    high: { label: 'High Hype', color: 'bg-orange-100 text-orange-700', bars: 3 },
    extreme: { label: 'Extreme Hype', color: 'bg-red-100 text-red-700', bars: 4 },
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
              i <= bars ? 'bg-brand-black' : 'bg-brand-gray/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export const DropsView: React.FC = () => {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  useEffect(() => {
    const loadDrops = async () => {
      setLoading(true);
      try {
        const upcomingDrops = await fetchUpcomingDrops();
        setDrops(upcomingDrops);
      } catch (error) {
        console.error("Failed to load drops:", error);
      } finally {
        setLoading(false);
      }
    };
    loadDrops();
  }, []);

  // Get unique brands for filter
  const brands = Array.from(new Set(drops.map((d) => d.brand))).sort();

  // Filter drops
  const filteredDrops = drops.filter((drop) => {
    if (selectedBrand) {
      return drop.brand === selectedBrand;
    }
    return true;
  });

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
    <main className="flex-1 flex flex-col bg-brand-white px-3 py-3 md:px-4 md:py-4 pb-20 md:pb-4 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-3 pb-3 border-b border-brand-gray/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-heading font-normal text-brand-black mb-1 leading-tight">
              Upcoming Drops
            </h1>
            <p className="text-xs text-brand-black/70 leading-tight">
              India-specific sneaker release calendar
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-0.5 leading-tight">
              Upcoming
            </p>
            <p className="text-lg font-mono-numeric font-semibold text-brand-black leading-tight">
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
                ? "border-brand-black bg-brand-black text-brand-white"
                : "border-brand-gray/30 bg-brand-white text-brand-black/70 hover:border-brand-gray/50"
            }`}
            style={{ borderRadius: '0px' }}
          >
            All Brands
          </button>
          {brands.map((brand) => (
            <button
              key={brand}
              onClick={() => setSelectedBrand(brand)}
              className={`px-3 py-1 text-xs font-medium border transition leading-tight ${
                selectedBrand === brand
                  ? "border-brand-black bg-brand-black text-brand-white"
                  : "border-brand-gray/30 bg-brand-white text-brand-black/70 hover:border-brand-gray/50"
              }`}
              style={{ borderRadius: '0px' }}
            >
              {brand}
            </button>
          ))}
        </div>
      )}

      {/* Drops List */}
      {loading ? (
        <div className="border border-brand-gray/30 p-8 text-center bg-brand-white">
          <p className="text-sm text-brand-black/70">Loading drops...</p>
        </div>
      ) : filteredDrops.length === 0 ? (
        <div className="border border-brand-gray/30 p-8 text-center bg-brand-white">
          <p className="text-sm font-medium text-brand-black mb-1.5 leading-tight">
            No upcoming drops
          </p>
          <p className="text-xs text-brand-black/70 leading-tight">
            Check back soon for new releases
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDrops.map((drop) => {
            const { date, time } = formatReleaseDateTime(drop.releaseDate, drop.releaseTime);
            
            return (
              <div
                key={drop.id}
                className="border border-brand-gray/30 p-4 bg-brand-white hover:border-brand-gray/50 transition"
                style={{ borderRadius: '0px' }}
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

                  {/* Countdown Timer */}
                  <div className="md:col-span-3">
                    <p className="text-[10px] text-brand-black/60 uppercase tracking-wide mb-2 leading-tight">
                      Time Remaining
                    </p>
                    <CountdownTimer
                      releaseDate={drop.releaseDate}
                      releaseTime={drop.releaseTime}
                    />
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
                          className="inline-block px-2.5 py-1 border border-brand-gray/30 bg-brand-white text-[10px] font-medium text-brand-black/70 hover:border-brand-black hover:text-brand-black transition leading-tight"
                          style={{ borderRadius: '0px' }}
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
