import React, { useState, useEffect, useCallback } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import { usePhone } from "./PhoneContext";
import PhoneFilters from "./PhoneFilters";
import { FullScreenSpinner } from "./PhoneUI";

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

// Dashboard filter keys (no search, no status tabs — those are in Deals)
const INITIAL_FILTERS = {
  dateFrom: "",
  dateTo: "",
  product: "",
  account: "",
  purchasedFrom: "",
  soldTo: "",
  creditCard: "",
  commissionTo: "",
  withGST: "",
  hasCashback: "",
  hasCommission: "",
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
      if (filters.hasCashback === "no" && d.cashback > 0) return false;
      if (filters.hasCommission === "yes" && !(d.commissionAmount > 0))
        return false;
      if (filters.hasCommission === "no" && d.commissionAmount > 0)
        return false;
      return true;
    });

    const hasClientFilters = Object.entries(filters).some(([k, v]) => {
      if (k === "dateFrom" || k === "dateTo") return false;
      return v && v !== "";
    });

    if (!hasClientFilters) {
      // No client-side filters active — use server stats directly
      setStats(allDealsStats);
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
        statusCounts,
      },
      cashbackByCard,
      profitByMonth,
      profitByProduct,
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
        labels: ["Complete", "Payment Pending", "Unsold"],
        datasets: [
          {
            data: [
              stats.summary.statusCounts.complete,
              stats.summary.statusCounts.pending_payment,
              stats.summary.statusCounts.unsold,
            ],
            backgroundColor: [
              "rgba(16,  215, 119, 0.7)",
              "rgba(245, 158, 11,  0.7)",
              "rgba(148, 163, 184, 0.7)",
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
