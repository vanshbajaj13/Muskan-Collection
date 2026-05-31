import React, { useState, useEffect, useCallback } from "react";
import { usePhone } from "./PhoneContext";
import { Btn, Select, Field, Modal, Toast, ConfirmModal } from "./PhoneUI";

const EMPTY_FORM = { date: "", amount: "", card: "", description: "" };

const ExpenseTracker = () => {
  const {
    getExpenses, createExpense, updateExpense, deleteExpense,
    formatCurrency, formatDate, tsFromDate, dateFromTs,
    opts,
  } = usePhone();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
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

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

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

  // All unique cards from expenses (for filter)
  const allCards = ["all", ...Array.from(new Set(expenses.map((e) => e.card || "Unknown").filter(Boolean)))];

  const visible = expenses.filter((e) => {
    if (cardFilter === "all") return true;
    return (e.card || "Unknown") === cardFilter;
  });

  const totalVisible = visible.reduce((s, e) => s + e.amount, 0);

  // By-card summary
  const byCard = expenses.reduce((acc, e) => {
    const key = e.card || "Unknown";
    acc[key] = (acc[key] || 0) + e.amount;
    return acc;
  }, {});

  return (
    <div className="relative">
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {showAdd && (
        <Modal title="Add Personal Expense" onClose={() => setShowAdd(false)}>
          <ExpenseForm onSave={handleCreate} onCancel={() => setShowAdd(false)} loading={saving} opts={opts} tsFromDate={tsFromDate} />
        </Modal>
      )}

      {editItem && (
        <Modal title="Edit Expense" onClose={() => setEditItem(null)}>
          <ExpenseForm
            initial={editItem}
            onSave={handleUpdate}
            onCancel={() => setEditItem(null)}
            loading={saving}
            opts={opts}
            tsFromDate={tsFromDate}
            dateFromTs={dateFromTs}
          />
        </Modal>
      )}

      {confirmDeleteId && (
        <ConfirmModal
          title="Delete this expense?"
          body="This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteId(null)}
          loading={deleting}
        />
      )}

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Personal Expenses</h2>
          <p className="text-sm text-slate-400">Track your card spends separately from business</p>
        </div>
        <Btn variant="primary" onClick={() => setShowAdd(true)}>+ Add Expense</Btn>
      </div>

      {/* ── By-card summary ───────────────────────────────────────── */}
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

      {/* ── Card filter tabs ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {allCards.map((c) => (
          <button
            key={c}
            onClick={() => setCardFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${cardFilter === c
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-500 hover:border-indigo-300"
              }`}
          >
            {c === "all" ? `All (${expenses.length})` : c}
          </button>
        ))}
      </div>

      {/* ── Expenses list ─────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">💳</p>
          <p className="font-medium text-slate-500">No expenses yet</p>
          <p className="text-sm mt-1">Click '+ Add Expense' to get started</p>
        </div>
      ) : (
        <>
          {/* Total row */}
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
                {/* Date */}
                <div className="text-xs text-slate-400 font-mono w-24 shrink-0">
                  {formatDate(exp.date)}
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {exp.description || <span className="text-slate-300 italic">No description</span>}
                  </p>
                  {exp.card && (
                    <p className="text-xs text-slate-400">💳 {exp.card}</p>
                  )}
                </div>

                {/* Amount */}
                <div className="text-sm font-bold text-rose-500 shrink-0">
                  {formatCurrency(exp.amount)}
                </div>

                {/* Actions */}
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
    </div>
  );
};

// ── Expense form (add / edit) ──────────────────────────────────────────────
const ExpenseForm = ({ initial, onSave, onCancel, loading, opts, tsFromDate, dateFromTs }) => {
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
        <Btn variant="secondary" type="button" onClick={onCancel} className="flex-1">Cancel</Btn>
        <Btn variant="primary" type="submit" disabled={loading} className="flex-1">
          {loading ? "Saving…" : initial ? "Update" : "Add Expense"}
        </Btn>
      </div>
    </form>
  );
};

export default ExpenseTracker;