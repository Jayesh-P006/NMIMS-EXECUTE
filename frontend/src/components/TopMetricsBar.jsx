import React from "react";
import {
  Leaf,
  Zap,
  Unplug,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

/* ── KPI data with unique accent bars ─────────────────────── */
const metrics = [
  {
    id: "carbon",
    label: "Net Carbon Emissions",
    value: "12.4",
    unit: "tonnes CO\u2082",
    delta: "-8.3%",
    deltaDirection: "down",
    icon: Leaf,
    accent: "text-emerald-400",
    accentBg: "bg-emerald-500/10",
    barClass: "accent-bar-emerald",
    glowClass: "hover:shadow-glow-emerald",
    borderAccent: "hover:border-emerald-500/20",
  },
  {
    id: "eui",
    label: "Energy Use Intensity",
    value: "142",
    unit: "kWh / m\u00B2",
    delta: "-3.1%",
    deltaDirection: "down",
    icon: Zap,
    accent: "text-sky-400",
    accentBg: "bg-sky-500/10",
    barClass: "accent-bar-sky",
    glowClass: "hover:shadow-glow-sky",
    borderAccent: "hover:border-sky-500/20",
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
    barClass: "accent-bar-violet",
    glowClass: "hover:shadow-glow-violet",
    borderAccent: "hover:border-violet-500/20",
  },
  {
    id: "savings",
    label: "Financial Savings",
    value: "\u20B93.72L",
    unit: "this month",
    delta: "+12.6%",
    deltaDirection: "up",
    icon: IndianRupee,
    accent: "text-amber-400",
    accentBg: "bg-amber-500/10",
    barClass: "accent-bar-amber",
    glowClass: "hover:shadow-glow-amber",
    borderAccent: "hover:border-amber-500/20",
  },
];

/* ── Single KPI Card ──────────────────────────────────────── */
function KpiCard({ metric, index }) {
  const Icon = metric.icon;
  const DeltaIcon = metric.deltaDirection === "up" ? ArrowUpRight : ArrowDownRight;
  const isPositive =
    (metric.deltaDirection === "down" && (metric.id === "carbon" || metric.id === "eui")) ||
    (metric.deltaDirection === "up" && metric.id !== "carbon" && metric.id !== "eui");

  return (
    <div
      className={`
        glass-card glass-card-hover ${metric.barClass} p-5 min-w-[200px]
        animate-fade-in-up stagger-${index + 1}
        ${metric.glowClass} ${metric.borderAccent}
      `}
    >
      {/* Top row: icon + delta badge */}
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${metric.accentBg} border border-white/[0.04]`}>
          <Icon className={`w-5 h-5 ${metric.accent}`} />
        </div>
        <span
          className={`
            flex items-center gap-0.5 text-xs font-semibold tracking-wide px-2 py-0.5 rounded-full
            ${isPositive
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-red-500/15 text-red-400"
            }
          `}
        >
          <DeltaIcon className="w-3 h-3" />
          {metric.delta}
        </span>
      </div>

      {/* Value */}
      <p className="text-2xl font-extrabold text-white leading-none tracking-tight">
        {metric.value}
        <span className="text-xs font-normal text-slate-500 ml-1.5">
          {metric.unit}
        </span>
      </p>

      {/* Label */}
      <p className="text-[11px] text-slate-500 mt-2.5 uppercase tracking-wider font-medium">
        {metric.label}
      </p>
    </div>
  );
}

/* ── Exported Component ───────────────────────────────────── */
export default function TopMetricsBar() {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {metrics.map((m, i) => (
        <KpiCard key={m.id} metric={m} index={i} />
      ))}
    </section>
  );
}
