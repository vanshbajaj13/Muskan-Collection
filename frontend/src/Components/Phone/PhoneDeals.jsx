import React, { useState, useEffect, useCallback } from "react";
import { usePhone } from "./PhoneContext";
import DealCard from "./DealCard";
import DealForm from "./DealForm";
import PhoneFilters from "./PhoneFilters";
import { Modal, Btn, Toast, FullScreenSpinner } from "./PhoneUI";

const INITIAL_FILTERS = {
  search: "",
  status: "all",
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
const DealDateGroup = ({ group, onEdit, onDelete, onRefresh, formatCurrency }) => {
  const [open, setOpen] = useState(true);

  const totalBuying  = group.deals.reduce((s, d) => s + (d.buyingPrice || 0), 0);
  const totalNet     = group.deals.reduce((s, d) => s + (d.netProfit  || 0), 0);
  const totalPending = group.deals.reduce((s, d) => s + (d.paymentPending || 0), 0);

  return (
    <div>
      {/* Group header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors mb-1"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">{group.label}</span>
          <span className="text-xs text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
            {group.deals.length} deal{group.deals.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
            <span>Invested: <span className="font-semibold text-slate-700">{formatCurrency(totalBuying)}</span></span>
            <span className={`font-semibold ${totalNet >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
              Net: {totalNet >= 0 ? "+" : ""}{formatCurrency(totalNet)}
            </span>
            {totalPending > 0 && (
              <span className="text-amber-600 font-semibold">
                Pending: {formatCurrency(totalPending)}
              </span>
            )}
          </div>
          {/* Mobile: just net profit */}
          <div className="sm:hidden">
            <span className={`text-xs font-semibold ${totalNet >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
              {totalNet >= 0 ? "+" : ""}{formatCurrency(totalNet)}
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

// ── Main PhoneDeals ────────────────────────────────────────────────────────
const PhoneDeals = () => {
  const { getDeals, createDeal, updateDeal, deleteDeal, formatCurrency } = usePhone();

  const [deals, setDeals]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [showAdd, setShowAdd]   = useState(false);
  const [editDeal, setEditDeal] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.dateFrom) params.from = new Date(filters.dateFrom).getTime();
      if (filters.dateTo)   params.to   = new Date(filters.dateTo).setHours(23, 59, 59, 999);
      const data = await getDeals(params);
      setDeals(data.deals || []);
    } catch {
      showToast("Failed to load deals", "error");
    } finally {
      setLoading(false);
    }
  }, [getDeals, filters.dateFrom, filters.dateTo]);

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
    if (filters.status && filters.status !== "all" && d.dealStatus !== filters.status) return false;
    if (filters.product      && d.product          !== filters.product)      return false;
    if (filters.account      && d.purchaseAccount  !== filters.account)      return false;
    if (filters.purchasedFrom && d.purchasedFrom   !== filters.purchasedFrom) return false;
    if (filters.soldTo       && d.soldTo           !== filters.soldTo)       return false;
    if (filters.creditCard   && d.creditCard       !== filters.creditCard)   return false;
    if (filters.commissionTo && d.commissionTo     !== filters.commissionTo) return false;
    if (filters.withGST === "true"  && !d.withGST)  return false;
    if (filters.withGST === "false" && d.withGST)   return false;
    if (filters.hasCashback === "yes" && !(d.cashback > 0))      return false;
    if (filters.hasCashback === "no"  && d.cashback > 0)         return false;
    if (filters.hasCommission === "yes" && !(d.commissionAmount > 0)) return false;
    if (filters.hasCommission === "no"  && d.commissionAmount > 0)    return false;
    return true;
  });

  // Summary strip totals
  const totals = visible.reduce(
    (acc, d) => ({
      buying:  acc.buying  + (d.buyingPrice  || 0),
      net:     acc.net     + (d.netProfit    || 0),
      gross:   acc.gross   + (d.grossProfit  || 0),
      pending: acc.pending + (d.paymentPending || 0),
    }),
    { buying: 0, net: 0, gross: 0, pending: 0 }
  );

  const dateGroups = groupByDate(visible);

  return (
    <div className="relative">
      {saving && <FullScreenSpinner message="Saving deal…" />}

      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {showAdd && (
        <Modal title="Add New Deal" onClose={() => setShowAdd(false)} wide>
          <DealForm onSave={handleCreate} onCancel={() => setShowAdd(false)} loading={saving} />
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
            {visible.length} deal{visible.length !== 1 ? "s" : ""} · {dateGroups.length} day{dateGroups.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/phones/deals/meta/export"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium
              bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
            download
          >
            ↓ CSV
          </a>
          <Btn variant="primary" onClick={() => setShowAdd(true)}>+ New Deal</Btn>
        </div>
      </div>

      {/* Filters */}
      <PhoneFilters
        filters={filters}
        onChange={setFilters}
        showSearch={true}
        compact={true}
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryStrip label="Total Invested"   value={formatCurrency(totals.buying)} />
        <SummaryStrip label="Gross Profit"     value={formatCurrency(totals.gross)}   positive={totals.gross >= 0} />
        <SummaryStrip label="Net Profit"       value={formatCurrency(totals.net)}     positive={totals.net >= 0} />
        <SummaryStrip label="Pending Payments" value={formatCurrency(totals.pending)} warn={totals.pending > 0} />
      </div>

      {/* Grouped deals list */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading deals…</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">📱</p>
          <p className="font-medium text-slate-500">No deals found</p>
          <p className="text-sm mt-1">Try adjusting your filters or add a new deal</p>
        </div>
      ) : (
        <div className="space-y-1">
          {dateGroups.map((group) => (
            <DealDateGroup
              key={group.label}
              group={group}
              onEdit={setEditDeal}
              onDelete={handleDelete}
              onRefresh={fetchDeals}
              formatCurrency={formatCurrency}
            />
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