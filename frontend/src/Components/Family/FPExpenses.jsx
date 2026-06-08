import React, { useState, useMemo } from "react";
import { useFP, FREQ_LABELS } from "./FamilyPlannerContext";
import {
  SectionHead, Badge, Btn, Modal, Field, FPInput, FPSelect, FPTextarea,
  ConfirmModal, Toast, EmptyState, FullSpinner, PillTabs,
} from "./FamilyPlannerUI";

const EMPTY = {
  label: "", category: "", amount: "", frequency: "monthly",
  isRecurring: true, startDate: "", endDate: "", occurredDate: "",
  notes: "", isActive: true, isBusinessExpense: false,
};

const FREQ_OPTS = ["monthly", "weekly", "fortnightly", "yearly", "one_time"];

export default function FPExpenses() {
  const {
    expenses, createExpense, updateExpense, deleteExpense,
    opts, addDropdown, INR, fmtDate, tsFromDate, dateFromTs, loading,
  } = useFP();

  const [tab,       setTab]       = useState("all");
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [deleting,  setDeleting]  = useState(false);
  const [toast,     setToast]     = useState(null);
  const [newCatInput, setNewCatInput] = useState("");
  const [addingCat,   setAddingCat]   = useState(false);
  const [searchQ,   setSearchQ]   = useState("");

  const notify = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY,
      startDate: new Date().toISOString().split("T")[0],
      occurredDate: new Date().toISOString().split("T")[0],
    });
    setShowForm(true);
  };

  const openEdit = (exp) => {
    setEditing(exp);
    setForm({
      label:            exp.label,
      category:         exp.category,
      amount:           String(exp.amount),
      frequency:        exp.frequency,
      isRecurring:      exp.isRecurring,
      startDate:        dateFromTs(exp.startDate),
      endDate:          dateFromTs(exp.endDate),
      occurredDate:     dateFromTs(exp.occurredDate),
      notes:            exp.notes || "",
      isActive:         exp.isActive,
      isBusinessExpense:exp.isBusinessExpense || false,
    });
    setShowForm(true);
  };

  const set = (k, v) => setForm((f) => {
    const next = { ...f, [k]: v };
    if (k === "frequency") next.isRecurring = v !== "one_time";
    return next;
  });

  const handleSubmit = async () => {
    if (!form.label.trim() || !form.category || !form.amount) {
      notify("Fill in all required fields", "error"); return;
    }
    // For one_time we need occurredDate; for recurring we need startDate
    if (form.frequency === "one_time" && !form.occurredDate) {
      notify("Please set the date it occurred", "error"); return;
    }
    if (form.frequency !== "one_time" && !form.startDate) {
      notify("Please set a start date", "error"); return;
    }

    setSaving(true);
    try {
      const isOneTime = form.frequency === "one_time";
      const payload = {
        label:            form.label.trim(),
        category:         form.category,
        amount:           Number(form.amount),
        frequency:        form.frequency,
        isRecurring:      !isOneTime,
        // For one_time: startDate = occurredDate so the context can find it
        startDate:        isOneTime
          ? tsFromDate(form.occurredDate)
          : tsFromDate(form.startDate),
        endDate:          !isOneTime && form.endDate ? tsFromDate(form.endDate) : null,
        occurredDate:     isOneTime && form.occurredDate ? tsFromDate(form.occurredDate) : null,
        notes:            form.notes,
        isActive:         form.isActive,
        isBusinessExpense:form.isBusinessExpense,
      };

      if (editing) {
        await updateExpense(editing._id, payload);
        notify("Expense updated");
      } else {
        await createExpense(payload);
        notify("Expense added");
      }
      setShowForm(false);
    } catch { notify("Failed to save", "error"); }
    finally  { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteExpense(delTarget._id);
      notify("Deleted");
      setDelTarget(null);
    } catch { notify("Delete failed", "error"); }
    finally  { setDeleting(false); }
  };

  const handleAddCat = async () => {
    if (!newCatInput.trim()) return;
    setAddingCat(true);
    try {
      await addDropdown("expenseCategory", newCatInput.trim());
      set("category", newCatInput.trim());
      setNewCatInput("");
      notify("Category added");
    } catch (e) { notify(e.message || "Already exists", "error"); }
    finally { setAddingCat(false); }
  };

  const categories = opts("expenseCategory");

  const filtered = useMemo(() => {
    let list = expenses;
    if (tab === "recurring") list = list.filter((e) => e.isRecurring && e.isActive);
    else if (tab === "one_time") list = list.filter((e) => !e.isRecurring);
    else if (tab === "inactive") list = list.filter((e) => !e.isActive);
    else list = list.filter((e) => e.isActive);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter((e) =>
        e.label.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [expenses, tab, searchQ]);

  const totalMonthlyRecurring = useMemo(() =>
    expenses.filter((e) => e.isActive && e.isRecurring && e.frequency !== "one_time")
      .reduce((s, e) => {
        const m = { monthly: e.amount, weekly: e.amount * 4.33, fortnightly: e.amount * 2.17, yearly: e.amount / 12 };
        return s + (m[e.frequency] || e.amount);
      }, 0),
    [expenses]
  );

  const catBreakdown = useMemo(() => {
    const map = {};
    expenses.filter((e) => e.isActive).forEach((e) => {
      if (!map[e.category]) map[e.category] = 0;
      const m = { monthly: e.amount, weekly: e.amount * 4.33, fortnightly: e.amount * 2.17, yearly: e.amount / 12, one_time: 0 };
      map[e.category] += m[e.frequency] ?? e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const TABS = [
    { key: "all",      label: `All Active (${expenses.filter((e) => e.isActive).length})` },
    { key: "recurring",label: `Recurring (${expenses.filter((e) => e.isRecurring && e.isActive).length})` },
    { key: "one_time", label: `One-time (${expenses.filter((e) => !e.isRecurring).length})` },
    { key: "inactive", label: `Inactive (${expenses.filter((e) => !e.isActive).length})` },
  ];

  if (loading) return <FullSpinner message="Loading expenses…" />;

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      <SectionHead title="Expenses" sub={`~${INR(Math.round(totalMonthlyRecurring))} / month recurring`}>
        <Btn onClick={openCreate}>+ Add Expense</Btn>
      </SectionHead>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Expenses",   val: expenses.filter((e) => e.isActive).length, color: "bg-rose-50 text-rose-700" },
          { label: "Recurring",        val: expenses.filter((e) => e.isRecurring && e.isActive).length, color: "bg-amber-50 text-amber-700" },
          { label: "Monthly Cost",     val: INR(Math.round(totalMonthlyRecurring)), color: "bg-red-50 text-red-700" },
          { label: "Categories",       val: catBreakdown.length, color: "bg-slate-100 text-slate-600" },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl p-3 text-center animate-enter ${c.color}`}>
            <p className="text-lg font-bold">{c.val}</p>
            <p className="text-xs font-medium mt-0.5 opacity-70">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Category breakdown bar */}
      {catBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 animate-enter">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Monthly Cost by Category</p>
          <div className="space-y-2">
            {catBreakdown.map(([cat, amt]) => {
              const pct = totalMonthlyRecurring > 0 ? Math.round((amt / totalMonthlyRecurring) * 100) : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-28 shrink-0 truncate">{cat}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="bg-rose-400 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-20 text-right shrink-0">
                    {INR(Math.round(amt))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs + Search */}
      <div className="space-y-3">
        <PillTabs tabs={TABS} active={tab} onChange={setTab} />
        <input
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="🔍 Search expenses…"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          style={{ fontSize: "16px" }}
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon="💸" title="No expenses found"
          sub="Add recurring bills, EMIs, subscriptions, or one-time expenses"
          action={<Btn onClick={openCreate}>+ Add Expense</Btn>} />
      ) : (
        <div className="space-y-2">
          {filtered.map((exp) => (
            <div key={exp._id}
              className={`bg-white rounded-xl border p-4 animate-enter ${!exp.isActive ? "opacity-60" : ""} border-slate-200`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">{exp.label}</span>
                    <Badge color={exp.isRecurring ? "amber" : "slate"}>{FREQ_LABELS[exp.frequency]}</Badge>
                    <Badge color="red">{exp.category}</Badge>
                    {exp.isBusinessExpense && <Badge color="amber">Biz</Badge>}
                    {!exp.isActive && <Badge color="slate">Inactive</Badge>}
                  </div>
                  <div className="mt-1 flex items-center gap-3 flex-wrap">
                    <span className="text-rose-600 font-bold">{INR(exp.amount)}</span>
                    {exp.isRecurring && (
                      <>
                        <span className="text-xs text-slate-400">From {fmtDate(exp.startDate)}</span>
                        {exp.endDate
                          ? <span className="text-xs text-slate-400">→ {fmtDate(exp.endDate)}</span>
                          : <span className="text-xs text-emerald-500">Ongoing</span>}
                      </>
                    )}
                    {!exp.isRecurring && exp.occurredDate &&
                      <span className="text-xs text-slate-400">On {fmtDate(exp.occurredDate)}</span>}
                  </div>
                  {exp.notes && <p className="text-xs text-slate-400 mt-1 italic">{exp.notes}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Btn variant="ghost" className="px-2 py-1 text-xs" onClick={() => openEdit(exp)}>✎ Rename</Btn>
                  <Btn variant="ghost" className="px-2 py-1 text-xs text-rose-400"
                    onClick={() => setDelTarget(exp)}>✕</Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <Modal title={editing ? "Edit Expense" : "Add Expense"} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <Field label="Expense Label" required>
              <FPInput value={form.label} onChange={(e) => set("label", e.target.value)}
                placeholder="e.g. Jio Recharge, Car EMI…" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Category" required>
                <FPSelect
                  options={categories}
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  placeholder="Select category…"
                />
              </Field>
              <Field label="Amount (₹)" required>
                <FPInput type="number" value={form.amount}
                  onChange={(e) => set("amount", e.target.value)} placeholder="0" />
              </Field>
            </div>

            {/* Inline add category */}
            <div className="flex gap-2 -mt-2">
              <FPInput
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                placeholder="+ New category"
                className="text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleAddCat()}
              />
              <Btn variant="secondary" className="text-xs px-3"
                onClick={handleAddCat} disabled={addingCat || !newCatInput.trim()}>
                Add
              </Btn>
            </div>

            <Field label="Frequency" required>
              <FPSelect
                options={FREQ_OPTS}
                value={form.frequency}
                onChange={(e) => set("frequency", e.target.value)}
                placeholder="Select…"
              />
            </Field>

            {/* Date fields — conditional on frequency */}
            {form.frequency === "one_time" ? (
              <Field label="Date it occurred" required
                hint="The exact date this expense happened">
                <FPInput type="date" value={form.occurredDate}
                  onChange={(e) => set("occurredDate", e.target.value)} />
              </Field>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date" required hint="When did this expense begin?">
                  <FPInput type="date" value={form.startDate}
                    onChange={(e) => set("startDate", e.target.value)} />
                </Field>
                <Field label="End Date" hint="Leave blank if ongoing. Set for EMIs.">
                  <FPInput type="date" value={form.endDate}
                    onChange={(e) => set("endDate", e.target.value)} />
                </Field>
              </div>
            )}

            <Field label="Notes">
              <FPTextarea value={form.notes}
                onChange={(e) => set("notes", e.target.value)} placeholder="Optional notes…" />
            </Field>

            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={form.isActive}
                  onChange={(e) => set("isActive", e.target.checked)}
                  className="w-4 h-4 accent-indigo-600" />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={form.isBusinessExpense}
                  onChange={(e) => set("isBusinessExpense", e.target.checked)}
                  className="w-4 h-4 accent-amber-500" />
                Business Expense
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <Btn variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn variant="danger" className="flex-1" onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving…" : editing ? "Update" : "Add Expense"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm — requires CONFIRM text */}
      {delTarget && (
        <ConfirmModal
          title="Delete Expense?"
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