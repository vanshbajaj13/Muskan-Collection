const express = require("express");
const router = express.Router();
const { Item } = require("../Models/item");
const {SaleLog} = require('../Models/salesLog');

// Endpoint for adding a product to inventory
router.post("/", async (req, res) => {
  const { brand, product, category, size, quantitySold, sellingPrice } = req.body;

  try {
    // Create a new item and save it to the database
    const newItem = new Item({
      brand: brand,
      product: product,
      category: category,
      size: size,
      quantitySold: quantitySold,
      sellingPrice: sellingPrice,
    });
    await Item.findOneAndUpdate(
      {
        brand: brand,
        product: product,
        category: category,
        size: size,
      },
      { $inc: { quantitySold: quantitySold }}
    )
      .then((result) => {
        if (result) {
            const newSaleLog = new SaleLog({
                brand: brand,
                product:product,
                category:category,
                size:size,
                mrp:result.mrp,
                sellingPrice:sellingPrice,
                soldAt:Date.now()
            });
            SaleLog.create(newSaleLog).then((doc)=>{
                if(doc){
                    res
                      .status(200)
                      .json({ message: "Product sold from inventory successfully and log also saved" });
                }
            }).catch((err)=>{
                console.log(err);
            })
        } else {
          res.send("No product found");
        }
      })
      .catch((error) => {
        console.log(error);
      });
  } catch (error) {
    console.error("Error selling product from inventory:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
