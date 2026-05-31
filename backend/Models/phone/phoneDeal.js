const mongoose = require("mongoose");

// Each payment transaction for a deal
const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Number, required: true }, // timestamp
    note: { type: String, default: "" },
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
    charges: { type: Number, default: 0 },                 // EMI charges, platform fees
    chargesDescription: { type: String, default: "" },
    onEmi: { type: Boolean, default: false },

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
// "unsold"           → no sellingPrice and no payments
// "pending_payment"  → sellingPrice set but payments < sellingPrice
// "complete"         → payments >= sellingPrice OR sellingPrice null but payments > 0
phoneDealSchema.virtual("dealStatus").get(function () {
  const totalPaid = this.payments.reduce((sum, p) => sum + p.amount, 0);
  if (!this.sellingPrice && totalPaid === 0) return "unsold";
  if (this.sellingPrice && totalPaid < this.sellingPrice) return "pending_payment";
  return "complete";
});

// ── Virtual: payment pending ──────────────────────────────────────
phoneDealSchema.virtual("paymentPending").get(function () {
  const totalPaid = this.payments.reduce((sum, p) => sum + p.amount, 0);
  if (!this.sellingPrice) return 0;
  return Math.max(0, this.sellingPrice - totalPaid);
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