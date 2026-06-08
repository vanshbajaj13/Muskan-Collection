const express = require("express");
const router = express.Router();
const { FamilyBusinessEntry } = require("../../Models/family/familyBusinessEntry");
const protect = require("../../middlewares/authMiddleWare");
const protectVansh = require("../../middlewares/phoneAuthMiddleware");

// GET all business entries
router.get("/", protect, protectVansh, async (req, res) => {
  try {
    const entries = await FamilyBusinessEntry.find().sort({ year: -1, month: -1 });
    res.json({ entries });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// UPSERT business entry for a month
router.post("/", protect, protectVansh, async (req, res) => {
  try {
    const { year, month, salesRevenue, stockPurchase, otherBusinessExpense, notes } = req.body;
    const entry = await FamilyBusinessEntry.findOneAndUpdate(
      { year, month },
      { year, month, salesRevenue: salesRevenue || 0, stockPurchase: stockPurchase || 0, otherBusinessExpense: otherBusinessExpense || 0, notes: notes || "" },
      { upsert: true, new: true }
    );
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE a business entry
router.delete("/:id", protect, protectVansh, async (req, res) => {
  try {
    await FamilyBusinessEntry.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;