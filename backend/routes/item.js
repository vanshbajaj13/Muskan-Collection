const express = require("express");
const router = express.Router();
const { Item } = require("../Models/item");
const protect = require("../middlewares/authMiddleWare");

router.get("/", protect, async (req, res) => {
  const items = await Item.find();
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
    // Find the item by its code and delete it
    const item = await Item.findOneAndDelete({ code: upperCaseCode });
    if (item) {
      res.json({ message: "Item deleted successfully" });
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

router.patch("/:code", protect, async (req, res) => {
  const { code } = req.params;
  const updateFields = req.body;
  try {
    // Find the item by code and update the specified fields
    const updatedItem = await Item.findOneAndUpdate(
      { code },
      { $set: updateFields },
      { new: true }
    );

    if (updatedItem) {
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "Item not found" });
    }
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
