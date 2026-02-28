import React, { useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Calculator,
  Map,
  ChevronLeft,
  ChevronRight,
  Building2,
  Leaf,
} from "lucide-react";
import AlertBanner from "./AlertBanner";
import TopMetricsBar from "./TopMetricsBar";

/**
 * DashboardLayout
 * ──────────────────────────────────────────────────────────────
 * Full-page shell with:
 *   • Collapsible sidebar  (left)
 *   • Alert banner         (top)
 *   • Top KPI metrics bar
 *   • Main content area    (children)
 *
 * Props:
 *   alertMessage : string | null   – forwarded to <AlertBanner />
 *   onDismissAlert : () => void
 *   children     : React.ReactNode – page content
 */

/* ── Navigation items ─────────────────────────────────────── */
const navItems = [
  { key: "overview",    label: "Overview",              icon: LayoutDashboard },
  { key: "analytics",   label: "Energy Analytics",      icon: BarChart3 },
  { key: "renewable",   label: "Renewable Simulator",   icon: Leaf },
  { key: "roi",         label: "ROI Calculator",        icon: Calculator },
  { key: "roadmap",     label: "Roadmap",               icon: Map },
];

export default function DashboardLayout({
  alertMessage,
  onDismissAlert,
  children,
  activeNav: controlledNav,
  onNavChange,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [internalNav, setInternalNav] = useState("overview");

  // Support both controlled and uncontrolled modes
  const activeNav = controlledNav ?? internalNav;
  const handleNavChange = (key) => {
    setInternalNav(key);
    onNavChange?.(key);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-campus-950">
      {/* ─── Sidebar ────────────────────────────────────────── */}
      <aside
        className={`
          flex flex-col
          bg-campus-900/70 border-r border-campus-800
          transition-[width] duration-300 ease-in-out
          ${collapsed ? "w-[68px]" : "w-60"}
        `}
      >
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-campus-800">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-campus-700/60">
            <Building2 className="w-5 h-5 text-sky-400" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <p className="text-sm font-semibold text-white leading-tight">
                NMIMS Indore
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                Net-Zero Command
              </p>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map(({ key, label, icon: Icon }) => {
            const isActive = key === activeNav;
            return (
              <button
                key={key}
                onClick={() => handleNavChange(key)}
                title={collapsed ? label : undefined}
                className={`
                  group flex items-center gap-3 w-full
                  rounded-lg px-3 py-2.5 text-sm font-medium
                  transition-colors duration-150
                  ${isActive
                    ? "bg-campus-800 text-white"
                    : "text-slate-400 hover:bg-campus-800/50 hover:text-slate-200"
                  }
                `}
              >
                <Icon
                  className={`w-[18px] h-[18px] flex-shrink-0 ${
                    isActive ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300"
                  }`}
                />
                {!collapsed && <span>{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t border-campus-800 p-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="
              flex items-center justify-center w-full
              rounded-lg py-2 text-slate-500
              hover:bg-campus-800/50 hover:text-slate-300
              transition-colors
            "
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>

      {/* ─── Main Content Area ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Alert Banner (conditionally rendered) */}
        <AlertBanner
          alertMessage={alertMessage}
          severity="high"
          onDismiss={onDismissAlert}
        />

        {/* Header */}
        <header className="flex items-center justify-between px-6 h-16 border-b border-campus-800 bg-campus-950/80 backdrop-blur">
          <div>
            <h1 className="text-lg font-semibold text-white">
              {navItems.find((n) => n.key === activeNav)?.label ?? "Dashboard"}
            </h1>
            <p className="text-xs text-slate-500">
              Real-time NMIMS Indore energy monitoring
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400 font-mono">LIVE</span>
          </div>
        </header>

        {/* Scrollable body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top KPI Metrics */}
          <TopMetricsBar />

          {/* Page-specific content */}
          {children}
        </main>
      </div>
    </div>
  );
}
