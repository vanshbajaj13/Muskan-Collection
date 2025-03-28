import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Spinner from "../Loader/Spinner";

const AddExpense = () => {
  const navigate = useNavigate();
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [expense, setExpense] = useState({
    expenseType: "",
    expenseAmount: "",
    goodsPayment: false,
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [tooltip, setTooltip] = useState({ message: "", type: "" });

  // Fetch Expense Types from backend
  useEffect(() => {
    const fetchExpenseTypes = async () => {
      try {
        const response = await fetch("/api/expenseTypes", {
          headers: {
            Authorization: `Bearer ${
              JSON.parse(window.localStorage.getItem("userInfo")).token
            }`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch expense types");
        }

        const data = await response.json();
        setExpenseTypes(data.map((type) => type.name));
      } catch (error) {
        console.error("Error fetching expense types:", error);
      }
    };

    fetchExpenseTypes();
  }, []);

  // Function to check if the "Add Expense" button should be enabled
  const isAddButtonEnabled = () => {
    return expense.expenseType && !isNaN(expense.expenseAmount) && expense.expenseAmount > 0;
  };

  const handleAddExpense = async () => {
    if (!isAddButtonEnabled()) {
      setTooltip({ message: "Please enter a valid expense type and amount!", type: "warning" });
      setTimeout(() => setTooltip({ message: "", type: "" }), 3000);
      return;
    }

    setIsLoading(true);

    try {
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
        setExpense({ expenseType: "", expenseAmount: "", goodsPayment: false, description: "" });
        setTooltip({ message: "Expense added successfully!", type: "success" });
      } else if (response.status === 401) {
        window.localStorage.clear();
        navigate("/login");
      } else {
        setTooltip({ message: "Failed to add expense. Try again!", type: "error" });
      }
    } catch (error) {
      console.error("Error:", error);
      setTooltip({ message: "Something went wrong. Please try again!", type: "error" });
    } finally {
      setIsLoading(false);
      setTimeout(() => setTooltip({ message: "", type: "" }), 3000);
    }
  };

  useEffect(() => {
    if (!window.localStorage.getItem("userInfo")) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="p-4">
    {isLoading && <>
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 999 }}
          >
            <Spinner></Spinner>
              
          </div>
        </>}
      <h2 className="text-2xl font-bold mb-4">Add Expense</h2>

      {/* Expense Type */}
      <div className="mb-4">
        <label className="block mb-2">Expense Type:</label>
        <select
          value={expense.expenseType}
          onChange={(e) => setExpense({ ...expense, expenseType: e.target.value })}
          className="border p-2 w-full"
        >
          <option value="">Select Expense Type</option>
          {expenseTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Expense Amount */}
      <div className="mb-4">
        <label className="block mb-2">Expense Amount:</label>
        <input
          type="number"
          value={expense.expenseAmount}
          onChange={(e) =>
            setExpense({ ...expense, expenseAmount: Math.max(0, e.target.value) })
          }
          className="border p-2 w-full"
        />
      </div>

      {/* Goods Payment */}
      <div className="mb-4">
        <label className="block mb-2">Goods Payment:</label>
        <select
          value={expense.goodsPayment}
          onChange={(e) =>
            setExpense({ ...expense, goodsPayment: e.target.value === "true" })
          }
          className="border p-2 w-full"
        >
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="block mb-2">Description:</label>
        <textarea
          value={expense.description}
          onChange={(e) => setExpense({ ...expense, description: e.target.value })}
          className="border p-2 w-full"
          placeholder="Enter a description (optional)"
        />
      </div>

      {/* Tooltip */}
      {tooltip.message && (
        <div
          className={`mt-4 p-2 rounded text-white text-center ${
            tooltip.type === "success"
              ? "bg-green-500"
              : tooltip.type === "error"
              ? "bg-red-500"
              : "bg-yellow-500"
          }`}
        >
          {tooltip.message}
        </div>
      )}

      {/* Add Expense Button */}
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
