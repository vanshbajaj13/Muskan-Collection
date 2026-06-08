const mongoose = require("mongoose");

// type: "borrowed" = we owe someone, "lent" = someone owes us
const repaymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Number, required: true },
    note: { type: String, default: "" },
  },
  { _id: true }
);

const familyDebtSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["borrowed", "lent"],
      required: true,
    },
    personName: { type: String, required: true, trim: true },
    principalAmount: { type: Number, required: true },
    borrowedOrLentDate: { type: Number, required: true },
    expectedReturnDate: { type: Number, default: null },
    reason: { type: String, default: "" },
    repayments: [repaymentSchema],
    isSettled: { type: Boolean, default: false },
    settledDate: { type: Number, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// Virtual: total repaid
familyDebtSchema.virtual("totalRepaid").get(function () {
  return this.repayments.reduce((s, r) => s + r.amount, 0);
});

// Virtual: outstanding balance
familyDebtSchema.virtual("outstanding").get(function () {
  return Math.max(0, this.principalAmount - this.totalRepaid);
});

familyDebtSchema.set("toJSON", { virtuals: true });
familyDebtSchema.set("toObject", { virtuals: true });

const FamilyDebt = mongoose.model("FamilyDebt", familyDebtSchema);
module.exports = { FamilyDebt };