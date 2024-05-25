const express = require("express");
const router = express.Router();
const { Item } = require("../Models/item");
const { SaleLog } = require("../Models/salesLog");
const protect = require("../middlewares/authMiddleWare");
const { Customer } = require("../Models/customer");

// Endpoint for adding a product to inventory
router.post("/", protect, async (req, res) => {
  const { code, quantitySold, sellingPrice, customerPhoneNo, customerName } = req.body;

  try {
    const item = await Item.findOneAndUpdate(
      { code: code },
      { $inc: { quantitySold: quantitySold } }
    );

    if (!item) {
      return res.status(404).json({ message: "No product found" });
    }

    const newSaleLog = new SaleLog({
      code: item.code,
      brand: item.brand,
      product: item.product,
      category: item.category,
      size: item.size,
      mrp: item.mrp,
      sellingPrice: sellingPrice,
      customerPhoneNo: customerPhoneNo,
      soldAt: Date.now(),
    });

    const saleLog = await newSaleLog.save();

    if (customerPhoneNo) {
      let customer = await Customer.findOne({ phoneNo: customerPhoneNo });

      if (!customer) {
        customer = new Customer({
          phoneNo: customerPhoneNo,
          name: customerName,
          purchaseList: [],
        });
      }

      customer.purchaseList.push({
        purchasedAt: Date.now(),
        salesLogId: saleLog._id,
      });

      await customer.save();
    }

    res.status(200).json({
      message: "Product sold from inventory successfully and log also saved",
    });

  } catch (error) {
    console.error("Error selling product from inventory:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Endpoint for customer purchases
router.post("/customerpurchase", protect, async (req, res) => {
  const { phoneNo, name, purchaseList } = req.body;

  try {
    let customer = await Customer.findOne({ phoneNo: phoneNo });

    if (!customer) {
      customer = new Customer({
        phoneNo: phoneNo,
        name: name,
        purchaseList: [],
      });
    }

    const saleLogPromises = purchaseList.map(async (purchase) => {
      const { code, quantitySold, sellingPrice } = purchase;
      const item = await Item.findOneAndUpdate(
        { code: code },
        { $inc: { quantitySold: quantitySold } }
      );

      if (!item) {
        throw new Error(`Item with code ${code} not found`);
      }
      var dt = Date.now()
      const newSaleLog = new SaleLog({
        code: item.code,
        brand: item.brand,
        product: item.product,
        category: item.category,
        size: item.size,
        mrp: item.mrp,
        sellingPrice: sellingPrice,
        customerPhoneNo: phoneNo,
        soldAt: dt,
      });

      const saleLog = await newSaleLog.save();
      customer.purchaseList.push({
        purchasedAt: dt,
        salesLogId: saleLog._id,
      });
      return saleLog;
    });

    await Promise.all(saleLogPromises);
    await customer.save();

    res.status(200).json({
      message: "Customer purchase recorded successfully",
      customer: customer,
    });
  } catch (error) {
    console.error("Error recording customer purchase:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
