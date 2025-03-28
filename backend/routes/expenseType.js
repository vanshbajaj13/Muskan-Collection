const express = require("express");
const router = express.Router();
const { ExpenseType } = require("../Models/expenseType");
const protect = require("../middlewares/authMiddleWare");

// Fetch unique expense types
router.get("/", protect, async (req, res) => {
  try {
    const expenseTypes = await ExpenseType.find().sort({ name: 1 });
    res.json(expenseTypes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add a new expense type
router.post("/", protect, async (req, res) => {
  try {
    
    var { name } = req.body;
    if (!name) return res.status(400).json({ error: "Expense type name is required" });
    name = name.toUpperCase();
    const existingType = await ExpenseType.findOne({ name });
    if (existingType) return res.status(400).json({ error: "Expense type already exists" });

    const newExpenseType = new ExpenseType({ name });
    await newExpenseType.save();

    res.status(201).json(newExpenseType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
