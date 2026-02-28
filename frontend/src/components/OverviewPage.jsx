import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  Leaf,
  Zap,
  Sun,
  Cloud,
  Wind,
  Droplets,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Target,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  Building2,
  Gauge,
  ThermometerSun,
  BatteryCharging,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

/**
 * OverviewPage — Enhanced Net-Zero Command Center Overview
 * ──────────────────────────────────────────────────────────────
 * Industry-grade dashboard inspired by:
 *   • Siemens Navigator      — Energy Performance Index, building comparison
 *   • Schneider EcoStruxure  — Real-time energy flow, sustainability scorecard
 *   • Johnson Controls OpenBlue — Predictive insights, weather correlation
 *   • Google DeepMind/Sustainability — Carbon intensity, renewable matching
 *
 * Features:
 *   1. Net-Zero Progress Ring (animated SVG gauge)
 *   2. Carbon Savings Counter (live rolling)
 *   3. Sustainability Score with Letter Grade
 *   4. Peak Demand Tracker
 *   5. 24-Hour Energy Profile (AreaChart)
 *   6. Renewable Mix (Donut PieChart)
 *   7. Block Performance Grid (efficiency cards)
 *   8. Energy Flow Visualization
 *   9. Weather Impact Panel
 *  10. Live Activity Feed
 *  11. Surge Prediction Status
 */

const API_URL = "http://localhost:5000/api/overview";
const SURGE_URL = "http://localhost:5000/api/predict-surge";
const POLL_INTERVAL = 5000;

/* ══════════════════════════════════════════════════════════════
   UTILITY HELPERS
   ══════════════════════════════════════════════════════════════ */

function formatINR(v) {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(2)} L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(1)} K`;
  return `₹${v.toFixed(0)}`;
}

function gradeColor(grade) {
  if (grade.startsWith("A")) return "text-emerald-400";
  if (grade.startsWith("B")) return "text-sky-400";
  if (grade.startsWith("C")) return "text-amber-400";
  return "text-red-400";
}

function gradeBg(grade) {
  if (grade.startsWith("A")) return "bg-emerald-500/15";
  if (grade.startsWith("B")) return "bg-sky-500/15";
  if (grade.startsWith("C")) return "bg-amber-500/15";
  return "bg-red-500/15";
}

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════════════════════ */

/* ── 1. Net-Zero Progress Ring ─────────────────────────────── */
function NetZeroGauge({ progress }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  const ringColor =
    progress >= 70 ? "#34d399" : progress >= 40 ? "#38bdf8" : "#f59e0b";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Background ring */}
          <circle
            cx="60" cy="60" r={radius}
            stroke="#1e2d56" strokeWidth="8" fill="none"
          />
          {/* Progress ring */}
          <circle
            cx="60" cy="60" r={radius}
            stroke={ringColor}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{progress}%</span>
          <span className="text-[9px] text-slate-500 uppercase tracking-widest">Net-Zero</span>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-2">Progress to Net-Zero Target</p>
    </div>
  );
}

/* ── 2. Stat Card (generic) ────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, accent, accentBg, trend, trendUp }) {
  return (
    <div className="bg-campus-900/80 border border-campus-800 rounded-xl p-4 hover:border-campus-700 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${accentBg}`}>
          <Icon className={`w-4 h-4 ${accent}`} />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            trendUp ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
          }`}>
            {trendUp
              ? <ArrowUpRight className="w-3 h-3" />
              : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>
      <p className="text-xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── 3. Sustainability Score Badge ─────────────────────────── */
function SustainabilityBadge({ score, grade }) {
  return (
    <div className="bg-campus-900/80 border border-campus-800 rounded-xl p-5 flex flex-col items-center justify-center hover:border-campus-700 transition-colors">
      <div className={`w-16 h-16 rounded-2xl ${gradeBg(grade)} flex items-center justify-center mb-3`}>
        <span className={`text-2xl font-black ${gradeColor(grade)}`}>{grade}</span>
      </div>
      <div className="w-full bg-campus-800 rounded-full h-1.5 mb-2">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-red-500 via-amber-500 via-sky-500 to-emerald-500 transition-all duration-1000"
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-sm font-semibold text-white">{score}/100</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Sustainability Score</p>
      <p className="text-[9px] text-slate-600 mt-1 text-center">
        Composite: Renewable Mix • Carbon • Efficiency
      </p>
    </div>
  );
}

/* ── 4. Peak Demand Indicator ──────────────────────────────── */
function PeakDemandCard({ peak, target, time }) {
  const pct = Math.min(100, (peak / target) * 100);
  const isAlert = pct > 85;

  return (
    <div className="bg-campus-900/80 border border-campus-800 rounded-xl p-4 hover:border-campus-700 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <Gauge className="w-4 h-4 text-orange-400" />
          </div>
          <span className="text-xs text-slate-400 font-medium">Peak Demand</span>
        </div>
        {isAlert && (
          <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
        )}
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-xl font-bold text-white">{peak}</span>
        <span className="text-xs text-slate-500">/ {target} kW</span>
      </div>
      {/* Progress bar */}
      <div className="w-full bg-campus-800 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${
            isAlert ? "bg-gradient-to-r from-amber-500 to-red-500" : "bg-gradient-to-r from-sky-600 to-sky-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>Peak at {time}</span>
        <span>{pct.toFixed(0)}% of target</span>
      </div>
    </div>
  );
}

/* ── 5. Energy Flow Visualization ──────────────────────────── */
function EnergyFlowDiagram({ solar, grid, hvac, total }) {
  return (
    <div className="bg-campus-900/80 border border-campus-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-cyan-500/10">
          <BatteryCharging className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Energy Flow — Right Now
          </h3>
          <p className="text-[10px] text-slate-500">Real-time generation → consumption flow</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Sources */}
        <div className="space-y-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest text-center">Sources</p>
          <div className="bg-campus-800/60 rounded-lg p-3 border border-cyan-500/20">
            <Sun className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <p className="text-center text-sm font-bold text-cyan-400">{solar} kW</p>
            <p className="text-center text-[9px] text-slate-500">Solar</p>
          </div>
          <div className="bg-campus-800/60 rounded-lg p-3 border border-amber-500/20">
            <Zap className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-center text-sm font-bold text-amber-400">{grid} kW</p>
            <p className="text-center text-[9px] text-slate-500">Grid</p>
          </div>
        </div>

        {/* Flow arrows */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="flex items-center gap-1">
            <div className="w-8 h-0.5 bg-gradient-to-r from-cyan-500/60 to-campus-800" />
            <ArrowUpRight className="w-3 h-3 text-cyan-400/60" />
          </div>
          <div className="bg-campus-800/80 rounded-xl p-3 border border-campus-700">
            <Building2 className="w-6 h-6 text-slate-400 mx-auto mb-1" />
            <p className="text-center text-sm font-bold text-white">{total} kW</p>
            <p className="text-center text-[9px] text-slate-500">Campus Load</p>
          </div>
          <div className="flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3 text-amber-400/60" />
            <div className="w-8 h-0.5 bg-gradient-to-l from-amber-500/60 to-campus-800" />
          </div>
        </div>

        {/* Consumers */}
        <div className="space-y-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest text-center">Consumers</p>
          <div className="bg-campus-800/60 rounded-lg p-3 border border-violet-500/20">
            <ThermometerSun className="w-5 h-5 text-violet-400 mx-auto mb-1" />
            <p className="text-center text-sm font-bold text-violet-400">{hvac} kW</p>
            <p className="text-center text-[9px] text-slate-500">HVAC</p>
          </div>
          <div className="bg-campus-800/60 rounded-lg p-3 border border-slate-500/20">
            <Zap className="w-5 h-5 text-slate-400 mx-auto mb-1" />
            <p className="text-center text-sm font-bold text-slate-300">
              {Math.max(0, total - hvac).toFixed(1)} kW
            </p>
            <p className="text-center text-[9px] text-slate-500">Other</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 6. Weather Impact Panel ───────────────────────────────── */
function WeatherPanel({ weather }) {
  if (!weather) return null;

  const condIcon = weather.condition?.includes("Cloud") ? Cloud :
                   weather.condition?.includes("Overcast") ? Cloud : Sun;
  const CondIcon = condIcon;

  return (
    <div className="bg-campus-900/80 border border-campus-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-sky-500/10">
          <Cloud className="w-4 h-4 text-sky-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Weather & Impact
          </h3>
          <p className="text-[10px] text-slate-500">Ambient conditions affecting energy use</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CondIcon className="w-10 h-10 text-amber-300" />
          <div>
            <p className="text-2xl font-bold text-white">{weather.temp_c}°C</p>
            <p className="text-xs text-slate-500">{weather.condition}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-campus-800/50 rounded-lg p-2 text-center">
          <Droplets className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
          <p className="text-xs font-semibold text-white">{weather.humidity}%</p>
          <p className="text-[9px] text-slate-600">Humidity</p>
        </div>
        <div className="bg-campus-800/50 rounded-lg p-2 text-center">
          <Wind className="w-3.5 h-3.5 text-teal-400 mx-auto mb-1" />
          <p className="text-xs font-semibold text-white">{weather.wind_kmh} km/h</p>
          <p className="text-[9px] text-slate-600">Wind</p>
        </div>
        <div className="bg-campus-800/50 rounded-lg p-2 text-center">
          <Sun className="w-3.5 h-3.5 text-yellow-400 mx-auto mb-1" />
          <p className="text-xs font-semibold text-white">{weather.solar_irradiance_w_m2}</p>
          <p className="text-[9px] text-slate-600">W/m² Solar</p>
        </div>
      </div>

      {/* Weather → Energy insight */}
      <div className="mt-3 px-3 py-2 rounded-lg bg-campus-800/40 border border-campus-800">
        <p className="text-[10px] text-slate-400">
          <span className="text-sky-400 font-semibold">Insight:</span>{" "}
          {weather.temp_c > 32
            ? "High temperature driving increased HVAC load. Consider pre-cooling strategy."
            : weather.solar_irradiance_w_m2 > 500
            ? "Strong solar irradiance — solar panels operating near peak efficiency."
            : weather.solar_irradiance_w_m2 < 100
            ? "Low solar irradiance — grid dependency is higher than normal."
            : "Moderate conditions — energy systems operating within normal parameters."}
        </p>
      </div>
    </div>
  );
}

/* ── 7. Block Performance Card ─────────────────────────────── */
function BlockCard({ block }) {
  const scoreColor =
    block.efficiency_score >= 75 ? "text-emerald-400" :
    block.efficiency_score >= 50 ? "text-amber-400" : "text-red-400";
  const barColor =
    block.efficiency_score >= 75 ? "bg-emerald-500" :
    block.efficiency_score >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="bg-campus-900/80 border border-campus-800 rounded-xl p-4 hover:border-campus-700 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-200">{block.name}</span>
        </div>
        <span className={`text-lg font-bold ${scoreColor}`}>{block.efficiency_score}</span>
      </div>

      {/* Efficiency bar */}
      <div className="w-full bg-campus-800 rounded-full h-1.5 mb-3">
        <div
          className={`h-1.5 rounded-full ${barColor} transition-all duration-700`}
          style={{ width: `${block.efficiency_score}%` }}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs font-bold text-amber-400">{block.grid_kw}</p>
          <p className="text-[9px] text-slate-600">Grid kW</p>
        </div>
        <div>
          <p className="text-xs font-bold text-cyan-400">{block.solar_kw}</p>
          <p className="text-[9px] text-slate-600">Solar kW</p>
        </div>
        <div>
          <p className="text-xs font-bold text-violet-400">{block.hvac_kw}</p>
          <p className="text-[9px] text-slate-600">HVAC kW</p>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-campus-800/60 flex justify-between text-[10px]">
        <span className="text-slate-600">EUI: {block.eui} kWh/m²</span>
        <span className="text-slate-600">{block.sqft?.toLocaleString()} sq ft</span>
      </div>
    </div>
  );
}

/* ── 8. Activity Feed ──────────────────────────────────────── */
function ActivityFeed({ events }) {
  const typeStyles = {
    warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
    success: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    info:    { icon: Info,          color: "text-sky-400",     bg: "bg-sky-500/10" },
  };

  return (
    <div className="bg-campus-900/80 border border-campus-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-violet-500/10">
          <Activity className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Live Activity Feed
          </h3>
          <p className="text-[10px] text-slate-500">Real-time campus energy events</p>
        </div>
      </div>

      <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
        {events.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-4">Waiting for events…</p>
        )}
        {events.map((evt, i) => {
          const style = typeStyles[evt.type] || typeStyles.info;
          const Icon = style.icon;
          return (
            <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-campus-800/30 transition-colors">
              <div className={`p-1 rounded ${style.bg} mt-0.5`}>
                <Icon className={`w-3 h-3 ${style.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-300 truncate">{evt.event}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-slate-600 font-mono">{evt.time}</span>
                  <span className="text-[9px] text-slate-600">• {evt.block}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 9. Custom Chart Tooltips ──────────────────────────────── */
function AreaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-campus-900 border border-campus-700 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-[11px] text-slate-500 font-mono mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="text-white font-semibold">{entry.value} kW</span>
        </div>
      ))}
    </div>
  );
}

/* ── 10. Surge Prediction Mini Card ────────────────────────── */
function SurgePredictionCard({ surgeData }) {
  if (!surgeData) return null;

  const isAlert = surgeData.anomaly_alert;

  return (
    <div className={`bg-campus-900/80 border rounded-xl p-4 ${
      isAlert ? "border-red-500/40" : "border-campus-800"
    } hover:border-campus-700 transition-colors`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isAlert ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
            <Shield className={`w-4 h-4 ${isAlert ? "text-red-400" : "text-emerald-400"}`} />
          </div>
          <span className="text-xs font-medium text-slate-400">ML Surge Prediction</span>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
          isAlert
            ? "bg-red-500/15 text-red-400"
            : "bg-emerald-500/15 text-emerald-400"
        }`}>
          {isAlert ? "ALERT" : "NORMAL"}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-white">
          {surgeData.predicted_Grid_Power_Draw_kW} kW
        </span>
        <span className="text-[10px] text-slate-500">predicted in 1hr</span>
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-slate-600">
        <span>Threshold: {surgeData.surge_threshold_kW} kW</span>
        <span>{surgeData.data_points_used} data points</span>
      </div>
      {isAlert && surgeData.alert?.recommended_actions && (
        <div className="mt-3 space-y-1">
          {surgeData.alert.recommended_actions.map((action, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] text-amber-400/80">
              <span>•</span>
              <span>{action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   MAIN OVERVIEW PAGE
   ══════════════════════════════════════════════════════════════ */

const PIE_COLORS = ["#22d3ee", "#f59e0b"];

export default function OverviewPage() {
  const [data, setData] = useState(null);
  const [surgeData, setSurgeData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);

  /* ── Fetch overview data ─────────────────────────────────── */
  const fetchData = async () => {
    try {
      const [ovRes, surgeRes] = await Promise.all([
        fetch(API_URL),
        fetch(SURGE_URL),
      ]);

      if (ovRes.ok) {
        const json = await ovRes.json();
        setData(json);
        setConnected(true);
        setLastUpdate(new Date());
      } else {
        setConnected(false);
      }

      if (surgeRes.ok) {
        const surgeJson = await surgeRes.json();
        setSurgeData(surgeJson);
      }
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, []);

  /* ── Derived data ────────────────────────────────────────── */
  const pieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Solar", value: data.renewable_pct || 0 },
      { name: "Grid", value: data.grid_pct || 100 },
    ];
  }, [data]);

  const totalGrid = data?.blocks?.reduce((s, b) => s + b.grid_kw, 0)?.toFixed(1) || "0";
  const totalSolar = data?.blocks?.reduce((s, b) => s + b.solar_kw, 0)?.toFixed(1) || "0";
  const totalHVAC = data?.blocks?.reduce((s, b) => s + b.hvac_kw, 0)?.toFixed(1) || "0";
  const totalLoad = (parseFloat(totalGrid) + parseFloat(totalSolar)).toFixed(1);

  /* ── Loading state ───────────────────────────────────────── */
  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64 rounded-xl border border-dashed border-campus-700 bg-campus-900/40">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 text-slate-600 animate-spin" />
            <p className="text-sm text-slate-500">Loading overview data from API…</p>
            <p className="text-[10px] text-slate-600">Ensure Flask backend is running on port 5000</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* ── Connection Status Bar ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {connected
            ? <><Wifi className="w-3.5 h-3.5 text-emerald-400" /><span className="text-[11px] text-emerald-400 font-mono">Live</span></>
            : <><WifiOff className="w-3.5 h-3.5 text-red-400" /><span className="text-[11px] text-red-400 font-mono">Disconnected</span></>
          }
          {lastUpdate && (
            <span className="text-[10px] text-slate-600 font-mono ml-1">
              Updated {lastUpdate.toLocaleTimeString("en-IN", { hour12: false })}
            </span>
          )}
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ROW 1 — Hero Metrics: Gauge + Cards + Score
         ══════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Net-Zero Gauge */}
        <div className="bg-campus-900/80 border border-campus-800 rounded-xl p-5 flex items-center justify-center">
          <NetZeroGauge progress={data.net_zero_progress} />
        </div>

        {/* Middle stats */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <StatCard
            icon={Leaf}
            label="Carbon Saved Today"
            value={`${data.carbon_saved_today_kg} kg`}
            sub="CO₂ offset via solar"
            accent="text-emerald-400"
            accentBg="bg-emerald-500/10"
            trend="+12%"
            trendUp={true}
          />
          <StatCard
            icon={TrendingUp}
            label="Financial Savings"
            value={formatINR(data.financial_savings_inr)}
            sub="Today's solar-based savings"
            accent="text-amber-400"
            accentBg="bg-amber-500/10"
            trend="+8.5%"
            trendUp={true}
          />
          <StatCard
            icon={Zap}
            label="Total Consumption"
            value={`${data.total_consumption_kwh} kWh`}
            sub={`Grid: ${data.total_grid_kwh} • Solar: ${data.total_solar_kwh}`}
            accent="text-sky-400"
            accentBg="bg-sky-500/10"
          />
          <PeakDemandCard
            peak={data.peak_demand_kw}
            target={data.peak_target_kw}
            time={data.peak_demand_time}
          />
        </div>

        {/* Sustainability Score */}
        <SustainabilityBadge
          score={data.sustainability_score}
          grade={data.sustainability_grade}
        />
      </section>

      {/* ══════════════════════════════════════════════════════════
          ROW 2 — Charts: 24H Profile + Renewable Mix
         ══════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 24-Hour Energy Profile */}
        <div className="lg:col-span-2 bg-campus-900/80 border border-campus-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-sky-500/10">
              <BarChart3 className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                24-Hour Energy Profile
              </h3>
              <p className="text-[10px] text-slate-500">Today's hourly average consumption pattern</p>
            </div>
          </div>

          {data.hourly_profile?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.hourly_profile} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="hvacGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="#1e2d56" vertical={false} />
                <XAxis
                  dataKey="hour" tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false} axisLine={{ stroke: "#1e2d56" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false} axisLine={false} unit=" kW"
                />
                <Tooltip content={<AreaTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={30}
                  formatter={(v) => <span className="text-xs text-slate-400">{v}</span>}
                />
                <Area type="monotone" dataKey="grid" name="Grid" stroke="#f59e0b" fill="url(#gridGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="solar" name="Solar" stroke="#22d3ee" fill="url(#solarGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="hvac" name="HVAC" stroke="#a78bfa" fill="url(#hvacGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center rounded-lg border border-dashed border-campus-700">
              <p className="text-xs text-slate-600">Hourly data accumulating…</p>
            </div>
          )}
        </div>

        {/* Renewable Mix Donut */}
        <div className="bg-campus-900/80 border border-campus-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Sun className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                Energy Mix
              </h3>
              <p className="text-[10px] text-slate-500">Solar vs Grid ratio today</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val) => `${val.toFixed(1)}%`}
                contentStyle={{
                  backgroundColor: "#0f1629",
                  border: "1px solid #1e2d56",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="text-xs text-slate-400">Solar {data.renewable_pct}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-xs text-slate-400">Grid {data.grid_pct}%</span>
            </div>
          </div>

          {/* Comparison benchmark */}
          <div className="mt-4 px-3 py-2 rounded-lg bg-campus-800/40 border border-campus-800">
            <p className="text-[10px] text-slate-500 text-center">
              <span className="text-sky-400 font-semibold">vs Industry Avg:</span>{" "}
              {data.renewable_pct > 25
                ? `${(data.renewable_pct - 25).toFixed(1)}% above the 25% industry benchmark`
                : `${(25 - data.renewable_pct).toFixed(1)}% below the 25% industry benchmark`}
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          ROW 3 — Energy Flow + Weather
         ══════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EnergyFlowDiagram
          solar={totalSolar}
          grid={totalGrid}
          hvac={totalHVAC}
          total={totalLoad}
        />
        <WeatherPanel weather={data.weather} />
      </section>

      {/* ══════════════════════════════════════════════════════════
          ROW 4 — Block Performance + Surge Prediction
         ══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Block Performance Index
          </h3>
          <span className="text-[10px] text-slate-600 ml-1">
            (Inspired by Siemens Energy Performance Index)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.blocks?.map((block) => (
            <BlockCard key={block.name} block={block} />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          ROW 5 — Activity Feed + ML Prediction
         ══════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityFeed events={data.activity_feed || []} />
        <div className="space-y-4">
          <SurgePredictionCard surgeData={surgeData} />

          {/* Campus EUI Benchmark */}
          <div className="bg-campus-900/80 border border-campus-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <BarChart3 className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                  Campus EUI Benchmark
                </h3>
                <p className="text-[10px] text-slate-500">Energy Use Intensity comparison</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: "Your Campus", value: data.campus_eui, color: "bg-sky-500" },
                { label: "India Avg (Office)", value: 180, color: "bg-slate-600" },
                { label: "GRIHA 5-Star", value: 90, color: "bg-emerald-500" },
                { label: "Net-Zero Target", value: 50, color: "bg-cyan-500" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="text-slate-500 font-mono">{item.value} kWh/m²</span>
                  </div>
                  <div className="w-full bg-campus-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${item.color} transition-all duration-700`}
                      style={{ width: `${Math.min(100, (item.value / 250) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 px-3 py-2 rounded-lg bg-campus-800/40 border border-campus-800">
              <p className="text-[10px] text-slate-400 text-center">
                {data.campus_eui < 100
                  ? "✦ Excellent — Campus EUI is below GRIHA 5-Star standards"
                  : data.campus_eui < 180
                  ? "◉ Good — Campus EUI is below India average, room to improve"
                  : "⚠ Above Average — Consider efficiency improvements to reduce EUI"}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
