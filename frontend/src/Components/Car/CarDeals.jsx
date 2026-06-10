import React, { useState, useEffect, useCallback } from "react";
import { useCar } from "./CarContext";
import CarDealCard from "./CarDealCard";
import CarDealForm from "./CarDealForm";
import { Modal, Btn, Toast, FullScreenSpinner, StatCard } from "./CarUI";

const CarDeals = () => {
  const { getDeals, createDeal, updateDeal, deleteDeal, formatCurrency } = useCar();

  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
  const [editDeal, setEditDeal] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");  // all | sold | unsold
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
      showToast("डेटा लोड नहीं हुआ। / Failed to load.", "error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      await createDeal(payload);
      setShowAdd(false);
      showToast("✅ डील सेव हो गई! / Deal saved!");
      fetchDeals();
    } catch {
      showToast("सेव नहीं हुआ। / Failed to save.", "error");
    } finally { setSaving(false); }
  };

  const handleUpdate = async (payload) => {
    setSaving(true);
    try {
      await updateDeal(editDeal._id, payload);
      setEditDeal(null);
      showToast("✅ अपडेट हो गया! / Updated!");
      fetchDeals();
    } catch {
      showToast("अपडेट नहीं हुआ। / Failed to update.", "error");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await deleteDeal(id);
    showToast("हटा दिया गया। / Deleted.", "info");
    fetchDeals();
  };

  // Client-side filtering
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

  // Summary totals
  const sold = visible.filter((d) => d.dealStatus === "sold");
  const unsold = visible.filter((d) => d.dealStatus === "unsold");
  const totalNetProfit = sold.reduce((s, d) => s + (d.netProfit || 0), 0);
  const capitalLocked = unsold.reduce((s, d) => s + (d.totalCost || 0), 0);

  return (
    <div className="relative">
      {saving && <FullScreenSpinner message="सेव हो रहा है... / Saving..." />}

      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {showAdd && (
        <Modal title="🚗 नई डील जोड़ें / Add New Deal" onClose={() => setShowAdd(false)} wide>
          <CarDealForm onSave={handleCreate} onCancel={() => setShowAdd(false)} loading={saving} />
        </Modal>
      )}

      {editDeal && (
        <Modal title="✎ डील बदलें / Edit Deal" onClose={() => setEditDeal(null)} wide>
          <CarDealForm initial={editDeal} onSave={handleUpdate} onCancel={() => setEditDeal(null)} loading={saving} />
        </Modal>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-800">सभी डील / All Deals</h2>
          <p className="text-base text-gray-500">{visible.length} गाड़ियाँ दिख रही हैं</p>
        </div>
        <Btn variant="primary" className="text-lg py-3 px-6" onClick={() => setShowAdd(true)}>
          + नई डील / New Deal
        </Btn>
      </div>

      {/* Quick summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="कुल गाड़ियाँ" value={visible.length} icon="🚗" color="blue" />
        <StatCard label="बिकी हुई" value={sold.length} icon="✅" color="green" />
        <StatCard label="स्टॉक में" value={unsold.length} icon="⏳" color="amber" />
        <StatCard label="शुद्ध मुनाफा" value={formatCurrency(totalNetProfit)} icon="💰" color={totalNetProfit >= 0 ? "green" : "red"} />
      </div>

      {capitalLocked > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-3 mb-5 flex items-center gap-3">
          <span className="text-2xl">🔒</span>
          <p className="text-base font-bold text-amber-800">
            पूंजी अटकी है: {formatCurrency(capitalLocked)} — {unsold.length} गाड़ी अभी नहीं बिकी
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 mb-5 space-y-3">
        <p className="text-base font-bold text-gray-600">🔍 फ़िल्टर / Filter</p>

        <input
          type="text"
          placeholder="गाड़ी नंबर, नाम, व्यक्ति... खोजें"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-blue-500"
          style={{ fontSize: "16px" }}
        />

        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all", label: "सभी / All" },
            { key: "unsold", label: "🚗 स्टॉक में" },
            { key: "sold", label: "✅ बिकी हुई" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-5 py-2.5 rounded-xl text-base font-bold transition-colors
                ${statusFilter === s.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-bold text-gray-500 mb-1 block">शुरू तारीख / From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-blue-500"
              style={{ fontSize: "16px" }} />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-500 mb-1 block">अंत तारीख / To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-blue-500"
              style={{ fontSize: "16px" }} />
          </div>
        </div>
      </div>

      {/* Deals list */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-xl">लोड हो रहा है...</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-6xl mb-4">🚗</p>
          <p className="text-xl font-bold text-gray-500">कोई डील नहीं मिली</p>
          <p className="text-base text-gray-400 mt-2">फ़िल्टर बदलें या नई डील जोड़ें</p>
        </div>
      ) : (
        <div className="space-y-3">
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