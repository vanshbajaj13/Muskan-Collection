const express = require("express");
const router = express.Router();
const { Item } = require("../Models/item");

router.get("/", async (req, res) => {
  const items = await Item.find();
  // console.log(items);
  res.json(items);
});

module.exports = router;
