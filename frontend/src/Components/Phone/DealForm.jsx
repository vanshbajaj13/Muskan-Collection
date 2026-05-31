import React, { useState, useEffect } from "react";
import { usePhone } from "./PhoneContext";
import { Field, Input, Select, Textarea, Btn } from "./PhoneUI";

const EMPTY = {
  purchaseDate: "",
  product: "",
  purchasedFrom: "",
  purchaseAccount: "",
  buyingPrice: "",
  creditCard: "",
  cashback: "",
  cashbackDate: "",
  charges: "",
  chargesDescription: "",
  onEmi: false,
  commissionAmount: "",
  commissionTo: "",
  soldTo: "",
  sellingPrice: "",
  saleDate: "",
  notes: "",
};

const DealForm = ({ initial, onSave, onCancel, loading }) => {
  const { opts, tsFromDate, dateFromTs } = usePhone();
  const [form, setForm] = useState(EMPTY);
  const [showSaleFields, setShowSaleFields] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        ...EMPTY,
        ...initial,
        purchaseDate: dateFromTs(initial.purchaseDate),
        cashbackDate: dateFromTs(initial.cashbackDate),
        saleDate: dateFromTs(initial.saleDate),
        buyingPrice: initial.buyingPrice ?? "",
        cashback: initial.cashback || "",
        charges: initial.charges || "",
        commissionAmount: initial.commissionAmount || "",
        sellingPrice: initial.sellingPrice ?? "",
      });
      setShowSaleFields(!!(initial.soldTo || initial.sellingPrice || initial.saleDate));
    }
  }, [initial, dateFromTs]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      purchaseDate: tsFromDate(form.purchaseDate),
      cashbackDate: form.cashbackDate ? tsFromDate(form.cashbackDate) : null,
      saleDate: form.saleDate ? tsFromDate(form.saleDate) : null,
      buyingPrice: parseFloat(form.buyingPrice) || 0,
      cashback: parseFloat(form.cashback) || 0,
      charges: parseFloat(form.charges) || 0,
      commissionAmount: parseFloat(form.commissionAmount) || 0,
      sellingPrice: form.sellingPrice !== "" ? parseFloat(form.sellingPrice) : null,
    };
    onSave(payload);
  };

  const effectiveCost =
    (parseFloat(form.buyingPrice) || 0) -
    (parseFloat(form.cashback) || 0) +
    (parseFloat(form.charges) || 0);

  const grossProfit =
    form.sellingPrice !== "" && parseFloat(form.sellingPrice) > 0
      ? parseFloat(form.sellingPrice) - effectiveCost
      : null;

  const netProfit =
    grossProfit !== null
      ? grossProfit - (parseFloat(form.commissionAmount) || 0)
      : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Purchase Info ────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3 pb-1 border-b border-slate-100">
          Purchase Details
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Purchase Date" required>
            <Input type="date" value={form.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} required />
          </Field>
          <Field label="Product" required>
            <Select options={opts("product")} value={form.product}
              onChange={(e) => set("product", e.target.value)} required />
          </Field>
          <Field label="Purchased From" required>
            <Select options={opts("purchasedFrom")} value={form.purchasedFrom}
              onChange={(e) => set("purchasedFrom", e.target.value)} required />
          </Field>
          <Field label="Account" required hint="Whose account was used">
            <Select options={opts("account")} value={form.purchaseAccount}
              onChange={(e) => set("purchaseAccount", e.target.value)} required />
          </Field>
          <Field label="Buying Price (₹)" required>
            <Input type="number" min="0" placeholder="e.g. 72000"
              value={form.buyingPrice} onChange={(e) => set("buyingPrice", e.target.value)}
              onWheel={(e) => e.target.blur()} required />
          </Field>
          <Field label="Credit Card Used">
            <Select options={opts("card")} value={form.creditCard}
              onChange={(e) => set("creditCard", e.target.value)} placeholder="Select card" />
          </Field>
        </div>

        {/* EMI toggle */}
        <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
          <input type="checkbox" checked={form.onEmi}
            onChange={(e) => set("onEmi", e.target.checked)}
            className="w-4 h-4 accent-indigo-600" />
          <span className="text-sm text-slate-600">Purchased on EMI</span>
        </label>
      </section>

      {/* ── Cashback ──────────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3 pb-1 border-b border-slate-100">
          Cashback
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cashback Amount (₹)">
            <Input type="number" min="0" placeholder="0"
              value={form.cashback} onChange={(e) => set("cashback", e.target.value)}
              onWheel={(e) => e.target.blur()} />
          </Field>
          <Field label="Cashback Received Date">
            <Input type="date" value={form.cashbackDate}
              onChange={(e) => set("cashbackDate", e.target.value)} />
          </Field>
        </div>
      </section>

      {/* ── Charges & Commission ─────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3 pb-1 border-b border-slate-100">
          Charges & Commission
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Charges (₹)" hint="EMI fees, platform charges, etc.">
            <Input type="number" min="0" placeholder="0"
              value={form.charges} onChange={(e) => set("charges", e.target.value)}
              onWheel={(e) => e.target.blur()} />
          </Field>
          <Field label="Charges Description">
            <Input placeholder="e.g. EMI charges to Gagan"
              value={form.chargesDescription}
              onChange={(e) => set("chargesDescription", e.target.value)} />
          </Field>
          <Field label="Commission Amount (₹)">
            <Input type="number" min="0" placeholder="0"
              value={form.commissionAmount} onChange={(e) => set("commissionAmount", e.target.value)}
              onWheel={(e) => e.target.blur()} />
          </Field>
          <Field label="Commission To">
            <Select options={opts("commissionTo")} value={form.commissionTo}
              onChange={(e) => set("commissionTo", e.target.value)} placeholder="Select person" />
          </Field>
        </div>
      </section>

      {/* ── Sale Info (collapsible) ──────────────────────────────── */}
      <section>
        <button type="button"
          onClick={() => setShowSaleFields(!showSaleFields)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-500 mb-2">
          <span className="pb-0.5">Sale Details</span>
          <span className="text-indigo-400 text-base">{showSaleFields ? "▲" : "▼"}</span>
          <span className="ml-1 text-slate-400 font-normal normal-case tracking-normal text-xs">
            (optional — fill when sold)
          </span>
        </button>
        <div className="border-b border-slate-100 mb-3" />

        {showSaleFields && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sold To">
              <Select options={opts("soldTo")} value={form.soldTo}
                onChange={(e) => set("soldTo", e.target.value)} placeholder="Select buyer" />
            </Field>
            <Field label="Sale Date">
              <Input type="date" value={form.saleDate}
                onChange={(e) => set("saleDate", e.target.value)} />
            </Field>
            <Field label="Selling Price (₹)" hint="Leave blank if payments cover it">
              <Input type="number" min="0" placeholder="e.g. 78000"
                value={form.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)}
                onWheel={(e) => e.target.blur()} />
            </Field>
          </div>
        )}
      </section>

      {/* ── Notes ────────────────────────────────────────────────── */}
      <section>
        <Field label="Notes">
          <Textarea placeholder="Any additional notes…"
            value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </section>

      {/* ── Live profit preview ───────────────────────────────────── */}
      {(form.buyingPrice || form.sellingPrice) && (
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm">
          <p className="font-semibold text-slate-600 mb-2 text-xs uppercase tracking-wide">Live Preview</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-slate-600">
            <span>Effective Cost</span>
            <span className="font-semibold text-right">
              ₹{effectiveCost.toLocaleString("en-IN")}
            </span>
            {grossProfit !== null && (
              <>
                <span>Gross Profit</span>
                <span className={`font-semibold text-right ${grossProfit >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                  {grossProfit >= 0 ? "+" : ""}₹{grossProfit.toLocaleString("en-IN")}
                </span>
                <span>Net Profit (after commission)</span>
                <span className={`font-semibold text-right ${netProfit >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                  {netProfit >= 0 ? "+" : ""}₹{netProfit.toLocaleString("en-IN")}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        <Btn variant="secondary" type="button" onClick={onCancel} className="flex-1">
          Cancel
        </Btn>
        <Btn variant="primary" type="submit" disabled={loading} className="flex-1">
          {loading ? "Saving…" : initial ? "Update Deal" : "Add Deal"}
        </Btn>
      </div>
    </form>
  );
};

export default DealForm;