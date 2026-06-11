import React, { useState } from "react";
import { useCar } from "./CarContext";
import {
  Btn,
  Input,
  Toast,
  ConfirmModal,
  Spinner,
  FullScreenSpinner,
} from "./CarUI";

const TYPES = [
  { key: "partner", label: "Partners", hint: "People who invest in deals" },
  { key: "boughtFrom", label: "Bought From", hint: "Sources you buy from" },
  { key: "soldTo", label: "Sold To", hint: "People you sell to" },
  { key: "make", label: "Car Makes", hint: "e.g. Maruti, Hyundai, Honda" },
];

const CarDropdownManager = () => {
  const {
    dropdowns,
    loadingDropdowns,
    addDropdown,
    renameDropdown,
    deleteDropdown,
  } = useCar();

  const [activeType, setActiveType] = useState("partner");
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [renameModal, setRenameModal] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const activeOptions = dropdowns[activeType] || [];
  const activeMeta = TYPES.find((t) => t.key === activeType);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newValue.trim()) return;
    setAdding(true);
    try {
      await addDropdown(activeType, newValue.trim());
      setNewValue("");
      showToast(`"${newValue.trim()}" added.`);
    } catch (err) {
      showToast(err.message || "Failed to add.", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleRename = (id) => {
    if (
      !editValue.trim() ||
      editValue.trim() ===
        (dropdowns[activeType] || []).find((o) => o._id === id)?.value
    )
      return;
    setRenameModal({ id, newValue: editValue.trim() });
  };

  const doRename = async () => {
    setSavingEdit(true);
    try {
      await renameDropdown(renameModal.id, renameModal.newValue);
      setEditingId(null);
      setRenameModal(null);
      showToast("Renamed successfully.");
    } catch {
      showToast("Failed to rename.", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="relative">
      {(savingEdit || deletingId) && (
        <FullScreenSpinner message={savingEdit ? "Renaming…" : "Deleting…"} />
      )}

      {confirmModal && (
        <ConfirmModal
          title="Delete option?"
          body={`"${confirmModal.value}" will be permanently removed.`}
          loading={deletingId === confirmModal.id}
          onCancel={() => setConfirmModal(null)}
          onConfirm={async () => {
            setDeletingId(confirmModal.id);
            try {
              await deleteDropdown(confirmModal.id);
              showToast(`"${confirmModal.value}" deleted.`);
            } catch {
              showToast("Failed to delete.", "error");
            } finally {
              setDeletingId(null);
              setConfirmModal(null);
            }
          }}
        />
      )}

      {renameModal && (
        <ConfirmModal
          title="Save rename?"
          body={`This will be saved as "${renameModal.newValue}".`}
          loading={savingEdit}
          onCancel={() => setRenameModal(null)}
          onConfirm={doRename}
        />
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

      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-800">Manage Options</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Add and edit dropdown values used across deals.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Type selector — horizontal pills on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {TYPES.map((t) => {
            const count = (dropdowns[t.key] || []).length;
            const active = activeType === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveType(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors
                  ${active ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                {t.label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-bold
                  ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Panel header */}
          <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-bold text-slate-700">
              {activeMeta?.label}
            </p>
            <p className="text-xs text-slate-400">{activeMeta?.hint}</p>
          </div>

          {/* Add form */}
          <div className="px-4 py-3.5 border-b border-slate-100">
            <form onSubmit={handleAdd} className="flex gap-2">
              <Input
                placeholder={`Add new ${activeMeta?.label.toLowerCase().replace(/s$/, "")}…`}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="flex-1 py-2 text-sm"
              />
              <Btn
                type="submit"
                variant="primary"
                disabled={adding || !newValue.trim()}
                className="text-sm shrink-0"
              >
                {adding ? <Spinner size={16} /> : "Add"}
              </Btn>
            </form>
          </div>

          {/* List */}
          {loadingDropdowns ? (
            <div className="flex justify-center py-10">
              <Spinner size={32} />
            </div>
          ) : activeOptions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-base font-semibold text-slate-500">
                No options yet
              </p>
              <p className="text-sm mt-1">Add one above to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeOptions.map((opt) => (
                <div
                  key={opt._id}
                  className="flex items-center gap-2 px-4 py-3"
                >
                  {editingId === opt._id ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(opt._id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 py-2 text-sm"
                      />
                      <Btn
                        variant="primary"
                        className="text-xs py-2 px-3"
                        onClick={() => handleRename(opt._id)}
                        disabled={
                          savingEdit ||
                          !editValue.trim() ||
                          editValue.trim() === opt.value
                        }
                      >
                        Save
                      </Btn>
                      <Btn
                        variant="secondary"
                        className="text-xs py-2 px-3"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Btn>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium text-slate-700">
                        {opt.value}
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(opt._id);
                          setEditValue(opt.value);
                        }}
                        className="text-xs text-slate-400 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() =>
                          setConfirmModal({ id: opt._id, value: opt.value })
                        }
                        disabled={deletingId === opt._id}
                        className="text-xs text-slate-300 hover:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        {deletingId === opt._id ? (
                          <Spinner size={14} />
                        ) : (
                          "Delete"
                        )}
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CarDropdownManager;
