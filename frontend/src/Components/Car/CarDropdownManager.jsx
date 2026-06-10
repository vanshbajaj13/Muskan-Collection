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
  {
    key: "partner",
    label: "हिस्सेदार / Partners",
    icon: "🤝",
    hint: "जो लोग गाड़ी में पैसा लगाते हैं",
  },
  {
    key: "boughtFrom",
    label: "किससे खरीदी / Bought From",
    icon: "🧑‍💼",
    hint: "जिनसे गाड़ी खरीदते हैं",
  },
  {
    key: "soldTo",
    label: "किसको बेची / Sold To",
    icon: "🤝",
    hint: "जिनको गाड़ी बेचते हैं",
  },
  {
    key: "make",
    label: "कंपनी / Car Make",
    icon: "🏭",
    hint: "जैसे Maruti, Hyundai, Honda",
  },
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
  const [confirmModal, setConfirmModal] = useState(null); // for delete
  const [renameModal, setRenameModal] = useState(null); // { id, oldValue, newValue }

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
      showToast(`"${newValue.trim()}" जोड़ा गया!`);
    } catch (err) {
      showToast(err.message || "जोड़ा नहीं गया।", "error");
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
      showToast("बदला गया ✓");
    } catch {
      showToast("बदला नहीं गया।", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="relative">
      {(savingEdit || deletingId) && (
        <FullScreenSpinner
          message={savingEdit ? "बदला जा रहा है..." : "हटाया जा रहा है..."}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          title="हटाएं?"
          body={`"${confirmModal.value}" को हटाना है?`}
          loading={deletingId === confirmModal.id}
          onCancel={() => setConfirmModal(null)}
          onConfirm={async () => {
            setDeletingId(confirmModal.id);
            try {
              await deleteDropdown(confirmModal.id);
              showToast(`"${confirmModal.value}" हटा दिया गया`);
            } catch {
              showToast("नहीं हटा।", "error");
            } finally {
              setDeletingId(null);
              setConfirmModal(null);
            }
          }}
        />
      )}

      {renameModal && (
        <ConfirmModal
          title="नाम बदलें / Rename?"
          body={`"${renameModal.newValue}" — यह नाम सेव होगा।`}
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
        <h2 className="text-2xl font-extrabold text-gray-800">
          ⚙️ विकल्प प्रबंधन / Manage Options
        </h2>
        <p className="text-base text-gray-500 mt-1">
          नाम, जगह और अन्य विकल्प यहाँ जोड़ें और बदलें।
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Type selector */}
        <div className="md:w-64 shrink-0">
          <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
            {TYPES.map((t) => {
              const count = (dropdowns[t.key] || []).length;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveType(t.key)}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors border-b-2 border-gray-100 last:border-0
                    ${activeType === t.key ? "bg-blue-50 border-l-4 border-l-blue-500" : "hover:bg-gray-50"}`}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <p
                      className={`text-base font-bold ${activeType === t.key ? "text-blue-700" : "text-gray-700"}`}
                    >
                      {t.label}
                    </p>
                    <p className="text-sm text-gray-400">{count} विकल्प</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Options panel */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl border-2 border-gray-200">
            {/* Header */}
            <div className="px-5 py-4 border-b-2 border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{activeMeta?.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {activeMeta?.label}
                  </h3>
                  <p className="text-sm text-gray-400">{activeMeta?.hint}</p>
                </div>
              </div>
            </div>

            {/* Add form */}
            <div className="px-5 py-4 border-b-2 border-gray-100 bg-gray-50">
              <form onSubmit={handleAdd} className="flex gap-3">
                <Input
                  placeholder={`नया ${activeMeta?.label} जोड़ें...`}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="flex-1"
                />
                <Btn
                  type="submit"
                  variant="primary"
                  disabled={adding || !newValue.trim()}
                  className="text-base"
                >
                  {adding ? <Spinner size={20} /> : "+ जोड़ें"}
                </Btn>
              </form>
            </div>

            {/* List */}
            {loadingDropdowns ? (
              <div className="flex justify-center py-12">
                <Spinner size={36} />
              </div>
            ) : activeOptions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">{activeMeta?.icon}</p>
                <p className="text-lg font-bold text-gray-500">
                  अभी कोई विकल्प नहीं
                </p>
                <p className="text-sm mt-1">ऊपर से जोड़ें</p>
              </div>
            ) : (
              <div className="divide-y-2 divide-gray-100">
                {activeOptions.map((opt) => (
                  <div
                    key={opt._id}
                    className="flex items-center gap-3 px-5 py-4"
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
                          className="flex-1"
                        />
                        <Btn
                          variant="primary"
                          className="text-base py-2 px-4"
                          onClick={() => handleRename(opt._id)}
                          disabled={
                            savingEdit ||
                            !editValue.trim() ||
                            editValue.trim() === opt.value
                          }
                        >
                          ✓ सेव
                        </Btn>
                        <Btn
                          variant="secondary"
                          className="text-base py-2 px-4"
                          onClick={() => setEditingId(null)}
                        >
                          रद्द
                        </Btn>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-lg font-semibold text-gray-700">
                          {opt.value}
                        </span>
                        <button
                          onClick={() => {
                            setEditingId(opt._id);
                            setEditValue(opt.value);
                          }}
                          className="text-base text-gray-400 hover:text-blue-600 px-3 py-2 rounded-xl hover:bg-blue-50 transition-colors font-medium"
                        >
                          ✎ बदलें
                        </button>
                        <button
                          onClick={() =>
                            setConfirmModal({ id: opt._id, value: opt.value })
                          }
                          disabled={deletingId === opt._id}
                          className="text-base text-gray-300 hover:text-red-400 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors"
                        >
                          {deletingId === opt._id ? <Spinner size={18} /> : "✕"}
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
    </div>
  );
};

export default CarDropdownManager;
