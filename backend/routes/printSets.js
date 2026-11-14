const express = require("express");
const router = express.Router();
const { Item } = require("../Models/item");
const protect = require("../middlewares/authMiddleWare");

// Safety cap so a very wide date range can't pull the whole collection.
const MAX_ITEMS = 5000;

// GET /api/printsets?from=<ISO>&to=<ISO>
//
// Read-only. Returns every item CREATED between `from` and `to` (inclusive),
// newest first, with only the fields the "Print Sets" page needs.
// Grouping into print sets (same code prefix / multi-set) is done on the
// frontend so this endpoint stays tiny and nothing else in the app is touched.
router.get("/", protect, async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "from and to dates are required" });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate) || isNaN(toDate)) {
      return res.status(400).json({ error: "Invalid from/to date" });
    }

    const found = await Item.find({
      createdAt: { $gte: fromDate, $lte: toDate },
    })
      .sort({ createdAt: -1 })
      .limit(MAX_ITEMS + 1)
      .select(
        "code brand product category size quantityBuy quantitySold mrp secretCode createdAt"
      )
      .lean();

    const truncated = found.length > MAX_ITEMS;
    const items = truncated ? found.slice(0, MAX_ITEMS) : found;

    res.json({ items, truncated });
  } catch (error) {
    console.error("Error fetching items for print sets:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;