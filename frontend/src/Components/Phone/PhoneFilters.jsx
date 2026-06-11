import React, { useState } from "react";
import { usePhone } from "./PhoneContext";

/**
 * PhoneFilters — shared filter panel for Deals, Dashboard, and Report tabs.
 *
 * Props:
 *   filters       {object}   current filter values
 *   onChange      {fn}       called with updated filters object
 *   showSearch    {bool}     show free-text search box (deals only)
 *   compact       {bool}     render as a collapsible panel (dashboard/report)
 */
const PhoneFilters = ({
  filters = {},
  onChange,
  showSearch = false,
  compact = false,
}) => {
  const { opts } = usePhone();
  const [open, setOpen] = useState(!compact);

  const set = (key, value) => onChange({ ...filters, [key]: value });

  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (k === "search") return v && v.trim() !== "";
    if (k === "status") return v && v !== "all";
    if (k === "dateFrom" || k === "dateTo") return v && v !== "";
    return v && v !== "all" && v !== "";
  }).length;

  const clearAll = () => {
    const cleared = {};
    Object.keys(filters).forEach((k) => {
      if (k === "status") cleared[k] = "all";
      else cleared[k] = k === "search" ? "" : "";
    });
    onChange(cleared);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl mb-4 overflow-hidden">
      {/* Header — always visible */}
      <div
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">
            Filters
          </span>
          {activeCount > 0 && (
            <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
              className="text-xs text-rose-400 hover:text-rose-600 px-2 py-0.5 rounded hover:bg-rose-50 transition-colors"
            >
              Clear all
            </button>
          )}
          <span className="text-slate-400 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
            {/* ── Free-text search ── */}
            {showSearch && (
              <div className="col-span-2 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Product, person, notes…"
                  value={filters.search || ""}
                  onChange={(e) => set("search", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}

            {/* ── Date From ── */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => set("dateFrom", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* ── Date To ── */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => set("dateTo", e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* ── Status (deals only) ── */}
            {"status" in filters && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Status
                </label>
                <select
                  value={filters.status || "all"}
                  onChange={(e) => set("status", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="unsold">Unsold</option>
                  <option value="pending_payment">Payment Pending</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
            )}

            {/* ── Product ── */}
            {"product" in filters && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Product
                </label>
                <select
                  value={filters.product || ""}
                  onChange={(e) => set("product", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="">All Products</option>
                  {opts("product").map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ── Account ── */}
            {"account" in filters && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Account
                </label>
                <select
                  value={filters.account || ""}
                  onChange={(e) => set("account", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="">All Accounts</option>
                  {opts("account").map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ── Purchased From ── */}
            {"purchasedFrom" in filters && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Purchased From
                </label>
                <select
                  value={filters.purchasedFrom || ""}
                  onChange={(e) => set("purchasedFrom", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="">All Sources</option>
                  {opts("purchasedFrom").map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ── Sold To ── */}
            {"soldTo" in filters && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Sold To
                </label>
                <select
                  value={filters.soldTo || ""}
                  onChange={(e) => set("soldTo", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="">All Buyers</option>
                  {opts("soldTo").map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ── Credit Card ── */}
            {"creditCard" in filters && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Credit Card
                </label>
                <select
                  value={filters.creditCard || ""}
                  onChange={(e) => set("creditCard", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="">All Cards</option>
                  {opts("card").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ── Commission To ── */}
            {"commissionTo" in filters && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Commission To
                </label>
                <select
                  value={filters.commissionTo || ""}
                  onChange={(e) => set("commissionTo", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="">All</option>
                  {opts("commissionTo").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ── With GST ── */}
            {"withGST" in filters && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  GST
                </label>
                <select
                  value={filters.withGST || ""}
                  onChange={(e) => set("withGST", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="">All</option>
                  <option value="true">With GST</option>
                  <option value="false">Without GST</option>
                </select>
              </div>
            )}

            {/* ── Has Cashback ── */}
            {"hasCashback" in filters && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Cashback
                </label>
                <select
                  value={filters.hasCashback || ""}
                  onChange={(e) => set("hasCashback", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="">All</option>
                  <option value="yes">Has Cashback</option>
                  <option value="no">No Cashback</option>
                </select>
              </div>
            )}

            {/* ── Has Commission ── */}
            {"hasCommission" in filters && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Commission
                </label>
                <select
                  value={filters.hasCommission || ""}
                  onChange={(e) => set("hasCommission", e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="">All</option>
                  <option value="yes">Has Commission</option>
                  <option value="no">No Commission</option>
                </select>
              </div>
            )}
          </div>

          {/* Active filter chips */}
          {activeCount > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
              {Object.entries(filters).map(([key, value]) => {
                const isEmpty = !value || value === "all" || value === "";
                if (isEmpty) return null;
                const labels = {
                  search: "Search",
                  dateFrom: "From",
                  dateTo: "To",
                  status: "Status",
                  product: "Product",
                  account: "Account",
                  purchasedFrom: "From",
                  soldTo: "Sold To",
                  creditCard: "Card",
                  commissionTo: "Commission",
                  withGST: "GST",
                  hasCashback: "Cashback",
                  hasCommission: "Commission",
                };
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs px-2 py-0.5 rounded-full"
                  >
                    <span className="font-medium">{labels[key] || key}:</span>
                    <span>{value}</span>
                    <button
                      onClick={() => set(key, key === "status" ? "all" : "")}
                      className="ml-0.5 hover:text-indigo-900"
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PhoneFilters;
