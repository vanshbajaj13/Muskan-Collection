import React, { useState, useEffect, useCallback } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import { useCar } from "./CarContext";
import { StatCard, FullScreenSpinner } from "./CarUI";

const INR = (n) => {
  const abs = Math.abs(Number(n || 0));
  if (abs >= 100000) return `₹${(Number(n) / 100000).toFixed(2)}L`;
  return `₹${Number(n).toLocaleString("en-IN")}`;
};

const COLORS = [
  "rgba(79,70,229,0.75)",
  "rgba(16,185,129,0.75)",
  "rgba(245,158,11,0.75)",
  "rgba(239,68,68,0.75)",
  "rgba(139,92,246,0.75)",
  "rgba(20,184,166,0.75)",
  "rgba(249,115,22,0.75)",
  "rgba(236,72,153,0.75)",
];
const getColors = (n) =>
  Array.from({ length: n }, (_, i) => COLORS[i % COLORS.length]);

const CarDashboard = () => {
  const { getStats } = useCar();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.from = new Date(dateFrom).getTime();
      if (dateTo) params.to = new Date(dateTo).setHours(23, 59, 59, 999);
      const data = await getStats(params);
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [getStats, dateFrom, dateTo]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const chartBase = { maintainAspectRatio: false };
  const gridColor = "rgba(0,0,0,0.04)";
  const yRupee = {
    ticks: {
      callback: (v) => {
        if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
        return `₹${(v / 1000).toFixed(0)}k`;
      },
      font: { size: 11 },
      color: "#94a3b8",
    },
    grid: { color: gridColor },
    border: { dash: [3, 3] },
  };

  const profitByMonthData = stats
    ? (() => {
        const entries = Object.entries(stats.profitByMonth || {}).sort(
          ([a], [b]) => a.localeCompare(b),
        );
        return {
          labels: entries.map(([m]) => m.slice(5) + "/" + m.slice(2, 4)),
          datasets: [
            {
              label: "Gross Profit",
              data: entries.map(([, v]) => v.gross),
              backgroundColor: "rgba(245,158,11,0.7)",
              borderRadius: 4,
              borderWidth: 0,
            },
            {
              label: "Net Profit",
              data: entries.map(([, v]) => v.net),
              backgroundColor: "rgba(79,70,229,0.7)",
              borderRadius: 4,
              borderWidth: 0,
            },
          ],
        };
      })()
    : null;

  const partnerProfitData = stats
    ? (() => {
        const entries = Object.entries(stats.partnerProfit || {}).sort(
          ([, a], [, b]) => b.profit - a.profit,
        );
        if (!entries.length) return null;
        return {
          labels: entries.map(([name]) => name),
          datasets: [
            {
              label: "Profit",
              data: entries.map(([, v]) => v.profit),
              backgroundColor: getColors(entries.length),
              borderRadius: 4,
              borderWidth: 0,
            },
          ],
        };
      })()
    : null;

  const makeData = stats
    ? (() => {
        const entries = Object.entries(stats.makeCount || {}).sort(
          ([, a], [, b]) => b - a,
        );
        if (!entries.length) return null;
        return {
          labels: entries.map(([k]) => k),
          datasets: [
            {
              data: entries.map(([, v]) => v),
              backgroundColor: getColors(entries.length),
              borderWidth: 0,
            },
          ],
        };
      })()
    : null;

  const statusData = stats
    ? {
        labels: ["Sold", "In Stock"],
        datasets: [
          {
            data: [stats.summary.soldDeals, stats.summary.unsoldDeals],
            backgroundColor: ["rgba(16,185,129,0.75)", "rgba(245,158,11,0.75)"],
            borderWidth: 0,
          },
        ],
      }
    : null;

  const legendOpts = {
    position: "bottom",
    labels: { font: { size: 12 }, padding: 12, color: "#64748b" },
  };

  return (
    <div className="relative">
      {loading && <FullScreenSpinner message="Loading…" />}

      {/* Header */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Performance overview across all deals
        </p>
      </div>

      {/* Date filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Filter by Date
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ fontSize: "16px" }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ fontSize: "16px" }}
            />
          </div>
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="mt-2.5 text-xs text-red-400 hover:text-red-600 font-semibold"
          >
            Clear filter
          </button>
        )}
      </div>

      {stats && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total Deals"
              value={stats.summary.totalDeals}
              color="blue"
            />
            <StatCard
              label="Sold"
              value={stats.summary.soldDeals}
              color="green"
            />
            <StatCard
              label="In Stock"
              value={stats.summary.unsoldDeals}
              color="amber"
            />
            <StatCard
              label="Capital Locked"
              value={INR(stats.summary.capitalLocked)}
              color="amber"
              sub={`${stats.summary.unsoldDeals} vehicle${stats.summary.unsoldDeals !== 1 ? "s" : ""}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Buying Cost"
              value={INR(stats.summary.totalBuyingCost)}
              color="slate"
            />
            <StatCard
              label="Expenses"
              value={INR(stats.summary.totalExpenses)}
              color="slate"
            />
            <StatCard
              label="Revenue"
              value={INR(stats.summary.totalRevenue)}
              color="blue"
            />
            <StatCard
              label="Commissions"
              value={INR(stats.summary.totalCommission)}
              color="purple"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Gross Profit"
              value={INR(stats.summary.totalGrossProfit)}
              color={stats.summary.totalGrossProfit >= 0 ? "green" : "red"}
              sub="Revenue − Cost"
            />
            <StatCard
              label="Net Profit"
              value={INR(stats.summary.totalNetProfit)}
              color={stats.summary.totalNetProfit >= 0 ? "green" : "red"}
              sub="Gross − Commission"
            />
          </div>

          {/* Monthly chart */}
          {profitByMonthData?.labels?.length > 0 && (
            <ChartBox title="Profit by Month">
              <Bar
                data={profitByMonthData}
                options={{
                  ...chartBase,
                  plugins: {
                    legend: {
                      labels: { font: { size: 12 }, color: "#64748b" },
                    },
                    tooltip: {
                      callbacks: {
                        label: (c) => ` ${c.dataset.label}: ${INR(c.parsed.y)}`,
                      },
                    },
                  },
                  scales: {
                    y: yRupee,
                    x: {
                      ticks: { font: { size: 11 }, color: "#94a3b8" },
                      grid: { color: gridColor },
                    },
                  },
                }}
              />
            </ChartBox>
          )}

          <div className="grid grid-cols-1 gap-4">
            {/* Status donut */}
            {statusData && stats.summary.totalDeals > 0 && (
              <ChartBox title="Deal Status" height="h-52">
                <Doughnut
                  data={statusData}
                  options={{
                    ...chartBase,
                    plugins: {
                      legend: legendOpts,
                      tooltip: {
                        callbacks: {
                          label: (c) =>
                            ` ${c.label}: ${c.parsed} vehicle${c.parsed !== 1 ? "s" : ""}`,
                        },
                      },
                    },
                  }}
                />
              </ChartBox>
            )}

            {/* Make donut */}
            {makeData && (
              <ChartBox title="Cars by Make" height="h-52">
                <Doughnut
                  data={makeData}
                  options={{
                    ...chartBase,
                    plugins: {
                      legend: legendOpts,
                      tooltip: {
                        callbacks: {
                          label: (c) =>
                            ` ${c.label}: ${c.parsed} vehicle${c.parsed !== 1 ? "s" : ""}`,
                        },
                      },
                    },
                  }}
                />
              </ChartBox>
            )}
          </div>

          {/* Partner bar */}
          {partnerProfitData && (
            <ChartBox title="Profit by Partner">
              <Bar
                data={partnerProfitData}
                options={{
                  ...chartBase,
                  indexAxis: "y",
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (c) => ` Profit: ${INR(c.parsed.x)}`,
                      },
                    },
                  },
                  scales: {
                    x: yRupee,
                    y: {
                      ticks: { font: { size: 12 }, color: "#64748b" },
                      grid: { color: gridColor },
                    },
                  },
                }}
              />
            </ChartBox>
          )}

          {/* Partner detail table */}
          {Object.keys(stats.partnerProfit || {}).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-slate-700 mb-3">
                Partner Earnings
              </h3>
              <div className="space-y-2">
                {Object.entries(stats.partnerProfit)
                  .sort(([, a], [, b]) => b.profit - a.profit)
                  .map(([name, data]) => (
                    <div
                      key={name}
                      className="flex justify-between items-center
                      px-3 py-2.5 bg-indigo-50 rounded-lg border border-indigo-100"
                    >
                      <div>
                        <span className="text-sm font-bold text-indigo-800">
                          {name}
                        </span>
                        <span className="text-xs text-indigo-400 ml-2">
                          {data.deals} deal{data.deals !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-extrabold ${data.profit >= 0 ? "text-green-600" : "text-red-500"}`}
                      >
                        {data.profit >= 0 ? "+" : "−"}₹
                        {Math.abs(data.profit).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {stats.summary.totalDeals === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <p className="text-3xl mb-3">🚗</p>
              <p className="text-base font-semibold text-slate-500">
                No data yet
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Add deals to see analytics here
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ChartBox = ({ title, children, height = "h-64" }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4">
    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
      {title}
    </h3>
    <div className={`${height} w-full`}>{children}</div>
  </div>
);

export default CarDashboard;
