const mongoose = require("mongoose");

// Stores all dropdown options for the phones business
// type: "product" | "purchasedFrom" | "account" | "soldTo" | "commissionTo" | "card"
const phoneDropdownSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["product", "purchasedFrom", "account", "soldTo", "commissionTo", "card"],
    },
    value: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique per type+value
phoneDropdownSchema.index({ type: 1, value: 1 }, { unique: true });

const PhoneDropdown = mongoose.model("PhoneDropdown", phoneDropdownSchema);
module.exports = { PhoneDropdown };