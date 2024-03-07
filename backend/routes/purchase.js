const express = require("express");
const router = express.Router();
const { Item } = require("../Models/item");
const protect = require("../middlewares/authMiddleWare");

// Endpoint for adding a product to inventory
router.post("/", protect, async (req, res) => {
  const { brand, product, category, size, quantityBuy, mrp } = req.body;

  try {
    // Create a new item and save it to the database
    const newItem = new Item({
      brand: brand,
      product: product,
      category: category,
      size: size,
      quantityBuy: quantityBuy,
      mrp: mrp,
    });
    options = { upsert: true, new: true };
    // upsert - create new if not found
    // new - by default findoneAndUpdate return doc before update if new is true it return doc after update
    await Item.findOneAndUpdate(
      {
        brand: brand,
        product: product,
        category: category,
        size: size,
        mrp: mrp,
      },
      { $inc: { quantityBuy: quantityBuy } },
      options
    )
      .then(() => {
        res
          .status(200)
          .json({ message: "Product added to inventory successfully" });
      })
      .catch((error) => {
        console.log(error);
      });
  } catch (error) {
    console.error("Error adding product to inventory:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
