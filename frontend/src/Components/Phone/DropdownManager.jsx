import React, { useState } from "react";
import { usePhone } from "./PhoneContext";
import { Btn, Input, Toast } from "./PhoneUI";

const TYPES = [
  { key: "product",       label: "Products",         icon: "📱", hint: "Phone models you buy/sell" },
  { key: "purchasedFrom", label: "Purchased From",   icon: "🏪", hint: "Shops / platforms (Amazon, Flipkart…)" },
  { key: "account",       label: "Accounts",         icon: "👤", hint: "Whose account was used" },
  { key: "soldTo",        label: "Sold To",          icon: "🤝", hint: "Buyers you sell to" },
  { key: "commissionTo",  label: "Commission To",    icon: "💰", hint: "People you pay commission" },
  { key: "card",          label: "Credit Cards",     icon: "💳", hint: "Cards used for purchases" },
];

const DropdownManager = () => {
  const { dropdowns, loadingDropdowns, addDropdown, renameDropdown, deleteDropdown } = usePhone();
  const [activeType, setActiveType] = useState("product");
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const activeOptions = dropdowns[activeType] || [];
  const activeTypeMeta = TYPES.find((t) => t.key === activeType);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newValue.trim()) return;
    setAdding(true);
    try {
      await addDropdown(activeType, newValue.trim());
      setNewValue("");
      showToast(`"${newValue.trim()}" added!`);
    } catch (err) {
      showToast(err.message || "Failed to add", "error");
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (opt) => {
    setEditingId(opt._id);
    setEditValue(opt.value);
  };

  const handleRename = async (id) => {
    if (!editValue.trim()) return;
    setSavingEdit(true);
    try {
      await renameDropdown(id, editValue.trim());
      setEditingId(null);
      showToast("Renamed & updated in all records ✓");
    } catch {
      showToast("Failed to rename", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id, value) => {
    if (!window.confirm(`Deactivate "${value}"? It won't appear in future forms but existing records are kept.`)) return;
    setDeletingId(id);
    try {
      await deleteDropdown(id);
      showToast(`"${value}" deactivated`);
    } catch {
      showToast("Failed to delete", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="relative">
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-800">Dropdown Options</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Manage options for all dropdowns. Renaming updates every existing record automatically.
        </p>
      </div>

      <div className="flex gap-4 flex-col md:flex-row">
        {/* ── Left: type selector ─────────────────────────────────── */}
        <div className="md:w-56 shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {TYPES.map((t) => {
              const count = (dropdowns[t.key] || []).length;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveType(t.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-100 last:border-0
                    ${activeType === t.key
                      ? "bg-indigo-50 border-l-2 border-l-indigo-500"
                      : "hover:bg-slate-50"
                    }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${activeType === t.key ? "text-indigo-700" : "text-slate-700"}`}>
                      {t.label}
                    </p>
                    <p className="text-xs text-slate-400">{count} option{count !== 1 ? "s" : ""}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: options list ──────────────────────────────────── */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-slate-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">{activeTypeMeta?.icon}</span>
                <div>
                  <h3 className="font-semibold text-slate-800">{activeTypeMeta?.label}</h3>
                  <p className="text-xs text-slate-400">{activeTypeMeta?.hint}</p>
                </div>
              </div>
            </div>

            {/* Add new option form */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <form onSubmit={handleAdd} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder={`Add new ${activeTypeMeta?.label.toLowerCase().replace(/s$/, "")}…`}
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                  />
                </div>
                <Btn type="submit" variant="primary" disabled={adding || !newValue.trim()}>
                  {adding ? "Adding…" : "+ Add"}
                </Btn>
              </form>
            </div>

            {/* Options list */}
            {loadingDropdowns ? (
              <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>
            ) : activeOptions.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p className="text-3xl mb-2">{activeTypeMeta?.icon}</p>
                <p className="text-sm font-medium text-slate-500">No options yet</p>
                <p className="text-xs mt-1">Add your first one above</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeOptions.map((opt) => (
                  <div key={opt._id} className="flex items-center gap-3 px-5 py-3">
                    {editingId === opt._id ? (
                      /* Edit mode */
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(opt._id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                          className="flex-1"
                        />
                        <Btn
                          variant="primary"
                          className="text-xs py-1.5 px-3"
                          onClick={() => handleRename(opt._id)}
                          disabled={savingEdit}
                        >
                          {savingEdit ? "Saving…" : "Save"}
                        </Btn>
                        <Btn
                          variant="secondary"
                          className="text-xs py-1.5 px-3"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Btn>
                      </div>
                    ) : (
                      /* View mode */
                      <>
                        <span className="flex-1 text-sm text-slate-700 font-medium">{opt.value}</span>
                        <button
                          onClick={() => startEdit(opt)}
                          className="text-xs text-slate-400 hover:text-indigo-600 transition-colors px-2 py-1 rounded hover:bg-indigo-50"
                          title="Rename"
                        >
                          ✎ Rename
                        </button>
                        <button
                          onClick={() => handleDelete(opt._id, opt.value)}
                          disabled={deletingId === opt._id}
                          className="text-xs text-slate-300 hover:text-rose-400 transition-colors px-2 py-1 rounded hover:bg-rose-50"
                          title="Deactivate"
                        >
                          {deletingId === opt._id ? "…" : "✕"}
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-xs text-amber-700">
            <strong>Rename = auto-update:</strong> Renaming any option will automatically update it in every existing deal and expense record. No manual work needed.
            <br />
            <strong>Deactivate:</strong> Removes from future dropdowns but keeps existing records intact.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DropdownManager;