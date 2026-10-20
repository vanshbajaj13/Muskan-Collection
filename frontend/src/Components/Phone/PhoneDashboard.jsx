import React, { useState, useEffect, useCallback } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import { usePhone } from "./PhoneContext";
import PhoneFilters from "./PhoneFilters";
import { FullScreenSpinner, Toast } from "./PhoneUI";
import GstFilingModal from "./GstFilingModal";
import { summarizeGst, GST_METHOD_LABEL } from "./gstUtils";

// ── Helpers ────────────────────────────────────────────────────────────────
const INR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const COLORS = [
  "rgba(255, 99, 132, 0.7)", // Soft Red
  "rgba(54, 162, 235, 0.7)", // Soft Blue
  "rgba(255, 206, 86, 0.7)", // Soft Yellow
  "rgba(75, 192, 192, 0.7)", // Soft Teal
  "rgba(192, 192, 192, 0.7)", // Soft Gray
  "rgba(153, 102, 255, 0.7)", // Soft Purple
  "rgba(255, 159, 64, 0.7)", // Soft Orange
  "rgba(255, 99, 255, 0.7)", // Soft Pink
  "rgba(54, 235, 162, 0.7)", // Soft Mint
  "rgba(206, 86, 255, 0.7)", // Soft Violet
  "rgba(192, 75, 192, 0.7)", // Soft Magenta
  "rgba(99, 255, 132, 0.7)", // Soft Green
  "rgba(235, 54, 162, 0.7)", // Soft Raspberry
  "rgba(86, 255, 206, 0.7)", // Soft Cyan
  "rgba(255, 192, 75, 0.7)", // Soft Amber
  "rgba(99, 132, 255, 0.7)", // Soft Periwinkle
  "rgba(162, 54, 235, 0.7)", // Soft Orchid
];

const getColors = (n) =>
  Array.from({ length: n }, (_, i) => COLORS[i % COLORS.length]);

const _now = new Date();
const _defaultFrom = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-01`;
const _lastDay = new Date(_now.getFullYear(), _now.getMonth() + 1, 0).getDate();
const _defaultTo = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_lastDay).padStart(2, "0")}`;

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Dashboard filter keys (status & cashback added for quick capsule filters)
const INITIAL_FILTERS = {
  dateFrom: _defaultFrom,
  dateTo: _defaultTo,
  status: "all",
  product: "",
  account: "",
  purchasedFrom: "",
  soldTo: "",
  creditCard: "",
  commissionTo: "",
  withGST: "",
  hasCashback: "",
  hasCommission: "",
  r1Status: "",
  r2Status: "",
};

// ── Capsule filter button ───────────────────────────────────────────────────
const Capsule = ({ active, onClick, children, activeColor = "gray" }) => {
  const activeClasses = {
    indigo: "bg-indigo-600 text-white border-indigo-600 shadow-sm",
    emerald: "bg-emerald-400 text-white border-emerald-400 shadow-sm",
    amber: "bg-amber-300 text-white border-amber-300 shadow-sm",
    slate: "bg-slate-600 text-white border-slate-600 shadow-sm",
    gray: "bg-slate-300 text-white border-slate-300 shadow-sm",
    rose: "bg-rose-500 text-white border-rose-500 shadow-sm",
  };
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap
        ${
          active
            ? activeClasses[activeColor]
            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
        }`}
    >
      {children}
    </button>
  );
};

// ── Summary card ───────────────────────────────────────────────────────────
const Card = ({ label, value, sub, accent = "indigo" }) => {
  const accents = {
    indigo: "bg-indigo-50  border-indigo-100  text-indigo-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    amber: "bg-amber-50   border-amber-100   text-amber-700",
    rose: "bg-rose-50    border-rose-100    text-rose-500",
    slate: "bg-slate-50   border-slate-200   text-slate-600",
  };
  return (
    <div className={`rounded-xl border p-4 ${accents[accent]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
        {label}
      </p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
    </div>
  );
};

const Section = ({ title, children, height = "h-72" }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5">
    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
      {title}
    </h3>
    <div className={`${height} w-full`}>{children}</div>
  </div>
);

// ── Main Dashboard ─────────────────────────────────────────────────────────
const PhoneDashboard = () => {
  const { getDealStats } = usePhone();

  const [allDealsStats, setAllDealsStats] = useState(null); // raw stats from server
  const [stats, setStats] = useState(null); // filtered stats
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [stripYear, setStripYear] = useState(_now.getFullYear());
  const [showGstFiling, setShowGstFiling] = useState(false);
  const [gstTableOpen, setGstTableOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Jump to a specific month/year in the date filters
  const selectMonth = (year, month) => {
    const last = new Date(year, month, 0).getDate();
    const m = String(month).padStart(2, "0");
    setFilters((f) => ({
      ...f,
      dateFrom: `${year}-${m}-01`,
      dateTo: `${year}-${m}-${String(last).padStart(2, "0")}`,
    }));
  };

  const clearMonthFilter = () => {
    setFilters((f) => ({ ...f, dateFrom: "", dateTo: "" }));
  };

  // Derive selected month/year from current dateFrom for highlighting
  const selectedMonthKey = (() => {
    if (!filters.dateFrom) return null;
    const d = new Date(filters.dateFrom + "T00:00:00");
    return `${d.getFullYear()}-${d.getMonth() + 1}`;
  })();

  // Build query params from date filters only (server-side date range)
  const buildParams = useCallback(() => {
    const p = {};
    if (filters.dateFrom) p.from = new Date(filters.dateFrom).getTime();
    if (filters.dateTo)
      p.to = new Date(filters.dateTo).setHours(23, 59, 59, 999);
    return p;
  }, [filters.dateFrom, filters.dateTo]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDealStats(buildParams());
      setAllDealsStats(data);
    } catch {
      setError("Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [getDealStats, buildParams]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Client-side filtering of raw deal data ───────────────────────────────
  // The stats endpoint returns computed aggregates, not individual deals.
  // We re-fetch with date params but filter other dimensions client-side.
  // To do this properly we fetch deals separately and re-compute stats.
  const { getDeals } = usePhone();
  const [rawDeals, setRawDeals] = useState([]);

  const fetchDeals = useCallback(async () => {
    try {
      const p = buildParams();
      const data = await getDeals(p);
      setRawDeals(data.deals || []);
    } catch {}
  }, [getDeals, buildParams]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Compute filtered stats client-side from rawDeals
  useEffect(() => {
    if (!rawDeals.length && !allDealsStats) return;

    // Apply non-date filters to rawDeals
    const filtered = rawDeals.filter((d) => {
      if (
        filters.status &&
        filters.status !== "all" &&
        d.dealStatus !== filters.status
      )
        return false;
      if (filters.product && d.product !== filters.product) return false;
      if (filters.account && d.purchaseAccount !== filters.account)
        return false;
      if (filters.purchasedFrom && d.purchasedFrom !== filters.purchasedFrom)
        return false;
      if (filters.soldTo && d.soldTo !== filters.soldTo) return false;
      if (filters.creditCard && d.creditCard !== filters.creditCard)
        return false;
      if (filters.commissionTo && d.commissionTo !== filters.commissionTo)
        return false;
      if (filters.withGST === "true" && !d.withGST) return false;
      if (filters.withGST === "false" && d.withGST) return false;
      if (filters.hasCashback === "yes" && !(d.cashback > 0)) return false;
      if (
        filters.hasCashback === "expected" &&
        !(d.cashbackExpected && !(d.cashback > 0))
      )
        return false;
      if (
        filters.hasCashback === "no" &&
        (d.cashback > 0 || d.cashbackExpected)
      )
        return false;
      if (filters.hasCommission === "yes" && !(d.commissionAmount > 0))
        return false;
      if (filters.hasCommission === "no" && d.commissionAmount > 0)
        return false;
      if (filters.r1Status && d.r1Status !== filters.r1Status) return false;
      if (filters.r2Status && d.r2Status !== filters.r2Status) return false;
      return true;
    });

    const hasClientFilters = Object.entries(filters).some(([k, v]) => {
      if (k === "dateFrom" || k === "dateTo") return false;
      if (k === "status") return v && v !== "all";
      return v && v !== "";
    });

    if (!hasClientFilters) {
      // No client-side filters active — use server stats directly
      // (GST breakdown is computed from the same date-filtered deals)
      setStats(
        allDealsStats
          ? { ...allDealsStats, gst: summarizeGst(rawDeals) }
          : allDealsStats,
      );
      return;
    }

    // Recompute stats from filtered deals
    const soldDeals = filtered.filter((d) => d.dealStatus !== "unsold");
    const totalRevenue = soldDeals.reduce(
      (s, d) => s + (d.effectiveSellingPrice || 0),
      0,
    );
    const totalBuyingCost = filtered.reduce((s, d) => s + d.buyingPrice, 0);
    const totalCashback = filtered.reduce((s, d) => s + (d.cashback || 0), 0);
    const totalCharges = filtered.reduce((s, d) => s + (d.charges || 0), 0);
    const totalCommission = filtered.reduce(
      (s, d) => s + (d.commissionAmount || 0),
      0,
    );
    const totalGrossProfit = soldDeals.reduce(
      (s, d) => s + (d.grossProfit || 0),
      0,
    );
    const totalNetProfit = soldDeals.reduce(
      (s, d) => s + (d.netProfit || 0),
      0,
    );
    const totalPending = filtered.reduce(
      (s, d) => s + (d.paymentPending || 0),
      0,
    );
    const totalExcess = filtered.reduce(
      (s, d) => s + (d.paymentExcess || 0),
      0,
    );

    const cashbackByCard = {};
    filtered.forEach((d) => {
      if (d.creditCard && d.cashback) {
        cashbackByCard[d.creditCard] =
          (cashbackByCard[d.creditCard] || 0) + d.cashback;
      }
    });

    const profitByMonth = {};
    soldDeals.forEach((d) => {
      const date = new Date(d.purchaseDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!profitByMonth[key])
        profitByMonth[key] = { gross: 0, net: 0, revenue: 0, count: 0 };
      profitByMonth[key].gross += d.grossProfit || 0;
      profitByMonth[key].net += d.netProfit || 0;
      profitByMonth[key].revenue += d.effectiveSellingPrice || 0;
      profitByMonth[key].count += 1;
    });

    const profitByProduct = {};
    soldDeals.forEach((d) => {
      if (!profitByProduct[d.product]) {
        profitByProduct[d.product] = { gross: 0, net: 0, count: 0 };
      }
      profitByProduct[d.product].gross += d.grossProfit || 0;
      profitByProduct[d.product].net += d.netProfit || 0;
      profitByProduct[d.product].count += 1;
    });

    const statusCounts = {
      unsold: filtered.filter((d) => d.dealStatus === "unsold").length,
      pending_payment: filtered.filter(
        (d) => d.dealStatus === "pending_payment",
      ).length,
      complete: filtered.filter((d) => d.dealStatus === "complete").length,
      excess_payment: filtered.filter((d) => d.dealStatus === "excess_payment")
        .length,
    };

    setStats({
      summary: {
        totalDeals: filtered.length,
        totalBuyingCost,
        totalRevenue,
        totalCashback,
        totalCharges,
        totalCommission,
        totalGrossProfit,
        totalNetProfit,
        totalPending,
        totalExcess,
        statusCounts,
      },
      cashbackByCard,
      profitByMonth,
      profitByProduct,
      gst: summarizeGst(filtered),
    });
  }, [rawDeals, allDealsStats, filters]);

  // ── Chart data builders ──────────────────────────────────────────────────
  const profitByMonthChartData = stats
    ? (() => {
        const entries = Object.entries(stats.profitByMonth || {}).sort(
          ([a], [b]) => a.localeCompare(b),
        );
        const labels = entries.map(([m]) => m.slice(5) + "/" + m.slice(2, 4));
        return {
          labels,
          datasets: [
            {
              label: "Gross Profit",
              data: entries.map(([, v]) => v.gross),
              backgroundColor: "rgba(255, 212, 75, 0.7)", // Soft Amber
              borderWidth: 1,
            },
            {
              label: "Net Profit",
              data: entries.map(([, v]) => v.net),
              backgroundColor: "rgba(75, 192, 192, 0.7)",
              borderWidth: 1,
            },
          ],
        };
      })()
    : null;

  const profitByProductChartData = stats
    ? (() => {
        const entries = Object.entries(stats.profitByProduct || {}).sort(
          ([, a], [, b]) => b.net - a.net,
        );
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
      })()
    : null;

  const statusChartData = stats
    ? {
        labels: ["Complete", "Payment Pending", "Unsold", "Excess Payment"],
        datasets: [
          {
            data: [
              stats.summary.statusCounts.complete,
              stats.summary.statusCounts.pending_payment,
              stats.summary.statusCounts.unsold,
              stats.summary.statusCounts.excess_payment || 0,
            ],
            backgroundColor: [
              "rgba(16,  215, 119, 0.7)",
              "rgba(245, 158, 11,  0.7)",
              "rgba(148, 163, 184, 0.7)",
              "rgba(244, 63,  94,  0.7)",
            ],
            borderWidth: 1,
          },
        ],
      }
    : null;

  const cashbackByCardChartData = stats
    ? (() => {
        const entries = Object.entries(stats.cashbackByCard || {});
        const colors = getColors(entries.length);
        return {
          labels: entries.map(([card]) => card),
          datasets: [
            {
              label: "Cashback (₹)",
              data: entries.map(([, amt]) => amt),
              backgroundColor: colors,
              borderWidth: 1,
            },
          ],
        };
      })()
    : null;

  const barOptions = {
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) =>
            ` ${ctx.dataset.label}: ₹${Number(ctx.parsed.y).toLocaleString("en-IN")}`,
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
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            ` Net Profit: ₹${Number(ctx.parsed.x).toLocaleString("en-IN")}`,
        },
      },
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
      legend: {
        position: "bottom",
        labels: { font: { size: 11 }, padding: 12 },
      },
    },
  };

  const cashbackBarOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            ` Cashback: ₹${Number(ctx.parsed.y).toLocaleString("en-IN")}`,
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

  const hasChartData =
    profitByMonthChartData?.labels?.length > 0 ||
    profitByProductChartData?.labels?.length > 0;

  return (
    <div>
      {loading && <FullScreenSpinner message="Loading analytics…" />}

      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {showGstFiling && (
        <GstFilingModal
          onClose={() => setShowGstFiling(false)}
          onDone={(msg) => {
            setToast({ message: msg, type: "success" });
            setTimeout(() => setToast(null), 3500);
            fetchStats();
            fetchDeals();
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-sm text-slate-400">
            Business analytics at a glance
          </p>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <PhoneFilters
        filters={filters}
        onChange={setFilters}
        showSearch={false}
        compact={true}
      />

      {/* Month / Year quick-select strip */}
      <div className="bg-white border border-slate-200 rounded-xl mb-4 overflow-hidden">
        {/* Year row */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
          <button
            onClick={() => setStripYear((y) => y - 1)}
            className="text-slate-400 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors text-sm font-bold"
          >
            ‹
          </button>
          <span className="text-sm font-bold text-slate-700 tracking-wide">
            {stripYear}
            {stripYear === new Date().getFullYear() && (
              <span className="ml-2 text-xs text-slate-500 font-normal">
                current year
              </span>
            )}
          </span>
          <button
            onClick={() => setStripYear((y) => y + 1)}
            className="text-slate-400 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors text-sm font-bold"
          >
            ›
          </button>
        </div>
        {/* Month pills */}
        <div className="grid grid-cols-6 md:grid-cols-12 gap-1 p-2">
          {MONTH_NAMES.map((name, idx) => {
            const key = `${stripYear}-${idx + 1}`;
            const isSelected = selectedMonthKey === key;
            const isCurrentMonth =
              stripYear === new Date().getFullYear() &&
              idx === new Date().getMonth();
            return (
              <button
                key={key}
                onClick={() => selectMonth(stripYear, idx + 1)}
                className={`px-1 py-2 rounded-lg text-xs font-semibold transition-colors text-center
                  ${
                    isSelected
                      ? "bg-slate-300 text-white shadow-sm"
                      : isCurrentMonth
                        ? "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-indigo-100"
                        : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                {name}
              </button>
            );
          })}
        </div>
        {/* Active month / clear */}
        {(filters.dateFrom || filters.dateTo) && (
          <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {filters.dateFrom || "…"} → {filters.dateTo || "…"}
            </span>
            <button
              onClick={clearMonthFilter}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
            >
              Clear date range
            </button>
          </div>
        )}
      </div>

      {/* Quick capsule filters: collapsible */}
      <div className="mb-5">
        {/* Filter header */}
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-slate-700 shrink-0">
              Filters
            </span>

            {/* Selected filters shown when collapsed */}
            {!filtersOpen && (
              <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto hide-scrollbar">
                <Capsule
                  active={true}
                  activeColor={
                    filters.status === "all"
                      ? "slate"
                      : filters.status === "unsold"
                        ? "gray"
                        : filters.status === "pending_payment"
                          ? "amber"
                          : filters.status === "complete"
                            ? "emerald"
                            : "rose"
                  }
                >
                  {filters.status === "all"
                    ? "All Status"
                    : filters.status === "unsold"
                      ? "Unsold"
                      : filters.status === "pending_payment"
                        ? "Payment Pending"
                        : filters.status === "complete"
                          ? "Complete"
                          : "Excess Payment"}
                </Capsule>

                <Capsule
                  active={true}
                  activeColor={
                    filters.hasCashback === ""
                      ? "slate"
                      : filters.hasCashback === "yes"
                        ? "emerald"
                        : filters.hasCashback === "expected"
                          ? "amber"
                          : "gray"
                  }
                >
                  {filters.hasCashback === ""
                    ? "All"
                    : filters.hasCashback === "yes"
                      ? "Cashback Received"
                      : filters.hasCashback === "expected"
                        ? "Cashback Pending"
                        : "No Cashback"}
                </Capsule>

                <Capsule
                  active={true}
                  activeColor={
                    filters.withGST === ""
                      ? "slate"
                      : filters.withGST === "true"
                        ? "indigo"
                        : "gray"
                  }
                >
                  {filters.withGST === ""
                    ? "All"
                    : filters.withGST === "true"
                      ? "With GST"
                      : "Without GST"}
                </Capsule>

                <Capsule
                  active={true}
                  activeColor={
                    filters.r1Status === ""
                      ? "slate"
                      : filters.r1Status === "filed"
                        ? "emerald"
                        : filters.r1Status === "pending"
                          ? "indigo"
                          : "gray"
                  }
                >
                  {filters.r1Status === ""
                    ? "All R1"
                    : filters.r1Status === "filed"
                      ? "R1 Filed"
                      : filters.r1Status === "pending"
                        ? "R1 Pending"
                        : "N/A"}
                </Capsule>

                <Capsule
                  active={true}
                  activeColor={
                    filters.r2Status === ""
                      ? "slate"
                      : filters.r2Status === "filed"
                        ? "emerald"
                        : filters.r2Status === "pending"
                          ? "indigo"
                          : "gray"
                  }
                >
                  {filters.r2Status === ""
                    ? "All R3B"
                    : filters.r2Status === "filed"
                      ? "R3B Filed"
                      : filters.r2Status === "pending"
                        ? "R3B Pending"
                        : "N/A"}
                </Capsule>
              </div>
            )}
          </div>

          <span className="text-slate-400 text-xs shrink-0 ml-3">
            {filtersOpen ? "▲" : "▼"}
          </span>
        </button>

        {/* Expanded filters */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            filtersOpen
              ? "max-h-96 opacity-100 translate-y-0 mt-3"
              : "max-h-0 opacity-0 -translate-y-2 mt-0"
          }`}
        >
          <div className="space-y-2">
            {/* Status */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
              {[
                { key: "all", label: "All Status", color: "slate" },
                { key: "unsold", label: "Unsold", color: "gray" },
                {
                  key: "pending_payment",
                  label: "Payment Pending",
                  color: "amber",
                },
                { key: "complete", label: "Complete", color: "emerald" },
                {
                  key: "excess_payment",
                  label: "Excess Payment",
                  color: "rose",
                },
              ].map((c) => (
                <Capsule
                  key={c.key}
                  active={filters.status === c.key}
                  activeColor={c.color}
                  onClick={() => setFilters((f) => ({ ...f, status: c.key }))}
                >
                  {c.label}
                </Capsule>
              ))}
            </div>

            {/* Cashback */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
              {[
                { key: "", label: "All", color: "slate" },
                {
                  key: "yes",
                  label: "Cashback Received",
                  color: "emerald",
                },
                {
                  key: "expected",
                  label: "Cashback Pending",
                  color: "amber",
                },
                { key: "no", label: "No Cashback", color: "gray" },
              ].map((c) => (
                <Capsule
                  key={c.key || "all"}
                  active={filters.hasCashback === c.key}
                  activeColor={c.color}
                  onClick={() =>
                    setFilters((f) => ({ ...f, hasCashback: c.key }))
                  }
                >
                  {c.label}
                </Capsule>
              ))}
            </div>

            {/* GST */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
              {[
                { key: "", label: "All", color: "slate" },
                { key: "true", label: "With GST", color: "indigo" },
                { key: "false", label: "Without GST", color: "gray" },
              ].map((c) => (
                <Capsule
                  key={c.key || "all-gst"}
                  active={filters.withGST === c.key}
                  activeColor={c.color}
                  onClick={() => setFilters((f) => ({ ...f, withGST: c.key }))}
                >
                  {c.label}
                </Capsule>
              ))}
            </div>

            {/* R1 */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
              {[
                { key: "", label: "All R1", color: "slate" },
                { key: "filed", label: "R1 Filed", color: "emerald" },
                { key: "pending", label: "R1 Pending", color: "indigo" },
                { key: "not_applicable", label: "N/A", color: "gray" },
              ].map((c) => (
                <Capsule
                  key={c.key || "all-r1"}
                  active={filters.r1Status === c.key}
                  activeColor={c.color}
                  onClick={() => setFilters((f) => ({ ...f, r1Status: c.key }))}
                >
                  {c.label}
                </Capsule>
              ))}
            </div>

            {/* R3B (stored as r2Filed) */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
              {[
                { key: "", label: "All R3B", color: "slate" },
                { key: "filed", label: "R3B Filed", color: "emerald" },
                { key: "pending", label: "R3B Pending", color: "indigo" },
                { key: "not_applicable", label: "N/A", color: "gray" },
              ].map((c) => (
                <Capsule
                  key={c.key || "all-r2"}
                  active={filters.r2Status === c.key}
                  activeColor={c.color}
                  onClick={() => setFilters((f) => ({ ...f, r2Status: c.key }))}
                >
                  {c.label}
                </Capsule>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="text-center py-24 text-rose-400">{error}</div>
      ) : !stats && !loading ? null : (
        stats && (
          <div className="space-y-5 animate-enter">
            {/* ── Summary cards ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card
                label="Total Deals"
                value={stats.summary.totalDeals}
                accent="slate"
              />
              <Card
                label="Total Purchase"
                value={INR(stats.summary.totalBuyingCost)}
                accent="indigo"
              />
              <Card
                label="Total Sales"
                value={INR(stats.summary.totalRevenue)}
                accent="indigo"
              />
              <Card
                label="Pending Collect"
                value={INR(stats.summary.totalPending)}
                accent="amber"
                sub={
                  stats.summary.statusCounts.pending_payment + " deals pending"
                }
              />
              {stats.summary.totalExcess > 0 && (
                <Card
                  label="Excess Received"
                  value={INR(stats.summary.totalExcess)}
                  accent="rose"
                  sub={
                    (stats.summary.statusCounts.excess_payment || 0) +
                    " deal(s) overpaid"
                  }
                />
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card
                label="Gross Profit"
                value={INR(stats.summary.totalGrossProfit)}
                accent="emerald"
              />
              <Card
                label="Net Profit"
                value={INR(stats.summary.totalNetProfit)}
                accent="emerald"
                sub="After commissions"
              />
              <Card
                label="Total Cashback"
                value={INR(stats.summary.totalCashback)}
                accent="indigo"
                sub="Across all cards"
              />
              <Card
                label="Total Commission"
                value={INR(stats.summary.totalCommission)}
                accent="rose"
              />
            </div>

            {/* ── GST: actually paid vs ideal 18% ─────────────────────── */}
            {stats.gst && stats.gst.gstDealCount > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
                    GST
                  </h3>
                  <button
                    onClick={() => setShowGstFiling(true)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Manage R1 / R3B filing →
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card
                    label="GST Paid (Actual)"
                    value={INR(stats.gst.actualPaid)}
                    accent="indigo"
                    sub={
                      stats.gst.effectiveRate !== null
                        ? `${stats.gst.effectiveRate.toFixed(1)}% of real margin`
                        : "No sold GST deals"
                    }
                  />
                  <Card
                    label="GST Ideal"
                    value={INR(stats.gst.ideal)}
                    accent="slate"
                    sub={`${GST_METHOD_LABEL} · ${INR(stats.gst.taxableMargin)} margin`}
                  />
                  <Card
                    label={
                      stats.gst.gap >= 0
                        ? "GST Saved vs Ideal"
                        : "GST Paid Above Ideal"
                    }
                    value={INR(Math.abs(stats.gst.gap))}
                    accent={stats.gst.gap > 0 ? "amber" : "emerald"}
                    sub="Ideal − Actual"
                  />
                  <Card
                    label="Returns Pending"
                    value={`R1: ${stats.gst.r1Pending} · R3B: ${stats.gst.r3bPending}`}
                    accent={
                      stats.gst.r1Pending + stats.gst.r3bPending > 0
                        ? "rose"
                        : "emerald"
                    }
                    sub={`${stats.gst.r1Filed} R1 · ${stats.gst.r3bFiled} R3B filed`}
                  />
                </div>

                <p className="text-xs text-slate-400">
                  Ideal = {GST_METHOD_LABEL}, where margin = real selling price −
                  buying price, on sold GST deals. Actual = the GST charge saved
                  on each deal.
                </p>

                {stats.gst.noGstRecordedCount > 0 && (
                  <p className="text-xs text-amber-600">
                    {stats.gst.noGstRecordedCount} sold GST deal
                    {stats.gst.noGstRecordedCount !== 1 ? "s have" : " has"} no
                    GST charge recorded — they count as ₹0 paid.
                  </p>
                )}

                {stats.gst.rows.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <button
                      onClick={() => setGstTableOpen((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-sm font-semibold text-slate-700">
                        GST by deal ({stats.gst.rows.length})
                      </span>
                      <span className="text-slate-400 text-xs">
                        {gstTableOpen ? "▲" : "▼"}
                      </span>
                    </button>
                    {gstTableOpen && (
                      <div className="overflow-x-auto border-t border-slate-100">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 text-slate-400 uppercase tracking-wide">
                            <tr>
                              <th className="text-left font-medium px-3 py-2">
                                Deal
                              </th>
                              <th className="text-right font-medium px-3 py-2">
                                Margin
                              </th>
                              <th className="text-right font-medium px-3 py-2">
                                Paid
                              </th>
                              <th className="text-right font-medium px-3 py-2">
                                Ideal
                              </th>
                              <th className="text-right font-medium px-3 py-2">
                                Diff
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {stats.gst.rows.map((r) => (
                              <tr key={r.id}>
                                <td className="px-3 py-2 text-slate-700">
                                  <span className="font-medium">
                                    {r.product}
                                  </span>
                                  {r.soldTo && (
                                    <span className="text-slate-400">
                                      {" "}
                                      · {r.soldTo}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right text-slate-600">
                                  {INR(r.margin)}
                                </td>
                                <td className="px-3 py-2 text-right text-slate-600">
                                  {INR(r.actual)}
                                </td>
                                <td className="px-3 py-2 text-right text-slate-600">
                                  {INR(r.ideal)}
                                </td>
                                <td
                                  className={`px-3 py-2 text-right font-semibold ${
                                    r.gap > 0
                                      ? "text-amber-600"
                                      : r.gap < 0
                                        ? "text-rose-500"
                                        : "text-slate-400"
                                  }`}
                                >
                                  {INR(r.gap)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Charts ─────────────────────────────────────────────── */}
            {profitByMonthChartData?.labels?.length > 0 && (
              <Section title="Profit by Month (Gross vs Net)">
                <Bar data={profitByMonthChartData} options={barOptions} />
              </Section>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {profitByProductChartData?.labels?.length > 0 && (
                <Section title="Net Profit by Product" height="h-64">
                  <Bar
                    data={profitByProductChartData}
                    options={horizontalBarOptions}
                  />
                </Section>
              )}
              {statusChartData && stats.summary.totalDeals > 0 && (
                <Section title="Deal Status" height="h-64">
                  <Doughnut data={statusChartData} options={doughnutOptions} />
                </Section>
              )}
            </div>

            {cashbackByCardChartData?.labels?.length > 0 && (
              <Section title="Cashback by Card" height="h-56">
                <Bar
                  data={cashbackByCardChartData}
                  options={cashbackBarOptions}
                />
              </Section>
            )}

            {!hasChartData && (
              <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
                <p className="text-4xl mb-3">📊</p>
                <p className="font-medium text-slate-500">
                  No completed deals for this filter
                </p>
                <p className="text-sm mt-1">
                  Charts will appear once you have sold deals matching the
                  current filters
                </p>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};

export default PhoneDashboard;
