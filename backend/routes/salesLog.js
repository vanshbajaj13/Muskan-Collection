const express = require("express");
const router = express.Router();
const { SaleLog } = require("../Models/salesLog");

router.get("/", async (req, res) => {
  await SaleLog.find().then((doc)=>{
      res.json(doc);
  }).catch((err)=>{
    console.log(err);
  });
  // console.log(items);
});

module.exports = router;