const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectToMongo = require("./db");
const ItemRoutes = require("./routes/item");
const DropdownOption = require("./routes/dropdownOption");
const Purchase = require("./routes/purchase");
const Sell = require("./routes/sale");
const availableQuantityRoute = require("./routes/availableQuantity");
const saleslog = require("./routes/salesLog");
const expenselog = require("./routes/expenseLog");
const expensetype = require("./routes/expenseType");
const login = require("./routes/login");
const signup = require("./routes/signUp");
const role = require("./routes/role");
const path = require("path");
const verification = require("./routes/verification");
const salesReport = require("./routes/salesReport");

// phones
const phoneDeals = require("./routes/phone/phoneDeals");
const phoneExpenses = require("./routes/phone/personalExpenses");
const phoneDropdowns = require("./routes/phone/phoneDropdowns");

// family planner  ← NEW
const familyIncome = require("./routes/family/familyIncome");
const familyExpenses = require("./routes/family/familyExpense");
const familyBusiness = require("./routes/family/familyBusiness");
const familyDebts = require("./routes/family/familyDebt");
const familySavings = require("./routes/family/familySavings");
const familyDropdowns = require("./routes/family/familyDropdowns");

// car business
const carDeals = require("./routes/car/carDeals");
const carDropdowns = require("./routes/car/carDropdowns");

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
app.use("/api/purchase", Purchase);
app.use("/api/sell", Sell);
app.use("/api/availablequantity", availableQuantityRoute);
app.use("/api/saleslog", saleslog);
app.use("/api/expenselog", expenselog);
app.use("/api/expensetypes", expensetype);
app.use("/login", login);
app.use("/signup", signup);
app.use("/api/role", role);
app.use("/api/verification", verification);
app.use("/api/salesreport", salesReport);

// phones
app.use("/api/phones/deals", phoneDeals);
app.use("/api/phones/expenses", phoneExpenses);
app.use("/api/phones/dropdowns", phoneDropdowns);

// family planner  ← NEW
app.use("/api/family/income", familyIncome);
app.use("/api/family/expenses", familyExpenses);
app.use("/api/family/business", familyBusiness);
app.use("/api/family/debts", familyDebts);
app.use("/api/family/savings", familySavings);
app.use("/api/family/dropdowns", familyDropdowns);

// Car business
app.use("/api/cars/deals", carDeals);
app.use("/api/cars/dropdowns", carDropdowns);

__dirname = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "/frontend/build")));

  // handle all routes other than defined by us above
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "frontend", "build", "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("hello world!");
  });
}
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("server started on \n http://localhost:5000");
});
