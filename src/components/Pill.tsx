import React from "react";

interface PillProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "primary" | "success" | "danger";
}

/**
 * Clean, modern pill button component
 * Inspired by Sentria intelligence-first terminal design
 */
export const Pill: React.FC<PillProps> = ({
  label,
  active = false,
  onClick,
  disabled = false,
  className = "",
  size = "md",
  variant = "default",
}) => {
  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const variantClasses = {
    default: active
      ? "bg-terminal-surface-raised text-terminal-text border-terminal-border-strong"
      : "bg-terminal-surface text-brand-black border-brand-gray hover:border-terminal-border-strong",
    primary: active
      ? "bg-blue-600 text-white border-blue-600"
      : "bg-terminal-surface text-blue-600 border-blue-200 hover:border-blue-600",
    success: active
      ? "bg-up text-terminal-bg border-up/40"
      : "bg-terminal-surface text-up border-up/40 hover:border-up/40",
    danger: active
      ? "bg-down text-white border-down/40"
      : "bg-terminal-surface text-down border-down/40 hover:border-down/40",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        border-2
        font-semibold
        transition-all
        duration-200
        disabled:opacity-40
        disabled:cursor-not-allowed
        active:scale-95
        ${className}
      `}
      style={{ borderRadius: "9999px" }}
    >
      {label}
    </button>
  );
};

interface PillGroupProps {
  children: React.ReactNode;
  className?: string;
  label?: string;
}

/**
 * Container for pill buttons with optional label
 */
export const PillGroup: React.FC<PillGroupProps> = ({ children, className = "", label }) => {
  return (
    <div className={className}>
      {label && (
        <p className="text-xs text-brand-black/60 uppercase tracking-wide mb-2 font-semibold">
          {label}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
};

