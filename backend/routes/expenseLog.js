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
// // Get all unique expense types
// router.get("/allexpensestypes", protect, async (req, res) => {
//   try {
//     const expenseTypes = await ExpenseLog.distinct("expenseType");
//     res.json(expenseTypes);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// const updateExpenseType = async (oldType, newType) => {
//   try {
//     const matchedResults = await ExpenseLog.countDocuments({ expenseType: oldType });
//     console.log(`Found ${matchedResults} documents with expenseType: "${oldType}".`);

//     const updateResult = await ExpenseLog.updateMany(
//       { expenseType: oldType }, // Find all documents with the old expense type
//       { $set: { expenseType: newType } } // Update only the expenseType field
//     );

//     console.log(`Updated ${updateResult.modifiedCount} documents.`);
//     return {
//       success: true,
//       matchedCount: matchedResults,
//       modifiedCount: updateResult.modifiedCount,
//       message: `Matched ${matchedResults} documents, updated ${updateResult.modifiedCount} documents.`,
//     };
//   } catch (error) {
//     console.error("Error updating expense type:", error);
//     return { success: false, message: "Error updating expense type." };
//   }
// };

// // // updateExpenseType("NONA ", "NONA SALARY");
// myarray = [ "LUCNH",
//     "LUNCH",
//     "LUNCH  TEA ",
//     "LUNCH + MIRCH",
//     "LUNCH 3000+150/TOTAL. 450",]
// myarray.forEach(element => {
//   // updateExpenseType(element,"LUNCH")
// });



// Endpoint to fetch expense logs from the last 365 days
router.get("/totalexpense/1year", protect, async (req, res) => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  try {
    const expenseLogs = await ExpenseLog.find(
      {date: { $gte: oneYearAgo }},
      { expenseAmount: 1, _id: 0, date: 1,goodsPayment : 1 }
    );
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
    const expenseLogs = await ExpenseLog.find(
      {},
      { expenseAmount: 1, _id: 0, date: 1,goodsPayment : 1 }
    );
    res.json(expenseLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Post a new expense
router.post("/", protect, async (req, res) => {
  try {
    var { expenseType, expenseAmount, goodsPayment, description } = req.body;
    expenseType = expenseType.toUpperCase();
    // Create a new expense log
    const date = Date.now();
    const newExpenseLog = new ExpenseLog({
      expenseType,
      expenseAmount,
      date,
      goodsPayment,
      description
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

// get expenses by type
router.get("/type", protect, async (req, res) => {
  // console.log("start");
  
  try {
    const { expenseType } = req.query;

    if (!expenseType) {
      return res.status(400).json({ message: "Expense type is required" });
    }

    const expenses = await ExpenseLog.find({ expenseType });
    // console.log(expenses);
    
    res.json({ expenses : expenses});
  } catch (error) {
    console.error("Error fetching expenses by type:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// Get a single expense log by ID
router.get("/:id", protect, async (req, res) => {
  try {
    
    const expenseLog = await ExpenseLog.findById(req.params.id);
    if (!expenseLog) {
      return res.status(404).json({ message: "Expense not found" });
    }
    
    res.json(expenseLog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update (edit) an expense log by ID
router.patch("/:id", protect, async (req, res) => {
  try {
    const { expenseType, expenseAmount, goodsPayment, description,date } = req.body;
    // Optionally, you can transform expenseType to uppercase if needed
    const updatedExpense = await ExpenseLog.findByIdAndUpdate(
      req.params.id,
      { expenseType, expenseAmount, goodsPayment, description,date },
      { new: true }
    );
    if (!updatedExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    res.json(updatedExpense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete an expense log by ID
router.delete("/:id", protect, async (req, res) => {
  try {
    const deletedExpense = await ExpenseLog.findByIdAndDelete(req.params.id);
    if (!deletedExpense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


module.exports = router;
