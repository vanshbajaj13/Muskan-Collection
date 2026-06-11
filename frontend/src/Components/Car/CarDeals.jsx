import React, { useState, useEffect, useCallback } from "react";
import { useCar } from "./CarContext";
import CarDealCard from "./CarDealCard";
import CarDealForm from "./CarDealForm";
import { Modal, Btn, Toast, FullScreenSpinner, StatCard } from "./CarUI";

const CarDeals = () => {
  const { getDeals, createDeal, updateDeal, deleteDeal, formatCurrency } =
    useCar();

  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
  const [editDeal, setEditDeal] = useState(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.from = new Date(dateFrom).getTime();
      if (dateTo) params.to = new Date(dateTo).setHours(23, 59, 59, 999);
      const data = await getDeals(params);
      setDeals(data.deals || []);
    } catch {
      showToast("Failed to load deals.", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      await createDeal(payload);
      setShowAdd(false);
      showToast("Deal saved successfully.");
      fetchDeals();
    } catch {
      showToast("Failed to save deal.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (payload) => {
    setSaving(true);
    try {
      await updateDeal(editDeal._id, payload);
      setEditDeal(null);
      showToast("Deal updated.");
      fetchDeals();
    } catch {
      showToast("Failed to update deal.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteDeal(id);
    showToast("Deal deleted.", "info");
    fetchDeals();
  };

  const visible = deals.filter((d) => {
    if (statusFilter !== "all" && d.dealStatus !== statusFilter) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      const hit =
        (d.carNumber || "").toLowerCase().includes(q) ||
        (d.carDescription || "").toLowerCase().includes(q) ||
        (d.make || "").toLowerCase().includes(q) ||
        (d.model || "").toLowerCase().includes(q) ||
        (d.boughtFrom || "").toLowerCase().includes(q) ||
        (d.soldTo || "").toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });

  const sold = visible.filter((d) => d.dealStatus === "sold");
  const unsold = visible.filter((d) => d.dealStatus === "unsold");
  const totalNetProfit = sold.reduce((s, d) => s + (d.netProfit || 0), 0);
  const capitalLocked = unsold.reduce((s, d) => s + (d.totalCost || 0), 0);

  return (
    <div className="relative">
      {saving && <FullScreenSpinner message="Saving…" />}

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
          <CarDealForm
            onSave={handleCreate}
            onCancel={() => setShowAdd(false)}
            loading={saving}
          />
        </Modal>
      )}

      {editDeal && (
        <Modal title="Edit Deal" onClose={() => setEditDeal(null)} wide>
          <CarDealForm
            initial={editDeal}
            onSave={handleUpdate}
            onCancel={() => setEditDeal(null)}
            loading={saving}
          />
        </Modal>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800">All Deals</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {visible.length} vehicle{visible.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Btn variant="primary" onClick={() => setShowAdd(true)}>
          + New Deal
        </Btn>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard label="Total" value={visible.length} color="blue" />
        <StatCard
          label="Net Profit"
          value={formatCurrency(totalNetProfit)}
          color={totalNetProfit >= 0 ? "green" : "red"}
        />
        <StatCard label="Sold" value={sold.length} color="green" />
        <StatCard label="In Stock" value={unsold.length} color="amber" />
      </div>

      {/* Capital locked banner */}
      {capitalLocked > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          <p className="text-sm font-semibold text-amber-800">
            {formatCurrency(capitalLocked)} locked in {unsold.length} unsold
            vehicle{unsold.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 space-y-3">
        <input
          type="text"
          placeholder="Search by number, name, person…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          style={{ fontSize: "16px" }}
        />

        {/* Status tabs */}
        <div className="flex gap-2">
          {[
            { key: "all", label: "All" },
            { key: "unsold", label: "In Stock" },
            { key: "sold", label: "Sold" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors
                ${
                  statusFilter === s.key
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ fontSize: "16px" }}
            />
          </div>
        </div>
      </div>

      {/* Deals list */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-3xl mb-3">🚗</p>
          <p className="text-base font-semibold text-slate-500">
            No deals found
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Adjust filters or add a new deal
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((deal) => (
            <CarDealCard
              key={deal._id}
              deal={deal}
              onEdit={setEditDeal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CarDeals;
