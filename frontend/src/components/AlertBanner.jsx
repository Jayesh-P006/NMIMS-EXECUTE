import React from "react";
import {
  AlertTriangle,
  X,
} from "lucide-react";

/**
 * AlertBanner
 * ──────────────────────────────────────────────────────────────
 * A top-of-page alert strip that accepts an `alertMessage` prop.
 * Renders nothing when the message is falsy.
 * Includes a dismiss button that calls the optional `onDismiss` prop.
 *
 * Props:
 *   alertMessage  : string | null   – message to display
 *   severity      : "high" | "medium" | "low"  (default "high")
 *   onDismiss     : () => void      – optional dismiss handler
 */
const severityStyles = {
  high: "bg-red-900/60 border-red-700/60 text-red-200",
  medium: "bg-amber-900/50 border-amber-700/50 text-amber-200",
  low: "bg-sky-900/50 border-sky-700/50 text-sky-200",
};

const severityIcon = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-sky-400",
};

export default function AlertBanner({
  alertMessage,
  severity = "high",
  onDismiss,
}) {
  if (!alertMessage) return null;

  const containerClass = severityStyles[severity] || severityStyles.high;
  const iconClass = severityIcon[severity] || severityIcon.high;

  return (
    <div
      role="alert"
      className={`
        flex items-center justify-between gap-3
        px-5 py-3 border-b text-sm font-medium tracking-wide
        ${containerClass}
      `}
    >
      {/* Icon + Message */}
      <div className="flex items-center gap-3 min-w-0">
        <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${iconClass}`} />
        <span className="truncate">{alertMessage}</span>
      </div>

      {/* Dismiss */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
