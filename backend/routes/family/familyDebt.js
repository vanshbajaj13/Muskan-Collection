const express = require("express");
const router = express.Router();
const { FamilyDebt } = require("../../Models/family/familyDebt");
const protect = require("../../middlewares/authMiddleWare");
const protectVansh = require("../../middlewares/phoneAuthMiddleware");

// GET all debts
router.get("/", protect, protectVansh, async (req, res) => {
  try {
    const debts = await FamilyDebt.find().sort({ createdAt: -1 });
    res.json({ debts });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// CREATE debt
router.post("/", protect, protectVansh, async (req, res) => {
  try {
    const debt = new FamilyDebt(req.body);
    await debt.save();
    res.status(201).json(debt);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// UPDATE debt
router.patch("/:id", protect, protectVansh, async (req, res) => {
  try {
    const debt = await FamilyDebt.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!debt) return res.status(404).json({ message: "Not found" });
    res.json(debt);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE debt
router.delete("/:id", protect, protectVansh, async (req, res) => {
  try {
    await FamilyDebt.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ADD repayment to a debt
router.post("/:id/repayment", protect, protectVansh, async (req, res) => {
  try {
    const { amount, date, note } = req.body;
    const debt = await FamilyDebt.findById(req.params.id);
    if (!debt) return res.status(404).json({ message: "Debt not found" });

    debt.repayments.push({ amount, date, note: note || "" });

    // Auto-settle if fully paid
    const totalRepaid = debt.repayments.reduce((s, r) => s + r.amount, 0);
    if (totalRepaid >= debt.principalAmount) {
      debt.isSettled = true;
      debt.settledDate = Date.now();
    }

    await debt.save();
    res.json(debt);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// REMOVE a repayment
router.delete("/:id/repayment/:repaymentId", protect, protectVansh, async (req, res) => {
  try {
    const debt = await FamilyDebt.findByIdAndUpdate(
      req.params.id,
      { $pull: { repayments: { _id: req.params.repaymentId } } },
      { new: true }
    );
    if (!debt) return res.status(404).json({ message: "Debt not found" });
    // Re-evaluate settled status
    const totalRepaid = debt.repayments.reduce((s, r) => s + r.amount, 0);
    if (totalRepaid < debt.principalAmount) {
      debt.isSettled = false;
      debt.settledDate = null;
      await debt.save();
    }
    res.json(debt);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;