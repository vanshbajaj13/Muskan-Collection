import React, { useState, useMemo } from "react";
import { useFP } from "./FamilyPlannerContext";
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
  PillTabs,
} from "./FamilyPlannerUI";

const EMPTY_DEBT = {
  type: "borrowed",
  personName: "",
  principalAmount: "",
  borrowedOrLentDate: "",
  expectedReturnDate: "",
  reason: "",
  notes: "",
};

const EMPTY_REPAYMENT = { amount: "", date: "", note: "" };

export default function FPDebts() {
  const {
    debts,
    createDebt,
    updateDebt,
    deleteDebt,
    addRepayment,
    removeRepayment,
    opts,
    addDropdown,
    INR,
    fmtDate,
    tsFromDate,
    dateFromTs,
    loading,
  } = useFP();

  const [tab, setTab] = useState("active");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [debtForm, setDebtForm] = useState(EMPTY_DEBT);
  const [savingDebt, setSavingDebt] = useState(false);

  const [showRepayModal, setShowRepayModal] = useState(null);
  const [repayForm, setRepayForm] = useState(EMPTY_REPAYMENT);
  const [savingRepay, setSavingRepay] = useState(false);

  const [delTarget, setDelTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Edit save confirm gate
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  // Repayment remove confirm gate
  const [repayDelTarget, setRepayDelTarget] = useState(null); // { debtId, repId }
  const [repayDeleting, setRepayDeleting] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState(null);

  const [newPersonInput, setNewPersonInput] = useState("");
  const [addingPerson, setAddingPerson] = useState(false);

  const notify = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openCreate = () => {
    setEditingDebt(null);
    setDebtForm({
      ...EMPTY_DEBT,
      borrowedOrLentDate: new Date().toISOString().split("T")[0],
    });
    setShowDebtForm(true);
  };

  const openEdit = (debt) => {
    setEditingDebt(debt);
    setDebtForm({
      type: debt.type,
      personName: debt.personName,
      principalAmount: String(debt.principalAmount),
      borrowedOrLentDate: dateFromTs(debt.borrowedOrLentDate),
      expectedReturnDate: dateFromTs(debt.expectedReturnDate),
      reason: debt.reason || "",
      notes: debt.notes || "",
    });
    setShowDebtForm(true);
  };

  const setD = (k, v) => setDebtForm((f) => ({ ...f, [k]: v }));
  const setR = (k, v) => setRepayForm((f) => ({ ...f, [k]: v }));

  const handleSaveDebt = () => {
    if (
      !debtForm.personName ||
      !debtForm.principalAmount ||
      !debtForm.borrowedOrLentDate
    ) {
      notify("Fill all required fields", "error");
      return;
    }
    const payload = {
      type: debtForm.type,
      personName: debtForm.personName,
      principalAmount: Number(debtForm.principalAmount),
      borrowedOrLentDate: tsFromDate(debtForm.borrowedOrLentDate),
      expectedReturnDate: debtForm.expectedReturnDate
        ? tsFromDate(debtForm.expectedReturnDate)
        : null,
      reason: debtForm.reason,
      notes: debtForm.notes,
    };
    if (editingDebt) {
      setPendingPayload(payload);
      setSaveConfirmOpen(true);
    } else {
      doSaveDebt(payload);
    }
  };

  const doSaveDebt = async (payload) => {
    setSavingDebt(true);
    try {
      if (editingDebt) {
        await updateDebt(editingDebt._id, payload);
        notify("Updated");
      } else {
        await createDebt(payload);
        notify("Debt recorded");
      }
      setShowDebtForm(false);
    } catch {
      notify("Failed to save", "error");
    } finally {
      setSavingDebt(false);
    }
  };

  const handleConfirmSave = async () => {
    setSaveConfirmOpen(false);
    await doSaveDebt(pendingPayload);
    setPendingPayload(null);
  };

  const handleAddRepayment = async () => {
    if (!repayForm.amount || !repayForm.date) {
      notify("Enter amount and date", "error");
      return;
    }
    setSavingRepay(true);
    try {
      await addRepayment(showRepayModal._id, {
        amount: Number(repayForm.amount),
        date: tsFromDate(repayForm.date),
        note: repayForm.note,
      });
      notify("Repayment recorded");
      setRepayForm(EMPTY_REPAYMENT);
    } catch {
      notify("Failed", "error");
    } finally {
      setSavingRepay(false);
    }
  };

  // Confirm gate for repayment removal
  const requestRepayRemove = (debtId, repId) => {
    setRepayDelTarget({ debtId, repId });
  };

  const handleRemoveRepayment = async () => {
    if (!repayDelTarget) return;
    setRepayDeleting(true);
    try {
      await removeRepayment(repayDelTarget.debtId, repayDelTarget.repId);
      notify("Removed");
      setRepayDelTarget(null);
    } catch {
      notify("Failed", "error");
    } finally {
      setRepayDeleting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDebt(delTarget._id);
      notify("Deleted");
      setDelTarget(null);
    } catch {
      notify("Failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddPerson = async () => {
    if (!newPersonInput.trim()) return;
    setAddingPerson(true);
    try {
      await addDropdown("person", newPersonInput.trim());
      setD("personName", newPersonInput.trim());
      setNewPersonInput("");
      notify("Person added");
    } catch (e) {
      notify(e.message || "Already exists", "error");
    } finally {
      setAddingPerson(false);
    }
  };

  const persons = opts("person");

  const outstanding = (debt) => {
    const repaid = (debt.repayments || []).reduce((s, r) => s + r.amount, 0);
    return Math.max(0, debt.principalAmount - repaid);
  };
  const totalRepaid = (debt) =>
    (debt.repayments || []).reduce((s, r) => s + r.amount, 0);

  const filtered = useMemo(() => {
    let list = debts;
    if (tab === "active") list = list.filter((d) => !d.isSettled);
    else if (tab === "settled") list = list.filter((d) => d.isSettled);
    if (typeFilter !== "all") list = list.filter((d) => d.type === typeFilter);
    return list.sort((a, b) => b.borrowedOrLentDate - a.borrowedOrLentDate);
  }, [debts, tab, typeFilter]);

  const totalBorrowed = debts
    .filter((d) => !d.isSettled && d.type === "borrowed")
    .reduce((s, d) => s + outstanding(d), 0);
  const totalLent = debts
    .filter((d) => !d.isSettled && d.type === "lent")
    .reduce((s, d) => s + outstanding(d), 0);

  const TABS = [
    {
      key: "active",
      label: `Active (${debts.filter((d) => !d.isSettled).length})`,
    },
    {
      key: "settled",
      label: `Settled (${debts.filter((d) => d.isSettled).length})`,
    },
    { key: "all", label: `All (${debts.length})` },
  ];

  if (loading) return <FullSpinner message="Loading debts…" />;

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

      <SectionHead title="Debts & Loans" sub="Money borrowed and lent">
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600"
            style={{ fontSize: "16px" }}
          >
            <option value="all">All Types</option>
            <option value="borrowed">Borrowed</option>
            <option value="lent">Lent</option>
          </select>
          <Btn onClick={openCreate}>+ Add Entry</Btn>
        </div>
      </SectionHead>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3 text-center bg-red-50 text-red-700">
          <p className="text-lg font-bold">{INR(totalBorrowed)}</p>
          <p className="text-xs font-medium mt-0.5 opacity-70">I Owe</p>
        </div>
        <div className="rounded-xl p-3 text-center bg-blue-50 text-blue-700">
          <p className="text-lg font-bold">{INR(totalLent)}</p>
          <p className="text-xs font-medium mt-0.5 opacity-70">Owed to Me</p>
        </div>
      </div>

      <PillTabs tabs={TABS} active={tab} onChange={setTab} />

      {filtered.length === 0 ? (
        <EmptyState
          icon="🤝"
          title="No entries found"
          sub="Record money you've borrowed or lent to track repayments"
          action={<Btn onClick={openCreate}>+ Add Entry</Btn>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((debt) => {
            const isExpanded = expandedId === debt._id;
            const out = outstanding(debt);
            const repaid = totalRepaid(debt);
            const pct =
              debt.principalAmount > 0
                ? Math.min(
                    100,
                    Math.round((repaid / debt.principalAmount) * 100),
                  )
                : 0;

            return (
              <div
                key={debt._id}
                className={`bg-white rounded-xl border p-4 animate-enter ${debt.isSettled ? "opacity-60" : ""} border-slate-200`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm">
                        {debt.personName}
                      </span>
                      <Badge color={debt.type === "borrowed" ? "red" : "blue"}>
                        {debt.type === "borrowed" ? "⬇️ Borrowed" : "⬆️ Lent"}
                      </Badge>
                      {debt.isSettled && <Badge color="slate">Settled</Badge>}
                    </div>

                    <div className="mt-1 flex items-center gap-3 flex-wrap text-sm">
                      <span
                        className={`font-bold ${debt.type === "borrowed" ? "text-red-600" : "text-blue-600"}`}
                      >
                        {INR(out)} outstanding
                      </span>
                      <span className="text-xs text-slate-400">
                        of {INR(debt.principalAmount)}
                      </span>
                    </div>

                    {debt.principalAmount > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>{pct}% repaid</span>
                          <span>{fmtDate(debt.borrowedOrLentDate)}</span>
                        </div>
                        <div className="bg-slate-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${debt.type === "borrowed" ? "bg-red-400" : "bg-blue-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-1.5 flex items-center gap-3 flex-wrap text-xs text-slate-400">
                      {debt.expectedReturnDate && (
                        <span>
                          Expected: {fmtDate(debt.expectedReturnDate)}
                        </span>
                      )}
                      {debt.reason && (
                        <span className="italic">"{debt.reason}"</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex gap-1">
                      <Btn
                        variant="ghost"
                        className="px-2 py-1 text-xs"
                        onClick={() => openEdit(debt)}
                      >
                        ✎ Edit
                      </Btn>
                      <Btn
                        variant="ghost"
                        className="px-2 py-1 text-xs text-rose-400"
                        onClick={() => setDelTarget(debt)}
                      >
                        ✕
                      </Btn>
                    </div>
                    {!debt.isSettled && (
                      <Btn
                        variant="secondary"
                        className="text-xs px-2 py-1"
                        onClick={() => {
                          setShowRepayModal(debt);
                          setRepayForm({
                            ...EMPTY_REPAYMENT,
                            date: new Date().toISOString().split("T")[0],
                          });
                        }}
                      >
                        + Repayment
                      </Btn>
                    )}
                    {(debt.repayments || []).length > 0 && (
                      <button
                        className="text-xs text-indigo-500 underline"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : debt._id)
                        }
                      >
                        {isExpanded
                          ? "Hide"
                          : `${debt.repayments.length} repayment${debt.repayments.length > 1 ? "s" : ""}`}
                      </button>
                    )}
                  </div>
                </div>

                {/* Repayments list */}
                {isExpanded && (debt.repayments || []).length > 0 && (
                  <div className="mt-3 border-t border-slate-100 pt-3 space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                      Repayment History
                    </p>
                    {debt.repayments.map((r) => (
                      <div
                        key={r._id}
                        className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-emerald-700">
                            {INR(r.amount)}
                          </span>
                          <span className="text-slate-400 text-xs">
                            {fmtDate(r.date)}
                          </span>
                          {r.note && (
                            <span className="text-slate-400 text-xs italic">
                              {r.note}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => requestRepayRemove(debt._id, r._id)}
                          className="text-xs text-rose-400 hover:text-rose-600 ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Debt Modal */}
      {showDebtForm && (
        <Modal
          title={editingDebt ? "Edit Entry" : "Add Debt / Loan"}
          onClose={() => setShowDebtForm(false)}
        >
          <div className="space-y-4">
            <Field label="Type" required>
              <div className="flex gap-2">
                {["borrowed", "lent"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setD("type", t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
                      ${
                        debtForm.type === t
                          ? t === "borrowed"
                            ? "bg-red-500 text-white border-red-500"
                            : "bg-blue-500 text-white border-blue-500"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    {t === "borrowed" ? "⬇️ I Borrowed" : "⬆️ I Lent"}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Person Name" required>
              <FPSelect
                options={persons}
                value={debtForm.personName}
                onChange={(e) => setD("personName", e.target.value)}
                placeholder="Select person…"
              />
            </Field>
            <div className="flex gap-2 -mt-2">
              <FPInput
                value={newPersonInput}
                onChange={(e) => setNewPersonInput(e.target.value)}
                placeholder="+ Add new person"
                className="text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleAddPerson()}
              />
              <Btn
                variant="secondary"
                className="text-xs px-3"
                onClick={handleAddPerson}
                disabled={addingPerson || !newPersonInput.trim()}
              >
                Add
              </Btn>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Principal Amount (₹)" required>
                <FPInput
                  type="number"
                  value={debtForm.principalAmount}
                  onChange={(e) => setD("principalAmount", e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field
                label={
                  debtForm.type === "borrowed" ? "Date Borrowed" : "Date Lent"
                }
                required
              >
                <FPInput
                  type="date"
                  value={debtForm.borrowedOrLentDate}
                  onChange={(e) => setD("borrowedOrLentDate", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Expected Return Date" hint="Optional">
              <FPInput
                type="date"
                value={debtForm.expectedReturnDate}
                onChange={(e) => setD("expectedReturnDate", e.target.value)}
              />
            </Field>

            <Field label="Reason / Purpose">
              <FPInput
                value={debtForm.reason}
                onChange={(e) => setD("reason", e.target.value)}
                placeholder="e.g. Medical emergency, wedding…"
              />
            </Field>

            <Field label="Notes">
              <FPTextarea
                value={debtForm.notes}
                onChange={(e) => setD("notes", e.target.value)}
                placeholder="Any additional notes…"
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <Btn
                variant="secondary"
                className="flex-1"
                onClick={() => setShowDebtForm(false)}
              >
                Cancel
              </Btn>
              <Btn
                className="flex-1"
                onClick={handleSaveDebt}
                disabled={savingDebt}
              >
                {savingDebt ? "Saving…" : editingDebt ? "Update" : "Add Entry"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Repayment Modal */}
      {showRepayModal && (
        <Modal
          title={`Record Repayment — ${showRepayModal.personName}`}
          onClose={() => setShowRepayModal(null)}
        >
          <div className="space-y-4">
            <div
              className={`rounded-lg px-4 py-3 text-sm font-semibold border ${showRepayModal.type === "borrowed" ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}
            >
              Outstanding: {INR(outstanding(showRepayModal))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹)" required>
                <FPInput
                  type="number"
                  value={repayForm.amount}
                  onChange={(e) => setR("amount", e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="Date" required>
                <FPInput
                  type="date"
                  value={repayForm.date}
                  onChange={(e) => setR("date", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Note">
              <FPInput
                value={repayForm.note}
                onChange={(e) => setR("note", e.target.value)}
                placeholder="Optional note…"
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <Btn
                variant="secondary"
                className="flex-1"
                onClick={() => setShowRepayModal(null)}
              >
                Cancel
              </Btn>
              <Btn
                variant="success"
                className="flex-1"
                onClick={handleAddRepayment}
                disabled={savingRepay}
              >
                {savingRepay ? "Saving…" : "Record Repayment"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit save confirm */}
      {saveConfirmOpen && editingDebt && (
        <ConfirmModal
          title="Save Changes?"
          body={`Confirm changes to "${editingDebt.personName}" — ${INR(editingDebt.principalAmount)}. Type CONFIRM to proceed.`}
          onConfirm={handleConfirmSave}
          onCancel={() => {
            setSaveConfirmOpen(false);
            setPendingPayload(null);
          }}
          loading={savingDebt}
          confirmTextRequired
        />
      )}

      {/* Delete confirm */}
      {delTarget && (
        <ConfirmModal
          title="Delete Debt Entry?"
          body={`"${delTarget.personName}" entry of ${INR(delTarget.principalAmount)} will be permanently removed.`}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
          loading={deleting}
          confirmTextRequired
        />
      )}

      {/* Repayment remove confirm */}
      {repayDelTarget && (
        <ConfirmModal
          title="Remove Repayment?"
          body="This repayment record will be permanently deleted. Type CONFIRM to proceed."
          onConfirm={handleRemoveRepayment}
          onCancel={() => setRepayDelTarget(null)}
          loading={repayDeleting}
          confirmTextRequired
        />
      )}
    </div>
  );
}
