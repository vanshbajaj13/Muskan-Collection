const mongoose = require("mongoose");

const expenseTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

const ExpenseType = mongoose.model("ExpenseType", expenseTypeSchema);
module.exports = { ExpenseType };
