const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectToMongo = require("./db");
const ItemRoutes = require("./routes/item");
const DropdownOption = require("./routes/dropdownOption");
const Purchase = require('./routes/purchase');
const Sell = require('./routes/sale');
const availableQuantityRoute = require("./routes/availableQuantity");

dotenv.config();

const app = express();
app.use(express.json());

// Enable CORS for all routes
app.use(cors());
// cors is used for cross-origin resource sharing
// as our backend is on port 5000 and frontend on 3000 to make request from frontend to backend we allow cors in backend for all routes with this

connectToMongo();

app.use("/api/item", ItemRoutes);
app.use("/api/dropdownoption", DropdownOption);
app.use("/api/purchase",Purchase );
app.use("/api/sell",Sell);
app.use("/api/availablequantity", availableQuantityRoute);

app.get("/", (req, res) => {
  res.send("hello world!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("server started on \n http://localhost:5000");
});
