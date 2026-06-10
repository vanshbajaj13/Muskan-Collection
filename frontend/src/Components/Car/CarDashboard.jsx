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
  "rgba(59,130,246,0.7)",   // blue
  "rgba(16,185,129,0.7)",   // green
  "rgba(245,158,11,0.7)",   // amber
  "rgba(239,68,68,0.7)",    // red
  "rgba(139,92,246,0.7)",   // purple
  "rgba(236,72,153,0.7)",   // pink
  "rgba(20,184,166,0.7)",   // teal
  "rgba(249,115,22,0.7)",   // orange
];
const getColors = (n) => Array.from({ length: n }, (_, i) => COLORS[i % COLORS.length]);

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

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const chartBase = { maintainAspectRatio: false };
  const yRupee = {
    ticks: {
      callback: (v) => {
        if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
        return `₹${(v / 1000).toFixed(0)}k`;
      },
      font: { size: 12 },
    },
    grid: { color: "rgba(0,0,0,0.05)" },
  };

  const profitByMonthData = stats ? (() => {
    const entries = Object.entries(stats.profitByMonth || {}).sort(([a], [b]) => a.localeCompare(b));
    return {
      labels: entries.map(([m]) => m.slice(5) + "/" + m.slice(2, 4)),
      datasets: [
        {
          label: "सकल मुनाफा / Gross",
          data: entries.map(([, v]) => v.gross),
          backgroundColor: "rgba(245,158,11,0.7)",
          borderWidth: 1,
        },
        {
          label: "शुद्ध मुनाफा / Net",
          data: entries.map(([, v]) => v.net),
          backgroundColor: "rgba(16,185,129,0.7)",
          borderWidth: 1,
        },
      ],
    };
  })() : null;

  const partnerProfitData = stats ? (() => {
    const entries = Object.entries(stats.partnerProfit || {})
      .sort(([, a], [, b]) => b.profit - a.profit);
    if (!entries.length) return null;
    return {
      labels: entries.map(([name]) => name),
      datasets: [{
        label: "मुनाफा / Profit",
        data: entries.map(([, v]) => v.profit),
        backgroundColor: getColors(entries.length),
        borderWidth: 1,
      }],
    };
  })() : null;

  const makeData = stats ? (() => {
    const entries = Object.entries(stats.makeCount || {}).sort(([, a], [, b]) => b - a);
    if (!entries.length) return null;
    return {
      labels: entries.map(([k]) => k),
      datasets: [{
        data: entries.map(([, v]) => v),
        backgroundColor: getColors(entries.length),
        borderWidth: 1,
      }],
    };
  })() : null;

  const statusData = stats ? {
    labels: ["बिकी हुई / Sold", "स्टॉक में / Unsold"],
    datasets: [{
      data: [stats.summary.soldDeals, stats.summary.unsoldDeals],
      backgroundColor: ["rgba(16,185,129,0.7)", "rgba(245,158,11,0.7)"],
      borderWidth: 1,
    }],
  } : null;

  return (
    <div className="relative">
      {loading && <FullScreenSpinner message="लोड हो रहा है..." />}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-800">📊 डैशबोर्ड / Dashboard</h2>
          <p className="text-base text-gray-500">सभी डीलों का विश्लेषण</p>
        </div>
      </div>

      {/* Date range filter */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 mb-5">
        <p className="text-base font-bold text-gray-600 mb-3">📅 तारीख के अनुसार / Filter by Date</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-bold text-gray-500 mb-1 block">शुरू / From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-blue-500"
              style={{ fontSize: "16px" }} />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-500 mb-1 block">अंत / To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-blue-500"
              style={{ fontSize: "16px" }} />
          </div>
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="mt-2 text-sm text-red-400 hover:text-red-600 font-medium">
            ✕ फ़िल्टर हटाएं / Clear
          </button>
        )}
      </div>

      {stats && (
        <div className="space-y-5">

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="कुल डील" value={stats.summary.totalDeals} icon="🚗" color="blue" />
            <StatCard label="बिकी हुई" value={stats.summary.soldDeals} icon="✅" color="green" />
            <StatCard label="स्टॉक में" value={stats.summary.unsoldDeals} icon="⏳" color="amber" />
            <StatCard label="पूंजी अटकी" value={INR(stats.summary.capitalLocked)} icon="🔒" color="amber"
              sub={`${stats.summary.unsoldDeals} गाड़ी में`} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="कुल खरीद" value={INR(stats.summary.totalBuyingCost)} icon="💸" color="slate" />
            <StatCard label="कुल खर्च" value={INR(stats.summary.totalExpenses)} icon="🔧" color="slate" />
            <StatCard label="कुल आमदनी" value={INR(stats.summary.totalRevenue)} icon="📈" color="blue" />
            <StatCard label="कुल कमीशन" value={INR(stats.summary.totalCommission)} icon="💼" color="purple" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <StatCard label="सकल मुनाफा / Gross Profit" value={INR(stats.summary.totalGrossProfit)}
              icon={stats.summary.totalGrossProfit >= 0 ? "▲" : "▼"}
              color={stats.summary.totalGrossProfit >= 0 ? "green" : "red"}
              sub="बिक्री − लागत" />
            <StatCard label="शुद्ध मुनाफा / Net Profit" value={INR(stats.summary.totalNetProfit)}
              icon={stats.summary.totalNetProfit >= 0 ? "✅" : "❌"}
              color={stats.summary.totalNetProfit >= 0 ? "green" : "red"}
              sub="सकल − कमीशन" />
          </div>

          {/* Monthly profit chart */}
          {profitByMonthData?.labels?.length > 0 && (
            <ChartBox title="महीनेवार मुनाफा / Profit by Month">
              <Bar data={profitByMonthData} options={{
                ...chartBase,
                plugins: {
                  tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${INR(c.parsed.y)}` } },
                },
                scales: { y: yRupee, x: { ticks: { font: { size: 12 } } } },
              }} />
            </ChartBox>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Deal status donut */}
            {statusData && stats.summary.totalDeals > 0 && (
              <ChartBox title="डील की स्थिति / Deal Status" height="h-56">
                <Doughnut data={statusData} options={{
                  ...chartBase,
                  plugins: {
                    legend: { position: "bottom", labels: { font: { size: 14 }, padding: 14 } },
                    tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.parsed} गाड़ी` } },
                  },
                }} />
              </ChartBox>
            )}

            {/* Make breakdown donut */}
            {makeData && (
              <ChartBox title="कंपनीवार गाड़ियाँ / Cars by Make" height="h-56">
                <Doughnut data={makeData} options={{
                  ...chartBase,
                  plugins: {
                    legend: { position: "bottom", labels: { font: { size: 14 }, padding: 14 } },
                    tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.parsed} गाड़ी` } },
                  },
                }} />
              </ChartBox>
            )}
          </div>

          {/* Partner profit bar */}
          {partnerProfitData && (
            <ChartBox title="हिस्सेदारवार मुनाफा / Profit by Partner">
              <Bar data={partnerProfitData} options={{
                ...chartBase,
                indexAxis: "y",
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: (c) => ` मुनाफा: ${INR(c.parsed.x)}` } },
                },
                scales: { x: yRupee, y: { ticks: { font: { size: 13 } } } },
              }} />
            </ChartBox>
          )}

          {/* Partner detail table */}
          {Object.keys(stats.partnerProfit || {}).length > 0 && (
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
              <h3 className="text-lg font-bold text-gray-700 mb-4">🤝 हिस्सेदारों की कमाई</h3>
              <div className="space-y-2">
                {Object.entries(stats.partnerProfit)
                  .sort(([, a], [, b]) => b.profit - a.profit)
                  .map(([name, data]) => (
                    <div key={name} className="flex justify-between items-center
                      px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
                      <div>
                        <span className="text-lg font-bold text-blue-800">{name}</span>
                        <span className="text-sm text-blue-500 ml-2">{data.deals} डील में</span>
                      </div>
                      <span className={`text-lg font-extrabold ${data.profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {data.profit >= 0 ? "▲ +" : "▼ "}₹{Math.abs(data.profit).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {stats.summary.totalDeals === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-gray-200">
              <p className="text-5xl mb-4">🚗</p>
              <p className="text-xl font-bold text-gray-500">अभी कोई डेटा नहीं</p>
              <p className="text-base text-gray-400 mt-2">डील जोड़ने के बाद यहाँ दिखेगा</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ChartBox = ({ title, children, height = "h-72" }) => (
  <div className="bg-white border-2 border-gray-200 rounded-2xl p-5">
    <h3 className="text-base font-bold text-gray-600 mb-4">{title}</h3>
    <div className={`${height} w-full`}>{children}</div>
  </div>
);

export default CarDashboard;