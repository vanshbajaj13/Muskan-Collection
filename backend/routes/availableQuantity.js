// availableQuantity.js

const express = require("express");
const router = express.Router();
const { Item } = require("../Models/item");
const protect= require("../middlewares/authMiddleWare");

// Endpoint for retrieving available quantity
router.get("/",protect , async (req, res) => {
  const { code } = req.query;
  try {
    // Find the item based on brand, product, category, and size
    await Item.findOne({
      code: code
    })
      .then((doc) => {
        if (doc) {
          return res
            .status(200)
            .json({ availableQuantity: doc.quantityBuy - doc.quantitySold });
        } else {
          res.status(404).json({ message: "Product not found" });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  } catch (error) {
    console.error("Error retrieving available quantity:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
