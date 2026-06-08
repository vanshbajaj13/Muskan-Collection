import React, { useState } from "react";
import { useFP } from "./FamilyPlannerContext";
import {
  Btn,
  FPInput,
  Toast,
  FullSpinner,
  ConfirmModal,
} from "./FamilyPlannerUI";

const DROPDOWN_TYPES = [
  {
    key: "incomeType",
    label: "Income Types",
    icon: "",
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    badgeColor: "green",
    placeholder: "e.g. Salary, Freelance, Rental…",
    description: "Categories for income sources",
    hint: "Income sources used across the planner",
  },
  {
    key: "expenseCategory",
    label: "Expense Categories",
    icon: "",
    color: "bg-rose-50 border-rose-200 text-rose-700",
    badgeColor: "red",
    placeholder: "e.g. Groceries, Utilities, EMI…",
    description: "Categories for expenses",
    hint: "Expense tags used when logging costs",
  },
  {
    key: "person",
    label: "People",
    icon: "",
    color: "bg-blue-50 border-blue-200 text-blue-700",
    badgeColor: "blue",
    placeholder: "e.g. Ramesh, Bank of India…",
    description: "People for debt & loan tracking",
    hint: "Contacts used in Debts & Loans",
  },
];

export default function FPSettings() {
  const { dropdowns, addDropdown, deleteDropdown, renameDropdown, loading } =
    useFP();

  const [activeType, setActiveType] = useState("incomeType");
  const [inputs, setInputs] = useState({
    incomeType: "",
    expenseCategory: "",
    person: "",
  });
  const [adding, setAdding] = useState({});
  const [toast, setToast] = useState(null);

  // Rename state
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const notify = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async (type) => {
    const val = inputs[type]?.trim();
    if (!val) return;
    setAdding((a) => ({ ...a, [type]: true }));
    try {
      await addDropdown(type, val);
      setInputs((i) => ({ ...i, [type]: "" }));
      notify(`Added "${val}"`);
    } catch (e) {
      notify(e.message || "Already exists", "error");
    } finally {
      setAdding((a) => ({ ...a, [type]: false }));
    }
  };

  const requestDelete = (type, id, value) => {
    setDeleteTarget({ type, id, value });
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteDropdown(deleteTarget.type, deleteTarget.id);
      notify(`Removed "${deleteTarget.value}"`);
      setDeleteTarget(null);
      setDeleteConfirmOpen(false);
    } catch {
      notify("Failed to remove", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const startRename = (type, id, currentValue) => {
    setRenaming({ type, id });
    setRenameValue(currentValue);
  };

  const cancelRename = () => {
    setRenaming(null);
    setRenameValue("");
  };

  const handleRename = async () => {
    if (!renaming || !renameValue.trim()) return;
    setRenameSaving(true);
    try {
      if (typeof renameDropdown === "function") {
        await renameDropdown(renaming.type, renaming.id, renameValue.trim());
      } else {
        await deleteDropdown(renaming.type, renaming.id);
        await addDropdown(renaming.type, renameValue.trim());
      }
      notify(`Renamed to "${renameValue.trim()}"`);
      cancelRename();
    } catch (e) {
      notify(e.message || "Rename failed", "error");
    } finally {
      setRenameSaving(false);
    }
  };

  if (loading) return <FullSpinner message="Loading settings…" />;

  const activeMeta = DROPDOWN_TYPES.find((dt) => dt.key === activeType);
  const activeItems = dropdowns[activeType] || [];

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {/* Info banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-700">
        <p className="font-semibold mb-0.5">Dropdown Management</p>
        <p className="text-indigo-600 text-xs">
          Add, rename, or remove options that appear in Income, Expenses, and
          Debt forms. Removing an option here won't delete existing entries that
          use it.
        </p>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-4 flex-col md:flex-row">
        {/* ── Left: type selector ── */}
        <div className="md:w-56 shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {DROPDOWN_TYPES.map((dt) => {
              const count = (dropdowns[dt.key] || []).length;
              const isActive = activeType === dt.key;
              return (
                <button
                  key={dt.key}
                  onClick={() => setActiveType(dt.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-100 last:border-0
                    ${
                      isActive
                        ? "bg-indigo-50 border-l-2 border-l-indigo-500"
                        : "hover:bg-slate-50"
                    }`}
                >
                  <span className="text-lg">{dt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${isActive ? "text-indigo-700" : "text-slate-700"}`}
                    >
                      {dt.label}
                    </p>
                    <p className="text-xs text-slate-400">
                      {count} option{count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: active type panel ── */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-slate-200">
            {/* Panel header */}
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">{activeMeta?.icon}</span>
                <div>
                  <h3 className="font-semibold text-slate-800">
                    {activeMeta?.label}
                  </h3>
                  <p className="text-xs text-slate-400">{activeMeta?.hint}</p>
                </div>
              </div>
            </div>

            {/* Add input */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex gap-2">
                <FPInput
                  value={inputs[activeType] || ""}
                  onChange={(e) =>
                    setInputs((i) => ({ ...i, [activeType]: e.target.value }))
                  }
                  placeholder={activeMeta?.placeholder}
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd(activeType)}
                />
                <Btn
                  variant="primary"
                  onClick={() => handleAdd(activeType)}
                  disabled={adding[activeType] || !inputs[activeType]?.trim()}
                  className="shrink-0"
                >
                  {adding[activeType] ? "Adding…" : "+ Add"}
                </Btn>
              </div>
            </div>

            {/* Items list */}
            {activeItems.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p className="text-3xl mb-2">{activeMeta?.icon}</p>
                <p className="text-sm font-medium text-slate-500">
                  No options yet
                </p>
                <p className="text-xs mt-1">Add your first one above</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeItems.map((opt) => {
                  const isEditingThis =
                    renaming?.type === activeType && renaming?.id === opt._id;
                  return (
                    <div
                      key={opt._id}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      {isEditingThis ? (
                        /* Edit mode */
                        <div className="flex-1 flex gap-2">
                          <FPInput
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRename();
                              if (e.key === "Escape") cancelRename();
                            }}
                            autoFocus
                            className="flex-1"
                          />
                          <Btn
                            variant="primary"
                            className="text-xs py-1.5 px-3"
                            onClick={handleRename}
                            disabled={renameSaving || !renameValue.trim()}
                          >
                            {renameSaving ? "Saving…" : "Save"}
                          </Btn>
                          <Btn
                            variant="secondary"
                            className="text-xs py-1.5 px-3"
                            onClick={cancelRename}
                          >
                            Cancel
                          </Btn>
                        </div>
                      ) : (
                        /* View mode */
                        <>
                          <span className="flex-1 text-sm text-slate-700 font-medium">
                            {opt.value}
                          </span>
                          <button
                            onClick={() =>
                              startRename(activeType, opt._id, opt.value)
                            }
                            className="text-xs text-slate-400 hover:text-indigo-600 transition-colors px-2 py-1 rounded hover:bg-indigo-50"
                            title={`Rename ${opt.value}`}
                          >
                            ✎ Rename
                          </button>
                          <button
                            onClick={() =>
                              requestDelete(activeType, opt._id, opt.value)
                            }
                            className="text-xs text-slate-300 hover:text-rose-400 transition-colors px-2 py-1 rounded hover:bg-rose-50"
                            title={`Remove ${opt.value}`}
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-xs text-amber-700">
            <strong>Rename:</strong> Click <em>✎ Rename</em> to edit inline —
            updates the label everywhere.
            <br />
            <strong>Remove:</strong> Deletes from future dropdowns but keeps
            existing entries intact.
          </div>
        </div>
      </div>

      {/* Delete confirm modal */}
      {deleteConfirmOpen && deleteTarget && (
        <ConfirmModal
          title={`Remove "${deleteTarget.value}"?`}
          body={`This option will be removed from all dropdown menus. Existing entries that use it won't be affected.`}
          onConfirm={handleDelete}
          onCancel={() => {
            setDeleteConfirmOpen(false);
            setDeleteTarget(null);
          }}
          loading={deleteLoading}
          confirmTextRequired
        />
      )}
    </div>
  );
}
