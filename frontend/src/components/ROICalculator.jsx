import React, { useState, useMemo } from "react";
import { Calculator, TrendingUp, Clock, IndianRupee } from "lucide-react";

/**
 * ROICalculator
 * ──────────────────────────────────────────────────────────────
 * Interactive panel with two range sliders:
 *   1. Current Grid Rate (₹/kWh)
 *   2. Solar Installation Budget (₹)
 *
 * Dynamically computes:
 *   • Payback Period (years)
 *   • 10-Year Projected Savings (₹)
 *
 * Assumptions baked into the model:
 *   - Installed solar capacity  = budget / ₹45,000 per kWp
 *   - Annual generation per kWp = 1,500 kWh (Indian avg)
 *   - Annual degradation        = 0.5 % per year
 *   - Annual O&M cost           = 1 % of budget
 *   - Grid rate escalation      = 3 % per year
 */

/* ── Constants ─────────────────────────────────────────────── */
const COST_PER_KWP = 45000;          // ₹ per kWp installed
const ANNUAL_GEN_PER_KWP = 1500;     // kWh / kWp / year
const DEGRADATION_RATE = 0.005;       // 0.5 % / year
const OM_RATE = 0.01;                 // 1 % of capex / year
const GRID_ESCALATION = 0.03;         // 3 % annual tariff increase
const ANALYSIS_YEARS = 10;

/* ── Helpers ───────────────────────────────────────────────── */
function formatINR(value) {
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)} L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)} K`;
  return `₹${value.toFixed(0)}`;
}

function computeROI(gridRate, budget) {
  const capacityKWp = budget / COST_PER_KWP;
  const annualOM = budget * OM_RATE;

  let cumulativeSavings = 0;
  let paybackYear = null;
  const yearlyBreakdown = [];

  for (let yr = 1; yr <= ANALYSIS_YEARS; yr++) {
    const genKWh = capacityKWp * ANNUAL_GEN_PER_KWP * Math.pow(1 - DEGRADATION_RATE, yr - 1);
    const effectiveRate = gridRate * Math.pow(1 + GRID_ESCALATION, yr - 1);
    const grossSaving = genKWh * effectiveRate;
    const netSaving = grossSaving - annualOM;
    cumulativeSavings += netSaving;

    yearlyBreakdown.push({
      year: yr,
      generation: Math.round(genKWh),
      rate: parseFloat(effectiveRate.toFixed(2)),
      netSaving: Math.round(netSaving),
      cumulative: Math.round(cumulativeSavings),
    });

    if (paybackYear === null && cumulativeSavings >= budget) {
      // Linear interpolation within the year
      const prevCumulative = cumulativeSavings - netSaving;
      const fraction = (budget - prevCumulative) / netSaving;
      paybackYear = parseFloat((yr - 1 + fraction).toFixed(1));
    }
  }

  return {
    capacityKWp: parseFloat(capacityKWp.toFixed(2)),
    paybackYears: paybackYear ?? "> 10",
    totalSavings10Y: Math.round(cumulativeSavings),
    netROI10Y: Math.round(cumulativeSavings - budget),
    yearlyBreakdown,
  };
}

/* ── Styled Range Slider ───────────────────────────────────── */
function SliderInput({ label, icon: Icon, value, min, max, step, unit, onChange }) {
  // Progress percentage for the track fill
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-300 font-medium">{label}</span>
        </div>
        <span className="text-sm font-semibold text-white font-mono tabular-nums">
          {unit === "₹"
            ? formatINR(value)
            : `₹${value.toFixed(1)} /kWh`}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-sky-500/40
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-sky-400
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-campus-900
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-sky-400
          [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-campus-900
        "
        style={{
          background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${pct}%, #1e2d56 ${pct}%, #1e2d56 100%)`,
        }}
      />

      <div className="flex justify-between text-[10px] text-slate-600 font-mono">
        <span>{unit === "₹" ? formatINR(min) : `₹${min}`}</span>
        <span>{unit === "₹" ? formatINR(max) : `₹${max}`}</span>
      </div>
    </div>
  );
}

/* ── Result Card ───────────────────────────────────────────── */
function ResultCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="bg-campus-950/60 border border-campus-800 rounded-lg p-4 text-center">
      <div className={`inline-flex p-2 rounded-lg ${accent} mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */
export default function ROICalculator() {
  const [gridRate, setGridRate] = useState(8.5);          // ₹ per kWh
  const [budget, setBudget] = useState(25_00_000);        // ₹25 Lakh

  const roi = useMemo(() => computeROI(gridRate, budget), [gridRate, budget]);

  return (
    <div className="bg-campus-900/80 border border-campus-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-amber-500/10">
          <Calculator className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            ROI Calculator
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Estimate solar payback &amp; long-term savings
          </p>
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-6 mb-8">
        <SliderInput
          label="Current Grid Rate"
          icon={IndianRupee}
          value={gridRate}
          min={4}
          max={16}
          step={0.1}
          unit="₹/kWh"
          onChange={setGridRate}
        />
        <SliderInput
          label="Solar Installation Budget"
          icon={TrendingUp}
          value={budget}
          min={500000}
          max={50000000}
          step={100000}
          unit="₹"
          onChange={setBudget}
        />
      </div>

      {/* Installed capacity callout */}
      <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-lg bg-campus-800/50 border border-campus-800">
        <span className="text-[11px] text-slate-500">Estimated Capacity:</span>
        <span className="text-sm font-semibold text-sky-400 font-mono">
          {roi.capacityKWp} kWp
        </span>
        <span className="text-[10px] text-slate-600 ml-1">
          @ ₹{(COST_PER_KWP / 1000).toFixed(0)}K per kWp
        </span>
      </div>

      {/* Result Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <ResultCard
          icon={Clock}
          label="Payback Period"
          value={
            typeof roi.paybackYears === "number"
              ? `${roi.paybackYears} yrs`
              : roi.paybackYears
          }
          sub="Break-even on investment"
          accent="bg-sky-500/10 text-sky-400"
        />
        <ResultCard
          icon={IndianRupee}
          label="10-Year Savings"
          value={formatINR(roi.totalSavings10Y)}
          sub="Gross cumulative savings"
          accent="bg-emerald-500/10 text-emerald-400"
        />
        <ResultCard
          icon={TrendingUp}
          label="10-Year Net ROI"
          value={formatINR(roi.netROI10Y)}
          sub="Savings minus investment"
          accent={
            roi.netROI10Y >= 0
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          }
        />
      </div>

      {/* Year-by-year breakdown table */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer text-xs text-slate-500 hover:text-slate-300 transition-colors select-none">
          <span className="group-open:rotate-90 transition-transform text-[10px]">▶</span>
          Year-by-year breakdown
        </summary>
        <div className="mt-3 overflow-x-auto rounded-lg border border-campus-800">
          <table className="w-full text-[11px] text-slate-400">
            <thead>
              <tr className="bg-campus-800/50 text-slate-500 uppercase tracking-wider">
                <th className="text-left px-3 py-2 font-medium">Year</th>
                <th className="text-right px-3 py-2 font-medium">Gen (kWh)</th>
                <th className="text-right px-3 py-2 font-medium">Rate (₹)</th>
                <th className="text-right px-3 py-2 font-medium">Net Saving</th>
                <th className="text-right px-3 py-2 font-medium">Cumulative</th>
              </tr>
            </thead>
            <tbody>
              {roi.yearlyBreakdown.map((row) => (
                <tr
                  key={row.year}
                  className="border-t border-campus-800/60 hover:bg-campus-800/30 transition-colors"
                >
                  <td className="px-3 py-1.5 font-mono text-slate-300">{row.year}</td>
                  <td className="px-3 py-1.5 text-right font-mono">
                    {row.generation.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">₹{row.rate}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-emerald-400">
                    {formatINR(row.netSaving)}
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right font-mono font-semibold ${
                      row.cumulative >= budget ? "text-emerald-400" : "text-slate-300"
                    }`}
                  >
                    {formatINR(row.cumulative)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Fine print */}
      <p className="text-[10px] text-slate-600 mt-4 leading-relaxed">
        Assumptions: ₹{(COST_PER_KWP / 1000).toFixed(0)}K/kWp install cost · {ANNUAL_GEN_PER_KWP.toLocaleString()} kWh/kWp/yr ·{" "}
        {DEGRADATION_RATE * 100}% annual degradation · {OM_RATE * 100}% O&amp;M · {GRID_ESCALATION * 100}% tariff escalation
      </p>
    </div>
  );
}
