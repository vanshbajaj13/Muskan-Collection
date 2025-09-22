// backend/Models/verificationLog.js
const mongoose = require("mongoose");

const verificationLogSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['scan', 'manual_entry', 'correction', 'deletion', 'session_start', 'session_complete'],
    required: true
  },
  itemCode: {
    type: String
  },
  previousQuantity: {
    type: Number
  },
  newQuantity: {
    type: Number
  },
  performedBy: {
    type: String,
    required: true
  },
  timestamp: {
    type: Number,
    default: Date.now
  },
  details: {
    type: String
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, { timestamps: true });

const VerificationLog = mongoose.model("VerificationLog", verificationLogSchema);
module.exports = { VerificationLog };