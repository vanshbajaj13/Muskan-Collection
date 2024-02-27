const mongoose = require("mongoose");

const expenseLogSchema = new mongoose.Schema(
  {
    expenseType: {
      type: String,
      required: true,
    },
    expenseAmount: {
      type: Number,
      required: true,
    },
    date: {
      type: Number, 
      required: true,
    },
    expenseDescription: {
      type: String,
    },
  },
  { timestamps: true }
);

const ExpenseLog = mongoose.model("ExpenseLog", expenseLogSchema);

module.exports = { ExpenseLog };
