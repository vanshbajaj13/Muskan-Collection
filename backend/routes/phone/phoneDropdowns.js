const express = require("express");
const router = express.Router();
const { PhoneDropdown } = require("../../Models/phone/phoneDropdown");
const protect = require("../../middlewares/authMiddleWare");
const protectVansh = require("../../middlewares/phoneAuthMiddleware");

// GET all options (optionally filtered by type)
router.get("/", protect, protectVansh, async (req, res) => {
  try {
    const { type } = req.query;
    const query = { active: true };
    if (type) query.type = type;
    const options = await PhoneDropdown.find(query).sort({ type: 1, value: 1 });

    // Group by type for convenience
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

// ADD a new option
router.post("/", protect, protectVansh, async (req, res) => {
  try {
    const { type, value } = req.body;
    if (!type || !value) {
      return res.status(400).json({ error: "type and value are required" });
    }

    // Check if already exists (case-insensitive)
    const existing = await PhoneDropdown.findOne({
      type,
      value: { $regex: new RegExp(`^${value.trim()}$`, "i") },
    });
    if (existing) {
      // If it was soft-deleted, restore it
      if (!existing.active) {
        existing.active = true;
        await existing.save();
        return res.json(existing);
      }
      return res.status(400).json({ error: "Option already exists" });
    }

    const option = new PhoneDropdown({ type, value: value.trim() });
    await option.save();
    res.status(201).json(option);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// RENAME a dropdown option — updates the value in ALL deals/expenses automatically
// because we query by _id in dropdowns and store the string value in deals,
// we do a bulk update on all affected deal fields
router.patch("/:id", protect, protectVansh, async (req, res) => {
  try {
    const { value: newValue } = req.body;
    if (!newValue) return res.status(400).json({ error: "value is required" });

    const option = await PhoneDropdown.findById(req.params.id);
    if (!option) return res.status(404).json({ message: "Option not found" });

    const oldValue = option.value;
    const type = option.type;

    // Update the dropdown option itself
    option.value = newValue.trim();
    await option.save();

    // ── Propagate rename to all PhoneDeal records ─────────────────
    const { PhoneDeal } = require("../../Models/phone/phoneDeal");
    const { PersonalExpense } = require("../../Models/phone/personalExpense");

    const fieldMap = {
      product: "product",
      purchasedFrom: "purchasedFrom",
      account: "purchaseAccount",
      soldTo: "soldTo",
      commissionTo: "commissionTo",
      card: "creditCard",
    };

    if (fieldMap[type]) {
      await PhoneDeal.updateMany(
        { [fieldMap[type]]: oldValue },
        { $set: { [fieldMap[type]]: newValue.trim() } }
      );
    }

    // For "card" type, also update PersonalExpense
    if (type === "card") {
      await PersonalExpense.updateMany(
        { card: oldValue },
        { $set: { card: newValue.trim() } }
      );
    }

    res.json({ message: "Renamed and propagated successfully", option });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// SOFT DELETE (deactivate) a dropdown option
router.delete("/:id", protect, protectVansh, async (req, res) => {
  try {
    const option = await PhoneDropdown.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );
    if (!option) return res.status(404).json({ message: "Option not found" });
    res.json({ message: "Option deactivated", option });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;