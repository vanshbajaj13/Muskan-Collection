import React, { useState, useEffect, useCallback } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import "chart.js/auto";
import { usePhone } from "./PhoneContext";
import {
  Btn,
  Select,
  Field,
  Modal,
  Toast,
  ConfirmModal,
  FullScreenSpinner,
} from "./PhoneUI";

const EMPTY_FORM = { date: "", amount: "", card: "", category: "", description: "" };

// ── Shared chart helpers ───────────────────────────────────────────────────
const INR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const COLORS = [
  "rgba(99,  102, 241, 0.75)",
  "rgba(244, 63,  94,  0.75)",
  "rgba(245, 158, 11,  0.75)",
  "rgba(16,  185, 129, 0.75)",
  "rgba(6,   182, 212, 0.75)",
  "rgba(139, 92,  246, 0.75)",
  "rgba(249, 115, 22,  0.75)",
];
const getColors = (n) =>
  Array.from({ length: n }, (_, i) => COLORS[i % COLORS.length]);

// ── Expense Dashboard ──────────────────────────────────────────────────────
const ExpenseDashboard = ({ expenses, formatCurrency }) => {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
        <p className="text-4xl mb-3">💳</p>
        <p className="font-medium text-slate-500">No expense data yet</p>
        <p className="text-sm mt-1">Add expenses to see analytics here</p>
      </div>
    );
  }

  const totalSpend = expenses.reduce((s, e) => s + e.amount, 0);

  const byCard = expenses.reduce((acc, e) => {
    const k = e.card || "Unknown";
    acc[k] = (acc[k] || 0) + e.amount;
    return acc;
  }, {});

  const byCategory = expenses.reduce((acc, e) => {
    const k = e.category || "Uncategorised";
    acc[k] = (acc[k] || 0) + e.amount;
    return acc;
  }, {});

  const byMonth = expenses.reduce((acc, e) => {
    const d = new Date(e.date);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    acc[k] = (acc[k] || 0) + e.amount;
    return acc;
  }, {});
  const monthEntries = Object.entries(byMonth).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const byDesc = expenses.reduce((acc, e) => {
    const k = e.description || "Uncategorised";
    acc[k] = (acc[k] || 0) + e.amount;
    return acc;
  }, {});
  const topDesc = Object.entries(byDesc).sort(([, a], [, b]) => b - a).slice(0, 8);

  const cardChartData = {
    labels: Object.keys(byCard),
    datasets: [{
      data: Object.values(byCard),
      backgroundColor: getColors(Object.keys(byCard).length),
      borderWidth: 1,
    }],
  };

  const categoryChartData = {
    labels: Object.keys(byCategory),
    datasets: [{
      data: Object.values(byCategory),
      backgroundColor: getColors(Object.keys(byCategory).length),
      borderWidth: 1,
    }],
  };

  const monthlyChartData = {
    labels: monthEntries.map(([m]) => m.slice(5) + "/" + m.slice(2, 4)),
    datasets: [{
      label: "Monthly Spend",
      data: monthEntries.map(([, v]) => v),
      borderColor: "rgba(99, 102, 241, 0.9)",
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      fill: true,
      tension: 0.4,
      pointRadius: 4,
    }],
  };

  const catChartData = {
    labels: topDesc.map(([k]) => k),
    datasets: [{
      label: "Amount (₹)",
      data: topDesc.map(([, v]) => v),
      backgroundColor: getColors(topDesc.length),
      borderWidth: 1,
    }],
  };

  const chartBase = { maintainAspectRatio: false };
  const yRupee = {
    ticks: { callback: (v) => `₹${(v / 1000).toFixed(0)}k`, font: { size: 11 } },
    grid: { color: "rgba(0,0,0,0.05)" },
  };

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SCard label="Total Spent"    value={INR(totalSpend)}                  accent="rose" />
        <SCard label="No. of Entries" value={expenses.length}                  accent="slate" />
        <SCard label="Cards Used"     value={Object.keys(byCard).length}       accent="indigo" />
        <SCard label="Categories"     value={Object.keys(byCategory).length}   accent="amber" />
      </div>

      {/* Monthly trend */}
      {monthEntries.length > 0 && (
        <Section title="Monthly Spend Trend" height="h-64">
          <Line
            data={monthlyChartData}
            options={{
              ...chartBase,
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${INR(c.parsed.y)}` } } },
              scales: { y: yRupee, x: { ticks: { font: { size: 11 } } } },
            }}
          />
        </Section>
      )}

      {/* Card split + category split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Object.keys(byCard).length > 0 && (
          <Section title="Spend by Card" height="h-64">
            <Doughnut
              data={cardChartData}
              options={{
                ...chartBase,
                plugins: {
                  legend: { position: "bottom", labels: { font: { size: 11 }, padding: 10 } },
                  tooltip: { callbacks: { label: (c) => ` ${c.label}: ${INR(c.parsed)}` } },
                },
              }}
            />
          </Section>
        )}
        {Object.keys(byCategory).length > 0 && (
          <Section title="Spend by Category" height="h-64">
            <Doughnut
              data={categoryChartData}
              options={{
                ...chartBase,
                plugins: {
                  legend: { position: "bottom", labels: { font: { size: 11 }, padding: 10 } },
                  tooltip: { callbacks: { label: (c) => ` ${c.label}: ${INR(c.parsed)}` } },
                },
              }}
            />
          </Section>
        )}
      </div>

      {/* Top descriptions bar */}
      {topDesc.length > 0 && (
        <Section title="Top Spend Descriptions" height="h-64">
          <Bar
            data={catChartData}
            options={{
              ...chartBase,
              indexAxis: "y",
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${INR(c.parsed.x)}` } } },
              scales: { x: yRupee, y: { ticks: { font: { size: 11 } } } },
            }}
          />
        </Section>
      )}

      {/* Per-card breakdown */}
      {Object.keys(byCard).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Card-wise Totals</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(byCard).sort(([, a], [, b]) => b - a).map(([card, total]) => (
              <div key={card} className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                <p className="text-xs text-slate-400 truncate">💳 {card}</p>
                <p className="text-base font-bold text-slate-800 mt-0.5">{INR(total)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{((total / totalSpend) * 100).toFixed(1)}% of total</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-category breakdown */}
      {Object.keys(byCategory).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Category-wise Totals</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(byCategory).sort(([, a], [, b]) => b - a).map(([cat, total]) => (
              <div key={cat} className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                <p className="text-xs text-slate-400 truncate">🗂️ {cat}</p>
                <p className="text-base font-bold text-slate-800 mt-0.5">{INR(total)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{((total / totalSpend) * 100).toFixed(1)}% of total</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SCard = ({ label, value, accent = "slate" }) => {
  const colors = {
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-700",
    rose:   "bg-rose-50   border-rose-100   text-rose-600",
    amber:  "bg-amber-50  border-amber-100  text-amber-700",
    slate:  "bg-slate-50  border-slate-100  text-slate-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[accent]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
};

const Section = ({ title, children, height = "h-72" }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5">
    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">{title}</h3>
    <div className={`${height} w-full`}>{children}</div>
  </div>
);

// ── Main ExpenseTracker ────────────────────────────────────────────────────
const ExpenseTracker = () => {
  const {
    getExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    formatCurrency,
    formatDate,
    tsFromDate,
    dateFromTs,
    opts,
  } = usePhone();

  const [allExpenses, setAllExpenses] = useState([]);  // unfiltered
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [activeTab, setActiveTab] = useState("list");

  // Modals
  const [showAdd, setShowAdd]               = useState(false);
  const [editItem, setEditItem]             = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting]             = useState(false);
  const [confirmEdit, setConfirmEdit]       = useState(null);

  // ── Filter state ───────────────────────────────────────────────────────
  const [filterOpen, setFilterOpen] = useState(false);
  const today        = new Date();
  // eslint-disable-next-line
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  // eslint-disable-next-line
  const toDateStr    = (d) => d.toISOString().split("T")[0];

  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [cardFilter,     setCardFilter]     = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchFilter,   setSearchFilter]   = useState("");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      // Pass date range to server; card + category filtering is client-side
      const params = {};
      if (dateFrom) params.from = new Date(dateFrom).getTime();
      if (dateTo)   params.to   = new Date(dateTo).setHours(23, 59, 59, 999);
      const data = await getExpenses(params);
      setAllExpenses(data.expenses || []);
    } catch {
      showToast("Failed to load expenses", "error");
    } finally {
      setLoading(false);
    }
  }, [getExpenses, dateFrom, dateTo]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  // ── Client-side filtering ─────────────────────────────────────────────
  const expenses = allExpenses.filter((e) => {
    if (cardFilter !== "all" && (e.card || "Unknown") !== cardFilter) return false;
    if (categoryFilter !== "all" && (e.category || "Uncategorised") !== categoryFilter) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const hit = (e.description || "").toLowerCase().includes(q)
        || (e.card || "").toLowerCase().includes(q)
        || (e.category || "").toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });

  // Unique values for filter dropdowns (from unfiltered set)
  const allCards      = ["all", ...Array.from(new Set(allExpenses.map((e) => e.card || "Unknown").filter(Boolean)))];
  const allCategories = ["all", ...Array.from(new Set(allExpenses.map((e) => e.category || "Uncategorised").filter(Boolean)))];

  const activeFilterCount = [
    dateFrom, dateTo,
    cardFilter !== "all" ? cardFilter : "",
    categoryFilter !== "all" ? categoryFilter : "",
    searchFilter,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setCardFilter("all");
    setCategoryFilter("all");
    setSearchFilter("");
  };

  const totalVisible = expenses.reduce((s, e) => s + e.amount, 0);

  // ── CRUD handlers ─────────────────────────────────────────────────────
  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      await createExpense(payload);
      setShowAdd(false);
      showToast("Expense added!");
      fetchExpenses();
    } catch {
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRequest = (payload) => { setConfirmEdit(payload); };

  const handleUpdate = async (payload) => {
    setSaving(true);
    try {
      await updateExpense(editItem._id, payload);
      setEditItem(null);
      showToast("Expense updated!");
      fetchExpenses();
    } catch {
      showToast("Failed to update", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteExpense(confirmDeleteId);
      setConfirmDeleteId(null);
      showToast("Deleted", "info");
      fetchExpenses();
    } catch {
      showToast("Failed to delete", "error");
    } finally {
      setDeleting(false);
    }
  };

  // By-card totals from unfiltered set (for summary cards)
  const byCard = allExpenses.reduce((acc, e) => {
    const key = e.card || "Unknown";
    acc[key] = (acc[key] || 0) + e.amount;
    return acc;
  }, {});

  return (
    <div className="relative">
      {(saving || deleting) && (
        <FullScreenSpinner message={saving ? "Saving…" : "Deleting…"} />
      )}

      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {showAdd && (
        <Modal title="Add Personal Expense" onClose={() => setShowAdd(false)}>
          <ExpenseForm onSave={handleCreate} onCancel={() => setShowAdd(false)}
            loading={saving} opts={opts} tsFromDate={tsFromDate} />
        </Modal>
      )}

      {editItem && (
        <Modal title="Edit Expense" onClose={() => setEditItem(null)}>
          <ExpenseForm initial={editItem} onSave={handleUpdateRequest}
            onCancel={() => setEditItem(null)} loading={saving}
            opts={opts} tsFromDate={tsFromDate} dateFromTs={dateFromTs} />
        </Modal>
      )}

      {confirmEdit && (
        <ConfirmModal
          title="Update Expense"
          body="Type CONFIRM to update this expense."
          confirmTextRequired={true}
          loading={saving}
          onCancel={() => setConfirmEdit(null)}
          onConfirm={async () => { await handleUpdate(confirmEdit); setConfirmEdit(null); }}
        />
      )}

      {confirmDeleteId && (
        <ConfirmModal
          title="Delete this expense?"
          body="This action cannot be undone."
          confirmTextRequired={true}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteId(null)}
          loading={deleting}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Personal Expenses</h2>
          <p className="text-sm text-slate-400">Track your card spends separately from business</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
            {[{ key: "list", label: "📋 List" }, { key: "dashboard", label: "📊 Analytics" }].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                  ${activeTab === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Btn variant="primary" onClick={() => setShowAdd(true)}>+ Add Expense</Btn>
        </div>
      </div>

      {/* ── Filter panel ────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl mb-4 overflow-hidden">
        <button
          onClick={() => setFilterOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">🔍 Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); clearFilters(); }}
                className="text-xs text-rose-400 hover:text-rose-600 px-2 py-0.5 rounded hover:bg-rose-50 transition-colors"
              >
                Clear all
              </button>
            )}
            <span className="text-slate-400 text-xs">{filterOpen ? "▲" : "▼"}</span>
          </div>
        </button>

        {filterOpen && (
          <div className="px-4 pb-4 pt-1 border-t border-slate-100">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">

              {/* Date From */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Card filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Card</label>
                <select
                  value={cardFilter}
                  onChange={(e) => setCardFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  {allCards.map((c) => (
                    <option key={c} value={c}>{c === "all" ? `All Cards (${allExpenses.length})` : c}</option>
                  ))}
                </select>
              </div>

              {/* Category filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  {allCategories.map((c) => (
                    <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Description, card, category…"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            {/* Active chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
                {dateFrom && <FilterChip label="From" value={dateFrom} onRemove={() => setDateFrom("")} />}
                {dateTo   && <FilterChip label="To"   value={dateTo}   onRemove={() => setDateTo("")} />}
                {cardFilter !== "all"     && <FilterChip label="Card"     value={cardFilter}     onRemove={() => setCardFilter("all")} />}
                {categoryFilter !== "all" && <FilterChip label="Category" value={categoryFilter} onRemove={() => setCategoryFilter("all")} />}
                {searchFilter             && <FilterChip label="Search"   value={searchFilter}   onRemove={() => setSearchFilter("")} />}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Dashboard tab ──────────────────────────────────────────── */}
      {activeTab === "dashboard" &&
        (loading ? (
          <div className="text-center py-16 text-slate-400">Loading…</div>
        ) : (
          <ExpenseDashboard expenses={expenses} formatCurrency={formatCurrency} />
        ))}

      {/* ── List tab ───────────────────────────────────────────────── */}
      {activeTab === "list" && (
        <>
          {/* By-card summary (from full unfiltered set) */}
          {Object.keys(byCard).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {Object.entries(byCard).map(([card, total]) => (
                <div key={card} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                  <p className="text-xs text-slate-400 truncate">💳 {card}</p>
                  <p className="text-base font-bold text-slate-800 mt-0.5">{formatCurrency(total)}</p>
                </div>
              ))}
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="text-center py-16 text-slate-400">Loading…</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-4xl mb-3">💳</p>
              <p className="font-medium text-slate-500">No expenses match your filters</p>
              <p className="text-sm mt-1">Try adjusting the filters above or add a new expense</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-3 px-1">
                <span className="text-xs text-slate-400 uppercase tracking-wide">
                  {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
                  {allExpenses.length !== expenses.length && (
                    <span className="ml-1 text-indigo-500">(of {allExpenses.length} total)</span>
                  )}
                </span>
                <span className="text-sm font-bold text-slate-700">
                  Total: {formatCurrency(totalVisible)}
                </span>
              </div>

              <div className="space-y-2">
                {expenses.map((exp) => (
                  <div
                    key={exp._id}
                    className="bg-white rounded-xl border border-slate-200 flex items-center gap-4 px-4 py-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="text-xs text-slate-400 font-mono w-24 shrink-0">
                      {formatDate(exp.date)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {exp.description || <span className="text-slate-300 italic">No description</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {exp.card && (
                          <span className="text-xs text-slate-400">💳 {exp.card}</span>
                        )}
                        {exp.category && (
                          <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">
                            🗂️ {exp.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-rose-500 shrink-0">
                      {formatCurrency(exp.amount)}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setEditItem(exp)}
                        className="text-xs text-slate-400 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(exp._id)}
                        className="text-xs text-slate-300 hover:text-rose-400 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

// ── Small filter chip ──────────────────────────────────────────────────────
const FilterChip = ({ label, value, onRemove }) => (
  <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
    <span className="font-medium">{label}:</span>
    <span>{value}</span>
    <button onClick={onRemove} className="ml-0.5 hover:text-indigo-900">✕</button>
  </span>
);

// ── Expense form ───────────────────────────────────────────────────────────
const ExpenseForm = ({ initial, onSave, onCancel, loading, opts, tsFromDate, dateFromTs }) => {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (initial) {
      setForm({
        date:        dateFromTs ? dateFromTs(initial.date) : "",
        amount:      initial.amount ?? "",
        card:        initial.card     || "",
        category:    initial.category || "",
        description: initial.description || "",
      });
    }
  }, [initial, dateFromTs]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      date:        tsFromDate(form.date),
      amount:      parseFloat(form.amount),
      card:        form.card,
      category:    form.category,
      description: form.description,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" required>
          <input
            type="date" value={form.date}
            onChange={(e) => set("date", e.target.value)}
            required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800
              focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
        </Field>
        <Field label="Amount (₹)" required>
          <input
            type="number" min="0" step="0.01" placeholder="e.g. 2500"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            onWheel={(e) => e.target.blur()}
            required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800
              focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Card Used">
          <Select
            options={opts("card")}
            value={form.card}
            onChange={(e) => set("card", e.target.value)}
            placeholder="Select card"
          />
        </Field>
        <Field label="Category">
          <Select
            options={opts("expenseCategory")}
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="Select category"
          />
        </Field>
      </div>
      <Field label="Description">
        <input
          type="text" placeholder="What was this for?"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800
            focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white placeholder-slate-300"
        />
      </Field>
      <div className="flex gap-3 pt-2">
        <Btn variant="secondary" type="button" onClick={onCancel} className="flex-1">Cancel</Btn>
        <Btn variant="primary"   type="submit" disabled={loading} className="flex-1">
          {loading ? "Saving…" : initial ? "Update" : "Add Expense"}
        </Btn>
      </div>
    </form>
  );
};

export default ExpenseTracker;