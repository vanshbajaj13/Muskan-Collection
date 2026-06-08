const mongoose = require("mongoose");

// expenseCategory: from dropdown (FamilyDropdown type="expenseCategory")
// frequency: recurring or one-time
const familyExpenseSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    frequency: {
      type: String,
      enum: ["monthly", "weekly", "fortnightly", "yearly", "one_time"],
      default: "monthly",
    },
    isRecurring: { type: Boolean, default: true },
    startDate: { type: Number, required: true },
    endDate: { type: Number, default: null },   // null = ongoing/no end
    // For one-time: the date it occurred
    occurredDate: { type: Number, default: null },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: "" },
    // Mark if this is a business expense (stock purchase etc.)
    isBusinessExpense: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const FamilyExpense = mongoose.model("FamilyExpense", familyExpenseSchema);
module.exports = { FamilyExpense };