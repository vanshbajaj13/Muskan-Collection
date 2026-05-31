import React, { useState } from "react";
import { usePhone } from "./PhoneContext";
import { StatusBadge, ProfitChip, Btn, Input, Field, ConfirmModal } from "./PhoneUI";

const DealCard = ({ deal, onEdit, onDelete, onRefresh }) => {
  const { formatCurrency, formatDate, addPayment, removePayment, tsFromDate } = usePhone();
  const [expanded, setExpanded] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", date: "", note: "" });
  const [savingPayment, setSavingPayment] = useState(false);
  const [removingPayment, setRemovingPayment] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const totalPaid = (deal.payments || []).reduce((s, p) => s + p.amount, 0);
  const pending = deal.sellingPrice ? Math.max(0, deal.sellingPrice - totalPaid) : 0;

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
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          loading={deleting}
        />
      )}

      <div className={`bg-white rounded-xl border transition-all duration-200
        ${deal.dealStatus === "unsold" ? "border-slate-200" : ""}
        ${deal.dealStatus === "pending_payment" ? "border-amber-200" : ""}
        ${deal.dealStatus === "complete" ? "border-emerald-200" : ""}
        hover:shadow-md`}
      >
        {/* ── Compact header row ──────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          {/* Date */}
          <div className="text-xs text-slate-400 w-20 shrink-0 font-mono">
            {formatDate(deal.purchaseDate)}
          </div>

          {/* Product */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">{deal.product}</p>
            <p className="text-xs text-slate-400 truncate">
              {deal.purchaseAccount} · {deal.purchasedFrom}
            </p>
          </div>

          {/* Status + pending */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge status={deal.dealStatus} />
            {pending > 0 && (
              <span className="text-xs text-amber-600 font-medium">
                Pending {formatCurrency(pending)}
              </span>
            )}
          </div>

          {/* Financials */}
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-xs text-slate-400">Buy / Sell</p>
            <p className="text-sm font-medium text-slate-700">
              {formatCurrency(deal.buyingPrice)} → {deal.sellingPrice ? formatCurrency(deal.sellingPrice) : <span className="text-slate-300">—</span>}
            </p>
          </div>

          {/* Net profit */}
          <div className="text-right shrink-0 w-24">
            <p className="text-xs text-slate-400">Net</p>
            <ProfitChip value={deal.netProfit} />
          </div>

          {/* Chevron */}
          <span className={`text-slate-400 text-xs transition-transform ${expanded ? "rotate-180" : ""}`}>▼</span>
        </div>

        {/* ── Expanded details ────────────────────────────────────── */}
        {expanded && (
          <div className="border-t border-slate-100 px-4 pt-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm mb-4">
              {/* Purchase */}
              <Row label="Credit Card" value={deal.creditCard || "—"} />
              <Row label="On EMI" value={deal.onEmi ? "Yes" : "No"} />
              <Row label="Cashback"
                value={deal.cashback ? `${formatCurrency(deal.cashback)} on ${formatDate(deal.cashbackDate)}` : "—"} />
              <Row label="Charges"
                value={deal.charges ? `${formatCurrency(deal.charges)}${deal.chargesDescription ? ` (${deal.chargesDescription})` : ""}` : "—"} />
              <Row label="Commission"
                value={deal.commissionAmount ? `${formatCurrency(deal.commissionAmount)} to ${deal.commissionTo || "—"}` : "—"} />

              {/* Sale */}
              <Row label="Sold To" value={deal.soldTo || "—"} />
              <Row label="Sale Date" value={formatDate(deal.saleDate)} />
              <Row label="Selling Price" value={deal.sellingPrice ? formatCurrency(deal.sellingPrice) : "—"} />

              {/* Profit breakdown */}
              <Row label="Gross Profit" value={<ProfitChip value={deal.grossProfit} />} />
              <Row label="Net Profit" value={<ProfitChip value={deal.netProfit} />} />
              <Row label="Total Paid" value={formatCurrency(totalPaid)} />
            </div>

            {/* Notes */}
            {deal.notes && (
              <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm text-slate-600">
                <span className="font-semibold text-slate-500 text-xs uppercase tracking-wide mr-2">Notes</span>
                {deal.notes}
              </div>
            )}

            {/* Payments section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Payments Received
                </p>
                <Btn variant="ghost" className="text-xs py-1 px-2 h-auto"
                  onClick={() => setShowPaymentForm(!showPaymentForm)}>
                  + Add Payment
                </Btn>
              </div>

              {/* Add payment form */}
              {showPaymentForm && (
                <form onSubmit={handleAddPayment}
                  className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-3">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <Field label="Amount (₹)">
                      <Input type="number" min="0" placeholder="e.g. 40000"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                        onWheel={(e) => e.target.blur()} required />
                    </Field>
                    <Field label="Date">
                      <Input type="date" value={paymentForm.date}
                        onChange={(e) => setPaymentForm(f => ({ ...f, date: e.target.value }))}
                        required />
                    </Field>
                    <Field label="Note (optional)">
                      <Input placeholder="UPI / Cash / etc."
                        value={paymentForm.note}
                        onChange={(e) => setPaymentForm(f => ({ ...f, note: e.target.value }))} />
                    </Field>
                  </div>
                  <div className="flex gap-2">
                    <Btn type="button" variant="secondary" className="text-xs py-1"
                      onClick={() => setShowPaymentForm(false)}>Cancel</Btn>
                    <Btn type="submit" variant="primary" className="text-xs py-1"
                      disabled={savingPayment}>
                      {savingPayment ? "Saving…" : "Save Payment"}
                    </Btn>
                  </div>
                </form>
              )}

              {/* Payments list */}
              {(deal.payments || []).length === 0 ? (
                <p className="text-sm text-slate-400 italic">No payments recorded yet.</p>
              ) : (
                <div className="space-y-1">
                  {deal.payments.map((p) => (
                    <div key={p._id}
                      className="flex items-center gap-3 text-sm px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                      <span className="font-semibold text-emerald-700">{formatCurrency(p.amount)}</span>
                      <span className="text-slate-400 text-xs">{formatDate(p.date)}</span>
                      {p.note && <span className="text-slate-500 text-xs">{p.note}</span>}
                      <button
                        className="ml-auto text-slate-300 hover:text-rose-400 transition-colors"
                        onClick={() => handleRemovePayment(p._id)}
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
              <Btn variant="secondary" className="text-xs py-1.5" onClick={() => onEdit(deal)}>
                ✎ Edit
              </Btn>
              <Btn variant="ghost" className="text-xs py-1.5 text-rose-400 hover:bg-rose-50"
                onClick={() => setConfirmDelete(true)}>
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