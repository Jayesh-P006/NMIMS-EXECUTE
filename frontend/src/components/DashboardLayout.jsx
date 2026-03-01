import React, { useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Building2,
  Leaf,
  Sparkles,
  Sun,
} from "lucide-react";
import AlertBanner from "./AlertBanner";
import TopMetricsBar from "./TopMetricsBar";

/* ── Navigation items ─────────────────────────────────────── */
const navItems = [
  { key: "overview",    label: "Overview",              icon: LayoutDashboard },
  { key: "analytics",   label: "Energy Analytics",      icon: BarChart3 },
  { key: "solar",       label: "Solar Energy",          icon: Sun },
  { key: "renewable",   label: "Renewable Simulator",   icon: Leaf },
  { key: "roi",         label: "ROI Calculator",        icon: Calculator },
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

  const activeNav = controlledNav ?? internalNav;
  const handleNavChange = (key) => {
    setInternalNav(key);
    onNavChange?.(key);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      {/* ─── Sidebar ────────────────────────────────────────── */}
      <aside
        className={`
          flex flex-col relative
          border-r border-white/[0.06]
          transition-[width] duration-300 ease-in-out
          ${collapsed ? "w-[68px]" : "w-60"}
        `}
        style={{
          background: 'linear-gradient(180deg, #080808 0%, #000000 50%, #080808 100%)',
        }}
      >
        {/* Subtle side glow */}
        <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-sky-500/10 to-transparent" />

        {/* Logo / Brand */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/[0.06]">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-sky-400/20">
            <Building2 className="w-5 h-5 text-sky-400" />
            <div className="absolute -inset-0.5 rounded-xl bg-sky-400/10 blur-sm -z-10" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <p className="text-sm font-bold text-white leading-tight tracking-tight">
                NMIMS Indore
              </p>
              <p className="text-[9px] text-sky-400/70 uppercase tracking-[0.2em] font-medium">
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
                  group relative flex items-center gap-3 w-full
                  rounded-xl px-3 py-2.5 text-sm font-medium
                  transition-all duration-200
                  ${isActive
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.03]"
                  }
                `}
              >
                {/* Active indicator glow background */}
                {isActive && (
                  <>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-500/[0.12] to-violet-500/[0.06] border border-sky-400/10" />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                  </>
                )}
                <Icon
                  className={`relative w-[18px] h-[18px] flex-shrink-0 transition-colors duration-200 ${
                    isActive ? "text-sky-400" : "text-slate-600 group-hover:text-slate-400"
                  }`}
                />
                {!collapsed && <span className="relative">{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Version badge */}
        {!collapsed && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-1.5 text-[9px] text-slate-600">
              <Sparkles className="w-3 h-3" />
              <span>v1.0 — Smart Campus</span>
            </div>
          </div>
        )}

        {/* Collapse Toggle */}
        <div className="border-t border-white/[0.06] p-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="
              flex items-center justify-center w-full
              rounded-xl py-2 text-slate-600
              hover:bg-white/[0.03] hover:text-slate-400
              transition-all duration-200
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
        {/* Alert Banner */}
        <AlertBanner
          alertMessage={alertMessage}
          severity="high"
          onDismiss={onDismissAlert}
        />

        {/* Header — frosted glass */}
        <header className="relative flex items-center justify-between px-6 h-16 border-b border-white/[0.06] bg-campus-950/60 backdrop-blur-xl">
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-sky-500/10 to-transparent" />
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              {navItems.find((n) => n.key === activeNav)?.label ?? "Dashboard"}
            </h1>
            <p className="text-[11px] text-slate-500">
              Real-time NMIMS Indore energy monitoring
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-xs text-emerald-400/80 font-mono font-medium tracking-wider">LIVE</span>
          </div>
        </header>

        {/* Scrollable body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeNav !== "solar" && <TopMetricsBar />}
          {/* Page content with entrance animation keyed to nav */}
          <div key={activeNav} className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
