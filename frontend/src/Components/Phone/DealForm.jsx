import React, { useState, useEffect, useRef } from "react";
import { usePhone } from "./PhoneContext";
import { Field, Input, Textarea, Btn, ConfirmModal, ComboBox } from "./PhoneUI";

const EMPTY = {
  purchaseDate: "",
  product: "",
  purchasedFrom: "",
  purchaseAccount: "",
  buyingPrice: "",
  creditCard: "",
  cashback: "",
  cashbackDate: "",
  cashbackExpected: false,
  charges: "",
  chargesDescription: "",
  withGST: false,
  itemReceivedDate: "",
  imeiNumber: "",
  purchaseBillUrl: "",
  gstCharge: "",
  r1Filed: false,
  r1FiledDate: "",
  commissionAmount: "",
  commissionTo: "",
  soldTo: "",
  sellingPrice: "",
  saleDate: "",
  sellingBillUrl: "",
  r2Filed: false,
  r2FiledDate: "",
  notes: "",
};

const DealForm = ({ initial, onSave, onCancel, loading }) => {
  const { opts, tsFromDate, dateFromTs, addDropdown } = usePhone();
  const [form, setForm] = useState(EMPTY);
  const [showSaleFields, setShowSaleFields] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const initializedRef = useRef(false);
  // Tracks whether the GST charge box currently holds the auto-suggested
  // (18% of gross profit) value, or a value the user typed themselves.
  // Starts true (auto) for new deals; for an existing deal with a stored
  // gstCharge we treat it as user-chosen so we don't silently overwrite it.
  const [gstManuallyEdited, setGstManuallyEdited] = useState(false);

  useEffect(() => {
    if (initial && !initializedRef.current) {
      initializedRef.current = true;
      setForm({
        ...EMPTY,
        ...initial,
        purchaseDate: dateFromTs(initial.purchaseDate),
        cashbackDate: dateFromTs(initial.cashbackDate),
        saleDate: dateFromTs(initial.saleDate),
        itemReceivedDate: dateFromTs(initial.itemReceivedDate),
        r1FiledDate: dateFromTs(initial.r1FiledDate),
        r2FiledDate: dateFromTs(initial.r2FiledDate),
        buyingPrice: initial.buyingPrice ?? "",
        cashback: initial.cashback || "",
        cashbackExpected: initial.cashbackExpected || false,
        charges: initial.charges || "",
        imeiNumber: initial.imeiNumber || "",
        purchaseBillUrl: initial.purchaseBillUrl || "",
        sellingBillUrl: initial.sellingBillUrl || "",
        gstCharge: initial.gstCharge || "",
        r1Filed: initial.r1Filed || false,
        r2Filed: initial.r2Filed || false,
        commissionAmount: initial.commissionAmount || "",
        sellingPrice: initial.sellingPrice ?? "",
      });
      setShowSaleFields(
        !!(initial.soldTo || initial.sellingPrice || initial.saleDate),
      );
      // Existing deal already has a saved GST charge — treat it as
      // user-chosen so the auto-calc effect doesn't stomp on it.
      setGstManuallyEdited(!!(initial.gstCharge && initial.gstCharge > 0));
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
      itemReceivedDate: form.itemReceivedDate
        ? tsFromDate(form.itemReceivedDate)
        : null,
      r1FiledDate: form.r1FiledDate ? tsFromDate(form.r1FiledDate) : null,
      r2FiledDate: form.r2FiledDate ? tsFromDate(form.r2FiledDate) : null,
      buyingPrice: parseFloat(form.buyingPrice) || 0,
      cashback: parseFloat(form.cashback) || 0,
      cashbackExpected: form.cashbackExpected,
      charges: parseFloat(form.charges) || 0,
      imeiNumber: form.imeiNumber || "",
      purchaseBillUrl: form.purchaseBillUrl || "",
      sellingBillUrl: form.withGST ? form.sellingBillUrl || "" : "",
      gstCharge: form.withGST ? parseFloat(form.gstCharge) || 0 : 0,
      r1Filed: form.withGST ? form.r1Filed : false,
      r2Filed: form.withGST ? form.r2Filed : false,
      commissionAmount: parseFloat(form.commissionAmount) || 0,
      sellingPrice:
        form.sellingPrice !== "" ? parseFloat(form.sellingPrice) : null,
    };
    if (initial) {
      setPendingPayload(payload);
    } else {
      onSave(payload);
    }
  };

  const effectiveCost =
    (parseFloat(form.buyingPrice) || 0) -
    (parseFloat(form.cashback) || 0) +
    (parseFloat(form.charges) || 0);

  const grossProfit =
    form.sellingPrice !== "" && parseFloat(form.sellingPrice) > 0
      ? parseFloat(form.sellingPrice) - effectiveCost
      : null;

  const suggestedGstCharge =
    form.withGST &&
    form.sellingPrice !== null &&
    form.sellingPrice > 0 &&
    form.buyingPrice !== null &&
    form.buyingPrice > 0
      ? Math.round((form.sellingPrice - form.buyingPrice) * 0.18)
      : 0;

  // Keep the GST charge box in sync with 18% of gross profit as the
  // person edits the deal — but only while they haven't typed a value
  // in themselves. Once they touch the box, it's theirs until they hit
  // "Reset to 18%".
  useEffect(() => {
    if (!form.withGST) return;
    if (gstManuallyEdited) return;
    set("gstCharge", suggestedGstCharge || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.withGST, suggestedGstCharge, gstManuallyEdited]);

  const netProfit =
    grossProfit !== null
      ? grossProfit -
        (parseFloat(form.commissionAmount) || 0) -
        (form.withGST ? parseFloat(form.gstCharge) || 0 : 0)
      : null;

  return (
    <>
      {pendingPayload && (
        <ConfirmModal
          title="Save changes to this deal?"
          body={`Update ${form.product || "this deal"}? Type CONFIRM to proceed.`}
          confirmTextRequired={true}
          onConfirm={() => {
            onSave(pendingPayload);
            setPendingPayload(null);
          }}
          onCancel={() => setPendingPayload(null)}
          loading={loading}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Purchase Details ─────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3 pb-1 border-b border-slate-100">
            Purchase Details
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Purchase Date" required>
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => set("purchaseDate", e.target.value)}
                required
              />
            </Field>

            <Field label="Product" required>
              <ComboBox
                value={form.product}
                onChange={(v) => set("product", v)}
                options={opts("product")}
                onAddNew={async (v) => {
                  set("product", v);
                  await addDropdown("product", v);
                }}
                placeholder="Type or select…"
              />
            </Field>

            <Field label="Purchased From" required>
              <ComboBox
                value={form.purchasedFrom}
                onChange={(v) => set("purchasedFrom", v)}
                options={opts("purchasedFrom")}
                onAddNew={async (v) => {
                  set("purchasedFrom", v);
                  await addDropdown("purchasedFrom", v);
                }}
                placeholder="Type or select…"
              />
            </Field>

            <Field label="Account" required hint="Whose account was used">
              <ComboBox
                value={form.purchaseAccount}
                onChange={(v) => set("purchaseAccount", v)}
                options={opts("account")}
                onAddNew={async (v) => {
                  set("purchaseAccount", v);
                  await addDropdown("account", v);
                }}
                placeholder="Type or select…"
              />
            </Field>

            <Field label="Buying Price (₹)" required>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 72000"
                value={form.buyingPrice}
                onChange={(e) => set("buyingPrice", e.target.value)}
                onWheel={(e) => e.target.blur()}
                required
              />
            </Field>

            <Field label="Credit Card Used">
              <ComboBox
                value={form.creditCard}
                onChange={(v) => set("creditCard", v)}
                options={opts("card")}
                onAddNew={async (v) => {
                  set("creditCard", v);
                  await addDropdown("card", v);
                }}
                placeholder="Type or select…"
              />
            </Field>

            <Field
              label="Item Received Date"
              hint="When the item physically arrived"
            >
              <Input
                type="date"
                value={form.itemReceivedDate}
                onChange={(e) => set("itemReceivedDate", e.target.value)}
              />
            </Field>

            <Field label="IMEI Number">
              <Input
                placeholder="e.g. 356789104567890"
                value={form.imeiNumber}
                onChange={(e) => set("imeiNumber", e.target.value)}
              />
            </Field>

            <Field
              label="Purchase Bill URL"
              hint="Drive link to the purchase bill"
            >
              <Input
                type="url"
                placeholder="https://drive.google.com/…"
                value={form.purchaseBillUrl}
                onChange={(e) => set("purchaseBillUrl", e.target.value)}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.withGST}
              onChange={(e) => set("withGST", e.target.checked)}
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="text-sm text-slate-600">Purchased with GST</span>
          </label>

          {form.withGST && (
            <div className="mt-3 flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-indigo-800">
                  R1 Filed?
                </p>
                <p className="text-xs text-indigo-500 mt-0.5">
                  GST return on the purchase side.
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0">
                {form.r1Filed && (
                  <Input
                    type="date"
                    value={form.r1FiledDate}
                    onChange={(e) => set("r1FiledDate", e.target.value)}
                    className="w-36"
                  />
                )}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => set("r1Filed", !form.r1Filed)}
                    className={`w-11 h-6 rounded-full relative transition-colors duration-200 cursor-pointer ${
                      form.r1Filed ? "bg-indigo-500" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                        form.r1Filed ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </label>
              </div>
            </div>
          )}
        </section>

        {/* ── Cashback ─────────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3 pb-1 border-b border-slate-100">
            Cashback
          </h3>
          <div className="mb-4 flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Cashback Expected?
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Enable if you expect cashback on this purchase.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none ml-4 shrink-0">
              <div
                onClick={() => set("cashbackExpected", !form.cashbackExpected)}
                className={`w-11 h-6 rounded-full relative transition-colors duration-200 cursor-pointer ${
                  form.cashbackExpected ? "bg-amber-500" : "bg-slate-300"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    form.cashbackExpected ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </div>
              <span
                className={`text-sm font-semibold ${form.cashbackExpected ? "text-amber-700" : "text-slate-500"}`}
              >
                {form.cashbackExpected ? "Enabled" : "Disabled"}
              </span>
            </label>
          </div>
          {form.cashbackExpected && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cashback Amount (₹)">
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.cashback}
                  onChange={(e) => set("cashback", e.target.value)}
                  onWheel={(e) => e.target.blur()}
                />
              </Field>
              <Field label="Cashback Received Date">
                <Input
                  type="date"
                  value={form.cashbackDate}
                  onChange={(e) => set("cashbackDate", e.target.value)}
                />
              </Field>
            </div>
          )}
        </section>

        {/* ── Charges & Commission ──────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3 pb-1 border-b border-slate-100">
            Charges & Commission
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Charges (₹)" hint="EMI fees, platform charges, etc.">
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={form.charges}
                onChange={(e) => set("charges", e.target.value)}
                onWheel={(e) => e.target.blur()}
              />
            </Field>
            <Field label="Charges Description">
              <Input
                placeholder="e.g. EMI charges to Gagan"
                value={form.chargesDescription}
                onChange={(e) => set("chargesDescription", e.target.value)}
              />
            </Field>
            <Field label="Commission Amount (₹)">
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={form.commissionAmount}
                onChange={(e) => set("commissionAmount", e.target.value)}
                onWheel={(e) => e.target.blur()}
              />
            </Field>
            <Field label="Commission To">
              <ComboBox
                value={form.commissionTo}
                onChange={(v) => set("commissionTo", v)}
                options={opts("commissionTo")}
                onAddNew={async (v) => {
                  set("commissionTo", v);
                  await addDropdown("commissionTo", v);
                }}
                placeholder="Type or select…"
              />
            </Field>
          </div>
        </section>

        {/* ── GST Charge (only for GST deals) ─────────────────────────── */}
        {form.withGST && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3 pb-1 border-b border-slate-100">
              GST
            </h3>
            <div className="grid grid-cols-2 gap-3 items-center">
              <Field
                label="GST Charge (₹)"
                hint={
                  grossProfit !== null
                    ? `18% of gross profit ≈ ₹${suggestedGstCharge.toLocaleString("en-IN")}`
                    : "18% of gross profit, once sold"
                }
              >
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.gstCharge}
                  onChange={(e) => {
                    setGstManuallyEdited(true);
                    set("gstCharge", e.target.value);
                  }}
                  onWheel={(e) => e.target.blur()}
                />
              </Field>
              <Btn
                type="button"
                variant="secondary"
                className="text-xs h-fit"
                onClick={() => {
                  setGstManuallyEdited(false);
                  set("gstCharge", suggestedGstCharge || "");
                }}
              >
                Reset to 18%
              </Btn>
            </div>
          </section>
        )}

        {/* ── Sale Details (collapsible) ────────────────────────────── */}
        <section>
          <button
            type="button"
            onClick={() => setShowSaleFields(!showSaleFields)}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-500 mb-2"
          >
            <span className="pb-0.5">Sale Details</span>
            <span className="text-indigo-400 text-base">
              {showSaleFields ? "▲" : "▼"}
            </span>
            <span className="ml-1 text-slate-400 font-normal normal-case tracking-normal text-xs">
              (optional — fill when sold)
            </span>
          </button>
          <div className="border-b border-slate-100 mb-3" />

          {showSaleFields && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sold To">
                <ComboBox
                  value={form.soldTo}
                  onChange={(v) => set("soldTo", v)}
                  options={opts("soldTo")}
                  onAddNew={async (v) => {
                    set("soldTo", v);
                    await addDropdown("soldTo", v);
                  }}
                  placeholder="Type or select…"
                />
              </Field>
              <Field label="Sale Date">
                <Input
                  type="date"
                  value={form.saleDate}
                  onChange={(e) => set("saleDate", e.target.value)}
                />
              </Field>
              <Field
                label="Selling Price (₹)"
                hint="Leave blank if payments cover it"
              >
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 78000"
                  value={form.sellingPrice}
                  onChange={(e) => set("sellingPrice", e.target.value)}
                  onWheel={(e) => e.target.blur()}
                />
              </Field>

              {form.withGST && (
                <Field
                  label="Selling Bill URL"
                  hint="Drive link to the selling bill"
                >
                  <Input
                    type="url"
                    placeholder="https://drive.google.com/…"
                    value={form.sellingBillUrl}
                    onChange={(e) => set("sellingBillUrl", e.target.value)}
                  />
                </Field>
              )}
            </div>
          )}

          {showSaleFields && form.withGST && (
            <div className="mt-3 flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-indigo-800">
                  R2 Filed?
                </p>
                <p className="text-xs text-indigo-500 mt-0.5">
                  GST return on the selling side.
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0">
                {form.r2Filed && (
                  <Input
                    type="date"
                    value={form.r2FiledDate}
                    onChange={(e) => set("r2FiledDate", e.target.value)}
                    className="w-36"
                  />
                )}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => set("r2Filed", !form.r2Filed)}
                    className={`w-11 h-6 rounded-full relative transition-colors duration-200 cursor-pointer ${
                      form.r2Filed ? "bg-indigo-500" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                        form.r2Filed ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </label>
              </div>
            </div>
          )}
        </section>

        {/* ── Notes ────────────────────────────────────────────────── */}
        <section>
          <Field label="Notes">
            <Textarea
              placeholder="Any additional notes…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </section>

        {/* ── Live Profit Breakdown ─────────────────────────────────────── */}
        {(form.buyingPrice || form.sellingPrice) && (
          <div className="w-full shrink-0">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                Profit Breakdown
              </p>

              {/* Selling price */}
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-600">Selling Price</span>
                <span className="font-semibold text-slate-800">
                  ₹
                  {(parseFloat(form.sellingPrice) || 0).toLocaleString("en-IN")}
                </span>
              </div>

              {/* Buying price */}
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500">− Buying Price</span>
                <span className="font-medium text-rose-500">
                  − ₹
                  {(parseFloat(form.buyingPrice) || 0).toLocaleString("en-IN")}
                </span>
              </div>

              {/* Charges */}
              {(parseFloat(form.charges) || 0) > 0 && (
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-500 truncate mr-2">
                    − Charges
                    {form.chargesDescription && (
                      <span className="text-slate-400 text-xs ml-1">
                        ({form.chargesDescription})
                      </span>
                    )}
                  </span>

                  <span className="font-medium text-rose-400 shrink-0">
                    − ₹{(parseFloat(form.charges) || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {/* Cashback */}
              {(parseFloat(form.cashback) || 0) > 0 && (
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-500">+ Cashback</span>
                  <span className="font-medium text-emerald-500">
                    + ₹
                    {(parseFloat(form.cashback) || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {/* Gross Profit */}
              {grossProfit !== null && (
                <div className="border-t border-slate-200 mt-1 pt-2 flex justify-between items-center">
                  <span className="text-slate-700 font-semibold text-xs uppercase tracking-wide">
                    Gross Profit
                  </span>

                  <span
                    className={`font-semibold ${
                      grossProfit >= 0 ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    {grossProfit >= 0 ? "+" : "−"} ₹
                    {Math.abs(grossProfit).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {/* GST */}
              {form.withGST && (parseFloat(form.gstCharge) || 0) > 0 && (
                <div className="flex justify-between items-center py-1.5 mt-0.5">
                  <span className="text-slate-500">− GST (18%)</span>
                  <span className="font-medium text-rose-400">
                    − ₹
                    {(parseFloat(form.gstCharge) || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {/* Commission */}
              {(parseFloat(form.commissionAmount) || 0) > 0 && (
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-500">− Commission</span>
                  <span className="font-medium text-rose-400">
                    − ₹
                    {(parseFloat(form.commissionAmount) || 0).toLocaleString(
                      "en-IN",
                    )}
                  </span>
                </div>
              )}

              {/* Net Profit */}
              {netProfit !== null && (
                <div className="border-t border-slate-200 mt-1 pt-2 flex justify-between items-center">
                  <span className="text-slate-700 font-semibold text-xs uppercase tracking-wide">
                    Net Profit
                  </span>

                  <span
                    className={`font-bold ${
                      netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {netProfit >= 0 ? "+" : "−"} ₹
                    {Math.abs(netProfit).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {/* Formula */}
              {netProfit !== null && (
                <div className="mt-3 pt-2 border-t border-slate-200">
                  <p className="text-[10px] leading-relaxed text-slate-400">
                    Selling Price − Buying Price − Commission
                    {form.withGST ? " − GST" : ""}
                    {" = "}
                    <span className="font-semibold text-slate-500">
                      Net Profit
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────── */}
        <div className="flex gap-3 pt-2">
          <Btn
            variant="secondary"
            type="button"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Btn>
          <Btn
            variant="primary"
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            {loading ? "Saving…" : initial ? "Update Deal" : "Add Deal"}
          </Btn>
        </div>
      </form>
    </>
  );
};

export default DealForm;
