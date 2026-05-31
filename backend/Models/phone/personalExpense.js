const mongoose = require("mongoose");

const personalExpenseSchema = new mongoose.Schema(
  {
    date: { type: Number, required: true },          // timestamp
    amount: { type: Number, required: true },
    card: { type: String, default: "" },             // which card was used
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

const PersonalExpense = mongoose.model("PersonalExpense", personalExpenseSchema);
module.exports = { PersonalExpense };