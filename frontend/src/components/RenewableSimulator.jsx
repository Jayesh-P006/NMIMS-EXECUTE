import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Zap,
  Battery,
  BatteryCharging,
  MapPin,
  RefreshCw,
  Loader2,
  Thermometer,
  Droplets,
  Wind,
  ArrowDown,
  ArrowUp,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/renewable-mix";
const POLL_INTERVAL = 5000;

/* ── Weather condition → icon mapping ────────────────────────── */
function WeatherIcon({ condition, className = "w-8 h-8" }) {
  const c = (condition || "").toLowerCase();
  if (c.includes("clear") || c.includes("sunny"))
    return <Sun className={`${className} text-amber-400`} />;
  if (c.includes("rain") || c.includes("shower"))
    return <CloudRain className={`${className} text-blue-400`} />;
  if (c.includes("snow"))
    return <CloudSnow className={`${className} text-slate-300`} />;
  if (c.includes("thunder"))
    return <CloudLightning className={`${className} text-yellow-400`} />;
  if (c.includes("fog"))
    return <CloudFog className={`${className} text-slate-400`} />;
  return <Cloud className={`${className} text-slate-400`} />;
}

/* ── Donut Chart Colors ──────────────────────────────────────── */
const MIX_COLORS = {
  Grid: "#ef4444",     // red-500
  Solar: "#facc15",    // yellow-400
  Battery: "#22d3ee",  // cyan-400
};

/* ── Battery gauge bar ───────────────────────────────────────── */
function BatteryGauge({ soc, status, currentKw, capacityKwh }) {
  const barColor =
    soc > 60 ? "bg-emerald-500" : soc > 25 ? "bg-amber-400" : "bg-red-500";
  const Icon = status === "Charging" ? BatteryCharging : Battery;

  return (
    <div className="bg-campus-800/40 rounded-xl border border-campus-700/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-medium text-slate-300">
            Battery Storage
          </span>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            status === "Charging"
              ? "bg-emerald-500/15 text-emerald-400"
              : status === "Discharging"
              ? "bg-amber-500/15 text-amber-400"
              : "bg-slate-500/15 text-slate-500"
          }`}
        >
          {status}
        </span>
      </div>

      {/* SoC bar */}
      <div className="relative h-5 bg-campus-900 rounded-full overflow-hidden mb-2">
        <div
          className={`absolute inset-y-0 left-0 ${barColor} rounded-full transition-all duration-700`}
          style={{ width: `${Math.max(2, soc)}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white drop-shadow">
          {soc.toFixed(1)}%
        </span>
      </div>

      <div className="flex justify-between text-[11px] text-slate-500">
        <span>{capacityKwh} kWh capacity</span>
        <span className="flex items-center gap-1">
          {currentKw < 0 ? (
            <ArrowDown className="w-3 h-3 text-emerald-400" />
          ) : currentKw > 0 ? (
            <ArrowUp className="w-3 h-3 text-amber-400" />
          ) : null}
          {Math.abs(currentKw).toFixed(1)} kW
        </span>
      </div>
    </div>
  );
}

/* ── Custom pie chart label ──────────────────────────────────── */
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}) => {
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {(percent * 100).toFixed(0)}%
    </text>
  );
};

/* ═══════════════════════════════════════════════════════════════
   RenewableSimulator Component
   ═══════════════════════════════════════════════════════════════ */
export default function RenewableSimulator() {
  const [data, setData] = useState(null);
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [geoStatus, setGeoStatus] = useState("pending"); // pending | granted | denied | unsupported
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  /* ── Request browser geolocation ──────────────────────────── */
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus("unsupported");
      return;
    }
    setGeoStatus("pending");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude.toFixed(4),
          lon: pos.coords.longitude.toFixed(4),
        });
        setGeoStatus("granted");
      },
      (err) => {
        console.warn("Geolocation denied:", err.message);
        setGeoStatus("denied");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  /* ── Poll the backend ─────────────────────────────────────── */
  const fetchMix = useCallback(async () => {
    try {
      let url = API_URL;
      if (location.lat && location.lon) {
        url += `?lat=${location.lat}&lon=${location.lon}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Renewable-mix fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    fetchMix();
    timerRef.current = setInterval(fetchMix, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [fetchMix]);

  /* ── Pie data ─────────────────────────────────────────────── */
  const pieData = data
    ? [
        { name: "Grid", value: Math.max(0, data.energy_mix.grid_kw) },
        { name: "Solar", value: Math.max(0, data.energy_mix.solar_kw) },
        {
          name: "Battery",
          value: Math.max(0, data.energy_mix.battery_kw),
        },
      ].filter((d) => d.value > 0)
    : [];

  const totalSupply = pieData.reduce((s, d) => s + d.value, 0);

  /* ── Loading state ────────────────────────────────────────── */
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading renewable data…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-slate-500 py-20">
        Unable to reach backend. Make sure Flask is running on port 5000.
      </div>
    );
  }

  const { weather, solar_multiplier, energy_mix, battery, blocks } = data;

  return (
    <div className="space-y-6">
      {/* ── Row 1: Location bar ──────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 bg-campus-900/60 border border-campus-800 rounded-xl px-5 py-3">
        <MapPin className="w-4 h-4 text-sky-400 flex-shrink-0" />
        {geoStatus === "granted" ? (
          <span className="text-sm text-slate-300">
            Live Location:{" "}
            <span className="font-mono text-sky-400">
              {location.lat}°, {location.lon}°
            </span>
          </span>
        ) : geoStatus === "denied" ? (
          <span className="text-sm text-amber-400">
            Location access denied — using simulated weather
          </span>
        ) : geoStatus === "unsupported" ? (
          <span className="text-sm text-amber-400">
            Geolocation not supported — using simulated weather
          </span>
        ) : (
          <span className="text-sm text-slate-500 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Locating…
          </span>
        )}
        <button
          onClick={requestLocation}
          title="Refresh location"
          className="ml-auto p-1.5 rounded-lg hover:bg-campus-800 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        {weather.source === "live" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
            LIVE WEATHER
          </span>
        )}
        {weather.source === "simulated" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">
            SIMULATED
          </span>
        )}
      </div>

      {/* ── Row 2: Weather + Donut + Battery ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weather Panel */}
        <div className="bg-campus-900/60 border border-campus-800 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Weather Conditions
          </h3>
          <div className="flex items-center gap-4 mb-5">
            <WeatherIcon condition={weather.condition} className="w-12 h-12" />
            <div>
              <p className="text-2xl font-bold text-white">
                {weather.temp_c}°C
              </p>
              <p className="text-sm text-slate-400">{weather.condition}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-campus-800/40 rounded-lg p-2.5">
              <Cloud className="w-4 h-4 mx-auto mb-1 text-slate-400" />
              <p className="text-lg font-bold text-white">
                {weather.cloud_cover_pct}%
              </p>
              <p className="text-[10px] text-slate-500">Cloud Cover</p>
            </div>
            <div className="bg-campus-800/40 rounded-lg p-2.5">
              <Droplets className="w-4 h-4 mx-auto mb-1 text-blue-400" />
              <p className="text-lg font-bold text-white">
                {weather.humidity_pct}%
              </p>
              <p className="text-[10px] text-slate-500">Humidity</p>
            </div>
            <div className="bg-campus-800/40 rounded-lg p-2.5">
              <Wind className="w-4 h-4 mx-auto mb-1 text-teal-400" />
              <p className="text-lg font-bold text-white">
                {weather.wind_kmh}
              </p>
              <p className="text-[10px] text-slate-500">km/h Wind</p>
            </div>
          </div>

          {/* Solar multiplier */}
          <div className="mt-4 bg-campus-800/40 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-yellow-400" />
                Solar Efficiency
              </span>
              <span
                className={`font-bold ${
                  solar_multiplier > 0.7
                    ? "text-emerald-400"
                    : solar_multiplier > 0.4
                    ? "text-amber-400"
                    : "text-red-400"
                }`}
              >
                {(solar_multiplier * 100).toFixed(0)}%
              </span>
            </div>
            <div className="mt-2 h-2 bg-campus-900 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  solar_multiplier > 0.7
                    ? "bg-emerald-500"
                    : solar_multiplier > 0.4
                    ? "bg-amber-400"
                    : "bg-red-500"
                }`}
                style={{ width: `${solar_multiplier * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5">
              {weather.cloud_cover_pct}% cloud cover reduces solar output by{" "}
              {(100 - solar_multiplier * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-campus-900/60 border border-campus-800 rounded-xl p-5 flex flex-col items-center">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 self-start">
            Live Energy Mix
          </h3>
          <div className="w-full" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  strokeWidth={0}
                  label={renderCustomLabel}
                  labelLine={false}
                  isAnimationActive
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={MIX_COLORS[entry.name]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0f1629",
                    border: "1px solid #1e293b",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(val) => `${val.toFixed(1)} kW`}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Total supply:{" "}
            <span className="text-white font-medium">
              {totalSupply.toFixed(1)} kW
            </span>
          </p>
        </div>

        {/* Battery + Summary */}
        <div className="space-y-5">
          <BatteryGauge
            soc={battery.soc_pct}
            status={battery.status}
            currentKw={battery.current_kw}
            capacityKwh={battery.capacity_kwh}
          />

          {/* Demand summary */}
          <div className="bg-campus-900/60 border border-campus-800 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Power Balance
            </h3>
            <div className="space-y-3">
              {[
                {
                  label: "Total Demand",
                  value: energy_mix.total_demand_kw,
                  color: "text-white",
                  icon: Zap,
                  iconColor: "text-slate-400",
                },
                {
                  label: "Grid Import",
                  value: energy_mix.grid_kw,
                  color: "text-red-400",
                  icon: Zap,
                  iconColor: "text-red-400",
                },
                {
                  label: "Solar Generation",
                  value: energy_mix.solar_kw,
                  color: "text-yellow-400",
                  icon: Sun,
                  iconColor: "text-yellow-400",
                },
                {
                  label: "Battery",
                  value: Math.abs(energy_mix.battery_kw),
                  color: "text-cyan-400",
                  icon: Battery,
                  iconColor: "text-cyan-400",
                  suffix:
                    energy_mix.battery_kw < 0
                      ? " (charging)"
                      : energy_mix.battery_kw > 0
                      ? " (supply)"
                      : " (idle)",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-slate-400 flex items-center gap-2">
                    <item.icon
                      className={`w-4 h-4 ${item.iconColor}`}
                    />
                    {item.label}
                  </span>
                  <span className={`text-sm font-mono font-medium ${item.color}`}>
                    {item.value.toFixed(1)} kW
                    {item.suffix && (
                      <span className="text-[10px] text-slate-500">
                        {item.suffix}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Per-block breakdown ───────────────────────── */}
      <div className="bg-campus-900/60 border border-campus-800 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Block-wise Solar Adjustment
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {blocks.map((b) => {
            const penalty = b.solar_raw_kw > 0
              ? (((b.solar_raw_kw - b.solar_adjusted_kw) / b.solar_raw_kw) * 100).toFixed(0)
              : 0;
            return (
              <div
                key={b.name}
                className="bg-campus-800/30 border border-campus-700/30 rounded-lg p-4"
              >
                <p className="text-sm font-semibold text-white mb-3">
                  {b.name}
                </p>
                <div className="space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Grid Draw</span>
                    <span className="text-red-400 font-mono">
                      {b.grid_kw.toFixed(1)} kW
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Solar (raw)</span>
                    <span className="text-yellow-300 font-mono">
                      {b.solar_raw_kw.toFixed(1)} kW
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Solar (adjusted)</span>
                    <span className="text-yellow-400 font-mono">
                      {b.solar_adjusted_kw.toFixed(1)} kW
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">HVAC</span>
                    <span className="text-sky-400 font-mono">
                      {b.hvac_kw.toFixed(1)} kW
                    </span>
                  </div>
                  {penalty > 0 && (
                    <div className="mt-1 text-[11px] text-amber-400/80 bg-amber-500/10 rounded px-2 py-1">
                      ☁️ Cloud penalty: −{penalty}% solar
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
