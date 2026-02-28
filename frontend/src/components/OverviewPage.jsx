import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Leaf,
  Zap,
  Sun,
  Cloud,
  Wind,
  Droplets,
  TrendingUp,
  Activity,
  Shield,
  Target,
  AlertTriangle,
  CheckCircle2,
  Info,
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

const API_URL = "http://localhost:5000/api/overview";
const SURGE_URL = "http://localhost:5000/api/predict-surge";
const POLL_INTERVAL = 5000;

/* ══════════════════════════════════════════════════════════════
   UTILITY HELPERS
   ══════════════════════════════════════════════════════════════ */

function formatINR(v) {
  if (v >= 1_00_00_000) return `\u20B9${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000) return `\u20B9${(v / 1_00_000).toFixed(2)} L`;
  if (v >= 1_000) return `\u20B9${(v / 1_000).toFixed(1)} K`;
  return `\u20B9${v.toFixed(0)}`;
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
    progress >= 70 ? "#34d399" : progress >= 40 ? "#38bdf8" : "#fbbf24";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        {/* Ambient glow behind gauge */}
        <div
          className="absolute inset-4 rounded-full blur-2xl opacity-20"
          style={{ backgroundColor: ringColor }}
        />
        <svg className="w-full h-full -rotate-90 relative" viewBox="0 0 120 120">
          <defs>
            <filter id="ringGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={ringColor} />
              <stop offset="100%" stopColor={ringColor} stopOpacity="0.5" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx="60" cy="60" r={radius}
            stroke="rgba(255,255,255,0.04)" strokeWidth="8" fill="none"
          />
          {/* Progress ring with glow */}
          <circle
            cx="60" cy="60" r={radius}
            stroke="url(#ringGradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            filter="url(#ringGlow)"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-white">{progress}%</span>
          <span className="text-[8px] text-slate-500 uppercase tracking-[0.2em]">Net-Zero</span>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 mt-2">Progress to Target</p>
    </div>
  );
}

/* ── 2. Stat Card (glass variant) ──────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, accent, accentBg, trend, trendUp, accentBar }) {
  return (
    <div className={`glass-card glass-card-hover ${accentBar || ""} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-xl ${accentBg} border border-white/[0.04]`}>
          <Icon className={`w-4 h-4 ${accent}`} />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
            trendUp ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
          }`}>
            {trendUp
              ? <ArrowUpRight className="w-3 h-3" />
              : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>
      <p className="text-xl font-extrabold text-white tracking-tight">{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── 3. Sustainability Score Badge ─────────────────────────── */
function SustainabilityBadge({ score, grade }) {
  return (
    <div className="glass-card glass-card-hover p-5 flex flex-col items-center justify-center">
      <div className={`w-16 h-16 rounded-2xl ${gradeBg(grade)} flex items-center justify-center mb-3 border border-white/[0.04]`}>
        <span className={`text-2xl font-black ${gradeColor(grade)}`}>{grade}</span>
      </div>
      <div className="w-full bg-white/[0.04] rounded-full h-2 mb-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-1000"
          style={{
            width: `${score}%`,
            background: "linear-gradient(90deg, #ef4444, #f59e0b, #38bdf8, #34d399)",
          }}
        />
      </div>
      <p className="text-sm font-bold text-white">{score}/100</p>
      <p className="text-[9px] text-slate-500 uppercase tracking-[0.15em] mt-1">Sustainability</p>
      <p className="text-[9px] text-slate-600 mt-1 text-center">
        Renewable Mix &bull; Carbon &bull; Efficiency
      </p>
    </div>
  );
}

/* ── 4. Peak Demand Indicator ──────────────────────────────── */
function PeakDemandCard({ peak, target, time }) {
  const pct = Math.min(100, (peak / target) * 100);
  const isAlert = pct > 85;

  return (
    <div className={`glass-card glass-card-hover p-4 ${isAlert ? "accent-bar-coral" : "accent-bar-sky"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${isAlert ? "bg-orange-500/10" : "bg-sky-500/10"} border border-white/[0.04]`}>
            <Gauge className={`w-4 h-4 ${isAlert ? "text-orange-400" : "text-sky-400"}`} />
          </div>
          <span className="text-xs text-slate-400 font-medium">Peak Demand</span>
        </div>
        {isAlert && (
          <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
        )}
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-xl font-extrabold text-white">{peak}</span>
        <span className="text-xs text-slate-500">/ {target} kW</span>
      </div>
      <div className="w-full bg-white/[0.04] rounded-full h-2 mb-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: isAlert
              ? "linear-gradient(90deg, #f59e0b, #ef4444)"
              : "linear-gradient(90deg, #0284c7, #38bdf8)",
          }}
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
    <div className="glass-card accent-bar-cyan p-5 animate-fade-in-up stagger-3">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-cyan-500/10 border border-white/[0.04]">
          <BatteryCharging className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-200 tracking-tight">
            Energy Flow &mdash; Right Now
          </h3>
          <p className="text-[10px] text-slate-500">Real-time generation &rarr; consumption</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Sources */}
        <div className="space-y-3">
          <p className="text-[9px] text-slate-500 uppercase tracking-[0.15em] text-center">Sources</p>
          <div className="rounded-xl p-3 border border-cyan-500/15 bg-gradient-to-b from-cyan-500/[0.06] to-transparent">
            <Sun className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <p className="text-center text-sm font-bold text-cyan-400">{solar} kW</p>
            <p className="text-center text-[9px] text-slate-500">Solar</p>
          </div>
          <div className="rounded-xl p-3 border border-amber-500/15 bg-gradient-to-b from-amber-500/[0.06] to-transparent">
            <Zap className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-center text-sm font-bold text-amber-400">{grid} kW</p>
            <p className="text-center text-[9px] text-slate-500">Grid</p>
          </div>
        </div>

        {/* Flow center */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="flex items-center gap-1">
            <div className="w-8 h-0.5 bg-gradient-to-r from-cyan-500/60 to-transparent" />
            <ArrowUpRight className="w-3 h-3 text-cyan-400/60 animate-pulse" />
          </div>
          <div className="rounded-xl p-3 border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent">
            <Building2 className="w-6 h-6 text-slate-400 mx-auto mb-1" />
            <p className="text-center text-sm font-bold text-white">{total} kW</p>
            <p className="text-center text-[9px] text-slate-500">NMIMS Load</p>
          </div>
          <div className="flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3 text-amber-400/60 animate-pulse" />
            <div className="w-8 h-0.5 bg-gradient-to-l from-amber-500/60 to-transparent" />
          </div>
        </div>

        {/* Consumers */}
        <div className="space-y-3">
          <p className="text-[9px] text-slate-500 uppercase tracking-[0.15em] text-center">Consumers</p>
          <div className="rounded-xl p-3 border border-violet-500/15 bg-gradient-to-b from-violet-500/[0.06] to-transparent">
            <ThermometerSun className="w-5 h-5 text-violet-400 mx-auto mb-1" />
            <p className="text-center text-sm font-bold text-violet-400">{hvac} kW</p>
            <p className="text-center text-[9px] text-slate-500">HVAC</p>
          </div>
          <div className="rounded-xl p-3 border border-slate-500/15 bg-gradient-to-b from-white/[0.02] to-transparent">
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

  const CondIcon = weather.condition?.includes("Cloud") || weather.condition?.includes("Overcast")
    ? Cloud : Sun;

  const isSunny = !weather.condition?.includes("Cloud") && !weather.condition?.includes("Overcast");

  return (
    <div className="glass-card accent-bar-amber p-5 animate-fade-in-up stagger-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-sky-500/10 border border-white/[0.04]">
          <Cloud className="w-4 h-4 text-sky-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-200 tracking-tight">
            Weather &amp; Impact
          </h3>
          <p className="text-[10px] text-slate-500">Ambient conditions affecting energy use</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <CondIcon className={`w-10 h-10 ${isSunny ? "text-amber-300" : "text-slate-400"} ${isSunny ? "animate-float" : ""}`} />
            {isSunny && <div className="absolute -inset-1 rounded-full bg-amber-400/10 blur-lg -z-10" />}
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white">{weather.temp_c}&deg;C</p>
            <p className="text-xs text-slate-500">{weather.condition}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Droplets, color: "text-blue-400", value: `${weather.humidity}%`, label: "Humidity" },
          { icon: Wind, color: "text-teal-400", value: `${weather.wind_kmh} km/h`, label: "Wind" },
          { icon: Sun, color: "text-yellow-400", value: `${weather.solar_irradiance_w_m2}`, label: "W/m\u00B2" },
        ].map((item, i) => (
          <div key={i} className="rounded-xl p-2 text-center bg-white/[0.02] border border-white/[0.04]">
            <item.icon className={`w-3.5 h-3.5 ${item.color} mx-auto mb-1`} />
            <p className="text-xs font-bold text-white">{item.value}</p>
            <p className="text-[8px] text-slate-600">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Insight */}
      <div className="mt-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
        <p className="text-[10px] text-slate-400">
          <span className="text-sky-400 font-semibold">Insight:</span>{" "}
          {weather.temp_c > 32
            ? "High temperature driving increased HVAC load. Consider pre-cooling strategy."
            : weather.solar_irradiance_w_m2 > 500
            ? "Strong solar irradiance \u2014 solar panels operating near peak efficiency."
            : weather.solar_irradiance_w_m2 < 100
            ? "Low solar irradiance \u2014 grid dependency is higher than normal."
            : "Moderate conditions \u2014 energy systems operating within normal parameters."}
        </p>
      </div>
    </div>
  );
}

/* ── 7. Block Performance Card ─────────────────────────────── */
function BlockCard({ block, index }) {
  const scoreColor =
    block.efficiency_score >= 75 ? "text-emerald-400" :
    block.efficiency_score >= 50 ? "text-amber-400" : "text-red-400";
  const barGradient =
    block.efficiency_score >= 75 ? "from-emerald-500 to-emerald-400" :
    block.efficiency_score >= 50 ? "from-amber-500 to-amber-400" : "from-red-500 to-red-400";
  const borderAccent =
    block.efficiency_score >= 75 ? "border-l-emerald-500/30" :
    block.efficiency_score >= 50 ? "border-l-amber-500/30" : "border-l-red-500/30";

  return (
    <div className={`glass-card glass-card-hover border-l-2 ${borderAccent} p-4 animate-fade-in-up stagger-${Math.min(index + 1, 6)}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-bold text-slate-200">{block.name}</span>
        </div>
        <span className={`text-lg font-extrabold ${scoreColor}`}>{block.efficiency_score}</span>
      </div>

      <div className="w-full bg-white/[0.04] rounded-full h-1.5 mb-3 overflow-hidden">
        <div
          className={`h-1.5 rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700`}
          style={{ width: `${block.efficiency_score}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs font-bold text-amber-400">{block.grid_kw}</p>
          <p className="text-[8px] text-slate-600">Grid kW</p>
        </div>
        <div>
          <p className="text-xs font-bold text-cyan-400">{block.solar_kw}</p>
          <p className="text-[8px] text-slate-600">Solar kW</p>
        </div>
        <div>
          <p className="text-xs font-bold text-violet-400">{block.hvac_kw}</p>
          <p className="text-[8px] text-slate-600">HVAC kW</p>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-white/[0.04] flex justify-between text-[9px]">
        <span className="text-slate-600">EUI: {block.eui} kWh/m&sup2;</span>
        <span className="text-slate-600">{block.sqft?.toLocaleString()} sq ft</span>
      </div>
    </div>
  );
}

/* ── 8. Activity Feed ──────────────────────────────────────── */
function ActivityFeed({ events }) {
  const typeStyles = {
    warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", dot: "bg-amber-400" },
    success: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-400" },
    info:    { icon: Info,          color: "text-sky-400",     bg: "bg-sky-500/10", dot: "bg-sky-400" },
  };

  return (
    <div className="glass-card accent-bar-violet p-5 animate-fade-in-up stagger-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-violet-500/10 border border-white/[0.04]">
          <Activity className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-200 tracking-tight">
            Live Activity Feed
          </h3>
          <p className="text-[10px] text-slate-500">Real-time NMIMS Indore events</p>
        </div>
      </div>

      <div className="relative space-y-0.5 max-h-[280px] overflow-y-auto pr-1">
        {/* Timeline connector line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-[1px] bg-gradient-to-b from-violet-500/20 via-sky-500/10 to-transparent" />

        {events.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-4">Waiting for events&hellip;</p>
        )}
        {events.map((evt, i) => {
          const style = typeStyles[evt.type] || typeStyles.info;
          return (
            <div key={i} className="flex items-start gap-3 py-1.5 px-1 rounded-xl hover:bg-white/[0.02] transition-colors animate-fade-in">
              <div className="relative z-10 mt-1.5">
                <div className={`w-[6px] h-[6px] rounded-full ${style.dot}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-300 leading-relaxed">{evt.event}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-slate-600 font-mono">{evt.time}</span>
                  <span className="text-[9px] text-slate-600">&bull; {evt.block}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 9. Custom Chart Tooltip ───────────────────────────────── */
function AreaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-4 py-3 shadow-xl !rounded-xl" style={{ backdropFilter: "blur(16px)" }}>
      <p className="text-[11px] text-slate-500 font-mono mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color, boxShadow: `0 0 6px ${entry.color}` }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="text-white font-bold">{entry.value} kW</span>
        </div>
      ))}
    </div>
  );
}

/* ── 10. Surge Prediction Card ─────────────────────────────── */
function SurgePredictionCard({ surgeData }) {
  if (!surgeData) return null;
  const isAlert = surgeData.anomaly_alert;

  return (
    <div className={`glass-card glass-card-hover p-4 ${
      isAlert ? "accent-bar-coral" : "accent-bar-emerald"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl border border-white/[0.04] ${isAlert ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
            <Shield className={`w-4 h-4 ${isAlert ? "text-red-400" : "text-emerald-400"}`} />
          </div>
          <span className="text-xs font-medium text-slate-400">ML Surge Prediction</span>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
          isAlert ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"
        }`}>
          {isAlert ? "ALERT" : "NORMAL"}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-extrabold text-white">
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
              <span>&bull;</span>
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

export default function OverviewPage() {
  const [data, setData] = useState(null);
  const [surgeData, setSurgeData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);

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

  /* Loading */
  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64 glass-card">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 text-sky-400/40 animate-spin" />
            <p className="text-sm text-slate-500">Loading overview data&hellip;</p>
            <p className="text-[10px] text-slate-600">Ensure Flask backend is running on port 5000</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Connection Status */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-2">
          {connected
            ? <><Wifi className="w-3.5 h-3.5 text-emerald-400" /><span className="text-[11px] text-emerald-400 font-mono font-medium">Live</span></>
            : <><WifiOff className="w-3.5 h-3.5 text-red-400" /><span className="text-[11px] text-red-400 font-mono font-medium">Disconnected</span></>
          }
          {lastUpdate && (
            <span className="text-[10px] text-slate-600 font-mono ml-1">
              Updated {lastUpdate.toLocaleTimeString("en-IN", { hour12: false })}
            </span>
          )}
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.03]"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* ═══════ ROW 1 — Hero Metrics ═══════ */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 flex items-center justify-center animate-scale-in">
          <NetZeroGauge progress={data.net_zero_progress} />
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <StatCard
            icon={Leaf}
            label="Carbon Saved Today"
            value={`${data.carbon_saved_today_kg} kg`}
            sub="CO\u2082 offset via solar"
            accent="text-emerald-400"
            accentBg="bg-emerald-500/10"
            accentBar="accent-bar-emerald"
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
            accentBar="accent-bar-amber"
            trend="+8.5%"
            trendUp={true}
          />
          <StatCard
            icon={Zap}
            label="Total Consumption"
            value={`${data.total_consumption_kwh} kWh`}
            sub={`Grid: ${data.total_grid_kwh} \u2022 Solar: ${data.total_solar_kwh}`}
            accent="text-sky-400"
            accentBg="bg-sky-500/10"
            accentBar="accent-bar-sky"
          />
          <PeakDemandCard
            peak={data.peak_demand_kw}
            target={data.peak_target_kw}
            time={data.peak_demand_time}
          />
        </div>

        <SustainabilityBadge
          score={data.sustainability_score}
          grade={data.sustainability_grade}
        />
      </section>

      {/* ═══════ ROW 2 — Charts ═══════ */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 24-Hour Energy Profile */}
        <div className="lg:col-span-2 glass-card accent-bar-sky p-5 chart-glow animate-fade-in-up stagger-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-white/[0.04]">
              <BarChart3 className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 tracking-tight">
                24-Hour Energy Profile
              </h3>
              <p className="text-[10px] text-slate-500">Today's hourly consumption pattern</p>
            </div>
          </div>

          {data.hourly_profile?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.hourly_profile} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gridGradNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="solarGradNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5} />
                    <stop offset="50%" stopColor="#22d3ee" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="hvacGradNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                    <stop offset="50%" stopColor="#a78bfa" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis
                  dataKey="hour" tick={{ fontSize: 10, fill: "#475569" }}
                  tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.04)" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#475569" }}
                  tickLine={false} axisLine={false} unit=" kW"
                />
                <Tooltip content={<AreaTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={30}
                  formatter={(v) => <span className="text-[11px] text-slate-400">{v}</span>}
                />
                <Area type="monotone" dataKey="grid" name="Grid" stroke="#f97316" fill="url(#gridGradNew)" strokeWidth={2.5} animationDuration={1500} />
                <Area type="monotone" dataKey="solar" name="Solar" stroke="#06b6d4" fill="url(#solarGradNew)" strokeWidth={2.5} animationDuration={1500} />
                <Area type="monotone" dataKey="hvac" name="HVAC" stroke="#8b5cf6" fill="url(#hvacGradNew)" strokeWidth={2} strokeDasharray="6 3" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center rounded-xl border border-dashed border-white/[0.06]">
              <p className="text-xs text-slate-600">Hourly data accumulating&hellip;</p>
            </div>
          )}
        </div>

        {/* Renewable Mix Donut */}
        <div className="glass-card accent-bar-cyan p-5 animate-fade-in-up stagger-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-white/[0.04]">
              <Sun className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 tracking-tight">
                Energy Mix
              </h3>
              <p className="text-[10px] text-slate-500">Solar vs Grid ratio today</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <defs>
                <linearGradient id="solarPieGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
                <linearGradient id="gridPieGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
              </defs>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                innerRadius={45} outerRadius={75}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
                animationDuration={1200}
              >
                <Cell fill="url(#solarPieGrad)" />
                <Cell fill="url(#gridPieGrad)" />
              </Pie>
              <Tooltip
                formatter={(val) => `${val.toFixed(1)}%`}
                contentStyle={{
                  background: "rgba(12,18,32,0.9)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "12px",
                  fontSize: "11px",
                  backdropFilter: "blur(12px)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 6px #06b6d4" }} />
              <span className="text-xs text-slate-400">Solar {data.renewable_pct}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" style={{ boxShadow: "0 0 6px #fbbf24" }} />
              <span className="text-xs text-slate-400">Grid {data.grid_pct}%</span>
            </div>
          </div>

          <div className="mt-4 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <p className="text-[10px] text-slate-500 text-center">
              <span className="text-sky-400 font-semibold">vs Industry:</span>{" "}
              {data.renewable_pct > 25
                ? `${(data.renewable_pct - 25).toFixed(1)}% above 25% benchmark`
                : `${(25 - data.renewable_pct).toFixed(1)}% below 25% benchmark`}
            </p>
          </div>
        </div>
      </section>

      {/* ═══════ ROW 3 — Energy Flow + Weather ═══════ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EnergyFlowDiagram solar={totalSolar} grid={totalGrid} hvac={totalHVAC} total={totalLoad} />
        <WeatherPanel weather={data.weather} />
      </section>

      {/* ═══════ ROW 4 — Block Performance ═══════ */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-bold text-slate-300 tracking-tight">
            Block Performance Index
          </h3>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-sky-500/20 to-transparent ml-3" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.blocks?.map((block, i) => (
            <BlockCard key={block.name} block={block} index={i} />
          ))}
        </div>
      </section>

      {/* ═══════ ROW 5 — Activity + ML + EUI ═══════ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityFeed events={data.activity_feed || []} />
        <div className="space-y-4">
          <SurgePredictionCard surgeData={surgeData} />

          {/* Campus EUI Benchmark */}
          <div className="glass-card accent-bar-violet p-5 animate-fade-in-up stagger-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-violet-500/10 border border-white/[0.04]">
                <BarChart3 className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200 tracking-tight">
                  Campus EUI Benchmark
                </h3>
                <p className="text-[10px] text-slate-500">Energy Use Intensity comparison</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: "NMIMS Indore", value: data.campus_eui, gradient: "from-sky-500 to-sky-400", dot: "bg-sky-400" },
                { label: "India Avg (Office)", value: 180, gradient: "from-slate-600 to-slate-500", dot: "bg-slate-500" },
                { label: "GRIHA 5-Star", value: 90, gradient: "from-emerald-500 to-emerald-400", dot: "bg-emerald-400" },
                { label: "Net-Zero Target", value: 50, gradient: "from-cyan-500 to-cyan-400", dot: "bg-cyan-400" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                      {item.label}
                    </span>
                    <span className="text-slate-500 font-mono">{item.value} kWh/m&sup2;</span>
                  </div>
                  <div className="w-full bg-white/[0.04] rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full bg-gradient-to-r ${item.gradient} transition-all duration-700`}
                      style={{ width: `${Math.min(100, (item.value / 250) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[10px] text-slate-400 text-center">
                {data.campus_eui < 100
                  ? "\u2726 Excellent \u2014 NMIMS Indore EUI below GRIHA 5-Star"
                  : data.campus_eui < 180
                  ? "\u25C9 Good \u2014 Below India average, room to improve"
                  : "\u26A0 Above Average \u2014 Efficiency improvements needed"}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
