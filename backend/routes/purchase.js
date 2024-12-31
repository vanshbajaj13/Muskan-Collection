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

function inc_code(code) {
  // Extract the alphabetic part
  let alphabeticPart = code.substring(0, 3);

  // Extract the numeric part and convert it to a number
  let numericPart = parseInt(code.substring(3));

  // Increment the numeric part
  numericPart++;

  // Concatenate the alphabetic part with the incremented numeric part
  let newCode = alphabeticPart + numericPart;
  return newCode;
}

async function generateUniqueCodesArray(size) {
  let uniqueCodes = [];
  let uniqueCode;
  let codeExists = true;

  while (codeExists) {
    uniqueCode = generateUniqueCode();
    let index = 0;

    // Check if the code already exists in the database
    const existingItem = await Item.findOne({ code: uniqueCode });

    if (existingItem === null) {
      uniqueCodes.push(uniqueCode);
      let incrementedCode = uniqueCode;

      // Increment the code for each size
      while (index < size.length - 1) {
        incrementedCode = inc_code(incrementedCode);
        const existingItemForSize = await Item.findOne({
          code: incrementedCode,
        });
        if (existingItemForSize !== null) {
          // Reset uniqueCodes if any code already exists
          uniqueCodes = [];
          break;
        } else {
          uniqueCodes.push(incrementedCode);
        }
        index++;
      }

      // Break the loop if all sizes have been processed
      if (index === size.length - 1) {
        codeExists = false;
      }
    }
  }

  return uniqueCodes;
}

function convertToCode(number) {
  const codeMap = {
    1: "J",
    2: "A",
    3: "I",
    4: "S",
    5: "U",
    6: "L",
    7: "T",
    8: "AB",
    9: "N",
  };

  // // add 35 to make round off mid value to 25
  // number += 35;
  // add 10 to maker round off mid va;ue to 40
  number += 10;
  // Round the number to the nearest multiple of 100
  var roundedNumber = Math.round(number / 100) * 100;

  if (roundedNumber === 0) {
    return "J";
  }
  while (roundedNumber % 10 === 0) {
    roundedNumber /= 10;
  }
  // Get the code corresponding to the rounded number
  var code = "";
  let st = roundedNumber.toString();
  for (let i = 0; i < st.length; i++) {
    code += codeMap[st[i]];
  }
  return code;
}

// Endpoint for adding a product to inventory
router.post("/", protect, async (req, res) => {
  const { brand, product, category, size, quantityBuy, mrp } = req.body;

  try {
    // Generate unique codes for each size
    const codes = await generateUniqueCodesArray(size);

    // Create and save items for each size
    const items = [];
    for (let i = 0; i < size.length; i++) {
      let sCode = convertToCode(Number(mrp));
      const newItem = new Item({
        code: codes[i],
        brand: brand,
        product: product,
        category: category,
        size: size[i], // Use the current size from the array
        quantityBuy: quantityBuy,
        mrp: mrp,
        secretCode: sCode,
      });

      // Save the new item
      const savedItem = await newItem.save();
      items.push(savedItem);
    }

    res.status(200).json({ items: items });
  } catch (error) {
    console.error("Error adding product to inventory:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
