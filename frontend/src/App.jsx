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
 *   (Roadmap removed)
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
