import React, { useState, useEffect, useRef } from "react";
import { useCar } from "./CarContext";
import { Field, Input, Textarea, Btn, ConfirmModal } from "./CarUI";

// ── ComboBox: free-type + dropdown suggestions + auto-save new values ─────────
const ComboBox = ({
  value,
  onChange,
  options = [],
  onAddNew,
  placeholder = "Type or select…",
}) => {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const containerRef = useRef(null);

  const trimmed = value.trim();
  const filtered = options.filter((o) =>
    o.toLowerCase().includes(trimmed.toLowerCase()),
  );
  const isNew =
    trimmed.length > 0 &&
    !options.some((o) => o.toLowerCase() === trimmed.toLowerCase());

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  const handleAddNew = async () => {
    if (!onAddNew || !isNew) return;
    setAdding(true);
    try {
      await onAddNew(trimmed);
      onChange(trimmed); // ensure value is selected after dropdown list refreshes
    } finally {
      setAdding(false);
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-base text-slate-800
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          bg-white placeholder-slate-300 transition-shadow pr-8"
        style={{ fontSize: "16px" }}
        autoComplete="off"
      />
      {/* Chevron */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setOpen((o) => !o)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
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
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {filtered.length === 0 && !isNew && (
            <p className="px-3 py-2.5 text-sm text-slate-400">No matches</p>
          )}
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(opt);
              }}
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 transition-colors
                ${value === opt ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-700"}`}
            >
              {opt}
            </button>
          ))}
          {isNew && (
            <button
              type="button"
              disabled={adding}
              onMouseDown={(e) => {
                e.preventDefault();
                handleAddNew();
              }}
              className="w-full text-left px-3 py-2.5 text-sm text-indigo-600 font-semibold
                hover:bg-indigo-50 border-t border-slate-100 flex items-center gap-2 transition-colors"
            >
              <span className="text-base leading-none">+</span>
              {adding ? "Saving…" : `Add "${trimmed}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const EMPTY = {
  carNumber: "",
  carDescription: "",
  make: "",
  model: "",
  year: "",
  buyingPrice: "",
  boughtFrom: "",
  purchaseDate: "",
  purchaseNotes: "",
  partners: [],
  expenses: [],
  sellingPrice: "",
  soldTo: "",
  saleDate: "",
  saleNotes: "",
  commissions: [],
  notes: "",
};

let _uid = 0;
const uid = () => `_${++_uid}`;

const CarDealForm = ({ initial, onSave, onCancel, loading }) => {
  const { opts, tsFromDate, dateFromTs, addDropdown } = useCar();
  const initializedRef = useRef(false);
  const [form, setForm] = useState(EMPTY);
  const [showSale, setShowSale] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  useEffect(() => {
    // Only hydrate from `initial` once per form mount (edit mode).
    // Without this guard, any context re-render (e.g. after addDropdown →
    // fetchDropdowns) produces a new `dateFromTs` reference, re-fires this
    // effect, and resets the form — wiping values the user just added.
    if (initial && !initializedRef.current) {
      initializedRef.current = true;
      setForm({
        ...EMPTY,
        ...initial,
        purchaseDate: dateFromTs(initial.purchaseDate),
        saleDate: dateFromTs(initial.saleDate),
        year: initial.year ?? "",
        buyingPrice: initial.buyingPrice ?? "",
        sellingPrice: initial.sellingPrice ?? "",
        partners: (initial.partners || []).map((p) => ({ ...p, _uid: uid() })),
        expenses: (initial.expenses || []).map((e) => ({
          ...e,
          date: e.date ? dateFromTs(e.date) : "",
          _uid: uid(),
        })),
        commissions: (initial.commissions || []).map((c) => ({ ...c, _uid: uid() })),
      });
      setShowSale(
        !!(initial.soldTo || initial.sellingPrice || initial.saleDate),
      );
    }
  }, [initial, dateFromTs]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Partners
  const addPartner = () =>
    setForm((f) => ({
      ...f,
      partners: [...f.partners, { name: "", sharePercent: "", _uid: uid() }],
    }));
  const removePartner = (i) =>
    setForm((f) => ({
      ...f,
      partners: f.partners.filter((_, idx) => idx !== i),
    }));
  const setPartner = (i, key, val) =>
    setForm((f) => {
      const p = [...f.partners];
      p[i] = { ...p[i], [key]: val };
      return { ...f, partners: p };
    });
  const totalPartnerShare = form.partners.reduce(
    (s, p) => s + (parseFloat(p.sharePercent) || 0),
    0,
  );

  // Expenses
  const addExpense = () =>
    setForm((f) => ({
      ...f,
      expenses: [...f.expenses, { description: "", amount: "", date: "", _uid: uid() }],
    }));
  const removeExpense = (i) =>
    setForm((f) => ({
      ...f,
      expenses: f.expenses.filter((_, idx) => idx !== i),
    }));
  const setExpense = (i, key, val) =>
    setForm((f) => {
      const e = [...f.expenses];
      e[i] = { ...e[i], [key]: val };
      return { ...f, expenses: e };
    });
  const totalExpenses = form.expenses.reduce(
    (s, e) => s + (parseFloat(e.amount) || 0),
    0,
  );

  // Commissions
  const addCommission = () =>
    setForm((f) => ({
      ...f,
      commissions: [...f.commissions, { name: "", amount: "", note: "", _uid: uid() }],
    }));
  const removeCommission = (i) =>
    setForm((f) => ({
      ...f,
      commissions: f.commissions.filter((_, idx) => idx !== i),
    }));
  const setCommission = (i, key, val) =>
    setForm((f) => {
      const c = [...f.commissions];
      c[i] = { ...c[i], [key]: val };
      return { ...f, commissions: c };
    });

  // Live preview
  const buying = parseFloat(form.buyingPrice) || 0;
  const totalCost = buying + totalExpenses;
  const selling = parseFloat(form.sellingPrice) || 0;
  const totalCommission = form.commissions.reduce(
    (s, c) => s + (parseFloat(c.amount) || 0),
    0,
  );
  const grossProfit = selling > 0 ? selling - totalCost : null;
  const netProfit = grossProfit !== null ? grossProfit - totalCommission : null;
  const partnerBreakdown = form.partners
    .filter((p) => p.name && parseFloat(p.sharePercent) > 0)
    .map((p) => {
      const pct = parseFloat(p.sharePercent);
      const costShare = (totalCost * pct) / 100;
      const revenueShare = selling > 0 ? (selling * pct) / 100 : null;
      // Partners split net profit (after commissions), not gross
      const profitShare = netProfit !== null ? (netProfit * pct) / 100 : null;
      return { name: p.name, pct, costShare, revenueShare, profitShare };
    });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      purchaseDate: tsFromDate(form.purchaseDate),
      saleDate: form.saleDate ? tsFromDate(form.saleDate) : null,
      year: form.year ? parseInt(form.year) : null,
      buyingPrice: parseFloat(form.buyingPrice) || 0,
      sellingPrice:
        form.sellingPrice !== "" ? parseFloat(form.sellingPrice) : null,
      partners: form.partners
        .filter((p) => p.name && p.sharePercent)
        .map((p) => ({
          name: p.name,
          sharePercent: parseFloat(p.sharePercent),
        })),
      expenses: form.expenses
        .filter((e) => e.amount)
        .map((e) => ({
          description: e.description || "",
          amount: parseFloat(e.amount),
          date: e.date ? tsFromDate(e.date) : null,
        })),
      commissions: form.commissions
        .filter((c) => c.amount)
        .map((c) => ({
          name: c.name || "",
          amount: parseFloat(c.amount),
          note: c.note || "",
        })),
    };
    if (initial) setPendingPayload(payload);
    else onSave(payload);
  };

  return (
    <>
      {pendingPayload && (
        <ConfirmModal
          title="Save changes?"
          body={`Updates to ${form.carNumber} will be saved.`}
          onConfirm={() => {
            onSave(pendingPayload);
            setPendingPayload(null);
          }}
          onCancel={() => setPendingPayload(null)}
          loading={loading}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Car Details */}
        <Section title="Car Details">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Car Number" required>
              <Input
                placeholder="e.g. HR26DK1234"
                value={form.carNumber}
                onChange={(e) => set("carNumber", e.target.value.toUpperCase())}
                required
              />
            </Field>
            <Field label="Car Name">
              <Input
                placeholder="e.g. Swift 2019 White"
                value={form.carDescription}
                onChange={(e) => set("carDescription", e.target.value)}
              />
            </Field>
            <Field label="Make">
              <ComboBox
                value={form.make}
                onChange={(v) => set("make", v)}
                options={opts("make")}
                onAddNew={async (v) => {
                  set("make", v);
                  await addDropdown("make", v);
                }}
                placeholder="Type or select…"
              />
            </Field>
            <Field label="Model">
              <Input
                placeholder="e.g. Swift VXI"
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
              />
            </Field>
            <Field label="Year">
              <Input
                type="number"
                placeholder="e.g. 2019"
                min="1990"
                max="2030"
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                onWheel={(e) => e.target.blur()}
              />
            </Field>
          </div>
        </Section>

        {/* Purchase Details */}
        <Section title="Purchase Details">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Buying Price (₹)" required>
              <Input
                type="number"
                min="0"
                placeholder="600000"
                value={form.buyingPrice}
                onChange={(e) => set("buyingPrice", e.target.value)}
                onWheel={(e) => e.target.blur()}
                required
              />
            </Field>
            <Field label="Bought From">
              <ComboBox
                value={form.boughtFrom}
                onChange={(v) => set("boughtFrom", v)}
                options={opts("boughtFrom")}
                onAddNew={async (v) => {
                  set("boughtFrom", v);
                  await addDropdown("boughtFrom", v);
                }}
                placeholder="Type or select…"
              />
            </Field>
            <Field
              label="Purchase Date"
              required
              className="col-span-2 sm:col-span-1"
            >
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => set("purchaseDate", e.target.value)}
                required
              />
            </Field>
          </div>
          <Field label="Purchase Notes">
            <Textarea
              placeholder="Any relevant notes…"
              value={form.purchaseNotes}
              onChange={(e) => set("purchaseNotes", e.target.value)}
            />
          </Field>
        </Section>

        {/* Partners */}
        <Section
          title="Partners"
          subtitle="Optional — add if others have a share in this deal."
        >
          {form.partners.map((p, i) => (
            <div
              key={p._uid || i}
              className="flex gap-2 items-end mb-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100"
            >
              <Field label="Partner Name" className="flex-1">
                <ComboBox
                  value={p.name}
                  onChange={(v) => setPartner(i, "name", v)}
                  options={opts("partner")}
                  onAddNew={async (v) => {
                    setPartner(i, "name", v);
                    await addDropdown("partner", v);
                  }}
                  placeholder="Type or select…"
                />
              </Field>
              <Field label="Share %" className="w-24">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="50"
                  value={p.sharePercent}
                  onChange={(e) =>
                    setPartner(i, "sharePercent", e.target.value)
                  }
                  onWheel={(e) => e.target.blur()}
                />
              </Field>
              <Btn
                type="button"
                variant="danger"
                className="py-2.5 px-3 text-xs"
                onClick={() => removePartner(i)}
              >
                Remove
              </Btn>
            </div>
          ))}

          {form.partners.length > 0 && (
            <p
              className={`text-sm font-semibold mb-3 ${
                totalPartnerShare > 100
                  ? "text-red-500"
                  : totalPartnerShare === 100
                    ? "text-green-600"
                    : "text-amber-600"
              }`}
            >
              Total share: {totalPartnerShare}%
              {totalPartnerShare > 100 && " — exceeds 100%"}
              {totalPartnerShare === 100 && " — perfect"}
            </p>
          )}

          <Btn
            type="button"
            variant="secondary"
            className="text-sm"
            onClick={addPartner}
          >
            + Add Partner
          </Btn>
        </Section>

        {/* Expenses */}
        <Section
          title="Expenses"
          subtitle="Repairs, RC transfer, or any other costs."
        >
          {form.expenses.map((e, i) => (
            <div
              key={e._uid || i}
              className="grid grid-cols-11 items-end gap-2 mb-3 p-3 bg-orange-50 rounded-lg border border-orange-100"
            >
              <Field label="Amount (₹)" className="col-span-5">
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={e.amount}
                  onChange={(ev) => setExpense(i, "amount", ev.target.value)}
                  onWheel={(ev) => ev.target.blur()}
                />
              </Field>
              <Field label="Date (optional)" className="col-span-5">
                <div className="flex gap-2 items-center">
                  <Input
                    type="date"
                    value={e.date}
                    onChange={(ev) => setExpense(i, "date", ev.target.value)}
                    className="flex-1"
                  />
                </div>
              </Field>
              <Field className="col-span-1">
                  <Btn
                    type="button"
                    variant="danger"
                    className="py-2.5 px-3 text-xs"
                    onClick={() => removeExpense(i)}
                  >
                    ×
                  </Btn>
              </Field>
              <Field label="Description" className="col-span-11">
                <Input
                  placeholder="e.g. Repair, RC Transfer"
                  value={e.description}
                  onChange={(ev) =>
                    setExpense(i, "description", ev.target.value)
                  }
                />
              </Field>
            </div>
          ))}
          {form.expenses.length > 0 && (
            <p className="text-sm font-semibold text-orange-700 mb-3">
              Total expenses: ₹{totalExpenses.toLocaleString("en-IN")}
            </p>
          )}
          <Btn
            type="button"
            variant="secondary"
            className="text-sm"
            onClick={addExpense}
          >
            + Add Expense
          </Btn>
        </Section>

        {/* Sale Details (collapsible) */}
        <section className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSale(!showSale)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <span className="text-sm font-bold text-slate-700">
              Sale Details
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {showSale ? "Collapse" : "Fill when sold"}
            </span>
          </button>

          {showSale && (
            <div className="px-4 pb-4 pt-3 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Selling Price (₹)">
                  <Input
                    type="number"
                    min="0"
                    placeholder="700000"
                    value={form.sellingPrice}
                    onChange={(e) => set("sellingPrice", e.target.value)}
                    onWheel={(e) => e.target.blur()}
                  />
                </Field>
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
                <Field label="Sale Date" className="col-span-2 sm:col-span-1">
                  <Input
                    type="date"
                    value={form.saleDate}
                    onChange={(e) => set("saleDate", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Sale Notes">
                <Textarea
                  placeholder="Any notes about the sale…"
                  value={form.saleNotes}
                  onChange={(e) => set("saleNotes", e.target.value)}
                />
              </Field>
            </div>
          )}
        </section>

        {/* Commissions */}
        <Section title="Commissions">
          {form.commissions.map((c, i) => (
            <div
              key={c._uid || i}
              className="flex gap-2 items-end mb-3 p-3 bg-purple-50 rounded-lg border border-purple-100"
            >
              <Field label="To" className="flex-1">
                <ComboBox
                  value={c.name}
                  onChange={(v) => setCommission(i, "name", v)}
                  options={opts("partner")}
                  onAddNew={async (v) => {
                    setCommission(i, "name", v);
                    await addDropdown("partner", v);
                  }}
                  placeholder="Type or select…"
                />
              </Field>
              <Field label="Amount (₹)" className="w-32">
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={c.amount}
                  onChange={(e) => setCommission(i, "amount", e.target.value)}
                  onWheel={(e) => e.target.blur()}
                />
              </Field>
              <Field label="Note" className="flex-1">
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Optional note"
                    value={c.note}
                    onChange={(e) => setCommission(i, "note", e.target.value)}
                    className="flex-1"
                  />
                  <Btn
                    type="button"
                    variant="danger"
                    className="py-2.5 px-3 text-xs"
                    onClick={() => removeCommission(i)}
                  >
                    ×
                  </Btn>
                </div>
              </Field>
            </div>
          ))}
          <Btn
            type="button"
            variant="secondary"
            className="text-sm"
            onClick={addCommission}
          >
            + Add Commission
          </Btn>
        </Section>

        {/* General Notes */}
        <Section title="Notes">
          <Textarea
            placeholder="Any other relevant details…"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Section>

        {/* Live Preview */}
        {(buying > 0 || totalExpenses > 0 || selling > 0) && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Live Preview
            </p>
            <div className="space-y-1.5 text-sm">
              <PreviewRow
                label="Buying Price"
                value={`₹${buying.toLocaleString("en-IN")}`}
              />
              {totalExpenses > 0 && (
                <PreviewRow
                  label="+ Expenses"
                  value={`₹${totalExpenses.toLocaleString("en-IN")}`}
                />
              )}
              <PreviewRow
                label="= Total Cost"
                value={`₹${totalCost.toLocaleString("en-IN")}`}
                bold
              />
              {selling > 0 && (
                <>
                  <div className="my-2 border-t border-slate-200" />
                  <PreviewRow
                    label="Selling Price"
                    value={`₹${selling.toLocaleString("en-IN")}`}
                  />
                  {totalCommission > 0 && (
                    <PreviewRow
                      label="− Commission"
                      value={`₹${totalCommission.toLocaleString("en-IN")}`}
                    />
                  )}
                  <PreviewRow
                    label="Net Profit"
                    value={
                      <span
                        className={`font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-500"}`}
                      >
                        {netProfit >= 0 ? "+" : "−"}₹
                        {Math.abs(netProfit).toLocaleString("en-IN")}
                      </span>
                    }
                    bold
                  />
                </>
              )}
            </div>

            {partnerBreakdown.length > 0 && selling > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Partner Breakdown
                </p>
                {partnerBreakdown.map((p) => (
                  <div
                    key={p.name}
                    className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-sm font-medium text-slate-700">
                      {p.name} ({p.pct}%)
                    </span>
                    <span
                      className={`text-sm font-bold ${p.profitShare >= 0 ? "text-green-600" : "text-red-500"}`}
                    >
                      Cost ₹{p.costShare.toLocaleString("en-IN")} → Net{" "}
                      {p.profitShare >= 0 ? "+" : ""}₹
                      {p.profitShare.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
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
            {loading ? "Saving…" : initial ? "Save Changes" : "Add Deal"}
          </Btn>
        </div>
      </form>
    </>
  );
};

const Section = ({ title, subtitle, children }) => (
  <section className="border border-slate-200 rounded-xl p-4 space-y-3">
    <div className="pb-2 border-b border-slate-100">
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </section>
);

const PreviewRow = ({ label, value, bold }) => (
  <div
    className={`flex justify-between items-center ${bold ? "font-bold text-slate-800" : "text-slate-500"}`}
  >
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

export default CarDealForm;