const mongoose = require("mongoose");

// types: "partner" | "boughtFrom" | "soldTo" | "make"
const carDropdownSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["partner", "boughtFrom", "soldTo", "make"],
    },
    value: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

carDropdownSchema.index({ type: 1, value: 1 }, { unique: true });

const CarDropdown = mongoose.model("CarDropdown", carDropdownSchema);
module.exports = { CarDropdown };