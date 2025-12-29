import React from "react";

interface AlertsSheetProps {
  open: boolean;
  onClose: () => void;
}

export const AlertsSheet: React.FC<AlertsSheetProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-end md:items-center justify-center bg-black/60">
      <div className="w-full md:max-w-md md:rounded-none md:border md:border-brand-gray/20 bg-brand-white p-4 md:p-5 shadow-xl rounded-none">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-body font-normal text-brand-black">
            Configure alerts
          </h3>
          <button
            onClick={onClose}
            className="text-brand-black text-xs hover:text-brand-black"
          >
            ✕
          </button>
        </div>
          <p className="text-sm text-brand-black mb-3">
          Get notified when the market moves into your preferred zone. Alerts are
          sent via email / in-app in this mock.
        </p>
        <div className="space-y-2 text-sm text-brand-black">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-3 w-3" />
            <span>Price drops below your target band</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-3 w-3" />
            <span>New listings appear in India consumer market</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-3 w-3" />
            <span>Liquidity rating changes by a full step</span>
          </label>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-brand-black text-xs font-body font-normal">
            Alert frequency
          </p>
          <div className="flex flex-wrap gap-2">
            {["Instant", "Daily", "Weekly"].map((f, idx) => (
              <button
                key={f}
                className={`px-3 py-1 rounded-none border text-sm ${
                  idx === 0
                    ? "border-brand-black bg-brand-black text-brand-white"
                    : "border-brand-gray/20 text-brand-black hover:bg-brand-gray/10"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <button className="mt-4 w-full py-2 rounded border border-brand-black bg-brand-black text-brand-white text-sm font-medium hover:bg-brand-black/90">
          Save alert preferences
        </button>
      </div>
    </div>
  );
};

