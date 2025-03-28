import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Spinner from "../Loader/Spinner";

const EditExpense = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // State for expense types list from backend
  const [expenseTypes, setExpenseTypes] = useState([]);

  // Initial state matching the ExpenseLog model
  const [originalExpenseDetails, setOriginalExpenseDetails] = useState({
    expenseType: "",
    expenseAmount: "",
    description: "",
    date: "", // will store the original timestamp as number but convert for display
    goodsPayment: false,
  });

  const [expenseDetails, setExpenseDetails] = useState({
    ...originalExpenseDetails,
  });

  const [isFormValid, setIsFormValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [showUpdateTooltip, setShowUpdateTooltip] = useState(false);
  const [showDeleteTooltip, setShowDeleteTooltip] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [processInProgress, setProcessInProgress] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateConfirmText, setUpdateConfirmText] = useState("");

  useEffect(() => {
    if (!window.localStorage.getItem("userInfo")) {
      navigate("/login");
    }
  }, [navigate]);

  // Fetch expense types from backend
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
        if (response.ok) {
          const data = await response.json();
          setExpenseTypes(data.map((type) => type.name));
        } else {
          console.error("Failed to fetch expense types");
        }
      } catch (error) {
        console.error("Error fetching expense types:", error);
      }
    };

    fetchExpenseTypes();
  }, []);

  // Fetch expense details from the server and convert the date field
  const fetchExpenseDetails = async () => {
    try {
      setFetching(true);
      const response = await fetch(`/api/expenselog/${id}`, {
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch expense details");
      }
      const expense = await response.json();
      // Convert the date (stored as number) to YYYY-MM-DD for the date input
      const dateString = new Date(expense.date).toISOString().substring(0, 10);
      expense.date = dateString;
      setOriginalExpenseDetails(expense);
      setExpenseDetails(expense);
    } catch (error) {
      console.error("Error fetching expense details:", error);
    } finally {
      setFetching(false);
    }
  };

  // Validate form: ensure at least one field changed and required fields are filled
  const checkFormValidity = () => {
    const isAnyFieldChanged = Object.keys(originalExpenseDetails).some(
      (key) => originalExpenseDetails[key] !== expenseDetails[key]
    );
    const valid =
      isAnyFieldChanged &&
      expenseDetails.expenseType.trim() !== "" &&
      Number(expenseDetails.expenseAmount) > 0 &&
      expenseDetails.date.trim() !== "";
    setIsFormValid(valid);
  };

  useEffect(() => {
    checkFormValidity();
    // eslint-disable-next-line
  }, [expenseDetails]);

  useEffect(() => {
    fetchExpenseDetails();
    // eslint-disable-next-line
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // For expenseAmount, ensure it's a positive number
    if (name === "expenseAmount") {
      if (parseFloat(value) < 0) return;
      setExpenseDetails((prev) => ({
        ...prev,
        [name]: value,
      }));
      return;
    }

    // For goodsPayment, convert string to boolean
    if (name === "goodsPayment") {
      setExpenseDetails((prev) => ({
        ...prev,
        [name]: value === "true",
      }));
      return;
    }

    setExpenseDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleExpenseUpdate = async () => {
    setIsLoading(true);
    setProcessInProgress(true);

    try {
      // Determine which fields have changed
      const changedFields = Object.entries(expenseDetails).reduce(
        (acc, [key, value]) => {
          if (originalExpenseDetails[key] !== value) {
            acc[key] = value;
          }
          return acc;
        },
        {}
      );

      // Convert expenseAmount to number
      if (changedFields.expenseAmount) {
        changedFields.expenseAmount = Number(changedFields.expenseAmount);
      }
      // Convert date string back to timestamp
      if (changedFields.date) {
        changedFields.date = new Date(changedFields.date).getTime();
      }

      const response = await fetch(`/api/expenselog/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changedFields),
      });

      if (response.ok) {
        navigate("/expense-history");
      } else {
        console.error("Failed to update expense");
        setShowUpdateTooltip(true);
        setTimeout(() => {
          setShowUpdateTooltip(false);
        }, 3000);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
      setProcessInProgress(false);
    }
  };

  const handleOpenDeleteModal = () => {
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setConfirmText("");
    setIsDeleteModalOpen(false);
  };

  const handleUserInputChange = (e) => {
    setConfirmText(e.target.value.toUpperCase());
  };

  const handleExpenseDelete = async () => {
    if (confirmText === "CONFIRM") {
      try {
        setProcessInProgress(true);
        const response = await fetch(`/api/expenselog/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${
              JSON.parse(window.localStorage.getItem("userInfo")).token
            }`,
          },
        });
        if (response.ok) {
          navigate("/expense-history");
        } else {
          console.error("Failed to delete expense");
          setIsDeleteModalOpen(false);
          setShowDeleteTooltip(true);
          setTimeout(() => {
            setShowDeleteTooltip(false);
          }, 3000);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setProcessInProgress(false);
      }
    }
  };

  // Handler to open the update confirmation modal
  const handleOpenUpdateModal = () => {
    setIsUpdateModalOpen(true);
  };

  // Handler to close the update confirmation modal
  const handleCloseUpdateModal = () => {
    setUpdateConfirmText("");
    setIsUpdateModalOpen(false);
  };

  // Handler for update confirmation input change
  const handleUpdateUserInputChange = (e) => {
    setUpdateConfirmText(e.target.value.toUpperCase());
  };

  return (
    <div className="bg-white p-6 shadow-md rounded-md">
      {processInProgress && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <Spinner />
        </div>
      )}

      <h2 className="text-2xl font-semibold mb-6">Edit Expense</h2>

      {fetching ? (
        <h1 className="text-green-500 text-center text-2xl font-semibold mb-6">
          Loading...
        </h1>
      ) : (
        <>
          {/* Expense Type as a dropdown */}
          <div className="mb-4">
            <label className="block mb-2">Expense Type:</label>
            <select
              name="expenseType"
              value={expenseDetails.expenseType}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Select Expense Type</option>
              {expenseTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <input
            type="number"
            name="expenseAmount"
            placeholder="Amount"
            value={expenseDetails.expenseAmount}
            onChange={handleInputChange}
            className="w-full mt-4 p-2 border rounded-md"
          />

          <input
            type="date"
            name="date"
            value={expenseDetails.date}
            onChange={handleInputChange}
            className="w-full mt-4 p-2 border rounded-md"
          />

          <textarea
            name="description"
            placeholder="Description"
            value={expenseDetails.description}
            onChange={handleInputChange}
            className="w-full mt-4 p-2 border rounded-md"
          />

          {/* Goods Payment Section */}
          <div className="mt-4">
            <label className="block mb-2">Goods Payment:</label>
            <select
              name="goodsPayment"
              value={expenseDetails.goodsPayment.toString()}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md"
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
        </>
      )}

      {showUpdateTooltip && (
        <div className="text-red-500 text-center text-sm mt-2">
          Error while updating, try again.
        </div>
      )}

      <button
        onClick={handleOpenUpdateModal}
        disabled={!isFormValid || isLoading}
        className={`w-full mt-6 py-2 px-4 rounded focus:outline-none ${
          isFormValid
            ? "bg-indigo-500 text-white"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
      >
        {isLoading ? "Updating..." : "Update"}
      </button>

      {showDeleteTooltip && (
        <div className="text-red-500 text-center text-sm mt-2">
          Error while deleting, try again.
        </div>
      )}

      <button
        onClick={handleOpenDeleteModal}
        className="w-full mt-6 py-2 px-4 rounded focus:outline-none bg-red-500 text-white"
      >
        Delete This Expense
      </button>

      {isUpdateModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-md">
            <p className="mb-4">Type 'CONFIRM' to update this expense:</p>
            <div className="flex flex-col justify-center">
              <input
                type="text"
                value={updateConfirmText}
                onChange={handleUpdateUserInputChange}
                className="border p-2 rounded-md text-center"
              />
              <div className="mt-4 flex justify-between">
                <button
                  onClick={handleCloseUpdateModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md mr-2"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleExpenseUpdate();
                    setIsUpdateModalOpen(false);
                  }}
                  disabled={updateConfirmText !== "CONFIRM"}
                  className={`px-4 py-2 rounded-md ${
                    updateConfirmText !== "CONFIRM"
                      ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                      : "bg-indigo-500 text-white"
                  }`}
                >
                  Confirm Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-md">
            <p className="mb-4">Type 'CONFIRM' to delete this expense:</p>
            <div className="flex flex-col justify-center">
              <input
                type="text"
                value={confirmText}
                onChange={handleUserInputChange}
                className="border p-2 rounded-md text-center"
              />
              {processInProgress && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <Spinner />
                </div>
              )}
              <div className="mt-4 flex justify-between">
                <button
                  onClick={handleCloseDeleteModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md mr-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExpenseDelete}
                  disabled={confirmText !== "CONFIRM"}
                  className={`px-4 py-2 rounded-md ${
                    confirmText !== "CONFIRM"
                      ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                      : "bg-red-500 text-white"
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditExpense;
