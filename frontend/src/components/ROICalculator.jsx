import React, { useState, useMemo } from "react";
import { Calculator, TrendingUp, Clock, IndianRupee } from "lucide-react";

/* ── Constants ─────────────────────────────────────────────── */
const COST_PER_KWP = 45000;
const ANNUAL_GEN_PER_KWP = 1500;
const DEGRADATION_RATE = 0.005;
const OM_RATE = 0.01;
const GRID_ESCALATION = 0.03;
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
function SliderInput({ label, icon: Icon, value, min, max, step, unit, onChange, accentFrom, accentTo }) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08]">
            <Icon className="w-4 h-4 text-slate-400" />
          </span>
          <span className="text-sm text-slate-300 font-medium">{label}</span>
        </div>
        <span className="text-sm font-bold text-white font-mono tabular-nums">
          {unit === "₹" ? formatINR(value) : `₹${value.toFixed(1)} /kWh`}
        </span>
      </div>

      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer
            focus:outline-none
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20
            [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(56,189,248,0.4)]
            [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125
            [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white/20
          "
          style={{
            background: `linear-gradient(to right, ${accentFrom} 0%, ${accentTo} ${pct}%, rgba(255,255,255,0.06) ${pct}%, rgba(255,255,255,0.06) 100%)`,
            WebkitAppearance: "none",
          }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-600 font-mono">
        <span>{unit === "₹" ? formatINR(min) : `₹${min}`}</span>
        <span>{unit === "₹" ? formatINR(max) : `₹${max}`}</span>
      </div>
    </div>
  );
}

/* ── Result Card ───────────────────────────────────────────── */
function ResultCard({ icon: Icon, label, value, sub, accentBg, accentText, borderColor, glowShadow }) {
  return (
    <div className={`glass-card glass-card-hover p-4 text-center border-t-2 ${borderColor}`}>
      <div className={`inline-flex p-2.5 rounded-xl ${accentBg} mb-3`}
           style={{ boxShadow: glowShadow }}>
        <Icon className={`w-4 h-4 ${accentText}`} />
      </div>
      <p className="text-2xl font-extrabold text-white tracking-tight">{value}</p>
      <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-1.5 font-medium">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ROICalculator — Glass-Card Design
   ═══════════════════════════════════════════════════════════════════ */
export default function ROICalculator() {
  const [gridRate, setGridRate] = useState(8.5);
  const [budget, setBudget] = useState(25_00_000);
  const roi = useMemo(() => computeROI(gridRate, budget), [gridRate, budget]);

  return (
    <div className="glass-card accent-bar-amber p-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20"
             style={{ boxShadow: "0 0 12px rgba(245,158,11,0.15)" }}>
          <Calculator className="w-5 h-5 text-amber-400" />
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
          accentFrom="#f59e0b"
          accentTo="#fbbf24"
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
          accentFrom="#38bdf8"
          accentTo="#818cf8"
        />
      </div>

      {/* Installed capacity callout */}
      <div className="flex items-center gap-2 mb-6 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <span className="text-[11px] text-slate-500">Estimated Capacity:</span>
        <span className="text-sm font-bold text-sky-400 font-mono">
          {roi.capacityKWp} kWp
        </span>
        <span className="text-[10px] text-slate-600 ml-1">
          @ ₹{(COST_PER_KWP / 1000).toFixed(0)}K per kWp
        </span>
      </div>

      {/* Result Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <ResultCard
          icon={Clock}
          label="Payback Period"
          value={typeof roi.paybackYears === "number" ? `${roi.paybackYears} yrs` : roi.paybackYears}
          sub="Break-even on investment"
          accentBg="bg-sky-500/10 border border-sky-500/20"
          accentText="text-sky-400"
          borderColor="border-t-sky-500/30"
          glowShadow="0 0 10px rgba(56,189,248,0.15)"
        />
        <ResultCard
          icon={IndianRupee}
          label="10-Year Savings"
          value={formatINR(roi.totalSavings10Y)}
          sub="Gross cumulative savings"
          accentBg="bg-emerald-500/10 border border-emerald-500/20"
          accentText="text-emerald-400"
          borderColor="border-t-emerald-500/30"
          glowShadow="0 0 10px rgba(16,185,129,0.15)"
        />
        <ResultCard
          icon={TrendingUp}
          label="10-Year Net ROI"
          value={formatINR(roi.netROI10Y)}
          sub="Savings minus investment"
          accentBg={roi.netROI10Y >= 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}
          accentText={roi.netROI10Y >= 0 ? "text-emerald-400" : "text-red-400"}
          borderColor={roi.netROI10Y >= 0 ? "border-t-emerald-500/30" : "border-t-red-500/30"}
          glowShadow={roi.netROI10Y >= 0 ? "0 0 10px rgba(16,185,129,0.15)" : "0 0 10px rgba(239,68,68,0.15)"}
        />
      </div>

      {/* Year-by-year breakdown table */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer text-xs text-slate-500 hover:text-slate-300 transition-colors select-none mb-1">
          <span className="group-open:rotate-90 transition-transform text-[10px]">▶</span>
          Year-by-year breakdown
        </summary>
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <table className="w-full text-[11px] text-slate-400">
            <thead>
              <tr className="bg-white/[0.04] text-slate-500 uppercase tracking-wider">
                <th className="text-left px-3 py-2.5 font-medium">Year</th>
                <th className="text-right px-3 py-2.5 font-medium">Gen (kWh)</th>
                <th className="text-right px-3 py-2.5 font-medium">Rate (₹)</th>
                <th className="text-right px-3 py-2.5 font-medium">Net Saving</th>
                <th className="text-right px-3 py-2.5 font-medium">Cumulative</th>
              </tr>
            </thead>
            <tbody>
              {roi.yearlyBreakdown.map((row) => {
                const isPastPayback = row.cumulative >= budget;
                return (
                  <tr
                    key={row.year}
                    className={`border-t border-white/[0.04] transition-colors ${
                      isPastPayback
                        ? "bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <td className="px-3 py-2 font-mono text-slate-300 font-medium">{row.year}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {row.generation.toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">₹{row.rate}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-400">
                      {formatINR(row.netSaving)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono font-semibold ${
                        isPastPayback ? "text-emerald-400" : "text-slate-300"
                      }`}
                    >
                      {formatINR(row.cumulative)}
                      {isPastPayback && row.year === roi.yearlyBreakdown.find((r) => r.cumulative >= budget)?.year && (
                        <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">
                          PAYBACK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
