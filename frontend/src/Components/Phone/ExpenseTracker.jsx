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

const EMPTY_FORM = { date: "", amount: "", card: "", description: "" };

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

  // By card
  const byCard = expenses.reduce((acc, e) => {
    const k = e.card || "Unknown";
    acc[k] = (acc[k] || 0) + e.amount;
    return acc;
  }, {});

  // By month
  const byMonth = expenses.reduce((acc, e) => {
    const d = new Date(e.date);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    acc[k] = (acc[k] || 0) + e.amount;
    return acc;
  }, {});
  const monthEntries = Object.entries(byMonth).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  // By description category (top 8)
  const byDesc = expenses.reduce((acc, e) => {
    const k = e.description || "Uncategorised";
    acc[k] = (acc[k] || 0) + e.amount;
    return acc;
  }, {});
  const topDesc = Object.entries(byDesc)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  // Card spend doughnut
  const cardChartData = {
    labels: Object.keys(byCard),
    datasets: [
      {
        data: Object.values(byCard),
        backgroundColor: getColors(Object.keys(byCard).length),
        borderWidth: 1,
      },
    ],
  };

  // Monthly spend line
  const monthlyChartData = {
    labels: monthEntries.map(([m]) => m.slice(5) + "/" + m.slice(2, 4)),
    datasets: [
      {
        label: "Monthly Spend",
        data: monthEntries.map(([, v]) => v),
        borderColor: "rgba(99, 102, 241, 0.9)",
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      },
    ],
  };

  // Top categories bar
  const catChartData = {
    labels: topDesc.map(([k]) => k),
    datasets: [
      {
        label: "Amount (₹)",
        data: topDesc.map(([, v]) => v),
        backgroundColor: getColors(topDesc.length),
        borderWidth: 1,
      },
    ],
  };

  const chartBase = { maintainAspectRatio: false };
  const yRupee = {
    ticks: {
      callback: (v) => `₹${(v / 1000).toFixed(0)}k`,
      font: { size: 11 },
    },
    grid: { color: "rgba(0,0,0,0.05)" },
  };

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SCard label="Total Spent" value={INR(totalSpend)} accent="rose" />
        <SCard label="No. of Entries" value={expenses.length} accent="slate" />
        <SCard
          label="Cards Used"
          value={Object.keys(byCard).length}
          accent="indigo"
        />
        <SCard
          label="Avg per Entry"
          value={INR(totalSpend / expenses.length)}
          accent="amber"
        />
      </div>

      {/* Monthly trend */}
      {monthEntries.length > 0 && (
        <Section title="Monthly Spend Trend" height="h-64">
          <Line
            data={monthlyChartData}
            options={{
              ...chartBase,
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => ` ${INR(c.parsed.y)}` } },
              },
              scales: { y: yRupee, x: { ticks: { font: { size: 11 } } } },
            }}
          />
        </Section>
      )}

      {/* Card split + top categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Object.keys(byCard).length > 0 && (
          <Section title="Spend by Card" height="h-64">
            <Doughnut
              data={cardChartData}
              options={{
                ...chartBase,
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: { font: { size: 11 }, padding: 10 },
                  },
                  tooltip: {
                    callbacks: {
                      label: (c) => ` ${c.label}: ${INR(c.parsed)}`,
                    },
                  },
                },
              }}
            />
          </Section>
        )}
        {topDesc.length > 0 && (
          <Section title="Top Spend Categories" height="h-64">
            <Bar
              data={catChartData}
              options={{
                ...chartBase,
                indexAxis: "y",
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: { label: (c) => ` ${INR(c.parsed.x)}` },
                  },
                },
                scales: {
                  x: { ...yRupee },
                  y: { ticks: { font: { size: 11 } } },
                },
              }}
            />
          </Section>
        )}
      </div>

      {/* Per-card breakdown */}
      {Object.keys(byCard).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
            Card-wise Totals
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(byCard)
              .sort(([, a], [, b]) => b - a)
              .map(([card, total]) => (
                <div
                  key={card}
                  className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3"
                >
                  <p className="text-xs text-slate-400 truncate">💳 {card}</p>
                  <p className="text-base font-bold text-slate-800 mt-0.5">
                    {INR(total)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {((total / totalSpend) * 100).toFixed(1)}% of total
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Small helpers for dashboard
const SCard = ({ label, value, accent = "slate" }) => {
  const colors = {
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-700",
    rose: "bg-rose-50   border-rose-100   text-rose-600",
    amber: "bg-amber-50  border-amber-100  text-amber-700",
    slate: "bg-slate-50  border-slate-100  text-slate-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[accent]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
        {label}
      </p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
};

const Section = ({ title, children, height = "h-72" }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5">
    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">
      {title}
    </h3>
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

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Inner tab: list vs dashboard
  const [activeTab, setActiveTab] = useState("list");

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmEdit, setConfirmEdit] = useState(null);

  // Filter
  const [cardFilter, setCardFilter] = useState("all");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getExpenses();
      setExpenses(data.expenses || []);
    } catch {
      showToast("Failed to load expenses", "error");
    } finally {
      setLoading(false);
    }
  }, [getExpenses]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

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

  const handleUpdateRequest = (payload) => {
    setConfirmEdit(payload);
  };

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

  const allCards = [
    "all",
    ...Array.from(
      new Set(expenses.map((e) => e.card || "Unknown").filter(Boolean)),
    ),
  ];

  const visible = expenses.filter((e) => {
    if (cardFilter === "all") return true;
    return (e.card || "Unknown") === cardFilter;
  });

  const totalVisible = visible.reduce((s, e) => s + e.amount, 0);

  const byCard = expenses.reduce((acc, e) => {
    const key = e.card || "Unknown";
    acc[key] = (acc[key] || 0) + e.amount;
    return acc;
  }, {});

  return (
    <div className="relative">
      {/* Full-screen spinner for save/delete */}
      {(saving || deleting) && (
        <FullScreenSpinner message={saving ? "Saving…" : "Deleting…"} />
      )}

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
        <Modal title="Add Personal Expense" onClose={() => setShowAdd(false)}>
          <ExpenseForm
            onSave={handleCreate}
            onCancel={() => setShowAdd(false)}
            loading={saving}
            opts={opts}
            tsFromDate={tsFromDate}
          />
        </Modal>
      )}

      {editItem && (
        <Modal title="Edit Expense" onClose={() => setEditItem(null)}>
          <ExpenseForm
            initial={editItem}
            onSave={handleUpdateRequest}
            onCancel={() => setEditItem(null)}
            loading={saving}
            opts={opts}
            tsFromDate={tsFromDate}
            dateFromTs={dateFromTs}
          />
        </Modal>
      )}

      {confirmEdit && (
        <ConfirmModal
          title="Update Expense"
          body="Type CONFIRM to update this expense."
          confirmTextRequired={true}
          loading={saving}
          onCancel={() => setConfirmEdit(null)}
          onConfirm={async () => {
            await handleUpdate(confirmEdit);
            setConfirmEdit(null);
          }}
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

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Personal Expenses
          </h2>
          <p className="text-sm text-slate-400">
            Track your card spends separately from business
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Inner tabs */}
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
            {[
              { key: "list", label: "📋 List" },
              { key: "dashboard", label: "📊 Analytics" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                  ${
                    activeTab === t.key
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Btn variant="primary" onClick={() => setShowAdd(true)}>
            + Add Expense
          </Btn>
        </div>
      </div>

      {/* ── Dashboard tab ──────────────────────────────────────────── */}
      {activeTab === "dashboard" &&
        (loading ? (
          <div className="text-center py-16 text-slate-400">Loading…</div>
        ) : (
          <ExpenseDashboard
            expenses={expenses}
            formatCurrency={formatCurrency}
          />
        ))}

      {/* ── List tab ───────────────────────────────────────────────── */}
      {activeTab === "list" && (
        <>
          {/* By-card summary */}
          {Object.keys(byCard).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {Object.entries(byCard).map(([card, total]) => (
                <div
                  key={card}
                  className="bg-white rounded-xl border border-slate-200 px-4 py-3"
                >
                  <p className="text-xs text-slate-400 truncate">💳 {card}</p>
                  <p className="text-base font-bold text-slate-800 mt-0.5">
                    {formatCurrency(total)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Card filter tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {allCards.map((c) => (
              <button
                key={c}
                onClick={() => setCardFilter(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${
                    cardFilter === c
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-500 hover:border-indigo-300"
                  }`}
              >
                {c === "all" ? `All (${expenses.length})` : c}
              </button>
            ))}
          </div>

          {/* Expenses list */}
          {loading ? (
            <div className="text-center py-16 text-slate-400">Loading…</div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-4xl mb-3">💳</p>
              <p className="font-medium text-slate-500">No expenses yet</p>
              <p className="text-sm mt-1">
                Click '+ Add Expense' to get started
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-3 px-1">
                <span className="text-xs text-slate-400 uppercase tracking-wide">
                  {visible.length} expense{visible.length !== 1 ? "s" : ""}
                </span>
                <span className="text-sm font-bold text-slate-700">
                  Total: {formatCurrency(totalVisible)}
                </span>
              </div>

              <div className="space-y-2">
                {visible.map((exp) => (
                  <div
                    key={exp._id}
                    className="bg-white rounded-xl border border-slate-200 flex items-center gap-4 px-4 py-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="text-xs text-slate-400 font-mono w-24 shrink-0">
                      {formatDate(exp.date)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {exp.description || (
                          <span className="text-slate-300 italic">
                            No description
                          </span>
                        )}
                      </p>
                      {exp.card && (
                        <p className="text-xs text-slate-400">💳 {exp.card}</p>
                      )}
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

// ── Expense form ───────────────────────────────────────────────────────────
const ExpenseForm = ({
  initial,
  onSave,
  onCancel,
  loading,
  opts,
  tsFromDate,
  dateFromTs,
}) => {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (initial) {
      setForm({
        date: dateFromTs ? dateFromTs(initial.date) : "",
        amount: initial.amount ?? "",
        card: initial.card || "",
        description: initial.description || "",
      });
    }
  }, [initial, dateFromTs]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      date: tsFromDate(form.date),
      amount: parseFloat(form.amount),
      card: form.card,
      description: form.description,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" required>
          <input
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800
              focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
        </Field>
        <Field label="Amount (₹)" required>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 2500"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            onWheel={(e) => e.target.blur()}
            required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800
              focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
        </Field>
      </div>
      <Field label="Card Used">
        <Select
          options={opts("card")}
          value={form.card}
          onChange={(e) => set("card", e.target.value)}
          placeholder="Select card"
        />
      </Field>
      <Field label="Description">
        <input
          type="text"
          placeholder="What was this for?"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800
            focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white placeholder-slate-300"
        />
      </Field>
      <div className="flex gap-3 pt-2">
        <Btn
          variant="secondary"
          type="button"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Btn>
        <Btn
          variant="primary"
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? "Saving…" : initial ? "Update" : "Add Expense"}
        </Btn>
      </div>
    </form>
  );
};

export default ExpenseTracker;
