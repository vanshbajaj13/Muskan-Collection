import React, { useState, useEffect, useCallback } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import { usePhone } from "./PhoneContext";

// ── Helpers ────────────────────────────────────────────────────────────────
const INR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const PERIOD_OPTIONS = [
  { label: "All Time",      value: "all" },
  { label: "This Month",    value: "month" },
  { label: "Last 3 Months", value: "3months" },
  { label: "This Year",     value: "year" },
];

const getPeriodRange = (period) => {
  const now = new Date();
  if (period === "month")   return { from: new Date(now.getFullYear(), now.getMonth(), 1).getTime() };
  if (period === "3months") return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime() };
  if (period === "year")    return { from: new Date(now.getFullYear(), 0, 1).getTime() };
  return {};
};

// Same color palette style as your Inventory.jsx
const COLORS = [
  "rgba(99,  102, 241, 0.7)",  // indigo
  "rgba(16,  185, 129, 0.7)",  // emerald
  "rgba(245, 158, 11,  0.7)",  // amber
  "rgba(244, 63,  94,  0.7)",  // rose
  "rgba(6,   182, 212, 0.7)",  // cyan
  "rgba(139, 92,  246, 0.7)",  // violet
  "rgba(249, 115, 22,  0.7)",  // orange
  "rgba(20,  184, 166, 0.7)",  // teal
];

const getColors = (n) => Array.from({ length: n }, (_, i) => COLORS[i % COLORS.length]);

// ── Summary card ───────────────────────────────────────────────────────────
const Card = ({ label, value, sub, accent = "indigo" }) => {
  const accents = {
    indigo:  "bg-indigo-50  border-indigo-100  text-indigo-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    amber:   "bg-amber-50   border-amber-100   text-amber-700",
    rose:    "bg-rose-50    border-rose-100    text-rose-500",
    slate:   "bg-slate-50   border-slate-200   text-slate-600",
  };
  return (
    <div className={`rounded-xl border p-4 ${accents[accent]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
    </div>
  );
};

// ── Section wrapper ────────────────────────────────────────────────────────
const Section = ({ title, children, height = "h-72" }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5">
    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">{title}</h3>
    <div className={`${height} w-full`}>
      {children}
    </div>
  </div>
);

// ── Main Dashboard ─────────────────────────────────────────────────────────
const PhoneDashboard = () => {
  const { getDealStats } = usePhone();

  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const [period, setPeriod] = useState("all");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDealStats(getPeriodRange(period));
      setStats(data);
    } catch {
      setError("Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [getDealStats, period]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Chart data builders ──────────────────────────────────────────────────

  // 1. Profit by month — Grouped Bar (Gross vs Net)
  const profitByMonthChartData = stats ? (() => {
    const entries = Object.entries(stats.profitByMonth || {})
      .sort(([a], [b]) => a.localeCompare(b));
    const labels = entries.map(([m]) => m.slice(5) + "/" + m.slice(2, 4));
    return {
      labels,
      datasets: [
        {
          label: "Gross Profit",
          data: entries.map(([, v]) => v.gross),
          backgroundColor: "rgba(99, 102, 241, 0.7)",
          borderWidth: 1,
        },
        {
          label: "Net Profit",
          data: entries.map(([, v]) => v.net),
          backgroundColor: "rgba(16, 185, 129, 0.7)",
          borderWidth: 1,
        },
      ],
    };
  })() : null;

  // 2. Net profit by product — Horizontal Bar
  const profitByProductChartData = stats ? (() => {
    const entries = Object.entries(stats.profitByProduct || {})
      .sort(([, a], [, b]) => b.net - a.net);
    const colors = getColors(entries.length);
    return {
      labels: entries.map(([p]) => p),
      datasets: [
        {
          label: "Net Profit (₹)",
          data: entries.map(([, v]) => v.net),
          backgroundColor: colors,
          borderWidth: 1,
        },
      ],
    };
  })() : null;

  // 3. Deal status — Doughnut
  const statusChartData = stats ? {
    labels: ["Complete", "Payment Pending", "Unsold"],
    datasets: [{
      data: [
        stats.summary.statusCounts.complete,
        stats.summary.statusCounts.pending_payment,
        stats.summary.statusCounts.unsold,
      ],
      backgroundColor: [
        "rgba(16,  185, 129, 0.7)",  // emerald — complete
        "rgba(245, 158, 11,  0.7)",  // amber   — pending
        "rgba(148, 163, 184, 0.7)",  // slate   — unsold
      ],
      borderWidth: 1,
    }],
  } : null;

  // 4. Cashback by card — Bar
  const cashbackByCardChartData = stats ? (() => {
    const entries = Object.entries(stats.cashbackByCard || {});
    const colors = getColors(entries.length);
    return {
      labels: entries.map(([card]) => card),
      datasets: [{
        label: "Cashback (₹)",
        data: entries.map(([, amt]) => amt),
        backgroundColor: colors,
        borderWidth: 1,
      }],
    };
  })() : null;

  // ── Shared chart options ─────────────────────────────────────────────────
  const barOptions = {
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ₹${Number(ctx.parsed.y).toLocaleString("en-IN")}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (v) => `₹${(v / 1000).toFixed(0)}k`,
          font: { size: 11 },
        },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
      x: { ticks: { font: { size: 11 } } },
    },
  };

  const horizontalBarOptions = {
    maintainAspectRatio: false,
    indexAxis: "y",
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => ` Net Profit: ₹${Number(ctx.parsed.x).toLocaleString("en-IN")}`,
        },
      },
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: {
          callback: (v) => `₹${(v / 1000).toFixed(0)}k`,
          font: { size: 11 },
        },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
      y: { ticks: { font: { size: 11 } } },
    },
  };

  const doughnutOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { font: { size: 11 }, padding: 12 } },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.parsed} deals`,
        },
      },
    },
  };

  const cashbackBarOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` Cashback: ₹${Number(ctx.parsed.y).toLocaleString("en-IN")}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (v) => `₹${(v / 1000).toFixed(1)}k`,
          font: { size: 11 },
        },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
      x: { ticks: { font: { size: 11 } } },
    },
  };

  const hasChartData = profitByMonthChartData?.labels?.length > 0
    || profitByProductChartData?.labels?.length > 0;

  return (
    <div>
      {/* Header + period filter */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-sm text-slate-400">Business analytics at a glance</p>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
          {PERIOD_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setPeriod(o.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${period === o.value
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24 text-slate-400">Loading analytics…</div>
      ) : error ? (
        <div className="text-center py-24 text-rose-400">{error}</div>
      ) : !stats ? null : (
        <div className="space-y-5">

          {/* ── Summary cards row 1 ──────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card label="Total Deals"      value={stats.summary.totalDeals}              accent="slate" />
            <Card label="Total Invested"   value={INR(stats.summary.totalBuyingCost)}    accent="indigo" />
            <Card label="Total Revenue"    value={INR(stats.summary.totalRevenue)}        accent="indigo" />
            <Card label="Pending Collect"  value={INR(stats.summary.totalPending)}        accent="amber"
              sub={stats.summary.statusCounts.pending_payment + " deals pending"} />
          </div>

          {/* ── Summary cards row 2 ──────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card label="Gross Profit"     value={INR(stats.summary.totalGrossProfit)}   accent="emerald" />
            <Card label="Net Profit"       value={INR(stats.summary.totalNetProfit)}      accent="emerald"
              sub="After commissions" />
            <Card label="Total Cashback"   value={INR(stats.summary.totalCashback)}       accent="indigo"
              sub="Across all cards" />
            <Card label="Total Commission" value={INR(stats.summary.totalCommission)}     accent="rose" />
          </div>

          {/* ── Profit by month ───────────────────────────────────── */}
          {profitByMonthChartData?.labels?.length > 0 && (
            <Section title="Profit by Month (Gross vs Net)">
              <Bar data={profitByMonthChartData} options={barOptions} />
            </Section>
          )}

          {/* ── Profit by product + status side by side ──────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {profitByProductChartData?.labels?.length > 0 && (
              <Section title="Net Profit by Product" height="h-64">
                <Bar data={profitByProductChartData} options={horizontalBarOptions} />
              </Section>
            )}

            {statusChartData && stats.summary.totalDeals > 0 && (
              <Section title="Deal Status" height="h-64">
                <Doughnut data={statusChartData} options={doughnutOptions} />
              </Section>
            )}
          </div>

          {/* ── Cashback by card ──────────────────────────────────── */}
          {cashbackByCardChartData?.labels?.length > 0 && (
            <Section title="Cashback by Card" height="h-56">
              <Bar data={cashbackByCardChartData} options={cashbackBarOptions} />
            </Section>
          )}

          {/* ── Empty state ───────────────────────────────────────── */}
          {!hasChartData && (
            <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
              <p className="text-4xl mb-3">📊</p>
              <p className="font-medium text-slate-500">No completed deals yet for this period</p>
              <p className="text-sm mt-1">Charts will appear once you have sold deals</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default PhoneDashboard;