import React, { useState, useEffect, useCallback } from "react";
import { usePhone } from "./PhoneContext";
import {
  Btn,
  Input,
  Field,
  Modal,
  Toast,
  ConfirmModal,
  SummaryCard,
  FullScreenSpinner,
} from "./PhoneUI";

const _now = new Date();

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ── Helper: greedily auto-allocate an amount across selected deals ────────
// Pass 1: fill each deal up to its paymentPending (skips unsold/excess/zero-pending).
// Pass 2: spread any leftover evenly across open deals (unsold, excess, zero-pending).
//         If no open deals, dump remainder onto the last deal.
function autoAllocate(totalAmount, selectedDeals) {
  let remaining = totalAmount;
  const result = {};

  // Pass 1 — fill deals that have a real pending amount
  selectedDeals.forEach((d) => {
    const pending = d.paymentPending || 0;
    const isUnsold = d.dealStatus === "unsold";
    const isExcess = d.dealStatus === "excess_payment";

    if (isUnsold || isExcess || pending <= 0) {
      result[d._id] = 0;
    } else {
      const take = Math.min(remaining, pending);
      result[d._id] = take;
      remaining -= take;
    }
  });

  // Pass 2 — spread leftover across open/uncapped deals
  if (remaining > 0) {
    const openDeals = selectedDeals.filter(
      (d) =>
        d.dealStatus === "unsold" ||
        d.dealStatus === "excess_payment" ||
        (d.paymentPending || 0) <= 0
    );
    if (openDeals.length > 0) {
      const share = Math.floor((remaining / openDeals.length) * 100) / 100;
      const leftover = parseFloat((remaining - share * openDeals.length).toFixed(2));
      openDeals.forEach((d, i) => {
        result[d._id] = (result[d._id] || 0) + share + (i === 0 ? leftover : 0);
      });
    } else {
      const lastId = selectedDeals[selectedDeals.length - 1]._id;
      result[lastId] = (result[lastId] || 0) + remaining;
    }
  }

  return result;
}

// ── Group receipts by month ────────────────────────────────────────────────
function groupByMonth(receipts) {
  const map = {};
  receipts.forEach((r) => {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    if (!map[key]) map[key] = { key, label, ts: r.date, receipts: [] };
    map[key].receipts.push(r);
  });
  return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
}

// ── Shared Payment Form (used by both Add and Edit modals) ────────────────
const PaymentForm = ({ initial, onClose, onSuccess, mode = "add" }) => {
  const { getEligibleDeals, createPaymentReceipt, formatCurrency, tsFromDate, dateFromTs } =
    usePhone();

  // Core fields
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [date, setDate] = useState(() => {
    if (initial?.date) return dateFromTs(initial.date);
    return new Date().toISOString().split("T")[0];
  });
  const [method, setMethod] = useState(initial?.method || "");
  // Strip auto-generated note prefix — just the user note portion
  const [note, setNote] = useState(() => {
    if (!initial?.note) return "";
    const match = initial.note.match(/\. Note: (.+)$/);
    return match ? match[1] : "";
  });

  // Deal selection & allocation
  const [eligibleDeals, setEligibleDeals] = useState([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [search, setSearch] = useState("");
  const [showAllDeals, setShowAllDeals] = useState(false);

  // Seed selected deals from existing allocations
  const [selectedIds, setSelectedIds] = useState(
    initial?.allocations?.map((a) => a.dealId?.toString?.() || String(a.dealId)) || []
  );
  const [allocations, setAllocations] = useState(() => {
    const seed = {};
    if (initial?.allocations) {
      initial.allocations.forEach((a) => {
        seed[a.dealId?.toString?.() || String(a.dealId)] = String(a.amount);
      });
    }
    return seed;
  });
  const [autoSplit, setAutoSplit] = useState(!initial); // off when editing

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmEdit, setConfirmEdit] = useState(false);

  // In edit mode, adjust each deal's payment figures by adding back whatever
  // this receipt originally allocated — so the UI shows "true" pending
  // before this receipt is factored in, and auto-split has accurate room.
  const adjustDealForEdit = useCallback(
    (deal) => {
      if (mode !== "edit" || !initial?.allocations) return deal;
      const originalAlloc = initial.allocations.find(
        (a) => (a.dealId?.toString?.() || String(a.dealId)) === String(deal._id)
      );
      if (!originalAlloc) return deal;
      const restoredPending = (deal.paymentPending || 0) + originalAlloc.amount;
      const restoredReceived = Math.max(0, (deal.totalPaymentsReceived || 0) - originalAlloc.amount);
      let restoredStatus = deal.dealStatus;
      if (deal.sellingPrice) {
        if (restoredReceived > deal.sellingPrice) restoredStatus = "excess_payment";
        else if (restoredReceived >= deal.sellingPrice) restoredStatus = "complete";
        else restoredStatus = "pending_payment";
      }
      return { ...deal, paymentPending: restoredPending, totalPaymentsReceived: restoredReceived, dealStatus: restoredStatus };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, initial]
  );

  const loadDeals = useCallback(async () => {
    setLoadingDeals(true);
    try {
      const params = {};
      if (showAllDeals) {
        params.includeUnsold = "true";
        params.includeCompleted = "true";
      }
      if (search.trim()) params.search = search.trim();
      const data = await getEligibleDeals(params);
      setEligibleDeals((prev) => {
        const fetched = (data.deals || []).map(adjustDealForEdit);
        const fetchedIds = new Set(fetched.map((d) => d._id));
        const preserved = prev.filter(
          (d) => !fetchedIds.has(d._id) && selectedIds.includes(d._id)
        );
        return [...fetched, ...preserved];
      });
    } catch (e) {
      setError(e.message || "Failed to load deals");
    } finally {
      setLoadingDeals(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAllDeals, search, adjustDealForEdit]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  // Re-run auto allocation when amount, selection, or deal data changes.
  // eligibleDeals already have adjusted paymentPending (adjustDealForEdit),
  // so pass them directly — no further per-deal correction needed.
  useEffect(() => {
    if (!autoSplit) return;
    const amt = parseFloat(amount);
    if (!amt || selectedIds.length === 0) {
      setAllocations({});
      return;
    }
    const selectedDeals = selectedIds
      .map((id) => eligibleDeals.find((d) => d._id === id || d._id?.toString() === id))
      .filter(Boolean);

    const result = autoAllocate(amt, selectedDeals);
    const stringified = {};
    Object.entries(result).forEach(([k, v]) => {
      stringified[k] = v > 0 ? String(v) : "";
    });
    setAllocations(stringified);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, selectedIds, autoSplit, eligibleDeals]);

  const toggleDeal = (deal) => {
    const id = deal._id;
    setEligibleDeals((prev) =>
      prev.some((d) => d._id === id) ? prev : [...prev, adjustDealForEdit(deal)]
    );
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
  };


  const allocatedTotal = Object.values(allocations).reduce(
    (s, v) => s + (parseFloat(v) || 0),
    0
  );
  const enteredAmount = parseFloat(amount) || 0;
  const diff = Math.round((enteredAmount - allocatedTotal) * 100) / 100;

  // Build allocs once — shared by validation and the actual save call
  const allocs = selectedIds.map((id) => ({
    dealId: id,
    amount: parseFloat(allocations[id] || 0),
  }));

  // Validate and either proceed (add) or open confirm modal (edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!amount || !date || selectedIds.length === 0) {
      setError("Enter an amount, date, and select at least one deal.");
      return;
    }
    if (Math.abs(diff) > 0.01) {
      setError(
        `Allocated total (${formatCurrency(allocatedTotal)}) must match received amount (${formatCurrency(enteredAmount)}). Difference: ${formatCurrency(diff)}.`
      );
      return;
    }
    if (allocs.some((a) => !a.amount || a.amount <= 0)) {
      setError("Every selected deal needs an allocation amount greater than 0.");
      return;
    }

    // Edit mode: require explicit CONFIRM before touching any records
    if (mode === "edit") {
      setConfirmEdit(true);
      return;
    }

    await doSubmit();
  };

  // Actual API call — called directly (add) or after confirm modal (edit)
  const doSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        amount: enteredAmount,
        date: tsFromDate(date),
        note,
        method,
        allocations: allocs,
      };

      if (mode === "edit" && initial?._id) {
        const token = JSON.parse(window.localStorage.getItem("userInfo")).token;
        const res = await fetch(`/api/phones/payments/${initial._id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Request failed (${res.status})`);
        }
      } else {
        await createPaymentReceipt(payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to save payment");
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "edit" ? "Edit Payment" : "Add Payment Received";

  return (
    <>
      {confirmEdit && (
        <ConfirmModal
          title="Update this payment?"
          body="Type CONFIRM to update this payment and re-apply allocations across the selected deals."
          confirmTextRequired={true}
          loading={saving}
          onCancel={() => setConfirmEdit(false)}
          onConfirm={async () => {
            await doSubmit();
            setConfirmEdit(false);
          }}
        />
      )}
    <Modal title={title} onClose={onClose} wide={true}>
      {saving && <FullScreenSpinner message="Updating payment…" />}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Amount / date / method */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Amount Received (₹)" required>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 240000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onWheel={(e) => e.target.blur()}
              required
            />
          </Field>
          <Field label="Date" required>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Method (optional)">
            <Input
              placeholder="UPI / Cash / Bank Transfer"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Note (optional)" hint="Added on top of the auto-generated breakup note">
          <Input
            placeholder="e.g. Bulk settlement from Vaibhav"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        {/* Deal selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {mode === "edit" ? "Re-allocate to Deals" : "Select Deals to Apply Payment To"}
            </p>
            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={showAllDeals}
                onChange={(e) => setShowAllDeals(e.target.checked)}
              />
              Show all deals (incl. completed &amp; unsold)
            </label>
          </div>

          <Input
            placeholder="Search by product or buyer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />

          <div className="border border-slate-200 rounded-xl max-h-64 overflow-y-auto">
            {loadingDeals ? (
              <div className="text-center py-6 text-sm text-slate-400">Loading deals…</div>
            ) : eligibleDeals.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-400">No matching deals</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {eligibleDeals.map((d) => {
                  const id = d._id;
                  const checked = selectedIds.includes(id);
                  const originalAlloc = initial?.allocations?.find(
                    (a) => (a.dealId?.toString?.() || String(a.dealId)) === id
                  );
                  const wasOriginallyAllocated = !!originalAlloc;
                  const thisAlloc = parseFloat(allocations[id] || 0);

                  // Project deal status after applying current allocation input
                  const projectedReceived = checked
                    ? (d.totalPaymentsReceived || 0) + thisAlloc
                    : d.totalPaymentsReceived || 0;
                  let projectedStatus = d.dealStatus;
                  if (d.sellingPrice) {
                    if (projectedReceived > d.sellingPrice) projectedStatus = "excess_payment";
                    else if (projectedReceived >= d.sellingPrice) projectedStatus = "complete";
                    else projectedStatus = "pending_payment";
                  }

                  return (
                    <label
                      key={id}
                      className={`flex items-start gap-3 px-3 py-3 cursor-pointer transition-colors
                        ${checked ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDeal(d)}
                        className="shrink-0 mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        {/* Deal name */}
                        <p className="text-sm font-medium text-slate-700 truncate">
                          {d.product}
                          {d.soldTo && <span className="text-slate-400"> &rarr; {d.soldTo}</span>}
                          {wasOriginallyAllocated && mode === "edit" && (
                            <span className="ml-2 text-xs text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">
                              prev. allocated
                            </span>
                          )}
                        </p>

                        {/* Selling price + before/this-receipt context */}
                        {d.dealStatus !== "unsold" && d.sellingPrice ? (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Sell {formatCurrency(d.sellingPrice)}
                            {mode === "edit" && wasOriginallyAllocated ? (
                              <>
                                {" \u00b7 "}Before: {formatCurrency(d.totalPaymentsReceived)}
                                {" \u00b7 "}
                                <p className="text-violet-500">
                                  This receipt: {formatCurrency(originalAlloc.amount)}
                                </p>
                              </>
                            ) : (
                              <> &middot; Received: {formatCurrency(d.totalPaymentsReceived)}</>
                            )}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5">Unsold</p>
                        )}

                        {/* Live projected outcome */}
                        {checked && d.sellingPrice && (
                          <p className="text-xs mt-1 font-semibold">
                            {projectedStatus === "complete" && (
                              <span className="text-emerald-600">&check; Fully paid after this</span>
                            )}
                            {projectedStatus === "excess_payment" && (
                              <span className="text-rose-500">
                                &frasl; Overpaid by {formatCurrency(projectedReceived - d.sellingPrice)}
                              </span>
                            )}
                            {projectedStatus === "pending_payment" && (
                              <span className="text-amber-500">
                                Still pending {formatCurrency(d.sellingPrice - projectedReceived)}
                              </span>
                            )}
                          </p>
                        )}
                      </div>

                      {/* Right side: input when checked, pending status when unchecked */}
                      {checked ? (
                        <div className="w-28 shrink-0">
                          <Input
                            type="number"
                            min="0"
                            placeholder="split"
                            value={allocations[id] || ""}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              setAutoSplit(false);
                              setAllocations((a) => ({ ...a, [id]: e.target.value }));
                            }}
                            onWheel={(e) => e.target.blur()}
                            className="text-right text-sm"
                          />
                        </div>
                      ) : (
                        d.dealStatus !== "unsold" && d.sellingPrice && (
                          <span className="text-xs font-medium shrink-0 mt-0.5 text-slate-400">
                            {(projectedReceived - d.sellingPrice) > 0
                              ? `Pending ${formatCurrency(d.paymentPending)}`
                              : "Fully Paid"}
                          </span>
                        )
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Allocation summary bar — always visible when amount is entered, updates live on (de)select */}
        {enteredAmount > 0 && (
          <div
            className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between gap-3
              ${Math.abs(diff) < 0.01 && selectedIds.length > 0
                ? "bg-emerald-50 border border-emerald-100"
                : "bg-amber-50 border border-amber-100"}`}
          >
            <span className="text-slate-600">
              Allocated:{" "}
              <span className="font-semibold">{formatCurrency(allocatedTotal)}</span>{" "}
              of <span className="font-semibold">{formatCurrency(enteredAmount)}</span>
              {selectedIds.length === 0 && (
                <span className="ml-2 text-amber-500 font-medium">— select at least one deal</span>
              )}
            </span>
            {selectedIds.length > 0 && Math.abs(diff) >= 0.01 && (
              <span className="font-semibold text-amber-600 shrink-0">
                {diff > 0
                  ? `${formatCurrency(diff)} unallocated`
                  : `Over by ${formatCurrency(Math.abs(diff))}`}
              </span>
            )}
            <button
              type="button"
              onClick={() => setAutoSplit(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline shrink-0"
            >
              Auto-split
            </button>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <Btn type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" variant="primary" className="flex-1" disabled={saving}>
            {saving
              ? mode === "edit" ? "Updating…" : "Saving…"
              : mode === "edit" ? "Update Payment" : "Save Payment"}
          </Btn>
        </div>
      </form>
    </Modal>
    </>
  );
};

// ── Receipt card ─────────────────────────────────────────────────────────────
const ReceiptCard = ({ receipt, onDelete, onEdit, deleting, formatCurrency, formatDate }) => {
  const [expanded, setExpanded] = useState(false);
  const isSplit = receipt.allocations.length > 1;
  const fullyApplied =
    Math.abs(
      receipt.amount - receipt.allocations.reduce((s, a) => s + a.amount, 0)
    ) < 0.01;

  return (
    <div className="bg-white rounded-xl border border-slate-200 hover:shadow-sm transition-shadow">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-emerald-700 text-base">
            {formatCurrency(receipt.amount)}
          </p>
          <p className="text-xs text-slate-400">
            {formatDate(receipt.date)}
            {receipt.method && <span> · {receipt.method}</span>}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {isSplit ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
              Split · {receipt.allocations.length} deals
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              Single deal
            </span>
          )}
          {fullyApplied ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Fully Applied
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              Partially Applied
            </span>
          )}
        </div>

        <span className={`text-slate-400 text-xs transition-transform ${expanded ? "rotate-180" : ""}`}>
          ▼
        </span>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
            Split Breakdown
          </p>
          <div className="space-y-1 mb-3">
            {receipt.allocations.map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
              >
                <span className="text-slate-700 font-medium truncate">
                  {a.product || "Deal"}
                  {a.soldTo && <span className="text-slate-400"> → {a.soldTo}</span>}
                </span>
                <span className="font-semibold text-emerald-600 shrink-0 ml-3">
                  {formatCurrency(a.amount)}
                </span>
              </div>
            ))}
          </div>
          {receipt.note && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-slate-600 mb-3">
              {receipt.note}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Btn
              variant="secondary"
              className="text-xs py-1.5"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(receipt);
              }}
            >
              ✎ Edit / Re-split
            </Btn>
            <Btn
              variant="ghost"
              className="text-xs py-1.5 border border-slate-200 text-red-400 hover:text-white hover:bg-red-400"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(receipt);
              }}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Capsule filter button ─────────────────────────────────────────────────────
const Capsule = ({ active, onClick, children, activeColor = "gray" }) => {
  const activeClasses = {
    indigo: "bg-indigo-600 text-white border-indigo-600 shadow-sm",
    emerald: "bg-emerald-400 text-white border-emerald-400 shadow-sm",
    amber: "bg-amber-300 text-white border-amber-300 shadow-sm",
    slate: "bg-slate-600 text-white border-slate-600 shadow-sm",
    gray: "bg-slate-300 text-white border-slate-300 shadow-sm",
    violet: "bg-violet-400 text-white border-violet-400 shadow-sm",
  };
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap
        ${active ? activeClasses[activeColor] : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
    >
      {children}
    </button>
  );
};

// ── Month group ──────────────────────────────────────────────────────────────
const MonthGroup = ({ group, onDelete, onEdit, deletingId, formatCurrency, formatDate, allExpanded }) => {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (allExpanded !== null) setOpen(allExpanded);
  }, [allExpanded]);

  const total = group.receipts.reduce((s, r) => s + r.amount, 0);
  const splitCount = group.receipts.filter((r) => r.allocations.length > 1).length;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors mb-1"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">{group.label}</span>
          <span className="text-xs text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
            {group.receipts.length} payment{group.receipts.length !== 1 ? "s" : ""}
          </span>
          {splitCount > 0 && (
            <span className="text-xs text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">
              {splitCount} split
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-emerald-600">
            {formatCurrency(total)}
          </span>
          <span className="text-slate-400 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="space-y-2 mb-2">
          {group.receipts.map((r) => (
            <ReceiptCard
              key={r._id}
              receipt={r}
              onDelete={onDelete}
              onEdit={onEdit}
              deleting={deletingId === r._id}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main PhonePayments ────────────────────────────────────────────────────────
const PhonePayments = () => {
  const { getPayments, deletePaymentReceipt, formatCurrency, formatDate } = usePhone();

  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editReceipt, setEditReceipt] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [allExpanded, setAllExpanded] = useState(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [stripYear, setStripYear] = useState(_now.getFullYear());
  const [selectedMonthKey, setSelectedMonthKey] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPayments();
      setReceipts(data.receipts || []);
    } catch (e) {
      showToast(e.message || "Failed to load payments", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleDelete = async (receipt) => {
    setDeletingId(receipt._id);
    try {
      await deletePaymentReceipt(receipt._id);
      showToast("Payment deleted and removed from all deals");
      fetchReceipts();
    } catch (e) {
      showToast(e.message || "Failed to delete payment", "error");
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const selectMonth = (year, month) => {
    const key = `${year}-${month}`;
    setSelectedMonthKey((prev) => (prev === key ? null : key));
  };

  const clearMonthFilter = () => setSelectedMonthKey(null);

  const isFullyApplied = (r) =>
    Math.abs(r.amount - r.allocations.reduce((s, a) => s + a.amount, 0)) < 0.01;

  const statusFiltered = receipts.filter((r) => {
    switch (statusFilter) {
      case "split": return r.allocations.length > 1;
      case "single": return r.allocations.length === 1;
      case "partial": return !isFullyApplied(r);
      case "full": return isFullyApplied(r);
      default: return true;
    }
  });

  const monthFiltered = selectedMonthKey
    ? statusFiltered.filter((r) => {
        const d = new Date(r.date);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        return key === selectedMonthKey;
      })
    : statusFiltered;

  const groups = groupByMonth(monthFiltered);

  const totalReceived = monthFiltered.reduce((s, r) => s + r.amount, 0);
  const splitCount = monthFiltered.filter((r) => r.allocations.length > 1).length;
  const partialCount = monthFiltered.filter((r) => !isFullyApplied(r)).length;

  const statusCapsules = [
    { key: "all", label: "All", color: "gray" },
    { key: "split", label: "Split Payments", color: "violet" },
    { key: "single", label: "Single Deal", color: "indigo" },
    { key: "full", label: "Fully Applied", color: "emerald" },
    { key: "partial", label: "Partially Applied", color: "amber" },
  ];

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this payment?"
          body={`This will remove the ${formatCurrency(confirmDelete.amount)} payment and its allocations from ${confirmDelete.allocations.length} deal(s). This cannot be undone.`}
          confirmTextRequired={true}
          loading={deletingId === confirmDelete._id}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {showAdd && (
        <PaymentForm
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            showToast("Payment recorded and split across selected deals");
            fetchReceipts();
          }}
          mode="add"
        />
      )}

      {editReceipt && (
        <PaymentForm
          initial={editReceipt}
          onClose={() => setEditReceipt(null)}
          onSuccess={() => {
            setEditReceipt(null);
            showToast("Payment updated successfully");
            fetchReceipts();
          }}
          mode="edit"
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Payments Received</h2>
          <p className="text-sm text-slate-400">
            {monthFiltered.length} transaction{monthFiltered.length !== 1 ? "s" : ""}
            {groups.length > 0 && ` · ${groups.length} month${groups.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Btn
            variant="secondary"
            onClick={() => setAllExpanded((v) => (v === false ? true : false))}
          >
            {allExpanded === false ? "Expand All" : "Collapse All"}
          </Btn>
          <Btn variant="primary" onClick={() => setShowAdd(true)}>
            + Add Payment
          </Btn>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl mb-4 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
          <button
            onClick={() => setStripYear((y) => y - 1)}
            className="text-slate-400 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors text-sm font-bold"
          >
            ‹
          </button>
          <span className="text-sm font-bold text-slate-700 tracking-wide">
            {stripYear}
            {stripYear === new Date().getFullYear() && (
              <span className="ml-2 text-xs text-slate-500 font-normal">current year</span>
            )}
          </span>
          <button
            onClick={() => setStripYear((y) => y + 1)}
            className="text-slate-400 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors text-sm font-bold"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-6 md:grid-cols-12 gap-1 p-2">
          {MONTH_NAMES.map((name, idx) => {
            const key = `${stripYear}-${idx + 1}`;
            const isSelected = selectedMonthKey === key;
            const isCurrentMonth =
              stripYear === new Date().getFullYear() && idx === new Date().getMonth();
            return (
              <button
                key={key}
                onClick={() => selectMonth(stripYear, idx + 1)}
                className={`px-1 py-2 rounded-lg text-xs font-semibold transition-colors text-center
                  ${isSelected
                    ? "bg-slate-300 text-white shadow-sm"
                    : isCurrentMonth
                      ? "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-indigo-100"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                {name}
              </button>
            );
          })}
        </div>
        {selectedMonthKey && (
          <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {MONTH_NAMES[parseInt(selectedMonthKey.split("-")[1]) - 1]}{" "}
              {selectedMonthKey.split("-")[0]}
            </span>
            <button
              onClick={clearMonthFilter}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
            >
              Clear month filter
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <SummaryCard label="Total Received" value={formatCurrency(totalReceived)} accent="emerald" />
        <SummaryCard
          label="Split Payments"
          value={splitCount}
          sub="divided across multiple deals"
          accent="indigo"
        />
        <SummaryCard
          label="Partially Applied"
          value={partialCount}
          sub="allocation doesn't fully match amount"
          accent={partialCount > 0 ? "amber" : "slate"}
        />
      </div>

      <div className="mb-5">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
          {statusCapsules.map((c) => (
            <Capsule
              key={c.key}
              active={statusFilter === c.key}
              activeColor={c.color}
              onClick={() => setStatusFilter(c.key)}
            >
              {c.label}
            </Capsule>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 animate-enter">Loading payments…</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-slate-400 animate-enter">
          <p className="text-4xl mb-3">💰</p>
          <p className="font-medium text-slate-500">No payments found</p>
          <p className="text-sm mt-1">Try adjusting your filters or add a new payment</p>
        </div>
      ) : (
        <div className="space-y-1 animate-enter">
          {groups.map((group) => (
            <MonthGroup
              key={group.key}
              group={group}
              onDelete={setConfirmDelete}
              onEdit={setEditReceipt}
              deletingId={deletingId}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              allExpanded={allExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PhonePayments;