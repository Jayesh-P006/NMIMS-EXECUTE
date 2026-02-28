import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "./components/DashboardLayout";
import OverviewPage from "./components/OverviewPage";
import LiveEnergyChart from "./components/LiveEnergyChart";
import ROICalculator from "./components/ROICalculator";
import RenewableSimulator from "./components/RenewableSimulator";
import SolarEnergyPage from "./components/SolarEnergyPage";

/**
 * App — root component
 * ──────────────────────────────────────────────────────────────
 * Wires the DashboardLayout with nav-based page switching:
 *   • Overview      → OverviewPage (comprehensive analytics)
 *   • Analytics     → LiveEnergyChart + block breakdown
 *   • ROI Calculator→ ROICalculator
 *   • Roadmap       → Placeholder
 */

const PREDICT_URL = "http://localhost:5000/api/predict-surge";

export default function App() {
  const [alert, setAlert] = useState(null);
  const [activeNav, setActiveNav] = useState("overview");

  /* ── Fetch surge prediction on mount ────────────────────── */
  const fetchSurge = useCallback(async () => {
    try {
      const res = await fetch(PREDICT_URL);
      if (!res.ok) return;
      const data = await res.json();
      if (data.anomaly_alert && data.alert) {
        setAlert(data.alert.message);
      }
    } catch {
      // API not reachable — keep silent
    }
  }, []);

  useEffect(() => {
    fetchSurge();
    const id = setInterval(fetchSurge, 30_000);
    return () => clearInterval(id);
  }, [fetchSurge]);

  /* ── Page content based on active nav ────────────────────── */
  const renderPage = () => {
    switch (activeNav) {
      case "overview":
        return <OverviewPage />;

      case "analytics":
        return (
          <>
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <LiveEnergyChart />
              </div>
              <div className="glass-card accent-bar-violet p-6 animate-fade-in-up stagger-2">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                  Block-wise Breakdown
                </h2>
                {[
                  { name: "STME Block", color: "border-l-sky-400/50" },
                  { name: "SBM Block", color: "border-l-emerald-400/50" },
                  { name: "SOC Block", color: "border-l-violet-400/50" },
                  { name: "SOL Block", color: "border-l-amber-400/50" },
                  { name: "SPTM Block", color: "border-l-rose-400/50" },
                ].map((block) => (
                  <div
                    key={block.name}
                    className={`flex items-center justify-between py-3 pl-3 border-l-2 ${block.color} border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.03] transition-colors`}
                  >
                    <span className="text-sm text-slate-300">{block.name}</span>
                    <span className="text-xs font-mono text-slate-500">— kW</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="glass-card accent-bar-sky p-6 animate-fade-in-up stagger-3">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                Surge Prediction Model
              </h2>
              <div className="h-48 flex items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-slate-600 text-sm bg-white/[0.02]">
                Connect to /api/predict-surge for chart
              </div>
            </section>
          </>
        );

      case "solar":
        return <SolarEnergyPage />;

      case "renewable":
        return <RenewableSimulator />;

      case "roi":
        return (
          <section className="max-w-3xl">
            <ROICalculator />
          </section>
        );

      case "roadmap":
        return (
          <section className="glass-card accent-bar-emerald p-8 animate-fade-in-up">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-6">
              Net-Zero Roadmap
            </h2>
            <div className="relative space-y-0">
              {/* Vertical timeline line */}
              <div className="absolute left-[7px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-emerald-500/30 via-sky-500/20 to-transparent" />

              {[
                { phase: "Phase 1", title: "Campus Energy Audit & Baseline Study", status: "completed", timeline: "Q1 2025" },
                { phase: "Phase 2", title: "Rooftop Solar PV (150 kWp) — STME & SBM Blocks", status: "completed", timeline: "Q2 2025" },
                { phase: "Phase 3", title: "Smart HVAC & BMS Integration — All 5 Schools", status: "in-progress", timeline: "Q3 2025" },
                { phase: "Phase 4", title: "Battery Energy Storage System (200 kWh)", status: "in-progress", timeline: "Q4 2025" },
                { phase: "Phase 5", title: "EV Charging Stations & Smart Grid — Super Corridor Campus", status: "upcoming", timeline: "Q1 2026" },
                { phase: "Phase 6", title: "GRIHA 5-Star & Net-Zero Certification", status: "upcoming", timeline: "Q2 2026" },
                { phase: "Phase 7", title: "Water Recycling & Grey-Water Harvesting", status: "upcoming", timeline: "Q3 2026" },
                { phase: "Phase 8", title: "Carbon Neutral Campus Declaration", status: "upcoming", timeline: "Q4 2026" },
              ].map((item, index) => {
                const dotColor =
                  item.status === "completed" ? "bg-emerald-400" :
                  item.status === "in-progress" ? "bg-sky-400" : "bg-slate-600";
                const dotGlow =
                  item.status === "completed" ? "shadow-[0_0_8px_rgba(52,211,153,0.6)]" :
                  item.status === "in-progress" ? "shadow-[0_0_8px_rgba(56,189,248,0.6)]" : "";

                return (
                  <div
                    key={item.phase}
                    className="relative flex items-center gap-4 pl-6 py-2 animate-fade-in-up"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    {/* Timeline dot */}
                    <div className={`absolute left-[3px] w-[10px] h-[10px] rounded-full ${dotColor} ${dotGlow} z-10 border-2 border-[#0c1220]`}>
                      {item.status === "in-progress" && (
                        <span className={`absolute inset-0 rounded-full ${dotColor} animate-ping opacity-75`} />
                      )}
                    </div>

                    <div className={`flex-1 flex items-center gap-4 p-3.5 rounded-xl 
                      ${item.status === "in-progress" ? "bg-sky-500/[0.06] border border-sky-500/[0.12] shimmer-bg" : 
                        item.status === "completed" ? "bg-emerald-500/[0.04] border border-emerald-500/[0.08]" : 
                        "bg-white/[0.03] border border-white/[0.06]"} 
                      hover:bg-white/[0.05] transition-all duration-300`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-600 font-mono font-medium">{item.phase}</span>
                          <span className="text-sm font-medium text-slate-300">{item.title}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{item.timeline}</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold tracking-wide ${
                        item.status === "completed" ? "bg-emerald-500/15 text-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.15)]" :
                        item.status === "in-progress" ? "bg-sky-500/15 text-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.15)]" :
                        "bg-white/5 text-slate-500"
                      }`}>
                        {item.status === "completed" ? "Done" :
                         item.status === "in-progress" ? "Active" : "Planned"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );

      default:
        return <OverviewPage />;
    }
  };

  return (
    <DashboardLayout
      alertMessage={alert}
      onDismissAlert={() => setAlert(null)}
      activeNav={activeNav}
      onNavChange={setActiveNav}
    >
      {renderPage()}
    </DashboardLayout>
  );
}
