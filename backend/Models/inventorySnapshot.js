// backend/Models/inventorySnapshot.js
const mongoose = require("mongoose");

const inventorySnapshotSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true
  },
  itemCode: {
    type: String,
    required: true
  },
  snapshotData: {
    brand: String,
    product: String,
    category: String,
    size: String,
    quantityBuy: Number,
    quantitySold: Number,
    availableQuantity: Number,
    mrp: Number,
    secretCode: String,
    sales: [{
      sellingPrice: Number,
      soldAt: Number,
      returnedAt: Number
    }]
  },
  createdAt: {
    type: Number,
    default: Date.now
  }
}, { timestamps: true });

const InventorySnapshot = mongoose.model("InventorySnapshot", inventorySnapshotSchema);
module.exports = { InventorySnapshot };