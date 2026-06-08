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
    const {
      year, month, salesRevenue,
      stockPurchases, businessExpenses,
      // legacy scalar fallbacks
      stockPurchase, otherBusinessExpense,
      notes,
    } = req.body;

    // Compute legacy scalar totals from arrays (or keep passed scalars)
    const computedStockPurchase =
      stockPurchases && stockPurchases.length > 0
        ? stockPurchases.reduce((s, p) => s + (p.amount || 0), 0)
        : stockPurchase || 0;

    const computedOtherExpense =
      businessExpenses && businessExpenses.length > 0
        ? businessExpenses.reduce((s, e) => s + (e.amount || 0), 0)
        : otherBusinessExpense || 0;

    const entry = await FamilyBusinessEntry.findOneAndUpdate(
      { year, month },
      {
        year,
        month,
        salesRevenue: salesRevenue || 0,
        stockPurchases: stockPurchases || [],
        businessExpenses: businessExpenses || [],
        stockPurchase: computedStockPurchase,
        otherBusinessExpense: computedOtherExpense,
        notes: notes || "",
      },
      { upsert: true, new: true }
    );
    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
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