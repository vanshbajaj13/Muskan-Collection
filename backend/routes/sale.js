const express = require("express");
const router = express.Router();
const { Item } = require("../Models/item");
const {SaleLog} = require('../Models/salesLog');
const protect= require("../middlewares/authMiddleWare");

// Endpoint for adding a product to inventory
router.post("/",protect , async (req, res) => {
  const { brand, product, category, size,mrp, quantitySold, sellingPrice } = req.body;

  try {
    await Item.findOneAndUpdate(
      {
        brand: brand,
        product: product,
        category: category,
        size: size,
        mrp:mrp,
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
                mrp:mrp,
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
