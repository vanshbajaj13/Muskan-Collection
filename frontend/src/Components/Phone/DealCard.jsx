import React, { useState } from "react";
import { usePhone } from "./PhoneContext";
import {
  StatusBadge,
  ProfitChip,
  Btn,
  Input,
  Field,
  ConfirmModal,
} from "./PhoneUI";

const DealCard = ({ deal, onEdit, onDelete, onRefresh }) => {
  const { formatCurrency, formatDate, addPayment, removePayment, tsFromDate } =
    usePhone();
  const [expanded, setExpanded] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: "",
    note: "",
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [removingPayment, setRemovingPayment] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeletePayment, setConfirmDeletePayment] = useState(null); // stores paymentId
  const [deleting, setDeleting] = useState(false);

  const totalPaid = (deal.payments || []).reduce((s, p) => s + p.amount, 0);
  const pending = deal.sellingPrice
    ? Math.max(0, deal.sellingPrice - totalPaid)
    : 0;

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || !paymentForm.date) return;
    setSavingPayment(true);
    try {
      await addPayment(deal._id, {
        amount: parseFloat(paymentForm.amount),
        date: tsFromDate(paymentForm.date),
        note: paymentForm.note,
      });
      setPaymentForm({ amount: "", date: "", note: "" });
      setShowPaymentForm(false);
      onRefresh();
    } finally {
      setSavingPayment(false);
    }
  };

  const handleRemovePayment = async (paymentId) => {
    setRemovingPayment(paymentId);
    try {
      await removePayment(deal._id, paymentId);
      onRefresh();
    } finally {
      setRemovingPayment(null);
      setConfirmDeletePayment(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(deal._id);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      {confirmDelete && (
        <ConfirmModal
          title="Delete this deal?"
          body={`${deal.product} — ${formatCurrency(deal.buyingPrice)} will be permanently removed.`}
          confirmTextRequired={true}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          loading={deleting}
        />
      )}

      {confirmDeletePayment && (
        <ConfirmModal
          title="Remove this payment?"
          body="This action cannot be undone."
          confirmTextRequired={true}
          onConfirm={() => handleRemovePayment(confirmDeletePayment)}
          onCancel={() => setConfirmDeletePayment(null)}
          loading={removingPayment === confirmDeletePayment}
        />
      )}

      <div
        className={`bg-white rounded-xl border transition-all duration-200
        ${deal.dealStatus === "unsold" ? "border-slate-200" : ""}
        ${deal.dealStatus === "pending_payment" ? "border-amber-200" : ""}
        ${deal.dealStatus === "complete" ? "border-emerald-200" : ""}
        hover:shadow-md`}
      >
        {/* ── Compact header row ──────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer overflow-auto"
          onClick={() => setExpanded(!expanded)}
        >
          {/* Date */}
          {/* <div className="text-xs text-slate-400 w-20 shrink-0 font-mono">
            {formatDate(deal.purchaseDate)}
          </div> */}

          {/* Product */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm ">
              {deal.product}
            </p>
            <p className="text-xs text-slate-400 ">
              {deal.purchaseAccount} · {deal.purchasedFrom}
            </p>
          </div>

          {/* Status + pending */}
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={deal.dealStatus} />
            {pending > 0 && (
              <span className="text-xs text-amber-600 font-medium">
                Pending {formatCurrency(pending)}
              </span>
            )}
            {deal.cashbackStatus === "pending" && (
              <span className="text-xs text-violet-600 font-medium bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">
                Cashback pending
              </span>
            )}
            {deal.cashbackStatus === "received" && (
              <span className="ml-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              Cashback ✓
            </span>
            )}
          </div>

          {/* Financials */}
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-xs text-slate-400">Buy / Sell</p>
            <p className="text-sm font-medium text-slate-700">
              {formatCurrency(deal.buyingPrice)} →{" "}
              {deal.sellingPrice ? (
                formatCurrency(deal.sellingPrice)
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </p>
          </div>

          {/* Net profit */}
          <div className="text-right shrink-0 w-24">
            <p className="text-xs text-slate-400 hidden sm:block">Net</p>
            <div className="text-sm font-medium text-slate-700 sm:hidden">
              {deal.sellingPrice ? (
                formatCurrency(deal.sellingPrice)
              ) : (
                <span className="text-slate-300">—</span>
              )}
              <p>
                {" - "}
                {formatCurrency(deal.buyingPrice)}
              </p>
              {deal.charges !== 0 && (
                <p className="text-rose-300">
                  {" - "}
                  {formatCurrency(deal.charges)}
                </p>
              )}
              {deal.cashback !== 0 && (
                <p className="text-emerald-300">
                  {" + "}
                  {formatCurrency(deal.cashback)}
                </p>
              )}
            </div>
            <ProfitChip value={deal.netProfit} />
          </div>

          {/* Chevron */}
          <span
            className={`text-slate-400 text-xs transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            ▼
          </span>
        </div>

        {/* ── Expanded details ────────────────────────────────────── */}
        {expanded && (
          <div className="border-t border-slate-100 px-4 pt-4 pb-4">

            {/* ── Two-column layout: deal info + profit breakdown ── */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">

              {/* Left: deal meta info */}
              <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Row label="Purchase Date" value={formatDate(deal.purchaseDate)} />
                <Row label="Credit Card" value={deal.creditCard || "—"} />
                <Row label="With GST" value={deal.withGST ? "Yes" : "No"} />
                <Row label="Sold To" value={deal.soldTo || "—"} />
                <Row label="Sale Date" value={formatDate(deal.saleDate)} />
                <Row
                  label="Cashback"
                  value={
                    deal.cashbackStatus === "not_expected" ? (
                      "—"
                    ) : deal.cashbackStatus === "pending" ? (
                      <span className="text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded">
                        Pending
                      </span>
                    ) : (
                      <span>
                        {formatCurrency(deal.cashback)}
                        {deal.cashbackDate && (
                          <span className="text-slate-400 ml-1 text-xs">
                            on {formatDate(deal.cashbackDate)}
                          </span>
                        )}
                      </span>
                    )
                  }
                />
                <Row
                  label="Total Received"
                  value={
                    <span className={totalPaid > 0 ? "text-emerald-600 font-semibold" : ""}>
                      {formatCurrency(totalPaid)}
                    </span>
                  }
                />
                {pending > 0 && (
                  <Row
                    label="Still Pending"
                    value={
                      <span className="text-amber-600 font-semibold">
                        {formatCurrency(pending)}
                      </span>
                    }
                  />
                )}
              </div>

              {/* Right: profit breakdown card */}
              {deal.sellingPrice ? (
                <div className="md:w-60 shrink-0">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                      Profit Breakdown
                    </p>

                    {/* Selling price */}
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-600">Selling Price</span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(deal.sellingPrice)}
                      </span>
                    </div>

                    {/* Buying price */}
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-500">− Buying Price</span>
                      <span className="font-medium text-rose-500">
                        − {formatCurrency(deal.buyingPrice)}
                      </span>
                    </div>

                    {/* Charges (only if present) */}
                    {deal.charges > 0 && (
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-slate-500 truncate mr-2">
                          − Charges
                          {deal.chargesDescription && (
                            <span className="text-slate-400 text-xs ml-1">
                              ({deal.chargesDescription})
                            </span>
                          )}
                        </span>
                        <span className="font-medium text-rose-400 shrink-0">
                          − {formatCurrency(deal.charges)}
                        </span>
                      </div>
                    )}

                    {/* Cashback (only if received) */}
                    {deal.cashback > 0 && (
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-slate-500">+ Cashback</span>
                        <span className="font-medium text-emerald-500">
                          + {formatCurrency(deal.cashback)}
                        </span>
                      </div>
                    )}

                    {/* Divider + Gross Profit */}
                    <div className="border-t border-slate-200 mt-1 pt-2 flex justify-between items-center">
                      <span className="text-slate-700 font-semibold text-xs uppercase tracking-wide">
                        Gross Profit
                      </span>
                      <ProfitChip value={deal.grossProfit} />
                    </div>

                    {/* Commission (only if present) */}
                    {deal.commissionAmount > 0 && (
                      <div className="flex justify-between items-center py-1.5 mt-0.5">
                        <span className="text-slate-500 truncate mr-2">
                          − Commission
                          {deal.commissionTo && (
                            <span className="text-slate-400 text-xs ml-1">
                              ({deal.commissionTo})
                            </span>
                          )}
                        </span>
                        <span className="font-medium text-rose-400 shrink-0">
                          − {formatCurrency(deal.commissionAmount)}
                        </span>
                      </div>
                    )}

                    {/* Net Profit — only show separately if commission exists */}
                    {deal.commissionAmount > 0 && (
                      <div className="border-t border-slate-200 mt-1 pt-2 flex justify-between items-center">
                        <span className="text-slate-700 font-bold text-xs uppercase tracking-wide">
                          Net Profit
                        </span>
                        <ProfitChip value={deal.netProfit} />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Unsold — show a minimal cost summary */
                <div className="md:w-60 shrink-0">
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                      Cost Summary
                    </p>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-600">Buying Price</span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(deal.buyingPrice)}
                      </span>
                    </div>
                    {deal.charges > 0 && (
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-slate-500">+ Charges</span>
                        <span className="font-medium text-rose-400">
                          + {formatCurrency(deal.charges)}
                        </span>
                      </div>
                    )}
                    {deal.cashback > 0 && (
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-slate-500">− Cashback</span>
                        <span className="font-medium text-emerald-500">
                          − {formatCurrency(deal.cashback)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 mt-1 pt-2 flex justify-between items-center">
                      <span className="text-slate-700 font-semibold text-xs uppercase tracking-wide">
                        Effective Cost
                      </span>
                      <span className="font-bold text-slate-800">
                        {formatCurrency(
                          (deal.buyingPrice || 0) +
                          (deal.charges || 0) -
                          (deal.cashback || 0)
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-3 text-center italic">
                      Not sold yet
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {deal.notes && (
              <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm text-slate-600">
                <span className="font-semibold text-slate-500 text-xs uppercase tracking-wide mr-2">
                  Notes
                </span>
                {deal.notes}
              </div>
            )}

            {/* Payments section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Payments Received
                </p>
                <Btn
                  variant="ghost"
                  className="text-xs py-1 px-2 h-auto"
                  onClick={() => setShowPaymentForm(!showPaymentForm)}
                >
                  + Add Payment
                </Btn>
              </div>

              {/* Add payment form */}
              {showPaymentForm && (
                <form
                  onSubmit={handleAddPayment}
                  className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-3"
                >
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <Field label="Amount (₹)">
                      <Input
                        type="number"
                        min="0"
                        placeholder="e.g. 40000"
                        value={paymentForm.amount}
                        onChange={(e) =>
                          setPaymentForm((f) => ({
                            ...f,
                            amount: e.target.value,
                          }))
                        }
                        onWheel={(e) => e.target.blur()}
                        required
                      />
                    </Field>
                    <Field label="Date">
                      <Input
                        type="date"
                        value={paymentForm.date}
                        onChange={(e) =>
                          setPaymentForm((f) => ({
                            ...f,
                            date: e.target.value,
                          }))
                        }
                        required
                      />
                    </Field>
                    <Field label="Note (optional)">
                      <Input
                        placeholder="UPI / Cash / etc."
                        value={paymentForm.note}
                        onChange={(e) =>
                          setPaymentForm((f) => ({
                            ...f,
                            note: e.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>
                  <div className="flex gap-2">
                    <Btn
                      type="button"
                      variant="secondary"
                      className="text-xs py-1"
                      onClick={() => setShowPaymentForm(false)}
                    >
                      Cancel
                    </Btn>
                    <Btn
                      type="submit"
                      variant="primary"
                      className="text-xs py-1"
                      disabled={savingPayment}
                    >
                      {savingPayment ? "Saving…" : "Save Payment"}
                    </Btn>
                  </div>
                </form>
              )}

              {/* Payments list */}
              {(deal.payments || []).length === 0 ? (
                <p className="text-sm text-slate-400 italic">
                  No payments recorded yet.
                </p>
              ) : (
                <div className="space-y-1">
                  {deal.payments.map((p) => (
                    <div
                      key={p._id}
                      className="flex items-center gap-3 text-sm px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100"
                    >
                      <span className="font-semibold text-emerald-700">
                        {formatCurrency(p.amount)}
                      </span>
                      <span className="text-slate-400 text-xs">
                        {formatDate(p.date)}
                      </span>
                      {p.note && (
                        <span className="text-slate-500 text-xs">{p.note}</span>
                      )}
                      <button
                        className="ml-auto text-slate-300 hover:text-rose-400 transition-colors"
                        onClick={() => setConfirmDeletePayment(p._id)}
                        disabled={removingPayment === p._id}
                        title="Remove payment"
                      >
                        {removingPayment === p._id ? "…" : "✕"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Btn
                variant="secondary"
                className="text-xs py-1.5"
                onClick={() => onEdit(deal)}
              >
                ✎ Edit
              </Btn>
              <Btn
                variant="ghost"
                className="text-xs py-1.5 border border-slate-200 text-red-400 hover:text-white hover:bg-red-400"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Btn>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const Row = ({ label, value }) => (
  <div>
    <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
    <p className="font-medium text-slate-700">{value}</p>
  </div>
);

export default DealCard;