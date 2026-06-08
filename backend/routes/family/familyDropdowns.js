const express = require("express");
const router = express.Router();
const { FamilyDropdown } = require("../../Models/family/familyDropdown");
const protect = require("../../middlewares/authMiddleWare");
const protectVansh = require("../../middlewares/phoneAuthMiddleware");

// GET all dropdowns grouped by type
router.get("/", protect, protectVansh, async (req, res) => {
  try {
    const options = await FamilyDropdown.find({ active: true }).sort({ type: 1, value: 1 });
    const grouped = {};
    options.forEach((opt) => {
      if (!grouped[opt.type]) grouped[opt.type] = [];
      grouped[opt.type].push({ _id: opt._id, value: opt.value });
    });
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ADD option
router.post("/", protect, protectVansh, async (req, res) => {
  try {
    const { type, value } = req.body;
    if (!type || !value) return res.status(400).json({ error: "type and value required" });

    const existing = await FamilyDropdown.findOne({
      type,
      value: { $regex: new RegExp(`^${value.trim()}$`, "i") },
    });
    if (existing) {
      if (!existing.active) {
        existing.active = true;
        await existing.save();
        return res.json(existing);
      }
      return res.status(400).json({ error: "Option already exists" });
    }

    const option = new FamilyDropdown({ type, value: value.trim() });
    await option.save();
    res.status(201).json(option);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// UPDATE option
router.patch("/:id", protect, protectVansh, async (req, res) => {
  try {
    const { value } = req.body;
    const option = await FamilyDropdown.findByIdAndUpdate(
      req.params.id,
      { value: value.trim() },
      { new: true }
    );
    if (!option) return res.status(404).json({ message: "Not found" });
    res.json(option);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// SOFT DELETE
router.delete("/:id", protect, protectVansh, async (req, res) => {
  try {
    const option = await FamilyDropdown.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );
    if (!option) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deactivated" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;