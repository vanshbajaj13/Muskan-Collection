const mongoose = require("mongoose");

const expenseLogSchema = new mongoose.Schema(
  {
    expenseType: {
      type: String,
    },
    expenseAmount: {
      type: Number,
      required: true,
    },
    date: {
      type: Number, 
      required: true,
    },
    goodsPayment: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

const ExpenseLog = mongoose.model("ExpenseLog", expenseLogSchema);

module.exports = { ExpenseLog };
