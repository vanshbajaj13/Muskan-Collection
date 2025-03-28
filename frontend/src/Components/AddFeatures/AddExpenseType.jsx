import React, { useEffect, useState } from "react";
import Spinner from "../Loader/Spinner";
import { useNavigate } from "react-router-dom";

const AddExpenseType = () => {
  const naviagate = useNavigate();
  const [expenseType, setExpenseType] = useState("");
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [toolTipMsg, setToolTipMsg] = useState("");
  const [tooltipColor, setTooltipColor] = useState("text-green-500"); // Default success color

  // auto navigate to login
    useEffect(() => {
      function isUserLogedIn() {
        if (!window.localStorage.getItem("userInfo")) {
          naviagate("/login");
        }
      }
      isUserLogedIn();
    }, [naviagate]);
  // Fetch existing expense types from the backend
  useEffect(() => {
    const fetchExpenseTypes = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/expenseTypes", {
          headers: {
            Authorization: `Bearer ${
              JSON.parse(window.localStorage.getItem("userInfo")).token
            }`,
          },
        });
        const data = await response.json();
        setExpenseTypes([...new Set(data.map((type) => type.name))]); // Ensure uniqueness
      } catch (error) {
        console.error("Error fetching expense types:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenseTypes();
  }, []);

  // Function to show tooltip with proper color
  const showTooltipMessage = (message, isSuccess) => {
    setToolTipMsg(message);
    setTooltipColor(isSuccess ? "text-green-500" : "text-red-500"); // Green for success, red for error
    setShowTooltip(true);

    setTimeout(() => {
      setShowTooltip(false);
      setToolTipMsg("");
    }, 3000);
  };

  // Function to add a new expense type
  const handleAddExpenseType = async () => {
    if (!expenseType.trim()) return;

    // Prevent duplicate expense types
    if (expenseTypes.includes(expenseType)) {
      showTooltipMessage("Expense Type already exists!", false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/expenseTypes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
        body: JSON.stringify({ name: expenseType }),
      });

      if (response.ok) {
        setExpenseTypes([...expenseTypes, expenseType]); // Update state dynamically
        setExpenseType("");
        showTooltipMessage("Expense Type added successfully!", true);
      } else {
        const error = await response.json();
        showTooltipMessage(error.error || "Failed to add expense type", false);
      }
    } catch (error) {
      console.error("Error:", error);
      showTooltipMessage("Something went wrong!", false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      {isLoading && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
        >
          <Spinner />
        </div>
      )}

      <h2 className="text-2xl font-bold mb-4">Manage Expense Types</h2>

      {/* Show available expense types */}
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-2">Available Expense Types:</h3>
        <ul className="space-y-2">
          {expenseTypes.length > 0 ? (
            expenseTypes.map((type, index) => (
              <li key={index} className="border-b pb-1">{type}</li>
            ))
          ) : (
            <p className="text-gray-500">No expense types added yet.</p>
          )}
        </ul>
      </div>

      {/* Add new expense type */}
      <div className="mb-4">
        <label className="block mb-2 text-lg font-semibold">
          New Expense Type:
        </label>
        <input
          type="text"
          value={expenseType}
          onChange={(e) => setExpenseType(e.target.value.toUpperCase())}
          className="border p-2 w-full rounded"
          placeholder="Enter expense type"
        />
      </div>

      {/* Tooltip for success/error messages */}
      {showTooltip && (
        <div className={`${tooltipColor} mt-2 font-semibold`}>{toolTipMsg}</div>
      )}

      {/* Button to add expense type (enabled only if input is not empty) */}
      <button
        onClick={handleAddExpenseType}
        className={`py-2 px-4 rounded text-white ${
          expenseType.trim()
            ? "bg-green-500 hover:bg-green-700"
            : "bg-gray-400 cursor-not-allowed"
        }`}
        disabled={!expenseType.trim()}
      >
        Add Expense Type
      </button>
    </div>
  );
};

export default AddExpenseType;
