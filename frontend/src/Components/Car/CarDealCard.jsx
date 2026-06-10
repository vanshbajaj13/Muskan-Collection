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
    try { await onDelete(deal._id); }
    finally { setDeleting(false); setConfirmDelete(false); }
  };

  const totalExpenses = (deal.expenses || []).reduce((s, e) => s + e.amount, 0);

  return (
    <>
      {confirmDelete && (
        <ConfirmModal
          title="इस डील को हटाएं?"
          body={`${deal.carNumber} — ${deal.carDescription || ""} हमेशा के लिए हट जाएगी।`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          loading={deleting}
        />
      )}

      <div className={`bg-white rounded-2xl border-2 transition-all duration-200 hover:shadow-md
        ${deal.dealStatus === "sold" ? "border-green-200" : "border-amber-200"}`}>

        {/* ── Compact header ──────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-5 py-4 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          {/* Car icon by status */}
          <div className={`text-3xl shrink-0`}>
            {deal.dealStatus === "sold" ? "✅" : "🚗"}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <p className="text-xl font-extrabold text-gray-800 leading-tight">
              {deal.carNumber}
            </p>
            <p className="text-base text-gray-500 truncate">
              {deal.carDescription || [deal.make, deal.model, deal.year].filter(Boolean).join(" ") || "गाड़ी"}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">
              खरीद: {formatDate(deal.purchaseDate)}
              {deal.boughtFrom && ` · ${deal.boughtFrom}`}
            </p>
          </div>

          {/* Status + profit */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusBadge status={deal.dealStatus} />
            <ProfitChip value={deal.netProfit} />
          </div>

          {/* Chevron */}
          <span className={`text-gray-400 font-bold transition-transform text-lg ml-1 ${expanded ? "rotate-180" : ""}`}>
            ▼
          </span>
        </div>

        {/* ── Expanded details ─────────────────────────────────── */}
        {expanded && (
          <div className="border-t-2 border-gray-100 px-5 pt-5 pb-5 space-y-5">

            {/* Financials grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoBox label="खरीद मूल्य" value={formatCurrency(deal.buyingPrice)} />
              {totalExpenses > 0 && (
                <InfoBox label="कुल खर्च" value={formatCurrency(totalExpenses)} />
              )}
              <InfoBox label="कुल लागत" value={formatCurrency(deal.totalCost)} highlight />
              {deal.sellingPrice && (
                <InfoBox label="बिक्री मूल्य" value={formatCurrency(deal.sellingPrice)} />
              )}
              {deal.grossProfit !== null && (
                <InfoBox label="सकल मुनाफा" value={<ProfitChip value={deal.grossProfit} />} />
              )}
              {deal.netProfit !== null && (
                <InfoBox label="शुद्ध मुनाफा" value={<ProfitChip value={deal.netProfit} />} />
              )}
              {deal.soldTo && (
                <InfoBox label="किसको बेची" value={deal.soldTo} />
              )}
              {deal.saleDate && (
                <InfoBox label="बिक्री तारीख" value={formatDate(deal.saleDate)} />
              )}
            </div>

            {/* Expenses breakdown */}
            {deal.expenses && deal.expenses.length > 0 && (
              <div>
                <p className="text-base font-bold text-gray-600 mb-2">🔧 खर्च का विवरण:</p>
                <div className="space-y-1.5">
                  {deal.expenses.map((e, i) => (
                    <div key={i} className="flex justify-between items-center px-4 py-2.5
                      bg-orange-50 rounded-xl border border-orange-100">
                      <span className="text-base text-gray-700">{e.description}</span>
                      <span className="text-base font-bold text-orange-700">
                        {formatCurrency(e.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Partners breakdown */}
            {deal.partnerBreakdown && deal.partnerBreakdown.length > 0 && (
              <div>
                <p className="text-base font-bold text-gray-600 mb-2">🤝 हिस्सेदारों का हिसाब:</p>
                <div className="space-y-2">
                  {deal.partnerBreakdown.map((p) => (
                    <div key={p.name} className="px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-bold text-blue-800">
                          {p.name} ({p.sharePercent}% हिस्सा)
                        </span>
                        {p.profitShare !== null && (
                          <ProfitChip value={p.profitShare} />
                        )}
                      </div>
                      <div className="flex gap-4 mt-1 text-sm text-blue-600">
                        <span>लागत: {formatCurrency(p.costShare)}</span>
                        {p.revenueShare !== null && (
                          <span>आमदनी: {formatCurrency(p.revenueShare)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Commissions */}
            {deal.commissions && deal.commissions.length > 0 && (
              <div>
                <p className="text-base font-bold text-gray-600 mb-2">💸 कमीशन:</p>
                <div className="space-y-1.5">
                  {deal.commissions.map((c, i) => (
                    <div key={i} className="flex justify-between items-center px-4 py-2.5
                      bg-purple-50 rounded-xl border border-purple-100">
                      <span className="text-base text-gray-700">
                        {c.name}{c.note && ` — ${c.note}`}
                      </span>
                      <span className="text-base font-bold text-purple-700">
                        {formatCurrency(c.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {(deal.notes || deal.purchaseNotes || deal.saleNotes) && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm font-bold text-gray-500 mb-1">📝 नोट्स:</p>
                {deal.purchaseNotes && <p className="text-base text-gray-600">खरीद: {deal.purchaseNotes}</p>}
                {deal.saleNotes && <p className="text-base text-gray-600">बिक्री: {deal.saleNotes}</p>}
                {deal.notes && <p className="text-base text-gray-600">{deal.notes}</p>}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2 border-t-2 border-gray-100">
              <Btn variant="secondary" className="text-base py-3" onClick={() => onEdit(deal)}>
                ✎ बदलाव करें / Edit
              </Btn>
              <Btn
                variant="ghost"
                className="text-base py-3 border-2 border-red-200 text-red-500 hover:bg-red-50"
                onClick={() => setConfirmDelete(true)}
              >
                🗑 हटाएं / Delete
              </Btn>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const InfoBox = ({ label, value, highlight }) => (
  <div className={`rounded-xl p-3.5 ${highlight ? "bg-blue-50 border-2 border-blue-200" : "bg-gray-50 border border-gray-200"}`}>
    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
    <div className="text-lg font-bold text-gray-800 mt-0.5">{value}</div>
  </div>
);

export default CarDealCard;