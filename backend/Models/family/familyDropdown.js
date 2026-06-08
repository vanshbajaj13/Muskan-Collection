const mongoose = require("mongoose");

// Completely independent dropdown store for family planner
// types: "incomeType" | "expenseCategory" | "person"
const familyDropdownSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["incomeType", "expenseCategory", "person"],
    },
    value: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

familyDropdownSchema.index({ type: 1, value: 1 }, { unique: true });

const FamilyDropdown = mongoose.model("FamilyDropdown", familyDropdownSchema);
module.exports = { FamilyDropdown };