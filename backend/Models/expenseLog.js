const mongoose = require("mongoose");

const expenseLogSchema = new mongoose.Schema(
  {
    expenseType: { type: String, required: true },
    expenseAmount: { type: Number, required: true },
    description: { type: String }, // Added description
    date: { type: Number, required: true },
    goodsPayment: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const ExpenseLog = mongoose.model("ExpenseLog", expenseLogSchema);
module.exports = { ExpenseLog };
