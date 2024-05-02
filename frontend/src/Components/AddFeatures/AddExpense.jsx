import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AddExpense = () => {
  const navigate = useNavigate();
  const [expense, setExpense] = useState({
    expenseType: "",
    expenseAmount: "",
    goodsPayment: false, // Default value for goodsPayment
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Function to check if the "Add Expense" button should be enabled
  const isAddButtonEnabled = () => {
    return (
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
      const response = await fetch("/api/expenseLog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
        body: JSON.stringify(expense),
      });

      if (response.ok) {
        console.log("Expense added successfully");
        // Clear the expense fields after successful addition
        setExpense({
          expenseType: "",
          expenseAmount: "",
          goodsPayment: "No", // Reset goodsPayment to default value after success
        });
        // Show the tooltip
        setShowTooltip(true);

        // Hide the tooltip after a certain duration
        setTimeout(() => {
          setShowTooltip(false);
        }, 3000);
      } else if (response.status === 401) {
        window.localStorage.clear();
        navigate("/login");
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

  // auto navigate to login
  useEffect(() => {
    function isUserLoggedIn() {
      if (!window.localStorage.getItem("userInfo")) {
        navigate("/login");
      }
    }
    isUserLoggedIn();
  }, [navigate]);

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
        <label className="block mb-2">Goods Payment:</label>
        <select
          value={expense.goodsPayment}
          onChange={(e) =>
            setExpense({ ...expense, goodsPayment: e.target.value })
          }
          className="border p-2 w-full"
        >
          <option value={false}>No</option>
          <option value={true}>Yes</option>
        </select>
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
