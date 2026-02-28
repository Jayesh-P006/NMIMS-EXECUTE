import React, { useState, useEffect, useCallback } from "react";
import DashboardLayout from "./components/DashboardLayout";
import OverviewPage from "./components/OverviewPage";
import LiveEnergyChart from "./components/LiveEnergyChart";
import ROICalculator from "./components/ROICalculator";
import RenewableSimulator from "./components/RenewableSimulator";

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
              <div className="bg-campus-900/80 border border-campus-800 rounded-xl p-6">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                  Block-wise Breakdown
                </h2>
                {["STME Block", "SBM Block", "SOC Block", "SOL Block", "SPTM Block"].map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between py-3 border-b border-campus-800 last:border-0"
                  >
                    <span className="text-sm text-slate-300">{name}</span>
                    <span className="text-xs font-mono text-slate-500">— kW</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="bg-campus-900/80 border border-campus-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                Surge Prediction Model
              </h2>
              <div className="h-48 flex items-center justify-center rounded-lg border border-dashed border-campus-700 text-slate-600 text-sm">
                Connect to /api/predict-surge for chart
              </div>
            </section>
          </>
        );

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
          <section className="bg-campus-900/80 border border-campus-800 rounded-xl p-8">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-6">
              Net-Zero Roadmap
            </h2>
            <div className="space-y-4">
              {[
                { phase: "Phase 1", title: "Campus Energy Audit & Baseline Study", status: "completed", timeline: "Q1 2025" },
                { phase: "Phase 2", title: "Rooftop Solar PV (150 kWp) — STME & SBM Blocks", status: "completed", timeline: "Q2 2025" },
                { phase: "Phase 3", title: "Smart HVAC & BMS Integration — All 5 Schools", status: "in-progress", timeline: "Q3 2025" },
                { phase: "Phase 4", title: "Battery Energy Storage System (200 kWh)", status: "in-progress", timeline: "Q4 2025" },
                { phase: "Phase 5", title: "EV Charging Stations & Smart Grid — Super Corridor Campus", status: "upcoming", timeline: "Q1 2026" },
                { phase: "Phase 6", title: "GRIHA 5-Star & Net-Zero Certification", status: "upcoming", timeline: "Q2 2026" },
                { phase: "Phase 7", title: "Water Recycling & Grey-Water Harvesting", status: "upcoming", timeline: "Q3 2026" },
                { phase: "Phase 8", title: "Carbon Neutral Campus Declaration", status: "upcoming", timeline: "Q4 2026" },
              ].map((item) => (
                <div key={item.phase} className="flex items-center gap-4 p-3 rounded-lg bg-campus-800/30 border border-campus-800/60">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    item.status === "completed" ? "bg-emerald-400" :
                    item.status === "in-progress" ? "bg-sky-400 animate-pulse" :
                    "bg-slate-600"
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-600 font-mono">{item.phase}</span>
                      <span className="text-sm font-medium text-slate-300">{item.title}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{item.timeline}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    item.status === "completed" ? "bg-emerald-500/15 text-emerald-400" :
                    item.status === "in-progress" ? "bg-sky-500/15 text-sky-400" :
                    "bg-slate-500/15 text-slate-500"
                  }`}>
                    {item.status === "completed" ? "Done" :
                     item.status === "in-progress" ? "Active" : "Planned"}
                  </span>
                </div>
              ))}
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
