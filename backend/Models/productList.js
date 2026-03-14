const mongoose = require("mongoose");

const productListSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

const ProductList = mongoose.model("ProductList", productListSchema);
module.exports = { ProductList };