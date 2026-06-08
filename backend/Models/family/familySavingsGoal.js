const mongoose = require("mongoose");

const savingsContributionSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Number, required: true },
    note: { type: String, default: "" },
  },
  { _id: true }
);

const familySavingsGoalSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true },
    targetDate: { type: Number, default: null },
    contributions: [savingsContributionSchema],
    isAchieved: { type: Boolean, default: false },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

familySavingsGoalSchema.virtual("totalSaved").get(function () {
  return this.contributions.reduce((s, c) => s + c.amount, 0);
});

familySavingsGoalSchema.virtual("remaining").get(function () {
  return Math.max(0, this.targetAmount - this.totalSaved);
});

familySavingsGoalSchema.virtual("progressPercent").get(function () {
  if (!this.targetAmount) return 0;
  return Math.min(100, (this.totalSaved / this.targetAmount) * 100);
});

familySavingsGoalSchema.set("toJSON", { virtuals: true });
familySavingsGoalSchema.set("toObject", { virtuals: true });

const FamilySavingsGoal = mongoose.model("FamilySavingsGoal", familySavingsGoalSchema);
module.exports = { FamilySavingsGoal };