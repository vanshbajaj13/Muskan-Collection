const mongoose = require("mongoose");

const recentlyDeletedItemSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
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
      default : 1,
    },
    quantitySold: {
      type: Number,
      default: 0, // Set default value to 0
    },
    mrp: {
      type: Number,
      required: true,
    },
    secretCode: {
      type: String,
    },
  },
  { timestamps: true }
);

const RecentlyDeletedItem = new mongoose.model("RecentlyDeletedItem", recentlyDeletedItemSchema);
module.exports = { RecentlyDeletedItem };
