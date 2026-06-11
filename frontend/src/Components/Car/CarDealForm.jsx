import React, { useState, useEffect } from "react";
import { useCar } from "./CarContext";
import { Field, Input, Select, Textarea, Btn, ConfirmModal } from "./CarUI";

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
  partners: [], // [{ name, sharePercent }]
  expenses: [], // [{ description, amount, date }]
  sellingPrice: "",
  soldTo: "",
  saleDate: "",
  saleNotes: "",
  commissions: [], // [{ name, amount, note }]
  notes: "",
};

const CarDealForm = ({ initial, onSave, onCancel, loading }) => {
  const { opts, tsFromDate, dateFromTs } = useCar();
  const [form, setForm] = useState(EMPTY);
  const [showSale, setShowSale] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  useEffect(() => {
    if (initial) {
      setForm({
        ...EMPTY,
        ...initial,
        purchaseDate: dateFromTs(initial.purchaseDate),
        saleDate: dateFromTs(initial.saleDate),
        year: initial.year ?? "",
        buyingPrice: initial.buyingPrice ?? "",
        sellingPrice: initial.sellingPrice ?? "",
        partners: (initial.partners || []).map((p) => ({ ...p })),
        expenses: (initial.expenses || []).map((e) => ({
          ...e,
          date: e.date ? dateFromTs(e.date) : "",
        })),
        commissions: (initial.commissions || []).map((c) => ({ ...c })),
      });
      setShowSale(
        !!(initial.soldTo || initial.sellingPrice || initial.saleDate),
      );
    }
  }, [initial, dateFromTs]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ── Partners helpers ───────────────────────────────────────────
  const addPartner = () =>
    setForm((f) => ({
      ...f,
      partners: [...f.partners, { name: "", sharePercent: "" }],
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

  // ── Expenses helpers ───────────────────────────────────────────
  const addExpense = () =>
    setForm((f) => ({
      ...f,
      expenses: [...f.expenses, { description: "", amount: "", date: "" }],
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

  // ── Commissions helpers ────────────────────────────────────────
  const addCommission = () =>
    setForm((f) => ({
      ...f,
      commissions: [...f.commissions, { name: "", amount: "", note: "" }],
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

  // ── Live preview calculations ──────────────────────────────────
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
      const profitShare =
        revenueShare !== null ? revenueShare - costShare : null;
      return { name: p.name, pct, costShare, revenueShare, profitShare };
    });

  // ── Submit ─────────────────────────────────────────────────────
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
          title="बदलाव सेव करें?"
          body={`${form.carNumber} की जानकारी अपडेट होगी।`}
          onConfirm={() => {
            onSave(pendingPayload);
            setPendingPayload(null);
          }}
          onCancel={() => setPendingPayload(null)}
          loading={loading}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ── Section 1: Car Details ─────────────────────────────── */}
        <Section title="🚗 गाड़ी की जानकारी / Car Details">
          <div className="grid grid-cols-2 gap-4">
            <Field label="गाड़ी नंबर / Car Number" required>
              <Input
                placeholder="जैसे HR26DK1234"
                value={form.carNumber}
                onChange={(e) => set("carNumber", e.target.value.toUpperCase())}
                required
              />
            </Field>
            <Field label="गाड़ी का नाम / Car Name">
              <Input
                placeholder="जैसे Swift 2019 White"
                value={form.carDescription}
                onChange={(e) => set("carDescription", e.target.value)}
              />
            </Field>
            <Field label="कंपनी / Make">
              <Select
                options={opts("make")}
                value={form.make}
                onChange={(e) => set("make", e.target.value)}
                placeholder="— कंपनी चुनें —"
              />
            </Field>
            <Field label="मॉडल / Model">
              <Input
                placeholder="जैसे Swift VXI"
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
              />
            </Field>
            <Field label="वर्ष / Year">
              <Input
                type="number"
                placeholder="जैसे 2019"
                min="1990"
                max="2030"
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                onWheel={(e) => e.target.blur()}
              />
            </Field>
          </div>
        </Section>

        {/* ── Section 2: Purchase ───────────────────────────────── */}
        <Section title="💰 खरीद की जानकारी / Purchase Details">
          <div className="grid grid-cols-2 gap-4">
            <Field label="खरीद मूल्य (₹) / Buying Price" required>
              <Input
                type="number"
                min="0"
                placeholder="जैसे 600000"
                value={form.buyingPrice}
                onChange={(e) => set("buyingPrice", e.target.value)}
                onWheel={(e) => e.target.blur()}
                required
              />
            </Field>
            <Field label="किससे खरीदी / Bought From">
              <Select
                options={opts("boughtFrom")}
                value={form.boughtFrom}
                onChange={(e) => set("boughtFrom", e.target.value)}
                placeholder="— व्यक्ति चुनें —"
              />
            </Field>
            <Field label="खरीद तारीख / Purchase Date" required>
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => set("purchaseDate", e.target.value)}
                required
              />
            </Field>
          </div>
          <Field label="नोट्स">
            <Textarea
              placeholder="कोई जरूरी बात..."
              value={form.purchaseNotes}
              onChange={(e) => set("purchaseNotes", e.target.value)}
            />
          </Field>
        </Section>

        {/* ── Section 3: Partners ──────────────────────────────── */}
        <Section title="🤝 हिस्सेदार / Partners (optional)">
          <p className="text-base text-gray-500 mb-3">
            अगर इस गाड़ी में किसी का हिस्सा है तो नीचे जोड़ें। सभी का हिस्सा
            मिलाकर 100% होना चाहिए।
          </p>

          {form.partners.map((p, i) => (
            <div
              key={i}
              className="flex gap-3 items-end mb-3 p-4 bg-blue-50 rounded-xl border border-blue-100"
            >
              <Field label="हिस्सेदार का नाम" className="flex-1">
                <Input
                  list={`partner-names-${i}`}
                  placeholder="नाम लिखें..."
                  value={p.name}
                  onChange={(e) => setPartner(i, "name", e.target.value)}
                />
                <datalist id={`partner-names-${i}`}>
                  {opts("partner").map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </Field>
              <Field label="हिस्सा %" className="w-32">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="जैसे 50"
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
                className="py-3 px-4"
                onClick={() => removePartner(i)}
              >
                हटाएं
              </Btn>
            </div>
          ))}

          {form.partners.length > 0 && (
            <p
              className={`text-base font-bold mb-3 ${totalPartnerShare > 100 ? "text-red-500" : totalPartnerShare === 100 ? "text-green-600" : "text-amber-600"}`}
            >
              कुल हिस्सा: {totalPartnerShare}%
              {totalPartnerShare > 100 && " ⚠️ 100% से ज्यादा है!"}
              {totalPartnerShare === 100 && " ✅"}
            </p>
          )}

          <Btn type="button" variant="secondary" onClick={addPartner}>
            + हिस्सेदार जोड़ें / Add Partner
          </Btn>
        </Section>

        {/* ── Section 4: Expenses ───────────────────────────────── */}
        <Section title="🔧 गाड़ी पर खर्च / Car Expenses (Repairs, RC, etc.)">
          {form.expenses.map((e, i) => (
            <div
              key={i}
              className="grid grid-cols-3 gap-3 mb-3 p-4 bg-orange-50 rounded-xl border border-orange-100 overflow-auto"
            >
              <Field
                label="खर्च का विवरण / Description"
                className="col-span-3 md:col-span-1"
              >
                <Input
                  placeholder="जैसे Repair, RC Transfer"
                  value={e.description}
                  onChange={(ev) =>
                    setExpense(i, "description", ev.target.value)
                  }
                />
              </Field>
              <Field label="राशि (₹) / Amount">
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={e.amount}
                  onChange={(ev) => setExpense(i, "amount", ev.target.value)}
                  onWheel={(ev) => ev.target.blur()}
                />
              </Field>
              <Field label="तारीख / Date (optional)">
                <div className="flex gap-2 items-center">
                  <Input
                    type="date"
                    value={e.date}
                    onChange={(ev) => setExpense(i, "date", ev.target.value)}
                    className="flex-1"
                  />
                  <Btn
                    type="button"
                    variant="danger"
                    className="py-3 px-3"
                    onClick={() => removeExpense(i)}
                  >
                    ✕
                  </Btn>
                </div>
              </Field>
            </div>
          ))}

          {form.expenses.length > 0 && (
            <p className="text-base font-bold text-orange-700 mb-3">
              कुल खर्च: ₹{totalExpenses.toLocaleString("en-IN")}
            </p>
          )}

          <Btn type="button" variant="secondary" onClick={addExpense}>
            + खर्च जोड़ें / Add Expense
          </Btn>
        </Section>

        {/* ── Section 5: Sale (collapsible) ─────────────────────── */}
        <section className="border-2 border-gray-200 rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSale(!showSale)}
            className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-lg font-bold text-gray-700">
              ✅ बिक्री की जानकारी / Sale Details
            </span>
            <span className="text-gray-400 text-base font-bold">
              {showSale ? "▲ बंद करें" : "▼ भरें जब बिके"}
            </span>
          </button>

          {showSale && (
            <div className="px-5 pb-5 pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="बिक्री मूल्य (₹) / Selling Price">
                  <Input
                    type="number"
                    min="0"
                    placeholder="जैसे 700000"
                    value={form.sellingPrice}
                    onChange={(e) => set("sellingPrice", e.target.value)}
                    onWheel={(e) => e.target.blur()}
                  />
                </Field>
                <Field label="किसको बेची / Sold To">
                  <Select
                    options={opts("soldTo")}
                    value={form.soldTo}
                    onChange={(e) => set("soldTo", e.target.value)}
                    placeholder="— व्यक्ति चुनें —"
                  />
                </Field>
                <Field label="बिक्री तारीख / Sale Date">
                  <Input
                    type="date"
                    value={form.saleDate}
                    onChange={(e) => set("saleDate", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="बिक्री नोट्स">
                <Textarea
                  placeholder="कोई जरूरी बात..."
                  value={form.saleNotes}
                  onChange={(e) => set("saleNotes", e.target.value)}
                />
              </Field>
            </div>
          )}
        </section>

        {/* ── Section 6: Commissions ────────────────────────────── */}
        <Section title="💸 कमीशन / Commission">
          {form.commissions.map((c, i) => (
            <div
              key={i}
              className="flex gap-3 items-end mb-3 p-4 bg-purple-50 rounded-xl border border-purple-100"
            >
              <Field label="किसको कमीशन / To" className="flex-1">
                <Input
                  list={`commission-names-${i}`}
                  placeholder="नाम लिखें / Enter name"
                  value={c.name}
                  onChange={(e) => setCommission(i, "name", e.target.value)}
                />
                <datalist id={`commission-names-${i}`}>
                  {opts("partner").map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </Field>
              <Field label="राशि (₹) / Amount" className="w-40">
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={c.amount}
                  onChange={(e) => setCommission(i, "amount", e.target.value)}
                  onWheel={(e) => e.target.blur()}
                />
              </Field>
              <Field label="नोट / Note" className="flex-1">
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="कोई नोट..."
                    value={c.note}
                    onChange={(e) => setCommission(i, "note", e.target.value)}
                    className="flex-1"
                  />
                  <Btn
                    type="button"
                    variant="danger"
                    className="py-3 px-3"
                    onClick={() => removeCommission(i)}
                  >
                    ✕
                  </Btn>
                </div>
              </Field>
            </div>
          ))}

          <Btn type="button" variant="secondary" onClick={addCommission}>
            + कमीशन जोड़ें / Add Commission
          </Btn>
        </Section>

        {/* ── Section 7: General Notes ──────────────────────────── */}
        <Section title="📝 सामान्य नोट्स / General Notes">
          <Textarea
            placeholder="कोई भी जरूरी जानकारी..."
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Section>

        {/* ── Live Preview ──────────────────────────────────────── */}
        {(buying > 0 || totalExpenses > 0 || selling > 0) && (
          <div className="rounded-2xl bg-gray-50 border-2 border-gray-200 p-5">
            <p className="text-base font-bold text-gray-600 mb-3 uppercase tracking-wide">
              📊 अनुमानित हिसाब / Preview
            </p>
            <div className="space-y-2 text-lg">
              <PreviewRow
                label="खरीद मूल्य"
                value={`₹${buying.toLocaleString("en-IN")}`}
              />
              {totalExpenses > 0 && (
                <PreviewRow
                  label="+ कुल खर्च"
                  value={`₹${totalExpenses.toLocaleString("en-IN")}`}
                />
              )}
              <PreviewRow
                label="= कुल लागत"
                value={`₹${totalCost.toLocaleString("en-IN")}`}
                bold
              />
              {selling > 0 && (
                <>
                  <PreviewRow
                    label="बिक्री मूल्य"
                    value={`₹${selling.toLocaleString("en-IN")}`}
                  />
                  {totalCommission > 0 && (
                    <PreviewRow
                      label="− कमीशन"
                      value={`₹${totalCommission.toLocaleString("en-IN")}`}
                    />
                  )}
                  <PreviewRow
                    label="शुद्ध मुनाफा / Net Profit"
                    value={
                      <span
                        className={`font-extrabold ${netProfit >= 0 ? "text-green-600" : "text-red-500"}`}
                      >
                        {netProfit >= 0 ? "▲ +" : "▼ "}₹
                        {Math.abs(netProfit).toLocaleString("en-IN")}
                      </span>
                    }
                    bold
                  />
                </>
              )}
            </div>

            {partnerBreakdown.length > 0 && selling > 0 && (
              <div className="mt-4 pt-4 border-t-2 border-gray-200">
                <p className="text-base font-bold text-gray-600 mb-2">
                  हिस्सेदारों का हिसाब:
                </p>
                {partnerBreakdown.map((p) => (
                  <div
                    key={p.name}
                    className="flex justify-between items-center py-1.5 border-b border-gray-100"
                  >
                    <span className="text-base font-semibold text-gray-700">
                      {p.name} ({p.pct}%)
                    </span>
                    <span
                      className={`text-base font-bold ${p.profitShare >= 0 ? "text-green-600" : "text-red-500"}`}
                    >
                      लागत ₹{p.costShare.toLocaleString("en-IN")} →
                      {p.profitShare >= 0 ? " +" : " "}₹
                      {p.profitShare.toLocaleString("en-IN")} मुनाफा
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Actions ───────────────────────────────────────────── */}
        <div className="flex gap-4 pt-2">
          <Btn
            variant="secondary"
            type="button"
            onClick={onCancel}
            className="flex-1 text-lg py-4"
          >
            रद्द करें / Cancel
          </Btn>
          <Btn
            variant="primary"
            type="submit"
            disabled={loading}
            className="flex-1 text-lg py-4"
          >
            {loading
              ? "सेव हो रहा है..."
              : initial
                ? "✅ अपडेट करें / Update"
                : "✅ सेव करें / Save"}
          </Btn>
        </div>
      </form>
    </>
  );
};

const Section = ({ title, children }) => (
  <section className="border-2 border-gray-200 rounded-2xl p-5 space-y-4">
    <h3 className="text-lg font-bold text-gray-700 pb-2 border-b-2 border-gray-100">
      {title}
    </h3>
    {children}
  </section>
);

const PreviewRow = ({ label, value, bold }) => (
  <div
    className={`flex justify-between items-center ${bold ? "font-bold text-gray-800" : "text-gray-600"}`}
  >
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

export default CarDealForm;
