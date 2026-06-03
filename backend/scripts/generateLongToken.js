// backend/generateLongToken.js  — run once: node generateLongToken.js
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});
const jwt = require("jsonwebtoken");
const token = jwt.sign({ id: "vansh", role: "vansh" }, process.env.JWT_SECRET, { expiresIn: "365d" });
console.log(token);