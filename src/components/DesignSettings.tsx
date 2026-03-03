import React, { useState, useEffect } from "react";

interface DesignTokens {
  brandBlack: string;
  brandGray: string;
  brandWhite: string;
  brandYellow: string;
  baseFontSize: number;
}

const defaultTokens: DesignTokens = {
  brandBlack: "#0c0c0c",
  brandGray: "#bec2c6",
  brandWhite: "#ffffff",
  brandYellow: "#f7f126",
  baseFontSize: 16,
};

export const DesignSettings: React.FC = () => {
  const [tokens, setTokens] = useState<DesignTokens>(defaultTokens);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load saved settings from localStorage
    const saved = localStorage.getItem("designTokens");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTokens({ ...defaultTokens, ...parsed });
        applyTokens({ ...defaultTokens, ...parsed });
      } catch (e) {
        // Silently fall back to defaults if saved tokens are corrupted
        applyTokens(defaultTokens);
      }
    } else {
      applyTokens(defaultTokens);
    }
  }, []);

  const applyTokens = (newTokens: DesignTokens) => {
    const root = document.documentElement;
    root.style.setProperty("--brand-black", newTokens.brandBlack);
    root.style.setProperty("--brand-gray", newTokens.brandGray);
    root.style.setProperty("--brand-white", newTokens.brandWhite);
    root.style.setProperty("--brand-yellow", newTokens.brandYellow);
    root.style.setProperty("--base-font-size", `${newTokens.baseFontSize}px`);
  };

  const handleChange = (key: keyof DesignTokens, value: string | number) => {
    const newTokens = { ...tokens, [key]: value };
    setTokens(newTokens);
    setHasChanges(true);
    applyTokens(newTokens);
  };

  const handleSave = () => {
    localStorage.setItem("designTokens", JSON.stringify(tokens));
    setHasChanges(false);
    alert("Design settings saved! Refresh the page to see changes across all components.");
  };

  const handleReset = () => {
    setTokens(defaultTokens);
    applyTokens(defaultTokens);
    localStorage.removeItem("designTokens");
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-brand-black mb-1">
              Design System Settings
            </h2>
            <p className="text-sm text-brand-black/60">
              Customize the visual appearance of the app. Changes apply immediately.
            </p>
          </div>
          <div className="flex gap-3">
            {hasChanges && (
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-brand-black text-brand-white text-sm font-medium hover:bg-brand-black/90 transition-all"
                style={{ borderRadius: '8px' }}
              >
                Save Changes
              </button>
            )}
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-brand-gray/20 bg-brand-white text-brand-black text-sm font-medium hover:border-brand-black/40 transition-all"
              style={{ borderRadius: '8px' }}
            >
              Reset to Default
            </button>
          </div>
        </div>

        {/* Color Tokens */}
        <div className="bg-brand-white border border-brand-gray/20 p-5 mb-5" style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 className="text-sm font-semibold text-brand-black mb-4">
            Brand Colors
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Brand Black */}
            <div>
              <label className="block text-sm font-medium text-brand-black mb-2">
                Brand Black
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={tokens.brandBlack}
                  onChange={(e) => handleChange("brandBlack", e.target.value)}
                  className="h-10 w-20 border border-brand-gray/20 cursor-pointer"
                  style={{ borderRadius: '8px' }}
                />
                <input
                  type="text"
                  value={tokens.brandBlack}
                  onChange={(e) => handleChange("brandBlack", e.target.value)}
                  className="flex-1 border border-brand-gray/20 px-3 py-2 text-sm text-brand-black focus:outline-none focus:border-brand-black/40 transition-colors"
                  style={{ borderRadius: '8px' }}
                  placeholder="#0c0c0c"
                />
              </div>
              <div
                className="mt-2 h-8 border border-brand-gray/15"
                style={{ backgroundColor: tokens.brandBlack, borderRadius: '8px' }}
              />
            </div>

            {/* Brand Gray */}
            <div>
              <label className="block text-sm font-medium text-brand-black mb-2">
                Brand Gray
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={tokens.brandGray}
                  onChange={(e) => handleChange("brandGray", e.target.value)}
                  className="h-10 w-20 border border-brand-gray/20 cursor-pointer"
                  style={{ borderRadius: '8px' }}
                />
                <input
                  type="text"
                  value={tokens.brandGray}
                  onChange={(e) => handleChange("brandGray", e.target.value)}
                  className="flex-1 border border-brand-gray/20 px-3 py-2 text-sm text-brand-black focus:outline-none focus:border-brand-black/40 transition-colors"
                  style={{ borderRadius: '8px' }}
                  placeholder="#bec2c6"
                />
              </div>
              <div
                className="mt-2 h-8 border border-brand-gray/15"
                style={{ backgroundColor: tokens.brandGray, borderRadius: '8px' }}
              />
            </div>

            {/* Brand White */}
            <div>
              <label className="block text-sm font-medium text-brand-black mb-2">
                Brand White
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={tokens.brandWhite}
                  onChange={(e) => handleChange("brandWhite", e.target.value)}
                  className="h-10 w-20 border border-brand-gray/20 cursor-pointer"
                  style={{ borderRadius: '8px' }}
                />
                <input
                  type="text"
                  value={tokens.brandWhite}
                  onChange={(e) => handleChange("brandWhite", e.target.value)}
                  className="flex-1 border border-brand-gray/20 px-3 py-2 text-sm text-brand-black focus:outline-none focus:border-brand-black/40 transition-colors"
                  style={{ borderRadius: '8px' }}
                  placeholder="#ffffff"
                />
              </div>
              <div
                className="mt-2 h-8 border border-brand-gray/15"
                style={{ backgroundColor: tokens.brandWhite, borderRadius: '8px' }}
              />
            </div>

            {/* Brand Yellow */}
            <div>
              <label className="block text-sm font-medium text-brand-black mb-2">
                Brand Yellow
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={tokens.brandYellow}
                  onChange={(e) => handleChange("brandYellow", e.target.value)}
                  className="h-10 w-20 border border-brand-gray/20 cursor-pointer"
                  style={{ borderRadius: '8px' }}
                />
                <input
                  type="text"
                  value={tokens.brandYellow}
                  onChange={(e) => handleChange("brandYellow", e.target.value)}
                  className="flex-1 border border-brand-gray/20 px-3 py-2 text-sm text-brand-black focus:outline-none focus:border-brand-black/40 transition-colors"
                  style={{ borderRadius: '8px' }}
                  placeholder="#f7f126"
                />
              </div>
              <div
                className="mt-2 h-8 border border-brand-gray/15"
                style={{ backgroundColor: tokens.brandYellow, borderRadius: '8px' }}
              />
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="bg-brand-white border border-brand-gray/20 p-5 mb-5" style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 className="text-sm font-semibold text-brand-black mb-4">
            Typography
          </h3>

          <div>
            <label className="block text-sm font-medium text-brand-black mb-2">
              Base Font Size: {tokens.baseFontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="20"
              value={tokens.baseFontSize}
              onChange={(e) => handleChange("baseFontSize", parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-brand-black/50 mt-1">
              <span>12px</span>
              <span>16px (default)</span>
              <span>20px</span>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-brand-white border border-brand-gray/20 p-5 mb-5" style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 className="text-sm font-semibold text-brand-black mb-4">
            Preview
          </h3>

          <div className="border border-brand-gray/15 p-5 bg-brand-white space-y-4" style={{ borderRadius: '12px' }}>
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 bg-brand-gray/10"
                style={{ backgroundColor: `${tokens.brandGray}20`, borderRadius: '8px' }}
              />
              <div>
                <h4 className="text-base font-semibold text-brand-black">
                  Sample Asset Name
                </h4>
                <p className="text-sm text-brand-black/60">Brand · SKU</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                className="px-4 py-2 text-brand-white text-sm font-medium"
                style={{
                  borderRadius: '8px',
                  backgroundColor: tokens.brandBlack,
                }}
              >
                Primary Button
              </button>
              <button
                className="px-4 py-2 border text-sm font-medium"
                style={{
                  borderRadius: '8px',
                  borderColor: `${tokens.brandGray}33`,
                  backgroundColor: tokens.brandWhite,
                  color: tokens.brandBlack,
                }}
              >
                Secondary Button
              </button>
            </div>
            <div className="text-sm text-brand-black">
              <p>Buy (B2B): ₹24,500</p>
              <p>Sell (B2C): ₹27,000 – ₹29,500</p>
            </div>
          </div>
        </div>

        {/* Current Values Display */}
        <div className="p-5 bg-brand-gray/5 border border-brand-gray/15" style={{ borderRadius: '12px' }}>
          <h3 className="text-sm font-medium text-brand-black mb-3">
            Current Design Tokens
          </h3>
          <pre className="text-xs font-mono text-brand-black/70 overflow-x-auto">
            {JSON.stringify(tokens, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

