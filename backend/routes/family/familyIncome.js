const express = require("express");
const router = express.Router();
const { FamilyIncome } = require("../../Models/family/familyIncome");
const protect = require("../../middlewares/authMiddleWare");
const protectVansh = require("../../middlewares/phoneAuthMiddleware");

// GET all income sources
router.get("/", protect, protectVansh, async (req, res) => {
  try {
    const incomes = await FamilyIncome.find().sort({ createdAt: -1 });
    res.json({ incomes });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// CREATE income source
router.post("/", protect, protectVansh, async (req, res) => {
  try {
    const income = new FamilyIncome(req.body);
    await income.save();
    res.status(201).json(income);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// UPDATE income source
router.patch("/:id", protect, protectVansh, async (req, res) => {
  try {
    const income = await FamilyIncome.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!income) return res.status(404).json({ message: "Not found" });
    res.json(income);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE income source
router.delete("/:id", protect, protectVansh, async (req, res) => {
  try {
    const income = await FamilyIncome.findByIdAndDelete(req.params.id);
    if (!income) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;