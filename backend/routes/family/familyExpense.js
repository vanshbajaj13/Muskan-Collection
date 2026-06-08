const express = require("express");
const router = express.Router();
const { FamilyExpense } = require("../../Models/family/familyExpense");
const protect = require("../../middlewares/authMiddleWare");
const protectVansh = require("../../middlewares/phoneAuthMiddleware");

// GET all expenses
router.get("/", protect, protectVansh, async (req, res) => {
  try {
    const expenses = await FamilyExpense.find().sort({ createdAt: -1 });
    res.json({ expenses });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// CREATE expense
router.post("/", protect, protectVansh, async (req, res) => {
  try {
    const expense = new FamilyExpense(req.body);
    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// UPDATE expense
router.patch("/:id", protect, protectVansh, async (req, res) => {
  try {
    const expense = await FamilyExpense.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!expense) return res.status(404).json({ message: "Not found" });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE expense
router.delete("/:id", protect, protectVansh, async (req, res) => {
  try {
    const expense = await FamilyExpense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;