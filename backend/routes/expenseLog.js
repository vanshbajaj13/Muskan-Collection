const express = require("express");
const router = express.Router();
const { ExpenseLog } = require("../Models/expenseLog");
const protect = require("../middlewares/authMiddleWare");

// Get all expenses
router.get("/", protect, async (req, res) => {
  try {
    const expenseLogs = await ExpenseLog.find().sort({ date: 1 });
    res.json(expenseLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get paginated expenses
router.get("/paginate", protect, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const totalExpenses = await ExpenseLog.countDocuments();
    const totalPages = Math.ceil(totalExpenses / limit);

    const expenseLogs = await ExpenseLog.find()
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      expenses: expenseLogs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/totalexpense", protect, async (req, res) => {
  try {
    const expenseLogs = await ExpenseLog.find({}, { expenseAmount: 1, _id: 0,date: 1 });
    res.json(expenseLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Post a new expense
router.post("/", protect, async (req, res) => {
  try {
    var { expenseType, expenseAmount } = req.body;
    expenseType = expenseType.toUpperCase();
    // Create a new expense log
    const date = Date.now();
    const newExpenseLog = new ExpenseLog({
      expenseType,
      expenseAmount,
      date,
    });

    // Save the expense log to the database
    await ExpenseLog.create(newExpenseLog)
      .then((doc) => {
        res.status(201).json(newExpenseLog);
      })
      .catch((err) => {
        console.log(err);
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
