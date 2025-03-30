const express = require("express");
const router = express.Router();
const { SaleLog } = require("../Models/salesLog");
const protect = require("../middlewares/authMiddleWare");
const { Item } = require("../Models/item");
const { RecentlyDeletedSaleLog } = require("../Models/recentlyDeletedSaleslog");
const { Customer } = require("../Models/customer");

router.get("/", protect, async (req, res) => {
  await SaleLog.find()
    .then((doc) => {
      res.json(doc);
    })
    .catch((err) => {
      console.log(err);
    });
  // console.log(items);
});

// Endpoint to fetch sale logs from the last 365 days
router.get("/1year", protect, async (req, res) => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  try {
    const saleLogs = await SaleLog.find({
      soldAt: { $gte: oneYearAgo },
    });

    res.json(saleLogs);
  } catch (err) {
    console.error("Error fetching sale logs:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:_id", protect, async (req, res) => {
  const { _id } = req.params;
  try {
    // Find the sale log with the given code
    const saleLog = await SaleLog.findOne({ _id });

    if (!saleLog) {
      return res.status(404).json({ message: "Sale log not found" });
    }

    var dt = Date.now();
    if (saleLog.customerPhoneNo) {
      // Find the customer associated with the sale log
      const customer = await Customer.findOne({
        phoneNo: saleLog.customerPhoneNo,
      });

      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Remove the sale log from the customer's purchase list using $pull operator
      await Customer.updateOne(
        { phoneNo: saleLog.customerPhoneNo },
        { $pull: { purchaseList: { salesLogId: saleLog._id } } }
      );

      // Add the sale log to the customer's returned item list
      await Customer.updateOne(
        { phoneNo: saleLog.customerPhoneNo },
        {
          $push: {
            returnItemList: {
              purchasedAt: saleLog.soldAt,
              returnedAt: dt,
              salesLogId: saleLog._id,
            },
          },
        }
      );
    }

    // Find the item with the given code
    const item = await Item.findOne({ code: saleLog.code });

    if (!item) {
      throw new Error("Item not found");
    }

    // Decrease the quantity sold by one
    item.quantitySold -= 1;

    // Update the sale entry by adding returnedAt instead of removing it
    item.sales = item.sales.map((sale) =>
      sale.soldAt === saleLog.soldAt
        ? { ...sale, returnedAt: dt }
        : sale
    );

    // Save the updated item document
    await item.save();

    // move to recyle bin
    const recycleBinSale = new RecentlyDeletedSaleLog({
      _id: saleLog._id,
      code: saleLog.code,
      brand: saleLog.brand,
      product: saleLog.product,
      category: saleLog.category,
      size: saleLog.size,
      mrp: saleLog.mrp,
      sellingPrice: saleLog.sellingPrice,
      customerPhoneNo: saleLog.customerPhoneNo,
      soldAt: saleLog.soldAt,
    });
    await recycleBinSale.save();
    // Delete the sale log
    await SaleLog.deleteOne({ _id });

    res.status(200).json({ message: "Sale log deleted successfully" });
  } catch (error) {
    console.error("Error deleting sale log:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to fetch items with pagination
router.get("/paginate", protect, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const sales = await SaleLog.find()
      .sort({ soldAt: -1 }) // Assuming you have a createdAt field in your items
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({ sales });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to get all the items which contain part of code based on search option
router.get("/search/:option/:query", protect, async (req, res) => {
  const { option, query } = req.params;
  const searchField = option.toLowerCase(); // Convert search option to lowercase

  try {
    let items;
    // Use a switch statement to handle different search options
    switch (searchField) {
      case "code":
        // Search by code
        items = await SaleLog.find({
          code: { $regex: query, $options: "i" },
        }).sort({ soldAt: -1 });
        break;
      case "brand":
        // Search by brand
        items = await SaleLog.find({
          brand: { $regex: query, $options: "i" },
        }).sort({ soldAt: -1 });
        break;
      case "product":
        // Search by product
        items = await SaleLog.find({
          product: { $regex: query, $options: "i" },
        }).sort({ soldAt: -1 });
        break;
      case "category":
        // Search by category
        items = await SaleLog.find({
          category: { $regex: query, $options: "i" },
        }).sort({ soldAt: -1 });
        break;
      case "size":
        // Search by size
        items = await SaleLog.find({
          size: { $regex: query, $options: "i" },
        }).sort({ soldAt: -1 });
        break;
      default:
        return res.status(400).json({ message: "Invalid search option" });
    }

    if (items.length > 0) {
      res.json(items);
    } else {
      res.status(404).json({ message: "Items not found" });
    }
  } catch (error) {
    console.error("Error searching items:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to get all the items which match the search query exactly (case-insensitive)
router.get("/exact-search/:option/:query", protect, async (req, res) => {
  const { option, query } = req.params;
  const searchField = option.toLowerCase(); // Convert search option to lowercase

  try {
    let items;
    // Use a switch statement to handle different search options
    switch (searchField) {
      case "code":
        // Search by code (case-insensitive)
        items = await SaleLog.find({
          code: { $regex: new RegExp(`^${query}$`, "i") },
        });
        break;
      case "brand":
        // Search by brand (case-insensitive)
        items = await SaleLog.find({
          brand: { $regex: new RegExp(`^${query}$`, "i") },
        });
        break;
      case "product":
        // Search by product (case-insensitive)
        items = await SaleLog.find({
          product: { $regex: new RegExp(`^${query}$`, "i") },
        });
        break;
      case "category":
        // Search by category (case-insensitive)
        items = await SaleLog.find({
          category: { $regex: new RegExp(`^${query}$`, "i") },
        });
        break;
      case "size":
        // Search by size (case-insensitive)
        items = await SaleLog.find({
          size: { $regex: new RegExp(`^${query}$`, "i") },
        });
        break;
      default:
        return res.status(400).json({ message: "Invalid search option" });
    }

    if (items.length > 0) {
      res.json(items);
    } else {
      res.status(404).json({ message: "Items not found" });
    }
  } catch (error) {
    console.error("Error searching items:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
