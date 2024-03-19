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

module.exports = router;
