const mongoose = require("mongoose");

// Each payment transaction for a deal
const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Number, required: true }, // timestamp
    note: { type: String, default: "" },
    receiptId: { type: mongoose.Schema.Types.ObjectId, ref: "PhonePayment", default: null }, // links to unified payment receipt, null for legacy/manual entries
  },
  { _id: true }
);

const phoneDealSchema = new mongoose.Schema(
  {
    // ── Purchase Info ──────────────────────────────────────────────
    purchaseDate: { type: Number, required: true },        // timestamp
    product: { type: String, required: true },             // "iPhone 17"
    purchasedFrom: { type: String, required: true },       // "Amazon", "Apple Store"
    purchaseAccount: { type: String, required: true },     // whose account: "Vansh", "Anuj"
    buyingPrice: { type: Number, required: true },
    creditCard: { type: String, default: "" },             // "SBI Card", "HDFC Regalia"
    cashback: { type: Number, default: 0 },
    cashbackDate: { type: Number, default: null },
    cashbackExpected: { type: Boolean, default: false },   // toggle: cashback is supposed to come
    charges: { type: Number, default: 0 },                 // EMI charges, platform fees
    chargesDescription: { type: String, default: "" },
    withGST: { type: Boolean, default: false },

    // ── Commission ─────────────────────────────────────────────────
    commissionAmount: { type: Number, default: 0 },
    commissionTo: { type: String, default: "" },

    // ── Sale Info ──────────────────────────────────────────────────
    soldTo: { type: String, default: "" },                 // "Vaibhav", "Gagan"
    sellingPrice: { type: Number, default: null },         // agreed price; null = unsold
    saleDate: { type: Number, default: null },

    // ── Payments ───────────────────────────────────────────────────
    payments: [paymentSchema],                             // multiple payment transactions

    // ── Meta ───────────────────────────────────────────────────────
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// ── Virtual: effective selling price ──────────────────────────────
// If sellingPrice is set → use it; otherwise sum of payments
phoneDealSchema.virtual("effectiveSellingPrice").get(function () {
  if (this.sellingPrice !== null && this.sellingPrice !== undefined) {
    return this.sellingPrice;
  }
  return this.payments.reduce((sum, p) => sum + p.amount, 0);
});

// ── Virtual: total payments received ──────────────────────────────
phoneDealSchema.virtual("totalPaymentsReceived").get(function () {
  return this.payments.reduce((sum, p) => sum + p.amount, 0);
});

// ── Virtual: deal status ───────────────────────────────────────────
// "unsold"           → no sellingPrice set (regardless of payments)
// "pending_payment"  → sellingPrice set but totalPaid < sellingPrice
// "complete"         → sellingPrice set and totalPaid >= sellingPrice
phoneDealSchema.virtual("dealStatus").get(function () {
  if (!this.sellingPrice) return "unsold";
  const totalPaid = this.payments.reduce((sum, p) => sum + p.amount, 0);
  if (totalPaid >= this.sellingPrice) return "complete";
  return "pending_payment";
});

// ── Virtual: payment pending ──────────────────────────────────────
phoneDealSchema.virtual("paymentPending").get(function () {
  const totalPaid = this.payments.reduce((sum, p) => sum + p.amount, 0);
  if (!this.sellingPrice) return 0;
  return Math.max(0, this.sellingPrice - totalPaid);
});

// ── Virtual: cashback status ──────────────────────────────────────
// "not_expected" → cashbackExpected is false
// "pending"      → cashbackExpected true, cashback amount is 0/empty
// "received"     → cashbackExpected true, cashback amount > 0
phoneDealSchema.virtual("cashbackStatus").get(function () {
  if (!this.cashbackExpected) return "not_expected";
  if (!this.cashback || this.cashback === 0) return "pending";
  return "received";
});

// ── Virtual: gross profit (before commission) ─────────────────────
phoneDealSchema.virtual("grossProfit").get(function () {
  const esp = this.effectiveSellingPrice;
  if (esp === 0) return null; // unsold
  const effectiveCost =
    this.buyingPrice -
    (this.cashback || 0) +
    (this.charges || 0);
  return esp - effectiveCost;
});

// ── Virtual: net profit (after commission) ────────────────────────
phoneDealSchema.virtual("netProfit").get(function () {
  const gross = this.grossProfit;
  if (gross === null) return null;
  return gross - (this.commissionAmount || 0);
});

phoneDealSchema.set("toJSON", { virtuals: true });
phoneDealSchema.set("toObject", { virtuals: true });

const PhoneDeal = mongoose.model("PhoneDeal", phoneDealSchema);
module.exports = { PhoneDeal };