import React, { useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Activity, Wifi, WifiOff } from "lucide-react";

/**
 * LiveEnergyChart
 * ──────────────────────────────────────────────────────────────
 * Synchronized line chart: Grid Power vs Solar Power over time.
 * Polls GET http://localhost:5000/api/live-status every 5 seconds,
 * accumulates readings into a rolling time-series window, and
 * renders a live-updating Recharts LineChart.
 */

const API_URL = "http://localhost:5000/api/live-status";
const POLL_INTERVAL_MS = 5000;
const MAX_DATA_POINTS = 60; // 5 minutes of data at 5-sec intervals

/* ── Custom Tooltip ────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-campus-900 border border-campus-700 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-[11px] text-slate-500 font-mono mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="text-white font-semibold">
            {entry.value.toFixed(1)} kW
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Custom Legend ──────────────────────────────────────────── */
function ChartLegend({ payload }) {
  if (!payload) return null;
  return (
    <div className="flex items-center justify-center gap-6 mt-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-2 text-xs">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-400">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function LiveEnergyChart() {
  const [chartData, setChartData] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);

  /* ── Fetch + Transform ───────────────────────────────────── */
  const fetchLiveData = async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      // Sum across all blocks for the aggregate chart
      let totalGrid = 0;
      let totalSolar = 0;
      let totalHVAC = 0;

      (json.blocks || []).forEach((block) => {
        totalGrid += block.Grid_Power_Draw_kW || 0;
        totalSolar += block.Solar_Power_Generated_kW || 0;
        totalHVAC += block.HVAC_Power_kW || 0;
      });

      const now = new Date();
      const timeLabel = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      const point = {
        time: timeLabel,
        gridPower: parseFloat(totalGrid.toFixed(2)),
        solarPower: parseFloat(totalSolar.toFixed(2)),
        hvacPower: parseFloat(totalHVAC.toFixed(2)),
      };

      setChartData((prev) => {
        const next = [...prev, point];
        return next.length > MAX_DATA_POINTS ? next.slice(-MAX_DATA_POINTS) : next;
      });

      setConnected(true);
      setLastUpdate(now);
    } catch (err) {
      console.error("[LiveEnergyChart] Fetch error:", err);
      setConnected(false);
    }
  };

  /* ── Polling Effect ──────────────────────────────────────── */
  useEffect(() => {
    // Fetch immediately on mount
    fetchLiveData();

    intervalRef.current = setInterval(fetchLiveData, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="bg-campus-900/80 border border-campus-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10">
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Energy Consumption — Live Feed
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Grid Power vs Solar Generation (all blocks aggregated)
            </p>
          </div>
        </div>

        {/* Connection indicator */}
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-mono">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[11px] text-red-400 font-mono">Disconnected</span>
            </>
          )}
          {lastUpdate && (
            <span className="text-[10px] text-slate-600 ml-2 font-mono">
              {lastUpdate.toLocaleTimeString("en-IN", { hour12: false })}
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="h-72 flex items-center justify-center rounded-lg border border-dashed border-campus-700">
          <p className="text-slate-600 text-sm">
            Waiting for data from API…
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={288}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 6"
              stroke="#1e2d56"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#1e2d56" }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
              domain={["auto", "auto"]}
              unit=" kW"
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend content={<ChartLegend />} />

            {/* Grid Power line */}
            <Line
              type="monotone"
              dataKey="gridPower"
              name="Grid Power"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#f59e0b", stroke: "#0f1629", strokeWidth: 2 }}
            />

            {/* Solar Power line */}
            <Line
              type="monotone"
              dataKey="solarPower"
              name="Solar Power"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#22d3ee", stroke: "#0f1629", strokeWidth: 2 }}
            />

            {/* HVAC Power line */}
            <Line
              type="monotone"
              dataKey="hvacPower"
              name="HVAC Power"
              stroke="#a78bfa"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              activeDot={{ r: 3, fill: "#a78bfa", stroke: "#0f1629", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Footer stats */}
      {chartData.length > 0 && (
        <div className="flex items-center gap-6 mt-4 pt-3 border-t border-campus-800">
          {[
            { label: "Grid", key: "gridPower", color: "text-amber-400" },
            { label: "Solar", key: "solarPower", color: "text-cyan-400" },
            { label: "HVAC", key: "hvacPower", color: "text-violet-400" },
          ].map(({ label, key, color }) => {
            const latest = chartData[chartData.length - 1][key];
            return (
              <div key={key} className="text-center">
                <p className={`text-lg font-bold ${color}`}>
                  {latest.toFixed(1)}
                  <span className="text-[10px] text-slate-500 ml-1">kW</span>
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  {label} Now
                </p>
              </div>
            );
          })}
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-500 font-mono">
              {chartData.length} data points
            </p>
            <p className="text-[10px] text-slate-600">
              Polling every {POLL_INTERVAL_MS / 1000}s
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
