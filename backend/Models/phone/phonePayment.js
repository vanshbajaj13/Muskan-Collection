const mongoose = require("mongoose");

// Each allocation: how much of this receipt went to which deal
const allocationSchema = new mongoose.Schema(
  {
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: "PhoneDeal", required: true },
    amount: { type: Number, required: true },
    // snapshot fields so receipt list can render deal context even if deal is later deleted
    product: { type: String, default: "" },
    soldTo: { type: String, default: "" },
  },
  { _id: false }
);

// PhonePayment = the ACTUAL money received (one bank/UPI transaction)
// It is split into one or more allocations against deals.
const phonePaymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },     // total amount actually received
    date: { type: Number, required: true },       // timestamp
    note: { type: String, default: "" },          // user note (auto-generated breakup appended)
    method: { type: String, default: "" },        // optional: UPI / Cash / Bank Transfer etc.
    allocations: [allocationSchema],
  },
  { timestamps: true }
);

const PhonePayment = mongoose.model("PhonePayment", phonePaymentSchema);
module.exports = { PhonePayment };