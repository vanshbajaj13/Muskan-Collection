const express = require("express");
const router = express.Router();
const Product = require("../Models/product");
const Size = require("../Models/size");
const Category = require("../Models/category");

// GET all brands
router.get("/brands", async (req, res) => {
  try {
    const products = await Product.find();
    const brands = products.map((product) => product.brand);
    res.json([...new Set(brands)]); // Use Set to get unique brand names
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST a new brand
router.post("/brands", async (req, res) => {
  const { brand } = req.body;

  try {
    const newBrand = new Product({ brand: brand, products: [] });
    await Product.create(newBrand)
      .then((doc) => {
        res.json(doc);
      })
      .catch((err) => {
        console.log(err);
        return res.send("Brand already exist");
      });
  } catch (error) {
    console.error("Error adding brand:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET all products
router.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST a new product
router.put("/products", async (req, res) => {
  const { brand, products } = req.body;
  try {
    options = { upsert: true, new: true };
    // upsert - create new if not found
    // new - by default findoneAndUpdate return doc before update if new is true it return doc after update
    await Product.findOneAndUpdate(
      { brand: brand },
      { $addToSet: { products: products } },
      options
    )
      .then(() => {
        res.sendStatus(200);
      })
      .catch((error) => {
        console.log(error);
      });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET all sizes
router.get("/sizes", async (req, res) => {
  try {
    await Size.find()
      .then((doc) => {
        res.json(doc);
      })
      .catch((err) => {
        console.log(err);
      });
  } catch (error) {
    console.error("Error fetching sizes:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST a new size
router.post("/sizes", async (req, res) => {
  const { size } = req.body;
  try {
    await Size.updateOne({ $addToSet: { size: size } })
      .then(() => {
        res.send("Size added to list");
      })
      .catch((err) => {
        if (err.code === 11000) {
          res.send("size already exist in list");
        }
        console.log(err);
      });
  } catch (error) {
    console.error("Error adding size:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET all categories
router.get("/categories", async (req, res) => {
  try {
    await Category.find()
      .then((doc) => {
        res.json(doc);
      })
      .catch((err) => {
        console.log(err);
      });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST a new category
router.post("/categories", async (req, res) => {
  const { category } = req.body;
  try {
    await Category.updateOne({ $addToSet: { category: category } })
      .then((result) => {
        if (result.nModified === 0) {
          // If no documents were modified, it means the category already exists
          return res.send("Category already exists in the list");
        }

        res.send("Category added to the list");
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error" });
      });
  } catch (error) {
    console.error("Error adding category:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET dropdown options
router.get("/dropdownoptions", async (req, res) => {
  try {
    const products = await Product.find({});
    const categories = await Category.find({});
    const sizes = await Size.find({});

    const dropdownOptions = {
      products: products,
      categories: categories,
      sizes: sizes
    };

    res.json(dropdownOptions);
  } catch (error) {
    console.error("Error fetching dropdown options:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
