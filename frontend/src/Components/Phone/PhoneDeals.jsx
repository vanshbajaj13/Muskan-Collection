import React, { useState, useEffect, useCallback } from "react";
import { usePhone } from "./PhoneContext";
import DealCard from "./DealCard";
import DealForm from "./DealForm";
import { Modal, Btn, Toast, FullScreenSpinner } from "./PhoneUI";

const STATUS_OPTS = [
  { value: "all",             label: "All Deals" },
  { value: "unsold",          label: "Unsold" },
  { value: "pending_payment", label: "Payment Pending" },
  { value: "complete",        label: "Complete" },
];

const PhoneDeals = () => {
  const { getDeals, createDeal, updateDeal, deleteDeal } = usePhone();

  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Custom date range
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDateRange, setShowDateRange] = useState(false);

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [editDeal, setEditDeal] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (dateFrom) params.from = new Date(dateFrom).getTime();
      if (dateTo)   params.to   = new Date(dateTo).setHours(23, 59, 59, 999);
      const data = await getDeals(params);
      setDeals(data.deals || []);
    } catch (e) {
      showToast("Failed to load deals", "error");
    } finally {
      setLoading(false);
    }
  }, [getDeals, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      await createDeal(payload);
      setShowAdd(false);
      showToast("Deal added!");
      fetchDeals();
    } catch {
      showToast("Failed to save deal", "error");
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
      fetchDeals();
    } catch {
      showToast("Failed to update deal", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteDeal(id);
    showToast("Deal deleted", "info");
    fetchDeals();
  };

  const clearDateRange = () => {
    setDateFrom("");
    setDateTo("");
  };

  // Client-side search filter
  const visible = deals.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.product?.toLowerCase().includes(q) ||
      d.purchaseAccount?.toLowerCase().includes(q) ||
      d.purchasedFrom?.toLowerCase().includes(q) ||
      d.soldTo?.toLowerCase().includes(q) ||
      d.notes?.toLowerCase().includes(q)
    );
  });

  // Totals for visible deals
  const totals = visible.reduce(
    (acc, d) => ({
      buying: acc.buying + (d.buyingPrice || 0),
      net: acc.net + (d.netProfit || 0),
      gross: acc.gross + (d.grossProfit || 0),
      pending: acc.pending + (d.paymentPending || 0),
    }),
    { buying: 0, net: 0, gross: 0, pending: 0 }
  );

  const hasDateFilter = dateFrom || dateTo;

  return (
    <div className="relative">
      {/* Full-screen spinner for save/delete ops */}
      {saving && <FullScreenSpinner message="Saving deal…" />}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <Modal title="Add New Deal" onClose={() => setShowAdd(false)} wide>
          <DealForm onSave={handleCreate} onCancel={() => setShowAdd(false)} loading={saving} />
        </Modal>
      )}

      {/* Edit Modal */}
      {editDeal && (
        <Modal title="Edit Deal" onClose={() => setEditDeal(null)} wide>
          <DealForm initial={editDeal} onSave={handleUpdate}
            onCancel={() => setEditDeal(null)} loading={saving} />
        </Modal>
      )}

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Phone Deals</h2>
          <p className="text-sm text-slate-400">{visible.length} deal{visible.length !== 1 ? "s" : ""} shown</p>
        </div>
        <Btn variant="primary" onClick={() => setShowAdd(true)}>+ New Deal</Btn>
      </div>

      {/* ── Filters ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-3">
        {/* Status tabs */}
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
          {STATUS_OPTS.map((o) => (
            <button key={o.value}
              onClick={() => setStatusFilter(o.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${statusFilter === o.value
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"}`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search product, person…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm flex-1 max-w-xs
            focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />

        {/* Date range toggle */}
        <button
          onClick={() => setShowDateRange((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
            ${hasDateFilter
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        >
          📅 {hasDateFilter ? "Date filter ON" : "Date Range"}
        </button>

        {/* Export CSV */}
        <a
          href={`/api/phones/deals/meta/export`}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium
            bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
          download
        >
          ↓ Export CSV
        </a>
      </div>

      {/* ── Date range picker ─────────────────────────────────────── */}
      {showDateRange && (
        <div className="flex flex-wrap items-end gap-3 mb-4 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-indigo-200 rounded-lg px-3 py-1.5 text-sm bg-white
                focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-indigo-200 rounded-lg px-3 py-1.5 text-sm bg-white
                focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          {hasDateFilter && (
            <button
              onClick={clearDateRange}
              className="text-xs text-rose-400 hover:text-rose-600 px-2 py-1.5 rounded hover:bg-rose-50 transition-colors"
            >
              ✕ Clear
            </button>
          )}
          <p className="text-xs text-indigo-400 self-end pb-1.5">
            Filters by purchase date
          </p>
        </div>
      )}

      {/* ── Summary strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryStrip label="Total Invested" value={`₹${totals.buying.toLocaleString("en-IN")}`} />
        <SummaryStrip label="Gross Profit" value={`₹${totals.gross.toLocaleString("en-IN")}`}
          positive={totals.gross >= 0} />
        <SummaryStrip label="Net Profit" value={`₹${totals.net.toLocaleString("en-IN")}`}
          positive={totals.net >= 0} />
        <SummaryStrip label="Pending Payments" value={`₹${totals.pending.toLocaleString("en-IN")}`}
          warn={totals.pending > 0} />
      </div>

      {/* ── Deals list ────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading deals…</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">📱</p>
          <p className="font-medium text-slate-500">No deals found</p>
          <p className="text-sm mt-1">
            {search || hasDateFilter
              ? "Try adjusting your filters"
              : "Click '+ New Deal' to add your first deal"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((d) => (
            <DealCard key={d._id} deal={d}
              onEdit={setEditDeal}
              onDelete={handleDelete}
              onRefresh={fetchDeals} />
          ))}
        </div>
      )}
    </div>
  );
};

const SummaryStrip = ({ label, value, positive, warn }) => (
  <div className={`rounded-xl border px-4 py-3
    ${warn ? "bg-amber-50 border-amber-100" : "bg-white border-slate-100"}`}>
    <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
    <p className={`text-base font-bold mt-0.5
      ${warn ? "text-amber-600" : positive === false ? "text-rose-500" : "text-slate-800"}`}>
      {value}
    </p>
  </div>
);

export default PhoneDeals;