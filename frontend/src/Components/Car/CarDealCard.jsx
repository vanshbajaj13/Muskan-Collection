import React, { useState } from "react";
import { useCar } from "./CarContext";
import { StatusBadge, ProfitChip, Btn, ConfirmModal } from "./CarUI";

const CarDealCard = ({ deal, onEdit, onDelete }) => {
  const { formatCurrency, formatDate } = useCar();
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(deal._id);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const totalExpenses = (deal.expenses || []).reduce((s, e) => s + e.amount, 0);
  const isSold = deal.dealStatus === "sold";

  return (
    <>
      {confirmDelete && (
        <ConfirmModal
          title="Delete this deal?"
          body={`${deal.carNumber}${deal.carDescription ? ` — ${deal.carDescription}` : ""} will be permanently removed.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          loading={deleting}
        />
      )}

      <div
        className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
        style={{ borderLeft: `3px solid ${isSold ? "#16a34a" : "#d97706"}` }}
      >
        {/* Compact header */}
        <div
          className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-slate-800">
                {deal.carNumber}
              </span>
              <StatusBadge status={deal.dealStatus} />
            </div>
            <p className="text-sm text-slate-500 truncate mt-0.5">
              {deal.carDescription ||
                [deal.make, deal.model, deal.year].filter(Boolean).join(" ") ||
                "—"}
            </p>
            <p className="text-lg text-slate-400 font-bold mt-0.5">
              Bought{formatDate(deal.purchaseDate)}
              {deal.boughtFrom && ` · ${deal.boughtFrom}`}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <ProfitChip value={deal.netProfit} />
            <p className="text-lg text-slate-400 font-bold mt-0.5">
              Sold {formatDate(deal.saleDate)}
              {deal.soldTo && ` · ${deal.soldTo}`}
            </p>
          </div>

          <svg
            className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-slate-100 px-4 pt-4 pb-4 space-y-4">
            {/* Financial flow */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              {/* Purchase side */}
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Purchase
                </p>
              </div>
              <FlowRow
                label="Buying Price"
                value={formatCurrency(deal.buyingPrice)}
              />
              {deal.expenses?.length > 0 &&
                deal.expenses.map((e, i) => (
                  <FlowRow
                    key={i}
                    label={`+ ${e.description || "Expense"}`}
                    value={formatCurrency(e.amount)}
                    indent
                    color="orange"
                  />
                ))}
              {totalExpenses > 0 && (
                <FlowRow
                  label="= Total Cost"
                  value={formatCurrency(deal.totalCost)}
                  bold
                  highlight="slate"
                />
              )}

              {/* Sale side */}
              {isSold && (
                <>
                  <div className="bg-slate-50 px-3 py-2 border-t border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Sale{deal.soldTo ? ` · ${deal.soldTo}` : ""}
                      {deal.saleDate ? ` · ${formatDate(deal.saleDate)}` : ""}
                    </p>
                  </div>
                  <FlowRow
                    label="Selling Price"
                    value={formatCurrency(deal.sellingPrice)}
                  />
                  <FlowRow
                    label="− Total Cost"
                    value={`−${formatCurrency(deal.totalCost)}`}
                    indent
                    color="orange"
                  />
                  <FlowRow
                    label="= Gross Profit"
                    value={formatCurrency(deal.grossProfit)}
                    bold
                    highlight={deal.grossProfit >= 0 ? "green" : "red"}
                  />
                  {deal.commissions?.length > 0 &&
                    deal.commissions.map((c, i) => (
                      <FlowRow
                        key={i}
                        label={`− Commission${c.name ? ` (${c.name})` : ""}${c.note ? ` · ${c.note}` : ""}`}
                        value={`−${formatCurrency(c.amount)}`}
                        indent
                        color="purple"
                      />
                    ))}
                  {deal.commissions?.length > 0 && (
                    <FlowRow
                      label="= Net Profit"
                      value={formatCurrency(deal.netProfit)}
                      bold
                      highlight={deal.netProfit >= 0 ? "green" : "red"}
                    />
                  )}
                </>
              )}
            </div>

            {/* Commissions */}
            {deal.commissions?.length > 0 && (
              <div>
                <SectionLabel>Commissions</SectionLabel>
                <div className="space-y-1.5 mt-2">
                  {deal.commissions.map((c, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center px-3 py-2 bg-purple-50 rounded-lg border border-purple-100"
                    >
                      <span className="text-sm text-slate-700">
                        {c.name}
                        {c.note && (
                          <span className="text-slate-400"> — {c.note}</span>
                        )}
                      </span>
                      <span className="text-sm font-semibold text-purple-700">
                        {formatCurrency(c.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Partners breakdown */}
            {deal.partnerBreakdown?.length > 0 && (
              <div>
                <SectionLabel>Partners</SectionLabel>
                <div className="space-y-2 mt-2">
                  {deal.partnerBreakdown.map((p) => (
                    <div
                      key={p.name}
                      className="px-3 py-2.5 bg-indigo-50 rounded-lg border border-indigo-100"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-indigo-800">
                          {p.name}{" "}
                          <span className="font-normal text-indigo-500">
                            ({p.sharePercent}%)
                          </span>
                        </span>
                        {p.profitShare !== null && (
                          <ProfitChip value={p.profitShare} />
                        )}
                      </div>
                      <div className="flex gap-4 mt-1 text-lg font-bold text-indigo-500">
                        <span>Cost: {formatCurrency(p.costShare)}</span>
                        {p.revenueShare !== null && (
                          <span>Revenue: {formatCurrency(p.revenueShare)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Notes */}
            {(deal.notes || deal.purchaseNotes || deal.saleNotes) && (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <SectionLabel>Notes</SectionLabel>
                <div className="mt-1.5 space-y-1">
                  {deal.purchaseNotes && (
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Purchase:</span>{" "}
                      {deal.purchaseNotes}
                    </p>
                  )}
                  {deal.saleNotes && (
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Sale:</span>{" "}
                      {deal.saleNotes}
                    </p>
                  )}
                  {deal.notes && (
                    <p className="text-sm text-slate-600">{deal.notes}</p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Btn
                variant="secondary"
                className="flex-1 text-sm"
                onClick={() => onEdit(deal)}
              >
                Edit Deal
              </Btn>
              <Btn
                variant="danger"
                className="text-sm border bg-red-600 border-red-200 text-red-500 hover:bg-red-50"
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

const FlowRow = ({ label, value, bold, indent, color, highlight }) => {
  const highlightCls =
    {
      green: "bg-green-50 border-t border-green-100",
      red: "bg-red-50 border-t border-red-100",
      slate: "bg-slate-100 border-t border-slate-200",
    }[highlight] || "";

  const valueCls =
    {
      green: "text-green-700",
      red: "text-red-600",
      slate: "text-slate-800",
      orange: "text-orange-600",
      purple: "text-purple-700",
    }[highlight || color] || "text-slate-700";

  return (
    <div
      className={`flex justify-between items-center px-3 py-2 ${highlightCls}`}
    >
      <span
        className={`text-sm ${indent ? "pl-3 text-slate-500" : bold ? "font-bold text-slate-700" : "text-slate-600"}`}
      >
        {label}
      </span>
      <span
        className={`text-sm ${bold ? "font-bold" : "font-medium"} ${valueCls}`}
      >
        {value}
      </span>
    </div>
  );
};

const SectionLabel = ({ children }) => (
  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
    {children}
  </p>
);

export default CarDealCard;
