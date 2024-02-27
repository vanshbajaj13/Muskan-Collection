import React, { useState } from "react";

const AddExpense = () => {
  const [expense, setExpense] = useState({
    expenseType: "",
    expenseAmount: "",
    expenseDescription: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Function to check if the "Add Expense" button should be enabled
  const isAddButtonEnabled = () => {
    return (
      !!expense.expenseType &&
      !isNaN(expense.expenseAmount) &&
      expense.expenseAmount > 0
    );
  };

  const handleAddExpense = async () => {
    try {
      // Validate required fields and positive expense amount
      if (!isAddButtonEnabled()) {
        console.error("Expense type and a valid positive amount are required");
        return;
      }

      // Set loading state to true
      setIsLoading(true);

      // Send a POST request to add the expense
      const response = await fetch("http://127.0.0.1:5000/api/expenseLog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expense),
      });

      if (response.ok) {
        console.log("Expense added successfully");
        // Clear the expense fields after successful addition
        setExpense({
          expenseType: "",
          expenseAmount: "",
          expenseDescription: "",
        });
        // Show the tooltip
        setShowTooltip(true);

        // Hide the tooltip after a certain duration
        setTimeout(() => {
          setShowTooltip(false);
        }, 3000);
      } else {
        console.error("Failed to add expense");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      // Set loading state to false after the request completes
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Add Expense</h2>
      <div className="mb-4">
        <label className="block mb-2">Expense Type:</label>
        <input
          type="text"
          value={expense.expenseType}
          onChange={(e) =>
            setExpense({ ...expense, expenseType: e.target.value })
          }
          className="border p-2 w-full"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2">Expense Amount:</label>
        <input
          type="number"
          value={expense.expenseAmount}
          onChange={(e) =>
            setExpense({
              ...expense,
              expenseAmount: Math.max(0, e.target.value),
            })
          }
          className="border p-2 w-full"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2">Expense Description:</label>
        <textarea
          value={expense.expenseDescription}
          onChange={(e) =>
            setExpense({ ...expense, expenseDescription: e.target.value })
          }
          className="border p-2 w-full"
        ></textarea>
      </div>

      {showTooltip && (
        <div className="text-green-500 mt-4">Expense added successfully!</div>
      )}
      <button
        onClick={handleAddExpense}
        className={`bg-blue-500 text-white py-2 px-4 rounded focus:outline-none hover:bg-blue-700 ${
          !isAddButtonEnabled() && "opacity-50 cursor-not-allowed"
        }`}
        disabled={!isAddButtonEnabled()}
      >
        {isLoading ? "Adding..." : "Add Expense"}
      </button>
    </div>
  );
};

export default AddExpense;
