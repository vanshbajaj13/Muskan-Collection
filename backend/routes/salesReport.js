const express = require("express");
const router = express.Router();
const { SaleLog } = require("../Models/salesLog");
const { Customer } = require("../Models/customer");
const protect = require("../middlewares/authMiddleWare");

// GET /api/salesreport?from=<timestamp>&to=<timestamp>
router.get("/", protect, async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "from and to timestamps are required" });
    }

    const fromNum = parseInt(from);
    const toNum = parseInt(to);

    const sales = await SaleLog.find({
      soldAt: { $gte: fromNum, $lte: toNum },
    }).sort({ soldAt: 1 });

    // Collect unique phone numbers to fetch customer names
    const phoneNumbers = [
      ...new Set(
        sales
          .filter((s) => s.customerPhoneNo)
          .map((s) => s.customerPhoneNo)
      ),
    ];

    // Build a map of phoneNo -> name
    const customerMap = {};
    if (phoneNumbers.length > 0) {
      const customers = await Customer.find(
        { phoneNo: { $in: phoneNumbers } },
        { phoneNo: 1, name: 1 }
      );
      customers.forEach((c) => {
        customerMap[c.phoneNo] = c.name || "";
      });
    }

    // Attach customer name to each sale
    const enriched = sales.map((sale) => ({
      _id: sale._id,
      code: sale.code,
      brand: sale.brand,
      product: sale.product,
      category: sale.category,
      size: sale.size,
      mrp: sale.mrp,
      sellingPrice: sale.sellingPrice,
      soldAt: sale.soldAt,
      customerPhoneNo: sale.customerPhoneNo || null,
      customerName: sale.customerPhoneNo
        ? customerMap[sale.customerPhoneNo] || ""
        : "",
      soldBy: sale.soldBy || "",
    }));

    res.json({ sales: enriched, total: enriched.length });
  } catch (error) {
    console.error("Error fetching sales report:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;