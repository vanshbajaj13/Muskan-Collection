// backend/Models/verificationItem.js
const mongoose = require("mongoose");

const verificationItemSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true
  },
  itemCode: {
    type: String,
    required: true
  },
  // Original item details from snapshot
  originalDetails: {
    brand: String,
    product: String,
    category: String,
    size: String,
    mrp: Number,
    secretCode: String
  },
  expectedQuantity: {
    type: Number,
    required: true
  },
  verifiedQuantity: {
    type: Number,
    default: 0
  },
  varianceQuantity: {
    type: Number,
    default: 0
  },
  varianceValue: {
    type: Number,
    default: 0
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'discrepancy', 'not_found', 'overage'],
    default: 'pending'
  },
  verificationMethod: {
    type: String,
    enum: ['qr_scan', 'manual_entry'],
    required: true
  },
  verifiedBy: {
    type: String,
    required: true
  },
  verifiedAt: {
    type: Number,
    default: Date.now
  },
  notes: {
    type: String
  },
  isAdjusted: {
    type: Boolean,
    default: false
  },
  adjustmentReason: {
    type: String
  }
}, { timestamps: true });

const VerificationItem = mongoose.model("VerificationItem", verificationItemSchema);
module.exports = { VerificationItem };