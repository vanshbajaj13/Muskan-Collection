const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authMiddleWare");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

router.get("/", protect, async (req, res) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract the token from the request headers
      token = req.headers.authorization.split(" ")[1];

      // Decode token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Access the role from the decoded token
      const userRole = decoded.role;

      // Now you can use the userRole as needed
      res.json({ role: userRole });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

module.exports = router;
