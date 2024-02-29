const express = require("express");
const router = express.Router();
const { ExpenseLog } = require("../Models/expenseLog");
const protect= require("../middlewares/authMiddleWare");

// Get all expenses
router.get("/",protect ,async (req, res) => {
  try {
    const expenseLogs = await ExpenseLog.find();
    res.json(expenseLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.get("/totalexpense",protect , async (req, res) => {
  try {
    const expenseLogs = await ExpenseLog.find({},{"expenseAmount":1,_id:0});
    res.json(expenseLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Post a new expense
router.post("/",protect , async (req, res) => {
  try {
    const { expenseType, expenseAmount, expenseDescription } = req.body;
    // Create a new expense log
    const date = Date.now();
    const newExpenseLog = new ExpenseLog({
      expenseType,
      expenseAmount,
      date,
      expenseDescription,
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
