const mongoose = require("mongoose");

const RecentlyDeletedSaleLogSchema = new mongoose.Schema(
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

const RecentlyDeletedSaleLog = new mongoose.model("RecentlyDeletedSaleLog", RecentlyDeletedSaleLogSchema);
module.exports = { RecentlyDeletedSaleLog };
