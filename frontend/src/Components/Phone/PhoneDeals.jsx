import React, { useState, useEffect, useCallback } from "react";
import { usePhone } from "./PhoneContext";
import DealCard from "./DealCard";
import DealForm from "./DealForm";
import PhoneFilters from "./PhoneFilters";
import { Modal, Btn, Toast, FullScreenSpinner } from "./PhoneUI";

const _now = new Date();
const _defaultFrom = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-01`;
const _lastDay = new Date(_now.getFullYear(), _now.getMonth() + 1, 0).getDate();
const _defaultTo = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_lastDay).padStart(2, "0")}`;

const INITIAL_FILTERS = {
  search: "",
  status: "all",
  dateFrom: _defaultFrom,
  dateTo: _defaultTo,
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

// ── Group deals by purchaseDate ────────────────────────────────────────────
function groupByDate(deals) {
  const map = {};
  deals.forEach((d) => {
    const ts = d.purchaseDate;
    const label = ts
      ? new Date(ts).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Unknown Date";
    if (!map[label]) map[label] = { label, ts: ts || 0, deals: [] };
    map[label].deals.push(d);
  });
  // Sort descending by date
  return Object.values(map).sort((a, b) => b.ts - a.ts);
}

// ── Date group header + collapsible deals ──────────────────────────────────
const DealDateGroup = ({
  group,
  onEdit,
  onDelete,
  onRefresh,
  formatCurrency,
  allExpanded,
}) => {
  const [open, setOpen] = useState(true);

  const totalBuying = group.deals.reduce((s, d) => s + (d.buyingPrice || 0), 0);
  const totalSelling = group.deals.reduce(
    (s, d) => s + (d.sellingPrice || 0),
    0,
  );
  const totalNet = group.deals.reduce((s, d) => s + (d.netProfit || 0), 0);
  const totalPending = group.deals.reduce(
    (s, d) => s + (d.paymentPending || 0),
    0,
  );

  useEffect(() => {
    if (allExpanded !== null) setOpen(allExpanded);
  }, [allExpanded]);

  return (
    <div>
      {/* Group header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors mb-1"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">
            {group.label}
          </span>
          <span className="text-xs text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
            {group.deals.length} Item{group.deals.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
            <span>
              Total Purchase:{" "}
              <span className="font-semibold text-slate-700">
                {formatCurrency(totalBuying)}
              </span>
            </span>
            <span>
              Total Sale:{" "}
              <span className="font-semibold text-slate-700">
                {formatCurrency(totalSelling)}
              </span>
            </span>
            <span
              className={`font-semibold ${totalNet >= 0 ? "text-emerald-600" : "text-rose-500"}`}
            >
              Net: {totalNet >= 0 ? "+" : ""}
              {formatCurrency(totalNet)}
            </span>
            {totalPending > 0 && (
              <span className="text-amber-600 font-semibold">
                Pending: {formatCurrency(totalPending)}
              </span>
            )}
          </div>
          {/* Mobile: just net profit */}
          <div className="sm:hidden">
            <span
              className={`text-xs font-semibold ${totalNet >= 0 ? "text-emerald-600" : "text-rose-500"}`}
            >
              {totalNet >= 0 ? "+" : ""}
              {formatCurrency(totalNet)}
            </span>
          </div>
          <span className="text-slate-400 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Deal cards */}
      {open && (
        <div className="space-y-2 mb-2">
          {group.deals.map((d) => (
            <DealCard
              key={d._id}
              deal={d}
              onEdit={onEdit}
              onDelete={onDelete}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
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

// ── Main PhoneDeals ────────────────────────────────────────────────────────
const PhoneDeals = () => {
  const { getDeals, createDeal, updateDeal, deleteDeal, formatCurrency } =
    usePhone();

  const [deals, setDeals] = useState([]);
  const [allExpanded, setAllExpanded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [summaryOpen, setSummaryOpen] = useState(false);

  // Month-picker: tracks which year is visible in the strip
  const [stripYear, setStripYear] = useState(_now.getFullYear());

  const [showAdd, setShowAdd] = useState(false);
  const [editDeal, setEditDeal] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDeals = useCallback(async (dateFrom, dateTo) => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.from = new Date(dateFrom).getTime();
      if (dateTo) params.to = new Date(dateTo).setHours(23, 59, 59, 999);
      const data = await getDeals(params);
      setDeals(data.deals || []);
    } catch {
      showToast("Failed to load deals", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDeals(filters.dateFrom, filters.dateTo);
    // eslint-disable-next-line
  }, [filters.dateFrom, filters.dateTo]); // fetchDeals is now stable

  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      await createDeal(payload);
      setShowAdd(false);
      showToast("Deal added!");
      fetchDeals(filters.dateFrom, filters.dateTo);
    } catch (err) {
      showToast(err.message || "Failed to save deal", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (payload) => {
    setSaving(true);
    try {
      await updateDeal(editDeal._id, payload);
      setEditDeal(null);
      showToast("Deal updated!");
      fetchDeals(filters.dateFrom, filters.dateTo);
    } catch (err) {
      showToast(err.message || "Failed to update deal", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setSaving(true);
    try {
      await deleteDeal(id);
      showToast("Deal deleted", "info");
      fetchDeals(filters.dateFrom, filters.dateTo);
    } catch (err) {
      showToast(err.message || "Failed to delete deal", "error");
    } finally {
      setSaving(false);
    }
  };

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

  // Client-side filtering
  const visible = deals.filter((d) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hit =
        d.product?.toLowerCase().includes(q) ||
        d.purchaseAccount?.toLowerCase().includes(q) ||
        d.purchasedFrom?.toLowerCase().includes(q) ||
        d.soldTo?.toLowerCase().includes(q) ||
        d.notes?.toLowerCase().includes(q) ||
        d.creditCard?.toLowerCase().includes(q) ||
        d.commissionTo?.toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (
      filters.status &&
      filters.status !== "all" &&
      d.dealStatus !== filters.status
    )
      return false;
    if (filters.product && d.product !== filters.product) return false;
    if (filters.account && d.purchaseAccount !== filters.account) return false;
    if (filters.purchasedFrom && d.purchasedFrom !== filters.purchasedFrom)
      return false;
    if (filters.soldTo && d.soldTo !== filters.soldTo) return false;
    if (filters.creditCard && d.creditCard !== filters.creditCard) return false;
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
    if (filters.hasCashback === "no" && (d.cashback > 0 || d.cashbackExpected))
      return false;
    if (filters.hasCommission === "yes" && !(d.commissionAmount > 0))
      return false;
    if (filters.hasCommission === "no" && d.commissionAmount > 0) return false;
    return true;
  });

  // Summary strip totals
  const totals = visible.reduce(
    (acc, d) => ({
      buying: acc.buying + (d.buyingPrice || 0),
      net: acc.net + (d.netProfit || 0),
      gross: acc.gross + (d.grossProfit || 0),
      pending: acc.pending + (d.paymentPending || 0),
    }),
    { buying: 0, net: 0, gross: 0, pending: 0 },
  );

  const dateGroups = groupByDate(visible);

  // ── Status / cashback capsule definitions ────────────────────────────────
  const statusCapsules = [
    { key: "all", label: "All Status", color: "slate" },
    { key: "unsold", label: "Unsold", color: "gray" },
    { key: "pending_payment", label: "Payment Pending", color: "amber" },
    { key: "complete", label: "Complete", color: "emerald" },
    { key: "excess_payment", label: "Excess Payment", color: "rose" },
  ];

  const cashbackCapsules = [
    { key: "", label: "All", color: "slate" },
    { key: "yes", label: "Cashback Received", color: "emerald" },
    { key: "expected", label: "Cashback Pending", color: "amber" },
    { key: "no", label: "No Cashback", color: "gray" },
  ];

  return (
    <div className="relative">
      {saving && <FullScreenSpinner message="Saving deal…" />}

      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {showAdd && (
        <Modal title="Add New Deal" onClose={() => setShowAdd(false)} wide>
          <DealForm
            onSave={handleCreate}
            onCancel={() => setShowAdd(false)}
            loading={saving}
          />
        </Modal>
      )}

      {editDeal && (
        <Modal title="Edit Deal" onClose={() => setEditDeal(null)} wide>
          <DealForm
            initial={editDeal}
            onSave={handleUpdate}
            onCancel={() => setEditDeal(null)}
            loading={saving}
          />
        </Modal>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Phone Deals</h2>
          <p className="text-sm text-slate-400">
            {visible.length} deal{visible.length !== 1 ? "s" : ""} ·{" "}
            {dateGroups.length} day{dateGroups.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Btn
            variant="secondary"
            onClick={() => setAllExpanded((v) => (v === false ? true : false))}
          >
            {allExpanded === false ? "Expand All" : "Collapse All"}
          </Btn>
          <Btn variant="primary" onClick={() => setShowAdd(true)}>
            + New Deal
          </Btn>
        </div>
      </div>

      {/* Filters */}
      <PhoneFilters
        filters={filters}
        onChange={setFilters}
        showSearch={true}
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

      {/* Summary strip (collapsible, collapsed by default) */}
      <div className="mb-4">
        <button
          onClick={() => setSummaryOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <span className="text-sm font-semibold text-slate-700">Summary</span>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-semibold ${totals.net >= 0 ? "text-emerald-600" : "text-rose-500"}`}
            >
              Net: {totals.net >= 0 ? "+" : ""}
              {formatCurrency(totals.net)}
            </span>
            {totals.pending > 0 && (
              <span className="text-xs font-semibold text-amber-600">
                Pending: {formatCurrency(totals.pending)}
              </span>
            )}
            <span className="text-slate-400 text-xs">
              {summaryOpen ? "▲" : "▼"}
            </span>
          </div>
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            summaryOpen
              ? "max-h-48 opacity-100 translate-y-0 mt-3"
              : "max-h-0 opacity-0 -translate-y-2 mt-0"
          }`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryStrip
              label="Total Invested"
              value={formatCurrency(totals.buying)}
            />
            <SummaryStrip
              label="Gross Profit"
              value={formatCurrency(totals.gross)}
              positive={totals.gross >= 0}
            />
            <SummaryStrip
              label="Net Profit"
              value={formatCurrency(totals.net)}
              positive={totals.net >= 0}
            />
            <SummaryStrip
              label="Pending Payments"
              value={formatCurrency(totals.pending)}
              warn={totals.pending > 0}
            />
          </div>
        </div>
      </div>

      {/* Quick capsule filters: status & cashback */}
      <div className="mb-5 space-y-2">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
          {/* <span className="text-xs text-slate-400 font-medium shrink-0">Status:</span> */}
          {statusCapsules.map((c) => (
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
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
          {/* <span className="text-xs text-slate-400 font-medium shrink-0">Cashback:</span> */}
          {cashbackCapsules.map((c) => (
            <Capsule
              key={c.key || "all"}
              active={filters.hasCashback === c.key}
              activeColor={c.color}
              onClick={() => setFilters((f) => ({ ...f, hasCashback: c.key }))}
            >
              {c.label}
            </Capsule>
          ))}
        </div>
      </div>

      {/* Grouped deals list */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 animate-enter">
          Loading deals…
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-slate-400 animate-enter">
          <p className="text-4xl mb-3">📱</p>
          <p className="font-medium text-slate-500">No deals found</p>
          <p className="text-sm mt-1">
            Try adjusting your filters or add a new deal
          </p>
        </div>
      ) : (
        <div className="space-y-1 animate-enter">
          {dateGroups.map((group) => (
            <DealDateGroup
              key={group.label}
              group={group}
              onEdit={setEditDeal}
              onDelete={handleDelete}
              onRefresh={() => fetchDeals(filters.dateFrom, filters.dateTo)}
              formatCurrency={formatCurrency}
              allExpanded={allExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SummaryStrip = ({ label, value, positive, warn }) => (
  <div
    className={`rounded-xl border px-4 py-3
    ${warn ? "bg-amber-50 border-amber-100" : "bg-white border-slate-100"}`}
  >
    <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
    <p
      className={`text-base font-bold mt-0.5
      ${warn ? "text-amber-600" : positive === false ? "text-rose-500" : "text-slate-800"}`}
    >
      {value}
    </p>
  </div>
);

export default PhoneDeals;