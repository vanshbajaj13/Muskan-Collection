import React, { useState, useMemo } from "react";
import { useFP } from "./FamilyPlannerContext";
import {
  SectionHead, Badge, Btn, Modal, Field, FPInput, FPTextarea,
  ConfirmModal, Toast, EmptyState, FullSpinner, LineItemRow,
} from "./FamilyPlannerUI";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const EMPTY_ITEM = { amount: "", description: "" };

const EMPTY = {
  year:            new Date().getFullYear(),
  month:           new Date().getMonth(),
  salesRevenue:    "",
  stockPurchases:  [{ ...EMPTY_ITEM }],
  businessExpenses:[{ ...EMPTY_ITEM }],
  notes:           "",
};

export default function FPBusiness() {
  const {
    businessEntries, upsertBusiness, deleteBusiness,
    getBizStockTotal, getBizExpenseTotal,
    INR, loading,
  } = useFP();

  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [deleting,  setDeleting]  = useState(false);
  const [toast,     setToast]     = useState(null);

  const notify = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openCreate = (year, month) => {
    const existing = businessEntries.find((b) => b.year === year && b.month === month);
    if (existing) { openEdit(existing); return; }
    setEditing(null);
    setForm({
      ...EMPTY,
      year,
      month,
      stockPurchases:   [{ ...EMPTY_ITEM }],
      businessExpenses: [{ ...EMPTY_ITEM }],
    });
    setShowForm(true);
  };

  const openEdit = (entry) => {
    setEditing(entry);
    // Normalise to arrays — old entries may only have scalar fields
    const sp = entry.stockPurchases?.length
      ? entry.stockPurchases.map((p) => ({ amount: String(p.amount || ""), description: p.description || "" }))
      : entry.stockPurchase > 0
        ? [{ amount: String(entry.stockPurchase), description: "" }]
        : [{ ...EMPTY_ITEM }];

    const be = entry.businessExpenses?.length
      ? entry.businessExpenses.map((e) => ({ amount: String(e.amount || ""), description: e.description || "" }))
      : entry.otherBusinessExpense > 0
        ? [{ amount: String(entry.otherBusinessExpense), description: "" }]
        : [{ ...EMPTY_ITEM }];

    setForm({
      year:             entry.year,
      month:            entry.month,
      salesRevenue:     String(entry.salesRevenue || ""),
      stockPurchases:   sp,
      businessExpenses: be,
      notes:            entry.notes || "",
    });
    setShowForm(true);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ── Line item helpers ───────────────────────────────────────────────────
  const addLineItem   = (key) => set(key, [...form[key], { ...EMPTY_ITEM }]);
  const removeLineItem = (key, idx) => set(key, form[key].filter((_, i) => i !== idx));
  const changeLineItem = (key, idx, field, val) =>
    set(key, form[key].map((item, i) => (i === idx ? { ...item, [field]: val } : item)));

  // Total from current form fields
  const formStockTotal = form.stockPurchases
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const formExpTotal   = form.businessExpenses
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const formProfit     = (Number(form.salesRevenue) || 0) - formStockTotal - formExpTotal;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        year:  Number(form.year),
        month: Number(form.month),
        salesRevenue: Number(form.salesRevenue) || 0,
        stockPurchases: form.stockPurchases
          .filter((p) => p.amount !== "" && Number(p.amount) > 0)
          .map((p) => ({ amount: Number(p.amount), description: p.description })),
        businessExpenses: form.businessExpenses
          .filter((e) => e.amount !== "" && Number(e.amount) > 0)
          .map((e) => ({ amount: Number(e.amount), description: e.description })),
        notes: form.notes,
      };
      await upsertBusiness(payload);
      notify(editing ? "Entry updated" : "Entry saved");
      setShowForm(false);
    } catch { notify("Failed to save", "error"); }
    finally  { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteBusiness(delTarget._id);
      notify("Deleted");
      setDelTarget(null);
    } catch { notify("Delete failed", "error"); }
    finally  { setDeleting(false); }
  };

  // Build 12-row grid for the viewed year
  const yearEntries = useMemo(() =>
    Array.from({ length: 12 }, (_, m) => {
      const entry   = businessEntries.find((b) => b.year === viewYear && b.month === m);
      const stock   = getBizStockTotal(entry);
      const other   = getBizExpenseTotal(entry);
      return {
        month: m,
        label: MONTHS[m],
        entry,
        revenue:  entry?.salesRevenue || 0,
        stockExp: stock,
        otherExp: other,
        profit:   (entry?.salesRevenue || 0) - stock - other,
      };
    }),
    [businessEntries, viewYear, getBizStockTotal, getBizExpenseTotal]
  );

  const yearTotals = useMemo(() => ({
    revenue:  yearEntries.reduce((s, e) => s + e.revenue,  0),
    stockExp: yearEntries.reduce((s, e) => s + e.stockExp, 0),
    otherExp: yearEntries.reduce((s, e) => s + e.otherExp, 0),
    profit:   yearEntries.reduce((s, e) => s + e.profit,   0),
  }), [yearEntries]);

  if (loading) return <FullSpinner message="Loading business data…" />;

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      <SectionHead title="Business" sub="Monthly sales & expense tracking">
        <div className="flex items-center gap-2">
          <button onClick={() => setViewYear((y) => y - 1)}
            className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 transition-colors">
            ‹ {viewYear - 1}
          </button>
          <span className="text-sm font-bold text-slate-700">{viewYear}</span>
          <button onClick={() => setViewYear((y) => y + 1)}
            className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 transition-colors">
            {viewYear + 1} ›
          </button>
        </div>
      </SectionHead>

      {/* Year summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Revenue",    val: INR(yearTotals.revenue),  color: "bg-emerald-50 text-emerald-700" },
          { label: "Stock Purchases",  val: INR(yearTotals.stockExp), color: "bg-amber-50 text-amber-700" },
          { label: "Other Expenses",   val: INR(yearTotals.otherExp), color: "bg-rose-50 text-rose-700" },
          {
            label: "Net Profit",
            val: INR(yearTotals.profit),
            color: yearTotals.profit >= 0 ? "bg-indigo-50 text-indigo-700" : "bg-red-50 text-red-700",
          },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl p-3 text-center animate-enter ${c.color}`}>
            <p className="text-lg font-bold">{c.val}</p>
            <p className="text-xs font-medium mt-0.5 opacity-70">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Month-wise Entries</h3>
          <p className="text-xs text-slate-400">Click any month to add / edit</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left">Month</th>
                <th className="px-4 py-2.5 text-right">Revenue</th>
                <th className="px-4 py-2.5 text-right">Stock Exp.</th>
                <th className="px-4 py-2.5 text-right">Other Exp.</th>
                <th className="px-4 py-2.5 text-right">Net Profit</th>
                <th className="px-4 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {yearEntries.map((row) => {
                const isCurrent = viewYear === now.getFullYear() && row.month === now.getMonth();
                return (
                  <tr key={row.month}
                    className={`hover:bg-slate-50 transition-colors ${isCurrent ? "bg-indigo-50/30" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">{row.label}</span>
                        {isCurrent && <Badge color="indigo">Current</Badge>}
                        {row.entry?.notes && (
                          <span className="text-xs text-slate-400 italic truncate max-w-[100px]"
                            title={row.entry.notes}>
                            {row.entry.notes}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.revenue > 0
                        ? <span className="text-emerald-700 font-semibold">{INR(row.revenue)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.stockExp > 0
                        ? <span className="text-amber-600 font-semibold">{INR(row.stockExp)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.otherExp > 0
                        ? <span className="text-rose-600 font-semibold">{INR(row.otherExp)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.entry
                        ? <span className={`font-bold ${row.profit >= 0 ? "text-indigo-700" : "text-red-600"}`}>
                            {row.profit >= 0 ? "+" : ""}{INR(row.profit)}
                          </span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Btn variant="ghost" className="px-2 py-1 text-xs"
                          onClick={() => openCreate(viewYear, row.month)}>
                          {row.entry ? "✎ Rename" : "＋"}
                        </Btn>
                        {row.entry && (
                          <Btn variant="ghost" className="px-2 py-1 text-xs text-rose-400"
                            onClick={() => setDelTarget(row.entry)}>
                            ✕
                          </Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold text-sm">
                <td className="px-4 py-3 text-slate-700">Total {viewYear}</td>
                <td className="px-4 py-3 text-right text-emerald-700">{INR(yearTotals.revenue)}</td>
                <td className="px-4 py-3 text-right text-amber-600">{INR(yearTotals.stockExp)}</td>
                <td className="px-4 py-3 text-right text-rose-600">{INR(yearTotals.otherExp)}</td>
                <td className={`px-4 py-3 text-right ${yearTotals.profit >= 0 ? "text-indigo-700" : "text-red-600"}`}>
                  {yearTotals.profit >= 0 ? "+" : ""}{INR(yearTotals.profit)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {businessEntries.length === 0 && (
        <EmptyState icon="🏪" title="No business entries yet"
          sub="Click any month row above to log your sales revenue and expenses" />
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <Modal
          title={editing
            ? `Edit Entry — ${MONTHS[form.month]} ${form.year}`
            : `Add Entry — ${MONTHS[form.month]} ${form.year}`}
          onClose={() => setShowForm(false)}
          wide
        >
          <div className="space-y-5">
            <div className="bg-amber-50 rounded-lg px-4 py-3 text-sm text-amber-700 border border-amber-200">
              📅 <strong>{MONTHS[Number(form.month)]} {form.year}</strong>
            </div>

            {/* Sales Revenue */}
            <Field label="Sales Revenue (₹)" hint="Total revenue from shop / business sales this month">
              <FPInput
                type="number"
                value={form.salesRevenue}
                onChange={(e) => set("salesRevenue", e.target.value)}
                placeholder="0"
              />
            </Field>

            {/* ── Stock Purchases (multiple) ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Stock Purchases
                </label>
                <Btn variant="ghost" className="text-xs px-2 py-1 text-indigo-600 hover:bg-indigo-50"
                  onClick={() => addLineItem("stockPurchases")}>
                  + Add Row
                </Btn>
              </div>
              <div className="space-y-2">
                {form.stockPurchases.map((item, idx) => (
                  <LineItemRow
                    key={idx}
                    item={item}
                    index={idx}
                    onChange={(i, field, val) => changeLineItem("stockPurchases", i, field, val)}
                    onRemove={(i) => removeLineItem("stockPurchases", i)}
                    descPlaceholder="Item / supplier description…"
                  />
                ))}
              </div>
              {formStockTotal > 0 && (
                <p className="text-xs text-amber-600 font-semibold mt-1.5 text-right">
                  Total: {INR(formStockTotal)}
                </p>
              )}
            </div>

            {/* ── Business Expenses (multiple) ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Other Business Expenses
                </label>
                <Btn variant="ghost" className="text-xs px-2 py-1 text-indigo-600 hover:bg-indigo-50"
                  onClick={() => addLineItem("businessExpenses")}>
                  + Add Row
                </Btn>
              </div>
              <div className="space-y-2">
                {form.businessExpenses.map((item, idx) => (
                  <LineItemRow
                    key={idx}
                    item={item}
                    index={idx}
                    onChange={(i, field, val) => changeLineItem("businessExpenses", i, field, val)}
                    onRemove={(i) => removeLineItem("businessExpenses", i)}
                    descPlaceholder="Expense description (rent, utilities…)"
                  />
                ))}
              </div>
              {formExpTotal > 0 && (
                <p className="text-xs text-rose-600 font-semibold mt-1.5 text-right">
                  Total: {INR(formExpTotal)}
                </p>
              )}
            </div>

            {/* Live profit preview */}
            {(form.salesRevenue || formStockTotal > 0 || formExpTotal > 0) && (
              <div className={`rounded-lg px-4 py-3 text-sm font-semibold border ${
                formProfit >= 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}>
                Net Profit Preview: {formProfit >= 0 ? "+" : ""}{INR(formProfit)}
                <span className="text-xs font-normal ml-2 opacity-70">
                  (Revenue {INR(Number(form.salesRevenue) || 0)} − Stock {INR(formStockTotal)} − Other {INR(formExpTotal)})
                </span>
              </div>
            )}

            <Field label="Notes">
              <FPTextarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Any notes for this month…"
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <Btn variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn variant="amber" className="flex-1" onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving…" : editing ? "Update" : "Save Entry"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {delTarget && (
        <ConfirmModal
          title="Delete Business Entry?"
          body={`Entry for ${MONTHS[delTarget.month]} ${delTarget.year} will be removed.`}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
          loading={deleting}
          confirmTextRequired
        />
      )}
    </div>
  );
}