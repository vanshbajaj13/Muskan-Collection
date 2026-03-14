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


// Generate 8-digit code for set products: [3 alpha][set letter][4 digits]
function generateSetBaseAlpha() {
  function getRandomAlphabet() {
    const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return alphabets.charAt(Math.floor(Math.random() * alphabets.length));
  }
  return `${getRandomAlphabet()}${getRandomAlphabet()}${getRandomAlphabet()}`;
}

function buildSetCode(alphaPart, setLetter, number) {
  // e.g., "XYZ" + "A" + 1001 = "XYZA1001"
  return `${alphaPart}${setLetter}${number}`;
}

async function generateSetCodesForAllSets(sets) {
  // sets: [{ sizes: ['S','M','L'] }, { sizes: ['S','L','XL'] }]
  // Returns: [['XYZA0001','XYZA0002','XYZA0003'], ['XYZB0001','XYZB0002','XYZB0003']]

  let found = false;
  let alphaPart = "";
  let numBase = 0;

  while (!found) {
    alphaPart = generateSetBaseAlpha(); // e.g., "XYZ"
    numBase = Math.floor(1000 + Math.random() * 9000);

    let allClear = true;

    for (let setIdx = 0; setIdx < sets.length; setIdx++) {
      const setLetter = String.fromCharCode(65 + setIdx); // A, B, C...
      for (let sizeIdx = 0; sizeIdx < sets[setIdx].sizes.length; sizeIdx++) {
        const code = buildSetCode(alphaPart, setLetter, numBase + sizeIdx);
        const existing = await Item.findOne({ code });
        if (existing) {
          allClear = false;
          break;
        }
      }
      if (!allClear) break;
    }

    if (allClear) found = true;
  }

  // Build final arrays
  const result = [];
  for (let setIdx = 0; setIdx < sets.length; setIdx++) {
    const setLetter = String.fromCharCode(65 + setIdx);
    const setCodes = sets[setIdx].sizes.map((_, sizeIdx) =>
      buildSetCode(alphaPart, setLetter, numBase + sizeIdx)
    );
    result.push(setCodes);
  }

  return result;
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

// Multi-set purchase endpoint
router.post("/multiset", protect, async (req, res) => {
  const { brand, product, category, quantityBuy, mrp, sets } = req.body;

  if (!sets || sets.length < 2 || sets.length > 26) {
    return res.status(400).json({ error: "Provide between 2 and 26 sets" });
  }
  if (!brand || !product || !category || !mrp) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const allSetCodes = await generateSetCodesForAllSets(sets);
    const sCode = convertToCode(Number(mrp));
    const allItems = [];

    for (let setIdx = 0; setIdx < sets.length; setIdx++) {
      const { sizes } = sets[setIdx];
      const codes = allSetCodes[setIdx];

      for (let sizeIdx = 0; sizeIdx < sizes.length; sizeIdx++) {
        const newItem = new Item({
          code: codes[sizeIdx],
          brand,
          product,
          category,
          size: sizes[sizeIdx],
          quantityBuy: Number(quantityBuy) || 1,
          mrp: Number(mrp),
          secretCode: sCode,
        });
        const saved = await newItem.save();
        allItems.push(saved);
      }
    }

    res.status(200).json({ items: allItems, setCodesGrouped: allSetCodes });
  } catch (error) {
    console.error("Error in multi-set purchase:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
