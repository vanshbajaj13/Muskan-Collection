const express = require("express");
const router = express.Router();
const { Item } = require("../Models/item");
const { RecentlyDeletedItem } = require("../Models/recentlyDeletedItem");
const protect = require("../middlewares/authMiddleWare");
const { ItemHistory } = require("../Models/itemHistory");

router.get("/", protect, async (req, res) => {
  const items = await Item.find().sort({ brand: 1 });
  // console.log(items);
  res.json(items);
});

// Route to fetch items with pagination
router.get("/paginate", protect, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const items = await Item.find()
      .sort({ createdAt: -1 }) // Assuming you have a createdAt field in your items
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({ items });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to fetch items by code
router.get("/code/:code", protect, async (req, res) => {
  var { code } = req.params;
  code = code.toUpperCase();
  try {
    const item = await Item.findOne({ code });
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ message: "Item not found" });
    }
  } catch (error) {
    console.error("Error fetching item by code:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to delete item by code
router.delete("/:code", protect, async (req, res) => {
  const { code } = req.params;
  const upperCaseCode = code.toUpperCase();
  try {
    // Find the item by its code
    const item = await Item.findOne({ code: upperCaseCode });
    if (item) {
      // Instead of directly deleting, move the item to the recycle bin
      const recycleBinItem = new RecentlyDeletedItem({
        code: item.code,
        brand: item.brand,
        product: item.product,
        category: item.category,
        size: item.size, // Use the current size from the array
        quantityBuy: item.quantityBuy,
        quantitySold: item.quantitySold,
        mrp: item.mrp,
        secretCode: item.secretCode,
      });
      await recycleBinItem.save();

      // Now delete the item from the original collection
      await Item.deleteOne({ code: upperCaseCode });

      res.json({ message: "Item moved to recycle bin successfully" });
    } else {
      res.status(404).json({ message: "Item not found" });
    }
  } catch (error) {
    console.error("Error deleting item by code:", error);
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
        items = await Item.find({ code: { $regex: query, $options: "i" } });
        break;
      case "brand":
        // Search by brand
        items = await Item.find({ brand: { $regex: query, $options: "i" } });
        break;
      case "product":
        // Search by product
        items = await Item.find({ product: { $regex: query, $options: "i" } });
        break;
      case "category":
        // Search by category
        items = await Item.find({ category: { $regex: query, $options: "i" } });
        break;
      case "size":
        // Search by size
        items = await Item.find({ size: { $regex: query, $options: "i" } });
        break;
      case "mrp<=":
        // Search by MRP less than or equal to the specified value
        items = await Item.find({ mrp: { $lte: parseFloat(query) } }).sort({
          mrp: 1,
        });
        break;
      case "mrp>=":
        // Search by MRP greater than or equal to the specified value
        items = await Item.find({ mrp: { $gte: parseFloat(query) } }).sort({
          mrp: 1,
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
        items = await Item.find({
          code: { $regex: new RegExp(`^${query}$`, "i") },
        });
        break;
      case "brand":
        // Search by brand (case-insensitive)
        items = await Item.find({
          brand: { $regex: new RegExp(`^${query}$`, "i") },
        });
        break;
      case "product":
        // Search by product (case-insensitive)
        items = await Item.find({
          product: { $regex: new RegExp(`^${query}$`, "i") },
        });
        break;
      case "category":
        // Search by category (case-insensitive)
        items = await Item.find({
          category: { $regex: new RegExp(`^${query}$`, "i") },
        });
        break;
      case "size":
        // Search by size (case-insensitive)
        items = await Item.find({
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

router.get("/list", protect, async (req, res) => {
  const { brand, product, category, size } = req.query;
  try {
    // Find the item based on brand, product, category, and size
    await Item.find({
      brand: brand,
      product: product,
      category: category,
      size: size,
    })
      .then((doc) => {
        if (doc) {
          return res.status(200).json(doc);
        } else {
          res.status(404).json({ message: "Product not found" });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  } catch (error) {
    console.error("Error retrieving :", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/updateAll", protect, async (req, res) => {
  const updates = req.body; // Expecting an array of { code, updateFields }
  try {
    const updatePromises = updates.map(async ({ code, updateFields }) => {
      // Find the item by code
      const existingItem = await Item.findOne({ code });

      if (!existingItem) {
        return { code, success: false, message: "Item not found" };
      }

      // Store the previous values of the fields that are being updated
      const previousValues = {};
      for (const key in updateFields) {
        if (existingItem[key] !== undefined) {
          previousValues[key] = existingItem[key];
        }
      }

      // Find the item by code and update the specified fields
      const updatedItem = await Item.findOneAndUpdate(
        { code },
        { $set: updateFields },
        { new: true }
      );

      if (updatedItem) {
        // Create a new item history entry with just the updated fields
        const itemHistoryEntry = new ItemHistory({
          code: code,
          ...previousValues,
        });

        // Save the item history entry
        await itemHistoryEntry.save();

        return { code, success: true, updatedItem };
      } else {
        return { code, success: false, message: "Failed to update item" };
      }
    });

    const results = await Promise.all(updatePromises);
    res.json(results);
  } catch (error) {
    console.error("Error updating items:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/:code", protect, async (req, res) => {
  const { code } = req.params;
  const updateFields = req.body;
  try {
    // Find the item by code
    const existingItem = await Item.findOne({ code });

    if (!existingItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Store the previous values of the fields that are being updated
    const previousValues = {};
    for (const key in updateFields) {
      if (existingItem[key] !== undefined) {
        previousValues[key] = existingItem[key];
      }
    }

    // Find the item by code and update the specified fields
    const updatedItem = await Item.findOneAndUpdate(
      { code },
      { $set: updateFields },
      { new: false }
    );

    if (updatedItem) {
      // Create a new item history entry with just the updated fields
      const itemHistoryEntry = new ItemHistory({
        code: code,
        ...previousValues,
      });

      // Save the item history entry
      await itemHistoryEntry.save();

      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "Item not found" });
    }
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/verify/:brand", async (req, res) => {
  try {
    var { brand } = req.params;
    brand = brand.toUpperCase();
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const items = await Item.find({
      brand: brand,
      createdAt: { $gte: oneDayAgo },
    });

    if (!items || items.length === 0) {
      return res.status(404).json({ message: "No items found" });
    }

    const results = items.reduce(
      (acc, item) => {
        acc.sumMrpQuantity += item.mrp * item.quantityBuy;
        acc.sumQuantity += item.quantityBuy;
        return acc;
      },
      { sumMrpQuantity: 0, sumQuantity: 0 }
    );

    res.json(results);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


module.exports = router;
