const mongoose = require("mongoose");

// Sub-schema for individual stock purchase entries
const stockPurchaseItemSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    description: { type: String, default: "" },
    date: { type: Number, default: null }, // optional date override within month
  },
  { _id: true }
);

// Sub-schema for individual other expense entries
const businessExpenseItemSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    description: { type: String, default: "" },
    date: { type: Number, default: null },
  },
  { _id: true }
);

// Tracks actual monthly business figures
// For each month, you can log actual sales revenue and multiple stock purchases / expenses
const familyBusinessEntrySchema = new mongoose.Schema(
  {
    year: { type: Number, required: true },
    month: { type: Number, required: true }, // 0-11
    salesRevenue: { type: Number, default: 0 },

    // ── NEW: arrays of line items ──────────────────────────────────────────
    stockPurchases: { type: [stockPurchaseItemSchema], default: [] },
    businessExpenses: { type: [businessExpenseItemSchema], default: [] },

    // ── Legacy scalar fields kept for backward compatibility ───────────────
    // These will be the SUM of the arrays when the arrays are present,
    // or the raw value when migrating old documents.
    stockPurchase: { type: Number, default: 0 },       // kept for old docs
    otherBusinessExpense: { type: Number, default: 0 }, // kept for old docs

    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

familyBusinessEntrySchema.index({ year: 1, month: 1 }, { unique: true });

// Virtual: total stock purchase = sum of array OR legacy scalar
familyBusinessEntrySchema.virtual("totalStockPurchase").get(function () {
  if (this.stockPurchases && this.stockPurchases.length > 0) {
    return this.stockPurchases.reduce((s, p) => s + p.amount, 0);
  }
  return this.stockPurchase || 0;
});

// Virtual: total other expense = sum of array OR legacy scalar
familyBusinessEntrySchema.virtual("totalOtherExpense").get(function () {
  if (this.businessExpenses && this.businessExpenses.length > 0) {
    return this.businessExpenses.reduce((s, e) => s + e.amount, 0);
  }
  return this.otherBusinessExpense || 0;
});

familyBusinessEntrySchema.set("toJSON", { virtuals: true });
familyBusinessEntrySchema.set("toObject", { virtuals: true });

const FamilyBusinessEntry = mongoose.model("FamilyBusinessEntry", familyBusinessEntrySchema);
module.exports = { FamilyBusinessEntry };