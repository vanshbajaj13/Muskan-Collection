import React, { useState } from "react";
import { useFP, FREQ_LABELS } from "./FamilyPlannerContext";
import {
  SectionHead,
  Badge,
  Btn,
  Modal,
  Field,
  FPInput,
  FPSelect,
  FPTextarea,
  ConfirmModal,
  Toast,
  EmptyState,
  FullSpinner,
} from "./FamilyPlannerUI";

const EMPTY = {
  label: "",
  incomeType: "",
  amount: "",
  frequency: "monthly",
  startDate: "",
  endDate: "",
  receivedDate: "",
  notes: "",
  isActive: true,
};

export default function FPIncome() {
  const {
    incomes,
    createIncome,
    updateIncome,
    deleteIncome,
    opts,
    addDropdown,
    INR,
    fmtDate,
    tsFromDate,
    dateFromTs,
    loading,
  } = useFP();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const [newTypeInput, setNewTypeInput] = useState("");
  const [addingType, setAddingType] = useState(false);
  const [filter, setFilter] = useState("all");

  // Edit save confirm
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  const notify = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, startDate: new Date().toISOString().split("T")[0] });
    setShowForm(true);
  };

  const openEdit = (inc) => {
    setEditing(inc);
    setForm({
      label: inc.label,
      incomeType: inc.incomeType,
      amount: String(inc.amount),
      frequency: inc.frequency,
      startDate: dateFromTs(inc.startDate),
      endDate: dateFromTs(inc.endDate),
      receivedDate: dateFromTs(inc.receivedDate),
      notes: inc.notes || "",
      isActive: inc.isActive,
    });
    setShowForm(true);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (
      !form.label.trim() ||
      !form.incomeType ||
      !form.amount ||
      !form.startDate
    ) {
      notify("Fill in all required fields", "error");
      return;
    }
    const payload = {
      label: form.label.trim(),
      incomeType: form.incomeType,
      amount: Number(form.amount),
      frequency: form.frequency,
      startDate: tsFromDate(form.startDate),
      endDate: form.endDate ? tsFromDate(form.endDate) : null,
      receivedDate:
        form.frequency === "one_time" && form.receivedDate
          ? tsFromDate(form.receivedDate)
          : null,
      notes: form.notes,
      isActive: form.isActive,
    };
    if (editing) {
      setPendingPayload(payload);
      setSaveConfirmOpen(true);
    } else {
      doSave(payload);
    }
  };

  const doSave = async (payload) => {
    setSaving(true);
    try {
      if (editing) {
        await updateIncome(editing._id, payload);
        notify("Income source updated");
      } else {
        await createIncome(payload);
        notify("Income source added");
      }
      setShowForm(false);
    } catch {
      notify("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmSave = async () => {
    setSaveConfirmOpen(false);
    await doSave(pendingPayload);
    setPendingPayload(null);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteIncome(delTarget._id);
      notify("Deleted");
      setDelTarget(null);
    } catch {
      notify("Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddType = async () => {
    if (!newTypeInput.trim()) return;
    setAddingType(true);
    try {
      await addDropdown("incomeType", newTypeInput.trim());
      set("incomeType", newTypeInput.trim());
      setNewTypeInput("");
      notify("Type added");
    } catch (e) {
      notify(e.message || "Already exists", "error");
    } finally {
      setAddingType(false);
    }
  };

  const incomeTypes = opts("incomeType");
  const filtered = incomes.filter((i) =>
    filter === "all" ? true : filter === "active" ? i.isActive : !i.isActive,
  );

  const totalMonthly = incomes
    .filter((i) => i.isActive && i.frequency !== "one_time")
    .reduce((s, i) => {
      const m = {
        monthly: i.amount,
        weekly: i.amount * 4.33,
        fortnightly: i.amount * 2.17,
        yearly: i.amount / 12,
      };
      return s + (m[i.frequency] || i.amount);
    }, 0);

  if (loading) return <FullSpinner message="Loading income sources…" />;

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

      <SectionHead
        title="Income Sources"
        sub={`~${INR(Math.round(totalMonthly))} / month recurring`}
      >
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600"
            style={{ fontSize: "16px" }}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <Btn onClick={openCreate}>+ Add Income</Btn>
        </div>
      </SectionHead>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total Sources",
            val: incomes.length,
            color: "bg-indigo-50 text-indigo-700",
          },
          {
            label: "Active",
            val: incomes.filter((i) => i.isActive).length,
            color: "bg-emerald-50 text-emerald-700",
          },
          {
            label: "Monthly Recurring",
            val: INR(Math.round(totalMonthly)),
            color: "bg-amber-50 text-amber-700",
          },
        ].map((c) => (
          <div
            key={c.label}
            className={`rounded-xl p-3 text-center animate-enter ${c.color}`}
          >
            <p className="text-lg font-bold">{c.val}</p>
            <p className="text-xs font-medium mt-0.5 opacity-70">{c.label}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="💰"
          title="No income sources yet"
          sub="Add salary, business income, rent, or any other source"
          action={<Btn onClick={openCreate}>+ Add Income</Btn>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((inc) => (
            <div
              key={inc._id}
              className={`bg-white rounded-xl border p-4 animate-enter ${!inc.isActive ? "opacity-60 border-slate-200" : "border-slate-200"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">
                      {inc.label}
                    </span>
                    <Badge color="green">{FREQ_LABELS[inc.frequency]}</Badge>
                    <Badge color="blue">{inc.incomeType}</Badge>
                    {!inc.isActive && <Badge color="slate">Inactive</Badge>}
                  </div>
                  <div className="mt-1 flex items-center gap-3 flex-wrap">
                    <span className="text-emerald-600 font-bold">
                      {INR(inc.amount)}
                    </span>
                    <span className="text-xs text-slate-400">
                      From {fmtDate(inc.startDate)}
                    </span>
                    {inc.endDate && (
                      <span className="text-xs text-slate-400">
                        → {fmtDate(inc.endDate)}
                      </span>
                    )}
                    {inc.frequency === "one_time" && inc.receivedDate && (
                      <span className="text-xs text-slate-400">
                        Received {fmtDate(inc.receivedDate)}
                      </span>
                    )}
                  </div>
                  {inc.notes && (
                    <p className="text-xs text-slate-400 mt-1 italic">
                      {inc.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Btn
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    onClick={() => openEdit(inc)}
                  >
                    ✎ Edit
                  </Btn>
                  <Btn
                    variant="ghost"
                    className="px-2 py-1 text-xs text-rose-400"
                    onClick={() => setDelTarget(inc)}
                  >
                    ✕
                  </Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <Modal
          title={editing ? "Edit Income Source" : "Add Income Source"}
          onClose={() => setShowForm(false)}
        >
          <div className="space-y-4">
            <Field label="Label" required>
              <FPInput
                value={form.label}
                onChange={(e) => set("label", e.target.value)}
                placeholder="e.g. My Salary, Shop Rent…"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Income Type" required>
                <FPSelect
                  options={incomeTypes}
                  value={form.incomeType}
                  onChange={(e) => set("incomeType", e.target.value)}
                  placeholder="Select type…"
                />
              </Field>
              <Field label="Amount (₹)" required>
                <FPInput
                  type="number"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>

            <div className="flex gap-2 -mt-2">
              <FPInput
                value={newTypeInput}
                onChange={(e) => setNewTypeInput(e.target.value)}
                placeholder="+ New income type"
                className="text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleAddType()}
              />
              <Btn
                variant="secondary"
                className="text-xs px-3"
                onClick={handleAddType}
                disabled={addingType || !newTypeInput.trim()}
              >
                Add
              </Btn>
            </div>

            <Field label="Frequency" required>
              <FPSelect
                options={[
                  "monthly",
                  "weekly",
                  "fortnightly",
                  "yearly",
                  "one_time",
                ]}
                value={form.frequency}
                onChange={(e) => set("frequency", e.target.value)}
                placeholder="Select…"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label={
                  form.frequency === "one_time" ? "Income Date" : "Start Date"
                }
                required
              >
                <FPInput
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                />
              </Field>
              {form.frequency !== "one_time" && (
                <Field label="End Date" hint="Leave blank if ongoing">
                  <FPInput
                    type="date"
                    value={form.endDate}
                    onChange={(e) => set("endDate", e.target.value)}
                  />
                </Field>
              )}
              {form.frequency === "one_time" && (
                <Field
                  label="Received Date"
                  hint="When did you actually receive it?"
                >
                  <FPInput
                    type="date"
                    value={form.receivedDate}
                    onChange={(e) => set("receivedDate", e.target.value)}
                  />
                </Field>
              )}
            </div>

            <Field label="Notes">
              <FPTextarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Optional notes…"
              />
            </Field>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="inc-active"
                checked={form.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
              <label htmlFor="inc-active" className="text-sm text-slate-600">
                Active (include in calculations)
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <Btn
                variant="secondary"
                className="flex-1"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Btn>
              <Btn className="flex-1" onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving…" : editing ? "Update" : "Add Income"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {saveConfirmOpen && editing && (
        <ConfirmModal
          title="Save Changes?"
          body={`Confirm changes to "${editing.label}". Type CONFIRM to proceed.`}
          onConfirm={handleConfirmSave}
          onCancel={() => {
            setSaveConfirmOpen(false);
            setPendingPayload(null);
          }}
          loading={saving}
          confirmTextRequired
        />
      )}

      {delTarget && (
        <ConfirmModal
          title="Delete Income Source?"
          body={`"${delTarget.label}" will be permanently removed.`}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
          loading={deleting}
          confirmTextRequired
        />
      )}
    </div>
  );
}
