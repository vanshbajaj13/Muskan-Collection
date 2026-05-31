const express = require("express");
const router = express.Router();
const { PersonalExpense } = require("../../Models/phone/personalExpense");
const protect = require("../../middlewares/authMiddleWare");
const protectVansh = require("../../middlewares/phoneAuthMiddleware");

// GET all personal expenses (with optional date range)
router.get("/", protect, protectVansh, async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = {};
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = parseInt(from);
      if (to) query.date.$lte = parseInt(to);
    }
    const expenses = await PersonalExpense.find(query).sort({ date: -1 });
    res.json({ expenses, total: expenses.length });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// CREATE personal expense
router.post("/", protect, protectVansh, async (req, res) => {
  try {
    const expense = new PersonalExpense(req.body);
    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// UPDATE personal expense
router.patch("/:id", protect, protectVansh, async (req, res) => {
  try {
    const expense = await PersonalExpense.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE personal expense
router.delete("/:id", protect, protectVansh, async (req, res) => {
  try {
    const expense = await PersonalExpense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// STATS for personal expenses (total by card, by month)
router.get("/meta/stats", protect, protectVansh, async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = {};
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = parseInt(from);
      if (to) query.date.$lte = parseInt(to);
    }
    const expenses = await PersonalExpense.find(query);

    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

    const byCard = {};
    expenses.forEach((e) => {
      const key = e.card || "Unknown";
      byCard[key] = (byCard[key] || 0) + e.amount;
    });

    const byMonth = {};
    expenses.forEach((e) => {
      const date = new Date(e.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] || 0) + e.amount;
    });

    res.json({ totalAmount, byCard, byMonth, count: expenses.length });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;