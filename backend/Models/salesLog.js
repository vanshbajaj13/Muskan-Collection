const mongoose = require("mongoose");

const saleLogSchema = new mongoose.Schema(
  { 
    code:{
      type: String,
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
    mrp: {
      type: Number,
      required: true,
    },
    sellingPrice:{
        type : Number
    },
    soldAt : {
        type : Number
    },
    customerPhoneNo : {
      type : Number
    }
  },
  { timestamps: true }
);

const SaleLog = new mongoose.model("SaleLog", saleLogSchema);
module.exports = { SaleLog };
