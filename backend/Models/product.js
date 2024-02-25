const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  brand: {
    type: String,
    required: true,
    unique: true,
  },
  products: [
    {
      type: String,
      required: true,
    },
  ],
});


const Product = mongoose.model("Product", productSchema);

module.exports = Product;
