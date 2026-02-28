import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle,
  Thermometer,
  Zap,
  TrendingUp,
  RefreshCw,
  Loader2,
  MapPin,
  Droplets,
  Wind,
  Eye,
  Gauge,
  Sunrise,
  Sunset,
  Clock,
  Navigation,
  ShieldAlert,
  Settings2,
  BarChart2,
  RotateCcw,
  Info,
  Maximize2,
  Percent,
  Activity,
  Triangle,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react";

/* ── Constants ─────────────────────────────────────────────── */
const API_URL = "http://localhost:5000/api/solar-live";
const POLL_INTERVAL = 10000;
const MAX_HISTORY = 30;
const CLEAR_SKY_GHI = 1000; // W/m²

/* ── Default System Config ─────────────────────────────────── */
const DEFAULT_CONFIG = {
  panel_area_m2: 500,
  panel_efficiency: 20,
  capacity_kw: 100,
  performance_ratio: 0.75,
  temp_coefficient: 0.4,
  tilt_angle: 22,
  inverter_efficiency: 96,
  soiling_loss: 2,
};

/* ── Helpers ────────────────────────────────────────────────── */
const pct = (v, max) => (max > 0 ? Math.min(Math.round((v / max) * 100), 100) : 0);

/* ── Weather Code → Icon ───────────────────────────────────── */
function WeatherIcon({ code, className = "w-10 h-10" }) {
  if (code === undefined || code === null) return <Sun className={`${className} text-amber-400`} />;
  if (code <= 1) return <Sun className={`${className} text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]`} />;
  if (code <= 3) return <Cloud className={`${className} text-slate-300`} />;
  if (code <= 48) return <CloudFog className={`${className} text-slate-400`} />;
  if (code <= 57) return <CloudDrizzle className={`${className} text-blue-300`} />;
  if (code <= 67) return <CloudRain className={`${className} text-blue-400`} />;
  if (code <= 77) return <CloudSnow className={`${className} text-slate-200`} />;
  if (code <= 82) return <CloudRain className={`${className} text-blue-500`} />;
  if (code <= 86) return <CloudSnow className={`${className} text-slate-300`} />;
  return <CloudLightning className={`${className} text-yellow-400`} />;
}

/* ── UV Level Helper ───────────────────────────────────────── */
function uvLevel(uv) {
  if (uv <= 2) return { label: "Low", color: "text-emerald-400", bg: "bg-emerald-500/15" };
  if (uv <= 5) return { label: "Moderate", color: "text-yellow-400", bg: "bg-yellow-500/15" };
  if (uv <= 7) return { label: "High", color: "text-orange-400", bg: "bg-orange-500/15" };
  if (uv <= 10) return { label: "Very High", color: "text-rose-400", bg: "bg-rose-500/15" };
  return { label: "Extreme", color: "text-fuchsia-400", bg: "bg-fuchsia-500/15" };
}

/* ── Custom Tooltip ────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-[10px] text-slate-500 font-mono mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {p.value} {p.name.includes("kW") ? "kW" : p.unit ?? ""}
        </p>
      ))}
    </div>
  );
}

/* ── Format time from ISO string ───────────────────────────── */
function fmtTime(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return isoStr;
  }
}

/* ═══════════════════════════════════════════════════════════════
   SolarEnergyPage
   ═══════════════════════════════════════════════════════════════ */
/* ── Editable Input Field ───────────────────────────────────── */
function ConfigInput({ label, icon: Icon, value, onChange, unit, min, max, step = 1, helpText, color = "text-amber-400" }) {
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            min={min}
            max={max}
            step={step}
            className="w-20 text-right text-sm font-bold text-white bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 
                       focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all
                       hover:bg-white/[0.06] font-mono"
          />
          {unit && <span className="text-[10px] text-slate-600 font-mono w-8">{unit}</span>}
        </div>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full h-1 rounded-full appearance-none bg-white/[0.06] cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(245,158,11,0.4)] [&::-webkit-slider-thumb]:transition-all
                   [&::-webkit-slider-thumb]:hover:scale-125"
      />
      {helpText && <p className="text-[9px] text-slate-600 mt-1">{helpText}</p>}
    </div>
  );
}

/* ── Factor Bar ────────────────────────────────────────────── */
function FactorBar({ label, impact, description, type }) {
  const isPositive = type === "positive";
  const isNeutral = type === "neutral";
  const barColor = isNeutral ? "bg-slate-500" : isPositive ? "bg-emerald-500" : "bg-rose-500";
  const textColor = isNeutral ? "text-slate-400" : isPositive ? "text-emerald-400" : "text-rose-400";
  const absImpact = Math.abs(impact);
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`text-xs font-bold font-mono ${textColor}`}>
          {isNeutral ? `${impact}` : impact > 0 ? `+${impact.toFixed(1)}%` : `${impact.toFixed(1)}%`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-500`}
            style={{ width: `${Math.min(absImpact, 100)}%` }}
          />
        </div>
      </div>
      <p className="text-[9px] text-slate-600 mt-0.5">{description}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SolarEnergyPage
   ═══════════════════════════════════════════════════════════════ */
export default function SolarEnergyPage() {
  const [live, setLive] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const [configOpen, setConfigOpen] = useState(true);

  /* ── Editable System Configuration ─────────────────────── */
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("solar_config");
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch { return DEFAULT_CONFIG; }
  });

  const updateConfig = (key, value) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-calc capacity when area or efficiency changes
      if (key === "panel_area_m2" || key === "panel_efficiency") {
        next.capacity_kw = +(next.panel_area_m2 * (next.panel_efficiency / 100)).toFixed(1);
      }
      localStorage.setItem("solar_config", JSON.stringify(next));
      return next;
    });
  };

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem("solar_config");
  };

  /* ── Fetch ──────────────────────────────────────────────── */
  const fetchSolar = useCallback(async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLive(data);
      setError(null);

      setHistory((prev) => {
        const next = [
          ...prev,
          {
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            power_kw: data.solar_kw ?? 0,
            irradiance: data.irradiance_wm2 ?? 0,
          },
        ];
        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSolar();
    intervalRef.current = setInterval(fetchSolar, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchSolar]);

  /* ── Derived (weather) ──────────────────────────────────── */
  const w = live?.weather ?? {};
  const isNight     = live?.is_nighttime ?? true;
  const location    = live?.location ?? {};
  const uvInfo      = uvLevel(w.uv_index ?? 0);

  /* ── Custom calculation using user config ────────────────── */
  const tempC       = w.temperature_c ?? 25;
  const cloudPct    = w.cloud_cover_pct ?? 0;
  const tCell       = tempC + 5;
  const localHour   = live?.local_hour ?? new Date().getHours();

  // Irradiance from weather
  const rawIrradiance = (localHour >= 6 && localHour < 18)
    ? CLEAR_SKY_GHI * (1 - cloudPct / 100)
    : 0;

  // Tilt factor (simple cos-based approximation)
  const tiltFactor  = Math.cos(((config.tilt_angle - 22) * Math.PI) / 180); // optimal at ~22° for Indore latitude
  const irradiance  = rawIrradiance * Math.min(tiltFactor, 1);

  // Temperature de-rating
  const gammaFrac   = config.temp_coefficient / 100; // convert 0.4% to 0.004
  const tempFactor  = 1 - gammaFrac * (tCell - 25);

  // Inverter & soiling losses
  const invEff      = config.inverter_efficiency / 100;
  const soilingF    = 1 - config.soiling_loss / 100;

  // Final output
  const solarKw     = irradiance > 0
    ? Math.max(0, +(config.capacity_kw * (irradiance / 1000) * config.performance_ratio * tempFactor * invEff * soilingF).toFixed(2))
    : 0;
  const capacityPct = pct(solarKw, config.capacity_kw);
  const peakToday   = history.length ? Math.max(...history.map((h) => h.power_kw)) : 0;

  // Daily energy estimate (kWh) — using simple integration of hourly profile
  const dailyKwh = (() => {
    let total = 0;
    for (let h = 6; h < 18; h++) {
      const f = Math.sin(((h - 6) / 12) * Math.PI);
      const hourIrr = CLEAR_SKY_GHI * f * (1 - cloudPct / 100) * Math.min(tiltFactor, 1);
      const hourPower = config.capacity_kw * (hourIrr / 1000) * config.performance_ratio * tempFactor * invEff * soilingF;
      total += Math.max(0, hourPower);
    }
    return total.toFixed(1);
  })();

  /* ── Factor breakdown ───────────────────────────────────── */
  const factors = [
    {
      label: "Cloud Cover Impact",
      impact: -cloudPct,
      description: `${cloudPct}% cloud cover reduces irradiance linearly`,
      type: cloudPct === 0 ? "neutral" : "negative",
    },
    {
      label: "Temperature De-rating",
      impact: -((gammaFrac * (tCell - 25)) * 100),
      description: `Cell temp ${tCell.toFixed(1)}°C → γ=${config.temp_coefficient}%/°C penalty`,
      type: tCell > 25 ? "negative" : "positive",
    },
    {
      label: "Performance Ratio",
      impact: -((1 - config.performance_ratio) * 100),
      description: `PR=${(config.performance_ratio * 100).toFixed(0)}% accounts for wiring, mismatch & inverter losses`,
      type: "negative",
    },
    {
      label: "Inverter Efficiency",
      impact: -((1 - invEff) * 100),
      description: `DC→AC conversion at ${config.inverter_efficiency}% efficiency`,
      type: "negative",
    },
    {
      label: "Soiling / Dust Loss",
      impact: -config.soiling_loss,
      description: `${config.soiling_loss}% loss from dust, dirt & debris on panels`,
      type: config.soiling_loss > 0 ? "negative" : "neutral",
    },
    {
      label: "Tilt Angle Optimization",
      impact: +((tiltFactor - 1) * 100),
      description: `${config.tilt_angle}° tilt (optimal ~22° for Indore latitude)`,
      type: Math.abs(config.tilt_angle - 22) < 2 ? "positive" : "negative",
    },
    {
      label: "Time-of-Day Factor",
      impact: localHour >= 6 && localHour < 18 ? +(Math.sin(((localHour - 6) / 12) * Math.PI) * 100).toFixed(0) : 0,
      description: localHour >= 6 && localHour < 18
        ? `Hour ${localHour}:00 — ${localHour >= 10 && localHour <= 14 ? "peak" : "partial"} solar window`
        : "Nighttime — no solar production",
      type: localHour >= 6 && localHour < 18 ? "positive" : "neutral",
    },
  ];

  // Net efficiency
  const netEfficiency = irradiance > 0
    ? ((solarKw / (config.capacity_kw * (irradiance / 1000))) * 100).toFixed(1)
    : 0;

  /* ── Hourly profile (uses user config) ──────────────────── */
  const hourlyProfile = Array.from({ length: 24 }, (_, h) => {
    let factor = 0;
    if (h >= 6 && h < 18) factor = Math.sin(((h - 6) / 12) * Math.PI);
    const clearSkyKw = config.capacity_kw * config.performance_ratio * factor;
    const actualKw = clearSkyKw * (1 - cloudPct / 100) * tempFactor * invEff * soilingF * Math.min(tiltFactor, 1);
    const nowHour = new Date().getHours();
    return {
      hour: `${String(h).padStart(2, "0")}:00`,
      "Clear Sky kW": Math.max(0, +clearSkyKw.toFixed(1)),
      "Estimated kW": h <= nowHour ? Math.max(0, +actualKw.toFixed(1)) : null,
    };
  });

  /* ═══════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-400/20">
            <Sun className="w-6 h-6 text-amber-400" />
            <div className="absolute -inset-1 rounded-xl bg-amber-400/10 blur-md -z-10" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Solar Energy Monitor
            </h2>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              {location.name || "NMIMS Indore"} — {location.lat ?? 22.925}°N, {location.lon ?? 75.866}°E
              {isNight && (
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                  Nighttime
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setLoading(true); fetchSolar(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-400 text-xs hover:bg-white/[0.08] hover:text-white transition-all"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>

      {error && (
        <div className="glass-card border-rose-500/20 p-3 text-rose-400 text-xs flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          API Error: {error} — showing cached data
        </div>
      )}

      {/* ── Top Row: Solar Output + Weather Hero ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Solar Output Card (2 cols) */}
        <div className="lg:col-span-2 glass-card relative overflow-hidden p-6 shadow-[0_0_30px_rgba(245,158,11,0.08)] animate-fade-in-up">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Live Solar Output</span>
            <span className="ml-auto flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
              </span>
              <span className="text-[9px] text-amber-400/70 font-mono">LIVE</span>
            </span>
          </div>

          <div className="flex items-end gap-3 mb-2">
            <span className="text-5xl font-bold text-white tracking-tighter">{solarKw}</span>
            <span className="text-lg text-slate-400 font-medium mb-1">kW</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            {capacityPct}% of {config.capacity_kw} kW capacity
            {peakToday > 0 && <> · Peak today: {peakToday.toFixed(1)} kW</>}
          </p>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-700 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
              style={{ width: `${capacityPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>0 kW</span>
            <span>{config.capacity_kw} kW</span>
          </div>

          {/* Irradiance + capacity + daily estimate */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Irradiance</p>
              <p className="text-lg font-bold text-white">{irradiance.toFixed(0)} <span className="text-xs text-slate-500 font-normal">W/m²</span></p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Net Efficiency</p>
              <p className="text-lg font-bold text-white">{netEfficiency}<span className="text-xs text-slate-500 font-normal">%</span></p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Est. Daily</p>
              <p className="text-lg font-bold text-emerald-400">{dailyKwh} <span className="text-xs text-slate-500 font-normal">kWh</span></p>
            </div>
          </div>
        </div>

        {/* ── Weather Report Hero Card (3 cols) ────────────── */}
        <div className="lg:col-span-3 glass-card relative overflow-hidden p-6 animate-fade-in-up stagger-1">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500" />

          {/* Top */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Cloud className="w-4 h-4 text-sky-400" />
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                  Current Weather — {location.name || "NMIMS Indore"}
                </span>
              </div>
              <p className="text-2xl font-bold text-white mt-2">
                {w.description || "Loading..."}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Real-time data via Open-Meteo API · Updates every 10s
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <WeatherIcon code={w.weather_code} className="w-14 h-14" />
            </div>
          </div>

          {/* Temperature */}
          <div className="flex items-end gap-4 mb-5">
            <div className="flex items-start">
              <span className="text-5xl font-bold text-white tracking-tighter">
                {w.temperature_c != null ? w.temperature_c.toFixed(1) : "—"}
              </span>
              <span className="text-xl text-slate-400 mt-1">°C</span>
            </div>
            <div className="pb-1.5 text-xs text-slate-500">
              <p>Feels like <span className="text-slate-300 font-medium">{w.feels_like_c != null ? w.feels_like_c.toFixed(1) : "—"}°C</span></p>
            </div>
          </div>

          {/* Weather stats 4-grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Droplets, label: "Humidity", value: `${w.humidity_pct ?? "—"}%`, color: "text-blue-400" },
              { icon: Wind, label: "Wind", value: `${w.wind_speed_kmh ?? 0} km/h`, sub: w.wind_direction ?? "—", color: "text-teal-400" },
              { icon: Eye, label: "Visibility", value: `${w.visibility_km ?? "—"} km`, color: "text-slate-300" },
              { icon: Gauge, label: "Pressure", value: `${w.pressure_hpa ? Math.round(w.pressure_hpa) : "—"} hPa`, color: "text-violet-400" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider">{item.label}</span>
                  </div>
                  <p className="text-base font-bold text-white">{item.value}</p>
                  {item.sub && <p className="text-[10px] text-slate-500 mt-0.5">{item.sub}</p>}
                </div>
              );
            })}
          </div>

          {/* Sunrise / Sunset / UV */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05] flex items-center gap-3">
              <Sunrise className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-[10px] text-slate-600 uppercase">Sunrise</p>
                <p className="text-sm font-bold text-white">{fmtTime(w.sunrise)}</p>
              </div>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05] flex items-center gap-3">
              <Sunset className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-[10px] text-slate-600 uppercase">Sunset</p>
                <p className="text-sm font-bold text-white">{fmtTime(w.sunset)}</p>
              </div>
            </div>
            <div className={`${uvInfo.bg} rounded-xl p-3 border border-white/[0.05] flex items-center gap-3`}>
              <ShieldAlert className={`w-5 h-5 ${uvInfo.color}`} />
              <div>
                <p className="text-[10px] text-slate-600 uppercase">UV Index</p>
                <p className="text-sm font-bold text-white">
                  {w.uv_index ?? 0} <span className={`text-[10px] ${uvInfo.color}`}>{uvInfo.label}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Cloud + Wind direction */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-[10px] text-slate-600 uppercase">Cloud Cover</span>
                </div>
                <span className="text-sm font-bold text-white">{w.cloud_cover_pct ?? 0}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-400 transition-all duration-700"
                  style={{ width: `${w.cloud_cover_pct ?? 0}%` }}
                />
              </div>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-[10px] text-slate-600 uppercase">Wind Direction</span>
                </div>
                <span className="text-sm font-bold text-white">{w.wind_direction ?? "—"}</span>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative w-10 h-10">
                  <div className="absolute inset-0 rounded-full border border-white/[0.08]" />
                  <Navigation
                    className="absolute inset-0 m-auto w-5 h-5 text-teal-400 transition-transform duration-500"
                    style={{ transform: `rotate(${(w.wind_direction_deg ?? 0) + 180}deg)` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── System Configuration + Factor Breakdown ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── System Configuration (Editable) ──────────────── */}
        <div className="glass-card relative overflow-hidden p-6 animate-fade-in-up stagger-2">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">System Configuration</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetConfig}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-500 text-[10px] hover:bg-white/[0.08] hover:text-slate-300 transition-all"
                title="Reset to defaults"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
              <button
                onClick={() => setConfigOpen((o) => !o)}
                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:bg-white/[0.08] hover:text-white transition-all"
              >
                {configOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {configOpen && (
            <div className="space-y-4">
              {/* Area + Efficiency → Capacity (linked) */}
              <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.05] space-y-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Info className="w-3 h-3 text-sky-400" />
                  <span className="text-[9px] text-sky-400/70 font-mono">Panel Area × Efficiency = System Capacity</span>
                </div>
                <ConfigInput
                  label="Panel Area" icon={Maximize2} unit="m²"
                  value={config.panel_area_m2} onChange={(v) => updateConfig("panel_area_m2", v)}
                  min={10} max={5000} step={10}
                  helpText="Total rooftop area covered by solar panels"
                />
                <ConfigInput
                  label="Panel Efficiency" icon={Percent} unit="%"
                  value={config.panel_efficiency} onChange={(v) => updateConfig("panel_efficiency", v)}
                  min={5} max={25} step={0.5}
                  helpText="Mono-Si: 20-22%, Poly-Si: 15-18%, Thin-film: 10-13%"
                />
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Derived Capacity</span>
                  <span className="text-lg font-bold text-amber-400 font-mono">{config.capacity_kw} <span className="text-xs text-slate-500">kWp</span></span>
                </div>
              </div>

              {/* Performance Parameters */}
              <ConfigInput
                label="Performance Ratio" icon={Activity} unit=""
                value={config.performance_ratio} onChange={(v) => updateConfig("performance_ratio", v)}
                min={0.5} max={0.95} step={0.01}
                helpText="Typical: 0.70–0.85. Includes cable, mismatch & shading losses."
                color="text-violet-400"
              />
              <ConfigInput
                label="Temp Coefficient" icon={Thermometer} unit="%/°C"
                value={config.temp_coefficient} onChange={(v) => updateConfig("temp_coefficient", v)}
                min={0.1} max={0.6} step={0.01}
                helpText="Power loss per °C above 25°C. Mono-Si: ~0.35%, Poly-Si: ~0.45%"
                color="text-rose-400"
              />
              <ConfigInput
                label="Tilt Angle" icon={Triangle} unit="°"
                value={config.tilt_angle} onChange={(v) => updateConfig("tilt_angle", v)}
                min={0} max={60} step={1}
                helpText="Optimal for Indore (22.9°N latitude) ≈ 22°. Flat roof = 0°."
                color="text-sky-400"
              />
              <ConfigInput
                label="Inverter Efficiency" icon={Zap} unit="%"
                value={config.inverter_efficiency} onChange={(v) => updateConfig("inverter_efficiency", v)}
                min={85} max={99} step={0.5}
                helpText="DC to AC conversion loss. Modern inverters: 95-98%"
                color="text-emerald-400"
              />
              <ConfigInput
                label="Soiling / Dust Loss" icon={Cloud} unit="%"
                value={config.soiling_loss} onChange={(v) => updateConfig("soiling_loss", v)}
                min={0} max={15} step={0.5}
                helpText="Dust, bird droppings, pollen. Desert: 5-10%, Urban: 2-5%"
                color="text-orange-400"
              />
            </div>
          )}

          {/* Compact summary when collapsed */}
          {!configOpen && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { l: "Capacity", v: `${config.capacity_kw} kWp`, c: "text-amber-400" },
                { l: "Area", v: `${config.panel_area_m2} m²`, c: "text-sky-400" },
                { l: "PR", v: `${(config.performance_ratio * 100).toFixed(0)}%`, c: "text-violet-400" },
                { l: "Eff.", v: `${config.panel_efficiency}%`, c: "text-emerald-400" },
              ].map((s) => (
                <div key={s.l} className="text-center">
                  <p className="text-[10px] text-slate-600 uppercase">{s.l}</p>
                  <p className={`text-sm font-bold ${s.c} font-mono`}>{s.v}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Factors Affecting Output ──────────────────────── */}
        <div className="glass-card relative overflow-hidden p-6 animate-fade-in-up stagger-3">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />

          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Output Factors Breakdown</span>
          </div>

          {/* Formula display */}
          <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05] mb-4">
            <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
              <span className="text-amber-400">E</span> = <span className="text-sky-400">P<sub>cap</sub></span> × (G/1000)
              × <span className="text-violet-400">PR</span>
              × [1 - <span className="text-rose-400">γ</span>(T<sub>cell</sub>-25)]
              × <span className="text-emerald-400">η<sub>inv</sub></span>
              × (1 - <span className="text-orange-400">S<sub>loss</sub></span>)
            </p>
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/[0.05]">
              <div className="text-center">
                <p className="text-[9px] text-slate-600">Input</p>
                <p className="text-xs font-bold text-sky-400 font-mono">{config.capacity_kw} kW</p>
              </div>
              <span className="text-slate-600">→</span>
              <div className="text-center">
                <p className="text-[9px] text-slate-600">After Losses</p>
                <p className="text-xs font-bold text-amber-400 font-mono">{solarKw} kW</p>
              </div>
              <span className="text-slate-600">→</span>
              <div className="text-center">
                <p className="text-[9px] text-slate-600">Net Eff.</p>
                <p className="text-xs font-bold text-emerald-400 font-mono">{netEfficiency}%</p>
              </div>
            </div>
          </div>

          {/* Factor bars */}
          <div className="space-y-1 divide-y divide-white/[0.04]">
            {factors.map((f) => (
              <FactorBar key={f.label} {...f} />
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-xs text-slate-400">Total System Loss</span>
            <span className="text-sm font-bold text-rose-400 font-mono">
              {irradiance > 0 ? `-${(100 - parseFloat(netEfficiency)).toFixed(1)}%` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-slate-400">Estimated Daily Yield</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {dailyKwh} kWh
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-slate-400">Monthly Estimate (×30)</span>
            <span className="text-sm font-bold text-amber-400 font-mono">
              {(dailyKwh * 30).toFixed(0)} kWh
            </span>
          </div>
        </div>
      </div>

      {/* ── Live Chart ─────────────────────────────────────── */}
      <div className="glass-card accent-bar-amber p-6 animate-fade-in-up stagger-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Live Solar Output
          </h3>
          <span className="text-[10px] text-slate-600 font-mono">
            Last {history.length} readings · Auto-refresh 10s
          </span>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={history} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="solarPowerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="irradianceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#eab308" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#eab308" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
            <Area
              type="monotone" dataKey="power_kw" name="Power (kW)"
              stroke="#f59e0b" strokeWidth={2} fill="url(#solarPowerGrad)"
              dot={false} activeDot={{ r: 4, stroke: "#f59e0b", strokeWidth: 2, fill: "#000" }}
            />
            <Area
              type="monotone" dataKey="irradiance" name="Irradiance (W/m²)"
              stroke="#eab308" strokeWidth={1} strokeDasharray="4 4"
              fill="url(#irradianceGrad)" dot={false} yAxisId={0}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── 24-Hour Solar Profile ──────────────────────────── */}
      <div className="glass-card accent-bar-emerald p-6 animate-fade-in-up stagger-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            24-Hour Solar Profile
          </h3>
          <span className="text-[10px] text-slate-600 font-mono">
            Clear sky vs. estimated (live cloud cover: {cloudPct}%)
          </span>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={hourlyProfile} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="clearSkyBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="estBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="hour" tick={{ fill: "#64748b", fontSize: 9 }} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} unit=" kW" />
            <Tooltip content={<ChartTooltip />} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
            <Bar dataKey="Clear Sky kW" fill="url(#clearSkyBarGrad)" radius={[3, 3, 0, 0]} barSize={12} />
            <Bar dataKey="Estimated kW" fill="url(#estBarGrad)" radius={[3, 3, 0, 0]} barSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
