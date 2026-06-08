import React, { useState } from "react";
import { useFP } from "./FamilyPlannerContext";
import {
  SectionHead, Badge, Btn, Field, FPInput, Toast, FullSpinner,
} from "./FamilyPlannerUI";

const DROPDOWN_TYPES = [
  {
    key: "incomeType",
    label: "Income Types",
    icon: "💰",
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    badgeColor: "green",
    placeholder: "e.g. Salary, Freelance, Rental…",
    description: "Categories for income sources",
  },
  {
    key: "expenseCategory",
    label: "Expense Categories",
    icon: "💸",
    color: "bg-rose-50 border-rose-200 text-rose-700",
    badgeColor: "red",
    placeholder: "e.g. Groceries, Utilities, EMI…",
    description: "Categories for expenses",
  },
  {
    key: "person",
    label: "People",
    icon: "👤",
    color: "bg-blue-50 border-blue-200 text-blue-700",
    badgeColor: "blue",
    placeholder: "e.g. Ramesh, Bank of India…",
    description: "People for debt & loan tracking",
  },
];

export default function FPSettings() {
  const { dropdowns, addDropdown, deleteDropdown, fetchAll, loading } = useFP();
  const [inputs, setInputs] = useState({ incomeType: "", expenseCategory: "", person: "" });
  const [adding, setAdding] = useState({});
  const [toast, setToast] = useState(null);

  const notify = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async (type) => {
    const val = inputs[type]?.trim();
    if (!val) return;
    setAdding(a => ({ ...a, [type]: true }));
    try {
      await addDropdown(type, val);
      setInputs(i => ({ ...i, [type]: "" }));
      notify(`Added "${val}"`);
    } catch (e) {
      notify(e.message || "Already exists", "error");
    } finally {
      setAdding(a => ({ ...a, [type]: false }));
    }
  };

  const handleDelete = async (type, id, value) => {
    try {
      await deleteDropdown(type, id);
      notify(`Removed "${value}"`);
    } catch {
      notify("Failed to remove", "error");
    }
  };

  if (loading) return <FullSpinner message="Loading settings…" />;

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      <SectionHead title="Settings" sub="Manage dropdown options used across the planner">
        <Btn variant="secondary" onClick={fetchAll}>↺ Refresh</Btn>
      </SectionHead>

      {/* Info banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-700">
        <p className="font-semibold mb-0.5">Dropdown Management</p>
        <p className="text-indigo-600 text-xs">
          Add or remove options that appear in Income, Expenses, and Debt forms.
          Removing an option here won't delete existing entries that use it.
        </p>
      </div>

      {/* One section per dropdown type */}
      {DROPDOWN_TYPES.map(dt => {
        const items = dropdowns[dt.key] || [];
        return (
          <div key={dt.key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Section header */}
            <div className={`px-5 py-3 border-b flex items-center gap-2 ${dt.color}`}>
              <span className="text-lg">{dt.icon}</span>
              <div className="flex-1">
                <p className="font-bold text-sm">{dt.label}</p>
                <p className="text-xs opacity-70">{dt.description}</p>
              </div>
              <Badge color={dt.badgeColor}>{items.length}</Badge>
            </div>

            {/* Add input */}
            <div className="px-5 py-3 border-b border-slate-100 flex gap-2">
              <FPInput
                value={inputs[dt.key] || ""}
                onChange={e => setInputs(i => ({ ...i, [dt.key]: e.target.value }))}
                placeholder={dt.placeholder}
                className="flex-1"
                onKeyDown={e => e.key === "Enter" && handleAdd(dt.key)}
              />
              <Btn
                variant="primary"
                onClick={() => handleAdd(dt.key)}
                disabled={adding[dt.key] || !inputs[dt.key]?.trim()}
                className="shrink-0"
              >
                {adding[dt.key] ? "Adding…" : "+ Add"}
              </Btn>
            </div>

            {/* Items list */}
            <div className="px-5 py-3">
              {items.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-4">
                  No {dt.label.toLowerCase()} yet — add one above
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {items.map(opt => (
                    <div
                      key={opt._id}
                      className="flex items-center gap-1.5 bg-slate-100 rounded-full pl-3 pr-1.5 py-1.5"
                    >
                      <span className="text-sm text-slate-700 font-medium">{opt.value}</span>
                      <button
                        onClick={() => handleDelete(dt.key, opt._id, opt.value)}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors text-xs"
                        title={`Remove ${opt.value}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Data management section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <p className="font-bold text-sm text-slate-700">⚙️ Data Management</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Sync all data</p>
              <p className="text-xs text-slate-400">Re-fetch income, expenses, debts and goals from server</p>
            </div>
            <Btn variant="secondary" onClick={fetchAll}>↺ Refresh All</Btn>
          </div>
        </div>
      </div>

      {/* Quick guide */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Quick Guide</p>
        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex gap-2">
            <span className="text-emerald-500 font-bold">💰</span>
            <span><strong>Income Types</strong> — used when adding income sources (e.g. Salary, Business, Freelance)</span>
          </div>
          <div className="flex gap-2">
            <span className="text-rose-500 font-bold">💸</span>
            <span><strong>Expense Categories</strong> — used when adding expenses (e.g. Groceries, EMI, Utilities)</span>
          </div>
          <div className="flex gap-2">
            <span className="text-blue-500 font-bold">👤</span>
            <span><strong>People</strong> — used in Debts section to identify who you borrowed from or lent to</span>
          </div>
        </div>
      </div>
    </div>
  );
}