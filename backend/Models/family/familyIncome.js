const mongoose = require("mongoose");

// incomeType: "salary" | "business" | "freelance" | "rental" | "investment" | "other"
// frequency: "monthly" | "weekly" | "yearly" | "one_time"
const familyIncomeSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    incomeType: { type: String, required: true },
    amount: { type: Number, required: true },
    frequency: {
      type: String,
      enum: ["monthly", "weekly", "fortnightly", "yearly", "one_time"],
      default: "monthly",
    },
    startDate: { type: Number, required: true }, // timestamp
    endDate: { type: Number, default: null },     // null = ongoing
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: "" },
    // For one-time income, the date it was received
    receivedDate: { type: Number, default: null },
  },
  { timestamps: true }
);

const FamilyIncome = mongoose.model("FamilyIncome", familyIncomeSchema);
module.exports = { FamilyIncome };