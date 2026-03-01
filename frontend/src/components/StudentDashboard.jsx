import React from "react";
import {
  Building2,
  LogOut,
  Leaf,
  Zap,
  Trophy,
  Target,
  GraduationCap,
} from "lucide-react";

export default function StudentDashboard({ onLogout }) {
  return (
    <div className="flex h-screen overflow-hidden bg-black">
      {/* ─── Sidebar ──────────────────────────────────────────── */}
      <aside
        className="flex flex-col w-64 border-r border-white/[0.06]"
        style={{
          background:
            "linear-gradient(180deg, #080808 0%, #000000 50%, #080808 100%)",
        }}
      >
        <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent" />

        {/* Brand */}
        <div className="px-4 h-[78px] border-b border-white/[0.06] flex items-center">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/25 shadow-[0_0_14px_rgba(52,211,153,0.08)]">
              <GraduationCap className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[24px] font-extrabold text-white leading-none tracking-tight">
                NMIMS Indore
              </p>
              <p className="text-[10px] text-emerald-400/75 uppercase tracking-[0.18em] font-semibold mt-1">
                Student Portal
              </p>
            </div>
          </div>
        </div>

        {/* Nav placeholder */}
        <nav className="flex-1 px-3 pt-6 pb-4 flex flex-col gap-2">
          {[
            { label: "My Dashboard", icon: Building2, active: true },
            { label: "Energy Pledge", icon: Leaf },
            { label: "GreenCoin Wallet", icon: Zap },
            { label: "Leaderboard", icon: Trophy },
            { label: "Campus Goals", icon: Target },
          ].map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              className={`group relative flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-[15px] font-medium transition-all duration-200 ${
                active
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.035]"
              }`}
            >
              {active && (
                <>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/[0.14] to-teal-500/[0.07] border border-emerald-400/15" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" />
                </>
              )}
              <Icon
                className={`relative w-[19px] h-[19px] flex-shrink-0 transition-colors duration-200 ${
                  active
                    ? "text-emerald-400"
                    : "text-slate-600 group-hover:text-slate-300"
                }`}
              />
              <span className="relative tracking-[0.01em] leading-none">
                {label}
              </span>
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-white/[0.06] p-3">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-[15px] font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-200"
          >
            <LogOut className="w-[19px] h-[19px] flex-shrink-0" />
            <span className="tracking-[0.01em] leading-none">Logout</span>
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="relative flex items-center justify-between px-6 h-16 border-b border-white/[0.06] bg-campus-950/60 backdrop-blur-xl">
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent" />
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Student Dashboard
            </h1>
            <p className="text-[11px] text-slate-500">
              Welcome to Campus Zero — your sustainability hub
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-xs text-emerald-400/80 font-mono font-medium tracking-wider">
              LIVE
            </span>
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            {/* Decorative icon */}
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-400/15 flex items-center justify-center">
                <GraduationCap className="w-12 h-12 text-emerald-400/60" />
              </div>
              <div className="absolute -inset-2 rounded-2xl bg-emerald-400/5 blur-xl -z-10" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">
              Student Portal
            </h2>
            <p className="text-slate-500 max-w-md leading-relaxed mb-8">
              This is your personal net-zero dashboard. Track your energy
              pledges, earn GreenCoins, and compete on the campus leaderboard.
            </p>

            {/* Placeholder cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
              {[
                {
                  icon: Zap,
                  title: "0",
                  sub: "GreenCoins",
                  color: "from-amber-500/20 to-orange-500/10 border-amber-400/15",
                  iconColor: "text-amber-400/60",
                },
                {
                  icon: Leaf,
                  title: "0",
                  sub: "Pledges Made",
                  color: "from-emerald-500/20 to-teal-500/10 border-emerald-400/15",
                  iconColor: "text-emerald-400/60",
                },
                {
                  icon: Trophy,
                  title: "—",
                  sub: "Rank",
                  color: "from-violet-500/20 to-fuchsia-500/10 border-violet-400/15",
                  iconColor: "text-violet-400/60",
                },
              ].map(({ icon: Icon, title, sub, color, iconColor }) => (
                <div
                  key={sub}
                  className={`glass-card p-6 bg-gradient-to-br ${color} text-center`}
                >
                  <Icon className={`w-6 h-6 ${iconColor} mx-auto mb-3`} />
                  <p className="text-2xl font-bold text-white">{title}</p>
                  <p className="text-xs text-slate-500 mt-1">{sub}</p>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-700 mt-8">
              More features coming soon — Energy Pledges, GreenCoin Wallet, Leaderboard & Campus Goals.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
