const express = require("express");
const router = express.Router();
const { FamilySavingsGoal } = require("../../Models/family/familySavingsGoal");
const protect = require("../../middlewares/authMiddleWare");
const protectVansh = require("../../middlewares/phoneAuthMiddleware");

// GET all goals
router.get("/", protect, protectVansh, async (req, res) => {
  try {
    const goals = await FamilySavingsGoal.find().sort({ createdAt: -1 });
    res.json({ goals });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// CREATE goal
router.post("/", protect, protectVansh, async (req, res) => {
  try {
    const goal = new FamilySavingsGoal(req.body);
    await goal.save();
    res.status(201).json(goal);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// UPDATE goal
router.patch("/:id", protect, protectVansh, async (req, res) => {
  try {
    const goal = await FamilySavingsGoal.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!goal) return res.status(404).json({ message: "Not found" });
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE goal
router.delete("/:id", protect, protectVansh, async (req, res) => {
  try {
    await FamilySavingsGoal.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ADD contribution
router.post("/:id/contribution", protect, protectVansh, async (req, res) => {
  try {
    const { amount, date, note } = req.body;
    const goal = await FamilySavingsGoal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: "Not found" });

    goal.contributions.push({ amount, date, note: note || "" });

    const totalSaved = goal.contributions.reduce((s, c) => s + c.amount, 0);
    if (totalSaved >= goal.targetAmount) {
      goal.isAchieved = true;
    }

    await goal.save();
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// REMOVE contribution
router.delete("/:id/contribution/:contribId", protect, protectVansh, async (req, res) => {
  try {
    const goal = await FamilySavingsGoal.findByIdAndUpdate(
      req.params.id,
      { $pull: { contributions: { _id: req.params.contribId } } },
      { new: true }
    );
    if (!goal) return res.status(404).json({ message: "Not found" });
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;