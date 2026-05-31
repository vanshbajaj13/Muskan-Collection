const express = require("express");
const router = express.Router();
const { PhoneDeal } = require("../../Models/phone/phoneDeal");
const protect = require("../../middlewares/authMiddleWare");
const protectVansh = require("../../middlewares/phoneAuthMiddleware");

// ── GET all deals (with filters) ──────────────────────────────────────────
// Query params: status, from, to, product, account
router.get("/", protect, protectVansh, async (req, res) => {
  try {
    const { status, from, to, product, account } = req.query;
    let query = {};

    if (from || to) {
      query.purchaseDate = {};
      if (from) query.purchaseDate.$gte = parseInt(from);
      if (to) query.purchaseDate.$lte = parseInt(to);
    }
    if (product) query.product = { $regex: product, $options: "i" };
    if (account) query.purchaseAccount = { $regex: account, $options: "i" };

    const deals = await PhoneDeal.find(query).sort({ purchaseDate: -1 });

    // Apply status filter after fetching (status is a virtual)
    let filtered = deals;
    if (status && status !== "all") {
      filtered = deals.filter((d) => d.dealStatus === status);
    }

    res.json({ deals: filtered, total: filtered.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET single deal ───────────────────────────────────────────────────────
router.get("/:id", protect, protectVansh, async (req, res) => {
  try {
    const deal = await PhoneDeal.findById(req.params.id);
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── CREATE deal ───────────────────────────────────────────────────────────
router.post("/", protect, protectVansh, async (req, res) => {
  try {
    const deal = new PhoneDeal(req.body);
    await deal.save();
    res.status(201).json(deal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── UPDATE deal (full edit) ───────────────────────────────────────────────
router.patch("/:id", protect, protectVansh, async (req, res) => {
  try {
    const deal = await PhoneDeal.findByIdAndUpdate(
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

// ── DELETE deal ───────────────────────────────────────────────────────────
router.delete("/:id", protect, protectVansh, async (req, res) => {
  try {
    const deal = await PhoneDeal.findByIdAndDelete(req.params.id);
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json({ message: "Deal deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── ADD payment to deal ───────────────────────────────────────────────────
router.post("/:id/payment", protect, protectVansh, async (req, res) => {
  try {
    const { amount, date, note } = req.body;
    if (!amount || !date) {
      return res.status(400).json({ error: "amount and date are required" });
    }
    const deal = await PhoneDeal.findByIdAndUpdate(
      req.params.id,
      { $push: { payments: { amount, date, note: note || "" } } },
      { new: true }
    );
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── REMOVE a specific payment from a deal ────────────────────────────────
router.delete("/:id/payment/:paymentId", protect, protectVansh, async (req, res) => {
  try {
    const deal = await PhoneDeal.findByIdAndUpdate(
      req.params.id,
      { $pull: { payments: { _id: req.params.paymentId } } },
      { new: true }
    );
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── STATS for dashboard ───────────────────────────────────────────────────
// Returns aggregated stats for charts and summary cards
router.get("/meta/stats", protect, protectVansh, async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = {};
    if (from || to) {
      query.purchaseDate = {};
      if (from) query.purchaseDate.$gte = parseInt(from);
      if (to) query.purchaseDate.$lte = parseInt(to);
    }

    const deals = await PhoneDeal.find(query);

    // Per-deal computed values
    const computed = deals.map((d) => ({
      product: d.product,
      purchaseAccount: d.purchaseAccount,
      creditCard: d.creditCard,
      purchaseDate: d.purchaseDate,
      buyingPrice: d.buyingPrice,
      effectiveSellingPrice: d.effectiveSellingPrice,
      grossProfit: d.grossProfit,
      netProfit: d.netProfit,
      cashback: d.cashback || 0,
      cashbackDate: d.cashbackDate,
      commissionAmount: d.commissionAmount || 0,
      charges: d.charges || 0,
      dealStatus: d.dealStatus,
      totalPaymentsReceived: d.totalPaymentsReceived,
      paymentPending: d.paymentPending,
    }));

    // Summary totals (completed/partial deals only — exclude unsold)
    const soldDeals = computed.filter((d) => d.dealStatus !== "unsold");
    const totalRevenue = soldDeals.reduce((s, d) => s + (d.effectiveSellingPrice || 0), 0);
    const totalBuyingCost = computed.reduce((s, d) => s + d.buyingPrice, 0);
    const totalCashback = computed.reduce((s, d) => s + d.cashback, 0);
    const totalCharges = computed.reduce((s, d) => s + d.charges, 0);
    const totalCommission = computed.reduce((s, d) => s + d.commissionAmount, 0);
    const totalGrossProfit = soldDeals.reduce((s, d) => s + (d.grossProfit || 0), 0);
    const totalNetProfit = soldDeals.reduce((s, d) => s + (d.netProfit || 0), 0);
    const totalPending = computed.reduce((s, d) => s + d.paymentPending, 0);

    // Cashback by card
    const cashbackByCard = {};
    computed.forEach((d) => {
      if (d.creditCard && d.cashback) {
        cashbackByCard[d.creditCard] = (cashbackByCard[d.creditCard] || 0) + d.cashback;
      }
    });

    // Profit by month
    const profitByMonth = {};
    soldDeals.forEach((d) => {
      const date = new Date(d.purchaseDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!profitByMonth[key]) profitByMonth[key] = { gross: 0, net: 0, revenue: 0, count: 0 };
      profitByMonth[key].gross += d.grossProfit || 0;
      profitByMonth[key].net += d.netProfit || 0;
      profitByMonth[key].revenue += d.effectiveSellingPrice || 0;
      profitByMonth[key].count += 1;
    });

    // Profit by product
    const profitByProduct = {};
    soldDeals.forEach((d) => {
      if (!profitByProduct[d.product]) {
        profitByProduct[d.product] = { gross: 0, net: 0, count: 0 };
      }
      profitByProduct[d.product].gross += d.grossProfit || 0;
      profitByProduct[d.product].net += d.netProfit || 0;
      profitByProduct[d.product].count += 1;
    });

    // Deal counts by status
    const statusCounts = {
      unsold: computed.filter((d) => d.dealStatus === "unsold").length,
      pending_payment: computed.filter((d) => d.dealStatus === "pending_payment").length,
      complete: computed.filter((d) => d.dealStatus === "complete").length,
    };

    res.json({
      summary: {
        totalDeals: deals.length,
        totalBuyingCost,
        totalRevenue,
        totalCashback,
        totalCharges,
        totalCommission,
        totalGrossProfit,
        totalNetProfit,
        totalPending,
        statusCounts,
      },
      cashbackByCard,
      profitByMonth,
      profitByProduct,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── EXPORT CSV ────────────────────────────────────────────────────────────
router.get("/meta/export", protect, protectVansh, async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = {};
    if (from || to) {
      query.purchaseDate = {};
      if (from) query.purchaseDate.$gte = parseInt(from);
      if (to) query.purchaseDate.$lte = parseInt(to);
    }

    const deals = await PhoneDeal.find(query).sort({ purchaseDate: -1 });

    const headers = [
      "Purchase Date", "Product", "Purchased From", "Account",
      "Buying Price", "Credit Card", "Cashback", "Cashback Date",
      "Charges", "Charges Description", "On EMI",
      "Commission Amount", "Commission To",
      "Sold To", "Selling Price", "Sale Date",
      "Total Payments Received", "Payment Pending",
      "Gross Profit", "Net Profit",
      "Deal Status", "Notes"
    ];

    const rows = deals.map((d) => [
      d.purchaseDate ? new Date(d.purchaseDate).toLocaleDateString("en-IN") : "",
      d.product,
      d.purchasedFrom,
      d.purchaseAccount,
      d.buyingPrice,
      d.creditCard,
      d.cashback || 0,
      d.cashbackDate ? new Date(d.cashbackDate).toLocaleDateString("en-IN") : "",
      d.charges || 0,
      d.chargesDescription || "",
      d.onEmi ? "Yes" : "No",
      d.commissionAmount || 0,
      d.commissionTo || "",
      d.soldTo || "",
      d.sellingPrice || "",
      d.saleDate ? new Date(d.saleDate).toLocaleDateString("en-IN") : "",
      d.totalPaymentsReceived,
      d.paymentPending,
      d.grossProfit !== null ? d.grossProfit : "",
      d.netProfit !== null ? d.netProfit : "",
      d.dealStatus,
      `"${(d.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="phone-deals-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;