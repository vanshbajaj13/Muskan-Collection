const express = require("express");
const router = express.Router();
const { Item } = require("../Models/item");
const protect = require("../middlewares/authMiddleWare");

router.get("/", protect, async (req, res) => {
  const items = await Item.find();
  // console.log(items);
  res.json(items);
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
