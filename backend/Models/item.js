const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    sellingPrice: {
      type: Number,
      required: true,
    },
    soldAt : {
        type : Number
    },
    returnedAt : {
        type : Number
    },
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
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
    sales: [saleSchema], // Array to store multiple sales records
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

const Item = new mongoose.model("Item", itemSchema);
module.exports = { Item };
