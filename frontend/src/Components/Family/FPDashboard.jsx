import React, { useState, useMemo } from "react";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import { useFP, FREQ_LABELS } from "./FamilyPlannerContext";
import { SummaryCard, Badge, CHART_PALETTE, getColor } from "./FamilyPlannerUI";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function FPDashboard() {
  const { getMonthSummary, getForecast, INR, debts } = useFP();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const summary = useMemo(() => getMonthSummary(viewYear, viewMonth), [getMonthSummary, viewYear, viewMonth]);
  const forecast = useMemo(() => getForecast(viewYear, viewMonth, 6), [getForecast, viewYear, viewMonth]);

  // Yearly view — all 12 months
  const yearData = useMemo(() =>
    Array.from({ length: 12 }, (_, m) => {
      const s = getMonthSummary(viewYear, m);
      return { month: MONTHS[m], ...s };
    }),
    [getMonthSummary, viewYear]
  );

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Pie: expense breakdown by category
  const expCatMap = summary.expenseBreakdown.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const expPieData = {
    labels: Object.keys(expCatMap),
    datasets: [{ data: Object.values(expCatMap), backgroundColor: CHART_PALETTE.slice(0, Object.keys(expCatMap).length), borderWidth: 1 }],
  };

  // Pie: income breakdown by type
  const incTypeMap = summary.incomeBreakdown.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + i.amount;
    return acc;
  }, {});
  const incPieData = {
    labels: Object.keys(incTypeMap),
    datasets: [{ data: Object.values(incTypeMap), backgroundColor: CHART_PALETTE.slice(4, 4 + Object.keys(incTypeMap).length), borderWidth: 1 }],
  };

  // Forecast line chart
  const forecastChartData = {
    labels: forecast.map(f => f.label),
    datasets: [
      { label: "Income", data: forecast.map(f => f.totalIncome), borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.1)", fill: true, tension: 0.4 },
      { label: "Expenses", data: forecast.map(f => f.totalExpenses), borderColor: "#f43f5e", backgroundColor: "rgba(244,63,94,0.1)", fill: true, tension: 0.4 },
      { label: "Net", data: forecast.map(f => f.netCashFlow), borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,0.1)", fill: false, tension: 0.4, borderDash: [4, 4] },
    ],
  };

  // Yearly bar chart
  const yearChartData = {
    labels: yearData.map(d => d.month),
    datasets: [
      { label: "Income", data: yearData.map(d => d.totalIncome), backgroundColor: "rgba(16,185,129,0.7)", borderRadius: 4 },
      { label: "Expenses", data: yearData.map(d => d.totalExpenses), backgroundColor: "rgba(244,63,94,0.7)", borderRadius: 4 },
    ],
  };

  // Outstanding debts summary
  const totalBorrowed = debts.filter(d => !d.isSettled && d.type === "borrowed")
    .reduce((s, d) => s + (d.outstanding || (d.principalAmount - (d.repayments || []).reduce((a, r) => a + r.amount, 0))), 0);
  const totalLent = debts.filter(d => !d.isSettled && d.type === "lent")
    .reduce((s, d) => s + (d.outstanding || (d.principalAmount - (d.repayments || []).reduce((a, r) => a + r.amount, 0))), 0);

  const chartOpts = { maintainAspectRatio: false, plugins: { legend: { display: false } } };
  const pieLegend = { maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { font: { size: 11 }, padding: 8 } } } };

  return (
    <div className="space-y-6">
      {/* ── Month selector ── */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-5 py-4">
        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">‹</button>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-800">{MONTHS[viewMonth]} {viewYear}</p>
          <p className="text-xs text-slate-400">Monthly Summary</p>
        </div>
        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">›</button>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total Income" value={INR(summary.totalIncome)} icon="💰" color="green"
          sub={`${summary.incomeBreakdown.length} source${summary.incomeBreakdown.length !== 1 ? "s" : ""}`} />
        <SummaryCard label="Total Expenses" value={INR(summary.totalExpenses)} icon="💸" color="red"
          sub={`${summary.expenseBreakdown.length} item${summary.expenseBreakdown.length !== 1 ? "s" : ""}`} />
        <SummaryCard label="Net Cash Flow" value={INR(summary.netCashFlow)} icon="📊" 
          color={summary.netCashFlow >= 0 ? "indigo" : "red"}
          sub={summary.savingsRate.toFixed(1) + "% savings rate"} />
        <SummaryCard label="Debt Outstanding" value={INR(totalBorrowed)} icon="🔴"
          color="amber" sub={`${INR(totalLent)} lent out`} />
      </div>

      {/* ── Income + Expense breakdown ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Income sources */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">Income Breakdown</h3>
          {summary.incomeBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-8">No income this month</p>
          ) : (
            <div className="space-y-2">
              {summary.incomeBreakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: getColor(i) }} />
                    <span className="text-slate-700 font-medium truncate max-w-[140px]">{item.label}</span>
                    <Badge color="green">{FREQ_LABELS[item.freq] || item.freq}</Badge>
                  </div>
                  <span className="font-bold text-emerald-700">{INR(item.amount)}</span>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between text-sm font-bold">
                <span className="text-slate-600">Total</span>
                <span className="text-emerald-700">{INR(summary.totalIncome)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">Expense Breakdown</h3>
          {summary.expenseBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-8">No expenses this month</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {summary.expenseBreakdown.sort((a,b) => b.amount - a.amount).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: getColor(i) }} />
                    <span className="text-slate-700 font-medium truncate max-w-[120px]">{item.label}</span>
                    <Badge color="slate">{item.category}</Badge>
                  </div>
                  <span className="font-bold text-rose-600">{INR(item.amount)}</span>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between text-sm font-bold">
                <span className="text-slate-600">Total</span>
                <span className="text-rose-600">{INR(summary.totalExpenses)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.keys(expCatMap).length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">Expenses by Category</h3>
            <div className="h-56"><Doughnut data={expPieData} options={pieLegend} /></div>
          </div>
        )}
        {Object.keys(incTypeMap).length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">Income by Type</h3>
            <div className="h-56"><Doughnut data={incPieData} options={pieLegend} /></div>
          </div>
        )}
      </div>

      {/* ── 6-month forecast ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">6-Month Cash Flow Forecast</h3>
        <div className="h-64">
          <Line data={forecastChartData} options={{
            maintainAspectRatio: false,
            plugins: { legend: { position: "top", labels: { font: { size: 11 } } } },
            scales: {
              y: { ticks: { callback: v => `₹${(v/1000).toFixed(0)}k`, font: { size: 11 } } },
              x: { ticks: { font: { size: 11 } } },
            },
          }} />
        </div>
      </div>

      {/* ── Yearly bar ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">{viewYear} Overview</h3>
          <div className="flex gap-2">
            <button onClick={() => setViewYear(y => y - 1)} className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200">‹ {viewYear - 1}</button>
            <button onClick={() => setViewYear(y => y + 1)} className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200">{viewYear + 1} ›</button>
          </div>
        </div>
        <div className="h-64">
          <Bar data={yearChartData} options={{
            ...chartOpts,
            plugins: { legend: { position: "top", labels: { font: { size: 11 } } } },
            scales: {
              y: { ticks: { callback: v => `₹${(v/1000).toFixed(0)}k`, font: { size: 11 } } },
            },
          }} />
        </div>
      </div>

      {/* ── Forecast table ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Month-wise Forecast</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-2 text-left">Month</th>
                <th className="px-4 py-2 text-right">Income</th>
                <th className="px-4 py-2 text-right">Expenses</th>
                <th className="px-4 py-2 text-right">Net</th>
                <th className="px-4 py-2 text-right">Savings %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {forecast.map((f, i) => (
                <tr key={i} className={`hover:bg-slate-50 ${i === 0 ? "font-semibold bg-indigo-50/40" : ""}`}>
                  <td className="px-4 py-2.5 text-slate-700">{f.label}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-700">{INR(f.totalIncome)}</td>
                  <td className="px-4 py-2.5 text-right text-rose-600">{INR(f.totalExpenses)}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${f.netCashFlow >= 0 ? "text-indigo-700" : "text-red-600"}`}>
                    {f.netCashFlow >= 0 ? "+" : ""}{INR(f.netCashFlow)}
                  </td>
                  <td className={`px-4 py-2.5 text-right text-xs ${f.savingsRate >= 20 ? "text-emerald-600" : f.savingsRate >= 0 ? "text-amber-600" : "text-red-600"}`}>
                    {f.savingsRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}