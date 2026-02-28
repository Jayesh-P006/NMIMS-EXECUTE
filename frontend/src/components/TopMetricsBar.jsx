import React from "react";
import {
  Leaf,
  Zap,
  Unplug,
  IndianRupee,
} from "lucide-react";

/**
 * TopMetricsBar
 * ──────────────────────────────────────────────────────────────
 * A horizontal row of 4 KPI cards for the command-center header.
 * Uses placeholder data – swap with live API data later.
 */

/* ── Placeholder KPI data ─────────────────────────────────── */
const metrics = [
  {
    id: "carbon",
    label: "Net Carbon Emissions",
    value: "12.4",
    unit: "tonnes CO₂",
    delta: "-8.3%",
    deltaDirection: "down",      // "down" is good for emissions
    icon: Leaf,
    accent: "text-emerald-400",
    accentBg: "bg-emerald-500/10",
  },
  {
    id: "eui",
    label: "Energy Use Intensity",
    value: "142",
    unit: "kWh / m²",
    delta: "-3.1%",
    deltaDirection: "down",
    icon: Zap,
    accent: "text-sky-400",
    accentBg: "bg-sky-500/10",
  },
  {
    id: "grid",
    label: "Grid Independence",
    value: "68.5",
    unit: "%",
    delta: "+4.2%",
    deltaDirection: "up",
    icon: Unplug,
    accent: "text-violet-400",
    accentBg: "bg-violet-500/10",
  },
  {
    id: "savings",
    label: "Financial Savings",
    value: "₹3.72L",
    unit: "this month",
    delta: "+12.6%",
    deltaDirection: "up",
    icon: IndianRupee,
    accent: "text-amber-400",
    accentBg: "bg-amber-500/10",
  },
];

/* ── Single KPI Card ──────────────────────────────────────── */
function KpiCard({ metric }) {
  const Icon = metric.icon;
  const isPositive =
    (metric.deltaDirection === "down" && metric.id === "carbon") ||
    (metric.deltaDirection === "down" && metric.id === "eui") ||
    (metric.deltaDirection === "up" && metric.id !== "carbon" && metric.id !== "eui");

  return (
    <div
      className="
        flex flex-col justify-between
        bg-campus-900/80 border border-campus-800
        rounded-xl p-5 min-w-[200px]
        hover:border-campus-700 transition-colors
      "
    >
      {/* Top row: icon + delta badge */}
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-lg ${metric.accentBg}`}>
          <Icon className={`w-5 h-5 ${metric.accent}`} />
        </div>
        <span
          className={`
            text-xs font-semibold tracking-wide px-2 py-0.5 rounded-full
            ${isPositive
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-red-500/15 text-red-400"
            }
          `}
        >
          {metric.delta}
        </span>
      </div>

      {/* Value */}
      <p className="text-2xl font-bold text-white leading-none tracking-tight">
        {metric.value}
        <span className="text-xs font-normal text-slate-400 ml-1.5">
          {metric.unit}
        </span>
      </p>

      {/* Label */}
      <p className="text-xs text-slate-500 mt-2 uppercase tracking-wider font-medium">
        {metric.label}
      </p>
    </div>
  );
}

/* ── Exported Component ───────────────────────────────────── */
export default function TopMetricsBar() {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {metrics.map((m) => (
        <KpiCard key={m.id} metric={m} />
      ))}
    </section>
  );
}
