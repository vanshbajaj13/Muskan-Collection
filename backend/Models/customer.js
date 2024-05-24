// Define the schema for the Customer model
const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
    phoneNo: {
      type: Number,
      unique: true,
      required: true,
    },
    name: {
      type: String,
    },
    purchaseList: [{
      purchasedAt: {
        type: Number,
        required: true,
      },
      salesLogId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SaleLog",
        required: true,
      }
    }],
    returnItemList: [{
      purchasedAt: {
        type: Number,
        required: true,
      },
      returnedAt: {
        type: Number,
        required: true,
      },
      salesLogId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SaleLog",
        required: true,
      }
    }]
  }, { timestamps: true });
  
  const Customer = mongoose.model("Customer", customerSchema);
  
  module.exports = { Customer};