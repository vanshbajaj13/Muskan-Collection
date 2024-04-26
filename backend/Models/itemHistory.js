const mongoose = require("mongoose");

const itemHistorySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
    },
    product: {
      type: String,
    },
    category: {
      type: String,
    },
    size: {
      type: String,
    },
    quantityBuy: {
      type: Number,
    },
    mrp: {
      type: Number,
    },
    secretCode: {
      type: String,
    },
  },
  { timestamps: true }
);

const ItemHistory = new mongoose.model("ItemHistory", itemHistorySchema);
module.exports = { ItemHistory };
