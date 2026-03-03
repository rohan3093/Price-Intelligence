import React, { useState, useRef, useEffect } from "react";
import { View } from "../types";
import { User } from "firebase/auth";

interface HeaderProps {
  view: View;
  setView: (view: View) => void;
  user?: User | null;
  onSignInClick?: () => void;
  onSignOutClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  view, 
  setView, 
  user,
  onSignInClick,
  onSignOutClick,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  // Get user initials for avatar
  const getUserInitials = (user: User): string => {
    if (user.displayName) {
      return user.displayName
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <header className="border-b border-brand-gray/20 px-3 md:px-4 py-3 flex items-center justify-between bg-white shadow-sm">
      <button
        onClick={() => setView("home")}
        className="flex items-center hover:opacity-80 transition-opacity"
      >
        {/* Logo - All screen sizes */}
        <img 
          src="/sentria-logo.svg" 
          alt="Sentria"
          className="h-6 md:h-7"
        />
      </button>

      <div className="flex items-center gap-3">
        {/* Navigation */}
      <nav className="hidden md:flex items-center gap-2">
        <button
          onClick={() => setView("home")}
          className={`px-4 py-2 text-xs font-semibold transition-all ${
            view === "home"
              ? "bg-brand-black text-white"
              : "bg-white text-brand-black border border-brand-gray/30 hover:border-brand-black"
          }`}
          style={{ borderRadius: '8px' }}
        >
          Market
        </button>
        <button
          onClick={() => setView("watchlist")}
          className={`px-4 py-2 text-xs font-semibold transition-all ${
            view === "watchlist"
              ? "bg-brand-black text-white"
              : "bg-white text-brand-black border border-brand-gray/30 hover:border-brand-black"
          }`}
          style={{ borderRadius: '8px' }}
        >
          Watchlist
        </button>
        <button
          onClick={() => setView("portfolio")}
          className={`px-4 py-2 text-xs font-semibold transition-all ${
            view === "portfolio"
              ? "bg-brand-black text-white"
              : "bg-white text-brand-black border border-brand-gray/30 hover:border-brand-black"
          }`}
          style={{ borderRadius: '8px' }}
        >
          Portfolio
        </button>
        <button
          onClick={() => setView("connections")}
          className={`px-4 py-2 text-xs font-semibold transition-all ${
            view === "connections"
              ? "bg-brand-black text-white"
              : "bg-white text-brand-black border border-brand-gray/30 hover:border-brand-black"
          }`}
          style={{ borderRadius: '8px' }}
        >
          Connections
        </button>
        <button
          onClick={() => setView("drops")}
          className={`px-4 py-2 text-xs font-semibold transition-all ${
            view === "drops"
              ? "bg-brand-black text-white"
              : "bg-white text-brand-black border border-brand-gray/30 hover:border-brand-black"
          }`}
          style={{ borderRadius: '8px' }}
        >
          Drops
        </button>
        <button
          onClick={() => setView("education")}
          className={`px-4 py-2 text-xs font-semibold transition-all ${
            view === "education"
              ? "bg-brand-black text-white"
              : "bg-white text-brand-black border border-brand-gray/30 hover:border-brand-black"
          }`}
          style={{ borderRadius: '8px' }}
        >
          Learn
        </button>
        <div className="h-5 w-px bg-brand-gray/30 mx-1"></div>
        <button
          onClick={() => setView("analyst")}
          className={`px-4 py-2 text-xs font-semibold transition-all ${
            view === "analyst"
              ? "bg-brand-black text-white"
              : "bg-white text-brand-black border border-brand-gray/30 hover:border-brand-black"
          }`}
          style={{ borderRadius: '8px' }}
        >
          Admin
        </button>
      </nav>

        {/* User Authentication Section */}
        <div className="flex items-center">
          {user ? (
            // Signed-in user menu
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2 py-1 hover:bg-brand-gray/10 transition-colors"
                style={{ borderRadius: '8px' }}
              >
                {/* Avatar */}
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-7 h-7 border border-brand-gray/30 object-cover"
                    style={{ borderRadius: '50%' }}
                  />
                ) : (
                  <div 
                    className="w-7 h-7 bg-brand-black text-brand-white flex items-center justify-center text-[10px] font-bold"
                    style={{ borderRadius: '50%' }}
                  >
                    {getUserInitials(user)}
                  </div>
                )}
                {/* Dropdown arrow */}
                <svg 
                  className={`w-3 h-3 text-brand-black/60 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div 
                  className="absolute right-0 top-full mt-2 w-56 bg-white border border-brand-gray/20 shadow-lg z-50"
                  style={{ borderRadius: '12px' }}
                >
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-brand-gray/20">
                    <p className="text-xs font-semibold text-brand-black truncate">
                      {user.displayName || "User"}
                    </p>
                    <p className="text-[10px] text-brand-black/60 truncate">
                      {user.email}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setView("watchlist");
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs text-brand-black hover:bg-brand-background/50 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-brand-black/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      My Watchlist
                    </button>
                    <button
                      disabled
                      className="w-full px-4 py-2.5 text-left text-xs text-brand-black/40 flex items-center gap-2 cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      Price Alerts
                      <span className="text-[9px] px-1.5 py-0.5 bg-brand-gray/20 text-brand-black/50 ml-auto" style={{ borderRadius: '4px' }}>Soon</span>
                    </button>
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-brand-gray/20 py-1">
                    <button
                      onClick={() => {
                        onSignOutClick?.();
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Sign-in button
            <button
              onClick={onSignInClick}
              className="px-4 py-2 bg-brand-black text-white text-xs font-semibold hover:bg-brand-black/90 transition-colors flex items-center gap-2"
              style={{ borderRadius: '8px' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
