const express = require("express");
const router = express.Router();
const { Item } = require("../Models/item");
const protect = require("../middlewares/authMiddleWare");

// Function to generate a unique code
function generateUniqueCode() {
  // Function to generate a random alphabet
  function getRandomAlphabet() {
    const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return alphabets.charAt(Math.floor(Math.random() * alphabets.length));
  }

  // Function to generate a random number
  function getRandomNumber() {
    return Math.floor(1000 + Math.random() * 9000);
  }

  // Generate the unique code
  return `${getRandomAlphabet()}${getRandomAlphabet()}${getRandomAlphabet()}${getRandomNumber()}`;
}

// Endpoint for adding a product to inventory
router.post("/", protect, async (req, res) => {
  const { brand, product, category, size, quantityBuy, mrp } = req.body;

  try {
    let uniqueCode;
    let codeExists = true;

    // Keep generating unique codes until one is found that doesn't exist
    while (codeExists) {
      uniqueCode = generateUniqueCode();

      // Check if the code already exists in the database
      const existingItem = await Item.findOne({ code: uniqueCode });
      codeExists = existingItem !== null;
    }

    // Create a new item and save it to the database
    const newItem = new Item({
      code: uniqueCode,
      brand: brand,
      product: product,
      category: category,
      size: size,
      quantityBuy: quantityBuy,
      mrp: mrp,
    });

    // Save the new item
    await newItem.save();

    res.status(200).json({ code: uniqueCode });
  } catch (error) {
    console.error("Error adding product to inventory:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
