import React, { useState, useMemo } from "react";
import { useFP } from "./FamilyPlannerContext";
import {
  SectionHead,
  Badge,
  Btn,
  Modal,
  Field,
  FPInput,
  FPTextarea,
  ConfirmModal,
  Toast,
  EmptyState,
  FullSpinner,
} from "./FamilyPlannerUI";

const EMPTY_GOAL = {
  label: "",
  targetAmount: "",
  targetDate: "",
  notes: "",
};

const EMPTY_CONTRIBUTION = { amount: "", date: "", note: "" };

export default function FPSavings() {
  const {
    savingsGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    addContribution,
    removeContribution,
    INR,
    fmtDate,
    tsFromDate,
    dateFromTs,
    loading,
  } = useFP();

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL);
  const [savingGoal, setSavingGoal] = useState(false);

  const [showContribModal, setShowContribModal] = useState(null);
  const [contribForm, setContribForm] = useState(EMPTY_CONTRIBUTION);
  const [savingContrib, setSavingContrib] = useState(false);

  const [delTarget, setDelTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Edit save confirm gate
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  // Contribution remove confirm gate
  const [contribDelTarget, setContribDelTarget] = useState(null); // { goalId, contribId }
  const [contribDeleting, setContribDeleting] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("active");

  const notify = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openCreate = () => {
    setEditingGoal(null);
    setGoalForm(EMPTY_GOAL);
    setShowGoalForm(true);
  };

  const openEdit = (goal) => {
    setEditingGoal(goal);
    setGoalForm({
      label: goal.label,
      targetAmount: String(goal.targetAmount),
      targetDate: dateFromTs(goal.targetDate),
      notes: goal.notes || "",
    });
    setShowGoalForm(true);
  };

  const setG = (k, v) => setGoalForm((f) => ({ ...f, [k]: v }));
  const setC = (k, v) => setContribForm((f) => ({ ...f, [k]: v }));

  const handleSaveGoal = () => {
    if (!goalForm.label.trim() || !goalForm.targetAmount) {
      notify("Fill in all required fields", "error");
      return;
    }
    const payload = {
      label: goalForm.label.trim(),
      targetAmount: Number(goalForm.targetAmount),
      targetDate: goalForm.targetDate ? tsFromDate(goalForm.targetDate) : null,
      notes: goalForm.notes,
    };
    if (editingGoal) {
      setPendingPayload(payload);
      setSaveConfirmOpen(true);
    } else {
      doSaveGoal(payload);
    }
  };

  const doSaveGoal = async (payload) => {
    setSavingGoal(true);
    try {
      if (editingGoal) {
        await updateGoal(editingGoal._id, payload);
        notify("Goal updated");
      } else {
        await createGoal(payload);
        notify("Goal created");
      }
      setShowGoalForm(false);
    } catch {
      notify("Failed to save", "error");
    } finally {
      setSavingGoal(false);
    }
  };

  const handleConfirmSave = async () => {
    setSaveConfirmOpen(false);
    await doSaveGoal(pendingPayload);
    setPendingPayload(null);
  };

  const handleAddContribution = async () => {
    if (!contribForm.amount || !contribForm.date) {
      notify("Enter amount and date", "error");
      return;
    }
    setSavingContrib(true);
    try {
      await addContribution(showContribModal._id, {
        amount: Number(contribForm.amount),
        date: tsFromDate(contribForm.date),
        note: contribForm.note,
      });
      notify("Contribution added");
      setContribForm(EMPTY_CONTRIBUTION);
    } catch {
      notify("Failed", "error");
    } finally {
      setSavingContrib(false);
    }
  };

  // Confirm gate for contribution removal
  const requestContribRemove = (goalId, contribId) => {
    setContribDelTarget({ goalId, contribId });
  };

  const handleRemoveContribution = async () => {
    if (!contribDelTarget) return;
    setContribDeleting(true);
    try {
      await removeContribution(
        contribDelTarget.goalId,
        contribDelTarget.contribId,
      );
      notify("Removed");
      setContribDelTarget(null);
    } catch {
      notify("Failed", "error");
    } finally {
      setContribDeleting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteGoal(delTarget._id);
      notify("Deleted");
      setDelTarget(null);
    } catch {
      notify("Failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  const totalSaved = (goal) =>
    (goal.contributions || []).reduce((s, c) => s + c.amount, 0);
  const remaining = (goal) => Math.max(0, goal.targetAmount - totalSaved(goal));
  const progressPct = (goal) => {
    if (!goal.targetAmount) return 0;
    return Math.min(
      100,
      Math.round((totalSaved(goal) / goal.targetAmount) * 100),
    );
  };

  const daysUntil = (ts) => {
    if (!ts) return null;
    const diff = ts - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const filtered = useMemo(() => {
    if (filter === "active") return savingsGoals.filter((g) => !g.isAchieved);
    if (filter === "achieved") return savingsGoals.filter((g) => g.isAchieved);
    return savingsGoals;
  }, [savingsGoals, filter]);

  const totalTarget = savingsGoals
    .filter((g) => !g.isAchieved)
    .reduce((s, g) => s + g.targetAmount, 0);
  const totalContributed = savingsGoals
    .filter((g) => !g.isAchieved)
    .reduce((s, g) => s + totalSaved(g), 0);

  if (loading) return <FullSpinner message="Loading savings goals…" />;

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

      <SectionHead title="Savings Goals" sub="Track your financial targets">
        <div className="flex gap-2 items-center">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600"
            style={{ fontSize: "16px" }}
          >
            <option value="active">Active</option>
            <option value="achieved">Achieved</option>
            <option value="all">All</option>
          </select>
          <Btn onClick={openCreate}>+ New Goal</Btn>
        </div>
      </SectionHead>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Active Goals",
            val: savingsGoals.filter((g) => !g.isAchieved).length,
            color: "bg-violet-50 text-violet-700",
          },
          {
            label: "Total Saved",
            val: INR(totalContributed),
            color: "bg-emerald-50 text-emerald-700",
          },
          {
            label: "Still Needed",
            val: INR(Math.max(0, totalTarget - totalContributed)),
            color: "bg-amber-50 text-amber-700",
          },
        ].map((c) => (
          <div
            key={c.label}
            className={`rounded-xl p-3 text-center ${c.color}`}
          >
            <p className="text-lg font-bold">{c.val}</p>
            <p className="text-xs font-medium mt-0.5 opacity-70">{c.label}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No savings goals yet"
          sub="Create a goal for a vacation, emergency fund, gadget, or anything you're saving toward"
          action={<Btn onClick={openCreate}>+ New Goal</Btn>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((goal) => {
            const saved = totalSaved(goal);
            const rem = remaining(goal);
            const pct = progressPct(goal);
            const isExpanded = expandedId === goal._id;
            const days = daysUntil(goal.targetDate);

            return (
              <div
                key={goal._id}
                className={`bg-white rounded-xl border p-4 animate-enter ${goal.isAchieved ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200"}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm">
                        {goal.label}
                      </span>
                      {goal.isAchieved && (
                        <Badge color="green">🎉 Achieved</Badge>
                      )}
                      {!goal.isAchieved && goal.targetDate && days !== null && (
                        <Badge
                          color={
                            days < 0 ? "red" : days < 30 ? "amber" : "blue"
                          }
                        >
                          {days < 0
                            ? `${Math.abs(days)}d overdue`
                            : `${days}d left`}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-3 flex-wrap text-sm">
                      <span className="text-violet-600 font-bold">
                        {INR(saved)}
                      </span>
                      <span className="text-slate-400 text-xs">
                        of {INR(goal.targetAmount)}
                      </span>
                      {!goal.isAchieved && rem > 0 && (
                        <span className="text-xs text-slate-400">
                          {INR(rem)} to go
                        </span>
                      )}
                    </div>

                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{pct}%</span>
                        <span>
                          {(goal.contributions || []).length} contribution
                          {(goal.contributions || []).length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${goal.isAchieved ? "bg-emerald-500" : "bg-violet-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {goal.notes && (
                      <p className="text-xs text-slate-400 mt-1.5 italic">
                        {goal.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex gap-1">
                      <Btn
                        variant="ghost"
                        className="px-2 py-1 text-xs"
                        onClick={() => openEdit(goal)}
                      >
                        ✎ Edit
                      </Btn>
                      <Btn
                        variant="ghost"
                        className="px-2 py-1 text-xs text-rose-400"
                        onClick={() => setDelTarget(goal)}
                      >
                        ✕
                      </Btn>
                    </div>
                    {!goal.isAchieved && (
                      <Btn
                        variant="secondary"
                        className="text-xs px-2 py-1"
                        onClick={() => {
                          setShowContribModal(goal);
                          setContribForm({
                            ...EMPTY_CONTRIBUTION,
                            date: new Date().toISOString().split("T")[0],
                          });
                        }}
                      >
                        + Add Money
                      </Btn>
                    )}
                    {(goal.contributions || []).length > 0 && (
                      <button
                        className="text-xs text-indigo-500 underline"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : goal._id)
                        }
                      >
                        {isExpanded
                          ? "Hide history"
                          : `View ${goal.contributions.length} entries`}
                      </button>
                    )}
                  </div>
                </div>

                {/* Contribution history */}
                {isExpanded && (goal.contributions || []).length > 0 && (
                  <div className="mt-3 border-t border-slate-100 pt-3 space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                      Contribution History
                    </p>
                    {[...(goal.contributions || [])]
                      .sort((a, b) => b.date - a.date)
                      .map((c) => (
                        <div
                          key={c._id}
                          className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-emerald-700">
                              {INR(c.amount)}
                            </span>
                            <span className="text-slate-400 text-xs">
                              {fmtDate(c.date)}
                            </span>
                            {c.note && (
                              <span className="text-slate-400 text-xs italic">
                                {c.note}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              requestContribRemove(goal._id, c._id)
                            }
                            className="text-xs text-rose-400 hover:text-rose-600 ml-2"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    <div className="flex justify-between text-xs font-bold px-3 pt-1 text-slate-600">
                      <span>Total contributed</span>
                      <span className="text-violet-700">{INR(saved)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      {showGoalForm && (
        <Modal
          title={editingGoal ? "Edit Goal" : "New Savings Goal"}
          onClose={() => setShowGoalForm(false)}
        >
          <div className="space-y-4">
            <Field label="Goal Name" required>
              <FPInput
                value={goalForm.label}
                onChange={(e) => setG("label", e.target.value)}
                placeholder="e.g. Emergency Fund, Vacation, New Phone…"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Target Amount (₹)" required>
                <FPInput
                  type="number"
                  value={goalForm.targetAmount}
                  onChange={(e) => setG("targetAmount", e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="Target Date" hint="Optional deadline">
                <FPInput
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(e) => setG("targetDate", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Notes">
              <FPTextarea
                value={goalForm.notes}
                onChange={(e) => setG("notes", e.target.value)}
                placeholder="What's this goal for? Any notes…"
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <Btn
                variant="secondary"
                className="flex-1"
                onClick={() => setShowGoalForm(false)}
              >
                Cancel
              </Btn>
              <Btn
                variant="primary"
                className="flex-1 bg-violet-600 hover:bg-violet-700"
                onClick={handleSaveGoal}
                disabled={savingGoal}
              >
                {savingGoal
                  ? "Saving…"
                  : editingGoal
                    ? "Update Goal"
                    : "Create Goal"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Contribution Modal */}
      {showContribModal && (
        <Modal
          title={`Add Money — ${showContribModal.label}`}
          onClose={() => setShowContribModal(null)}
        >
          <div className="space-y-4">
            <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-violet-700 font-semibold">Target</span>
                <span className="text-violet-700 font-bold">
                  {INR(showContribModal.targetAmount)}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-violet-600">Saved so far</span>
                <span className="text-violet-600 font-semibold">
                  {INR(totalSaved(showContribModal))}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-500">Still needed</span>
                <span className="text-slate-700 font-semibold">
                  {INR(remaining(showContribModal))}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹)" required>
                <FPInput
                  type="number"
                  value={contribForm.amount}
                  onChange={(e) => setC("amount", e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="Date" required>
                <FPInput
                  type="date"
                  value={contribForm.date}
                  onChange={(e) => setC("date", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Note">
              <FPInput
                value={contribForm.note}
                onChange={(e) => setC("note", e.target.value)}
                placeholder="Optional note…"
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <Btn
                variant="secondary"
                className="flex-1"
                onClick={() => setShowContribModal(null)}
              >
                Cancel
              </Btn>
              <Btn
                variant="success"
                className="flex-1"
                onClick={handleAddContribution}
                disabled={savingContrib}
              >
                {savingContrib ? "Saving…" : "Add Contribution"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit save confirm */}
      {saveConfirmOpen && editingGoal && (
        <ConfirmModal
          title="Save Changes?"
          body={`Confirm changes to "${editingGoal.label}". Type CONFIRM to proceed.`}
          onConfirm={handleConfirmSave}
          onCancel={() => {
            setSaveConfirmOpen(false);
            setPendingPayload(null);
          }}
          loading={savingGoal}
          confirmTextRequired
        />
      )}

      {/* Delete confirm */}
      {delTarget && (
        <ConfirmModal
          title="Delete Goal?"
          body={`"${delTarget.label}" and all its contribution history will be permanently removed.`}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
          loading={deleting}
          confirmTextRequired
        />
      )}

      {/* Contribution remove confirm */}
      {contribDelTarget && (
        <ConfirmModal
          title="Remove Contribution?"
          body="This contribution entry will be permanently deleted. Type CONFIRM to proceed."
          onConfirm={handleRemoveContribution}
          onCancel={() => setContribDelTarget(null)}
          loading={contribDeleting}
          confirmTextRequired
        />
      )}
    </div>
  );
}
