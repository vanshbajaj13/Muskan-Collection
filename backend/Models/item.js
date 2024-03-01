const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: true,
    },
    product: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    size: {
        type : String,
        required: true
    },
    quantityBuy: {
      type: Number,
    },
    quantitySold: {
      type: Number,
      default: 0, // Set default value to 0
    },
    mrp: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const Item = new mongoose.model("Item", itemSchema);
module.exports = { Item };
