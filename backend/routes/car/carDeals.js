const express = require("express");
const router = express.Router();
const { CarDeal } = require("../../Models/car/carDeal");
const protect = require("../../middlewares/authMiddleWare");

// GET all deals (optional date range)
router.get("/", protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = {};
    if (from || to) {
      query.purchaseDate = {};
      if (from) query.purchaseDate.$gte = parseInt(from);
      if (to) query.purchaseDate.$lte = parseInt(to);
    }
    const deals = await CarDeal.find(query).sort({ purchaseDate: -1 });
    res.json({ deals, total: deals.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET single deal
router.get("/:id", protect, async (req, res) => {
  try {
    const deal = await CarDeal.findById(req.params.id);
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// CREATE deal
router.post("/", protect, async (req, res) => {
  try {
    const deal = new CarDeal(req.body);
    await deal.save();
    res.status(201).json(deal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// UPDATE deal
router.patch("/:id", protect, async (req, res) => {
  try {
    const deal = await CarDeal.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json(deal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE deal
router.delete("/:id", protect, async (req, res) => {
  try {
    const deal = await CarDeal.findByIdAndDelete(req.params.id);
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json({ message: "Deal deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// STATS for dashboard
router.get("/meta/stats", protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = {};
    if (from || to) {
      query.purchaseDate = {};
      if (from) query.purchaseDate.$gte = parseInt(from);
      if (to) query.purchaseDate.$lte = parseInt(to);
    }

    const deals = await CarDeal.find(query);

    const soldDeals = deals.filter((d) => d.dealStatus === "sold");
    const unsoldDeals = deals.filter((d) => d.dealStatus === "unsold");

    const totalBuyingCost = deals.reduce((s, d) => s + d.buyingPrice, 0);
    const totalExpenses = deals.reduce((s, d) => s + d.totalExpenses, 0);
    const totalCost = deals.reduce((s, d) => s + d.totalCost, 0);
    const totalRevenue = soldDeals.reduce((s, d) => s + (d.sellingPrice || 0), 0);
    const totalGrossProfit = soldDeals.reduce((s, d) => s + (d.grossProfit || 0), 0);
    const totalNetProfit = soldDeals.reduce((s, d) => s + (d.netProfit || 0), 0);
    const totalCommission = deals.reduce((s, d) => s + d.totalCommission, 0);
    const capitalLocked = unsoldDeals.reduce((s, d) => s + d.totalCost, 0);

    // Profit by month
    const profitByMonth = {};
    soldDeals.forEach((d) => {
      const date = new Date(d.purchaseDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!profitByMonth[key]) profitByMonth[key] = { gross: 0, net: 0, count: 0, revenue: 0 };
      profitByMonth[key].gross += d.grossProfit || 0;
      profitByMonth[key].net += d.netProfit || 0;
      profitByMonth[key].revenue += d.sellingPrice || 0;
      profitByMonth[key].count += 1;
    });

    // Partner-wise profit
    const partnerProfit = {};
    soldDeals.forEach((d) => {
      (d.partnerBreakdown || []).forEach((p) => {
        if (!partnerProfit[p.name]) partnerProfit[p.name] = { profit: 0, deals: 0 };
        partnerProfit[p.name].profit += p.profitShare || 0;
        partnerProfit[p.name].deals += 1;
      });
    });

    // Top makes by count
    const makeCount = {};
    deals.forEach((d) => {
      const k = d.make || "Unknown";
      makeCount[k] = (makeCount[k] || 0) + 1;
    });

    res.json({
      summary: {
        totalDeals: deals.length,
        soldDeals: soldDeals.length,
        unsoldDeals: unsoldDeals.length,
        totalBuyingCost,
        totalExpenses,
        totalCost,
        totalRevenue,
        totalGrossProfit,
        totalNetProfit,
        totalCommission,
        capitalLocked,
      },
      profitByMonth,
      partnerProfit,
      makeCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;