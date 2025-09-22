// backend/Models/verificationSession.js
const mongoose = require("mongoose");

const verificationSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  sessionName: {
    type: String,
    required: true
  },
  sessionType: {
    type: String,
    enum: ['full', 'partial', 'category'],
    default: 'full'
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active'
  },
  startedBy: {
    type: String,
    required: true
  },
  participants: [{
    userId: String,
    userName: String,
    role: String
  }],
  totalExpectedItems: {
    type: Number,
    default: 0
  },
  totalVerifiedItems: {
    type: Number,
    default: 0
  },
  totalDiscrepancies: {
    type: Number,
    default: 0
  },
  categories: [String], // If partial verification
  expectedFinancialValue: {
    type: Number,
    default: 0
  },
  actualFinancialValue: {
    type: Number,
    default: 0
  },
  varianceValue: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Number,
    default: Date.now
  },
  completedAt: {
    type: Number
  },
  notes: {
    type: String
  }
}, { timestamps: true });

const VerificationSession = mongoose.model("VerificationSession", verificationSessionSchema);
module.exports = { VerificationSession };