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
    itemReceivedDate: { type: Number, default: null },     // date the item was physically received
    imeiNumber: { type: String, default: "" },              // applies to both GST and non-GST deals
    purchaseBillUrl: { type: String, default: "" },        // drive link to purchase bill

    // ── GST ────────────────────────────────────────────────────────
    // Auto-suggested as 18% of gross profit for withGST deals, but always
    // user-editable — the stored value is whatever was last saved, not
    // recomputed server-side.
    gstCharge: { type: Number, default: 0 },
    r1Filed: { type: Boolean, default: false },             // GST R1 filed (purchase side), GST deals only
    r1FiledDate: { type: Number, default: null },

    // ── Commission ─────────────────────────────────────────────────
    commissionAmount: { type: Number, default: 0 },
    commissionTo: { type: String, default: "" },

    // ── Sale Info ──────────────────────────────────────────────────
    soldTo: { type: String, default: "" },                 // "Vaibhav", "Gagan"
    sellingPrice: { type: Number, default: null },         // agreed price; null = unsold
    saleDate: { type: Number, default: null },
    sellingBillUrl: { type: String, default: "" },         // drive link to selling bill, GST deals only
    r2Filed: { type: Boolean, default: false },             // GST R2 filed (selling side), GST deals only
    r2FiledDate: { type: Number, default: null },

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
// "complete"         → sellingPrice set and totalPaid === sellingPrice (exact)
// "excess_payment"   → sellingPrice set and totalPaid > sellingPrice (overpaid — likely a mistake)
phoneDealSchema.virtual("dealStatus").get(function () {
  if (!this.sellingPrice) return "unsold";
  const totalPaid = this.payments.reduce((sum, p) => sum + p.amount, 0);
  if (totalPaid > this.sellingPrice) return "excess_payment";
  if (totalPaid >= this.sellingPrice) return "complete";
  return "pending_payment";
});

// ── Virtual: payment pending ──────────────────────────────────────
phoneDealSchema.virtual("paymentPending").get(function () {
  const totalPaid = this.payments.reduce((sum, p) => sum + p.amount, 0);
  if (!this.sellingPrice) return 0;
  return Math.max(0, this.sellingPrice - totalPaid);
});

// ── Virtual: payment excess ────────────────────────────────────────
// How much MORE than the agreed sellingPrice has been received. 0 if none/unsold.
phoneDealSchema.virtual("paymentExcess").get(function () {
  const totalPaid = this.payments.reduce((sum, p) => sum + p.amount, 0);
  if (!this.sellingPrice) return 0;
  return Math.max(0, totalPaid - this.sellingPrice);
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
  return gross - (this.commissionAmount || 0) - (this.gstCharge || 0);
});

// ── Virtual: R1 status (GST filing on purchase side) ───────────────
// "not_applicable" → deal is not withGST
// "pending"        → withGST but not yet filed
// "filed"          → withGST and filed
phoneDealSchema.virtual("r1Status").get(function () {
  if (!this.withGST) return "not_applicable";
  return this.r1Filed ? "filed" : "pending";
});

// ── Virtual: R2 status (GST filing on selling side) ─────────────────
// "not_applicable" → deal is not withGST, or not sold yet
// "pending"        → withGST, sold, but not yet filed
// "filed"          → withGST, sold, and filed
phoneDealSchema.virtual("r2Status").get(function () {
  if (!this.withGST) return "not_applicable";
  if (!this.sellingPrice) return "not_applicable";
  return this.r2Filed ? "filed" : "pending";
});

phoneDealSchema.set("toJSON", { virtuals: true });
phoneDealSchema.set("toObject", { virtuals: true });

const PhoneDeal = mongoose.model("PhoneDeal", phoneDealSchema);
module.exports = { PhoneDeal };