const mongoose = require("mongoose");

// Tracks actual monthly business figures
// For each month, you can log actual sales revenue and stock purchases
const familyBusinessEntrySchema = new mongoose.Schema(
  {
    year: { type: Number, required: true },
    month: { type: Number, required: true }, // 0-11
    salesRevenue: { type: Number, default: 0 },
    stockPurchase: { type: Number, default: 0 }, // treated as expense
    otherBusinessExpense: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

familyBusinessEntrySchema.index({ year: 1, month: 1 }, { unique: true });

const FamilyBusinessEntry = mongoose.model("FamilyBusinessEntry", familyBusinessEntrySchema);
module.exports = { FamilyBusinessEntry };