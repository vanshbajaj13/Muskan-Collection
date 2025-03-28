import React, { useState, useEffect } from "react";
import Spinner from "../Loader/Spinner";
import { useNavigate } from "react-router-dom";

const ExpenseHistory = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [groupedExpenses, setGroupedExpenses] = useState({});
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [selectedExpenseType, setSelectedExpenseType] = useState("");

  // For filtered expenses
  const [rawFilteredExpenses, setRawFilteredExpenses] = useState([]);
  const [groupedFilteredExpenses, setGroupedFilteredExpenses] = useState({});
  const [loadingFiltered, setLoadingFiltered] = useState(false);

  // Group all expenses by date (daily grouping)
  useEffect(() => {
    const groupExpensesByDate = (data) => {
      const grouped = {};
      data.forEach((expense) => {
        const date = new Date(expense.date).toLocaleDateString();
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(expense);
      });
      return grouped;
    };
    setGroupedExpenses(groupExpensesByDate(expenses));
  }, [expenses]);

  // Group filtered expenses by month (monthly grouping)
  useEffect(() => {
    const groupExpensesByMonth = (data) => {
      const grouped = {};
      data.forEach((expense) => {
        const dateObj = new Date(expense.date);
        const month = dateObj.toLocaleString("default", { month: "long" });
        const year = dateObj.getFullYear();
        const monthYear = `${month} ${year}`;
        if (!grouped[monthYear]) {
          grouped[monthYear] = [];
        }
        grouped[monthYear].push(expense);
      });
      return grouped;
    };
    setGroupedFilteredExpenses(groupExpensesByMonth(rawFilteredExpenses));
  }, [rawFilteredExpenses]);

  // Fetch all expenses with pagination
  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line
  }, [page]);

  // Fetch expense types
  useEffect(() => {
    fetchExpenseTypes();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/expenselog/paginate?page=${page}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${
              JSON.parse(window.localStorage.getItem("userInfo")).token
            }`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (page === 1) {
          setExpenses(data.expenses);
        } else {
          setExpenses((prevExpenses) => [...prevExpenses, ...data.expenses]);
        }
      } else {
        console.error("Failed to fetch expenses");
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all unique expense types
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

  // Fetch expenses based on selected type
  const fetchFilteredExpenses = async (type) => {
    setLoadingFiltered(true);
    try {
      const response = await fetch(`/api/expenselog/type?expenseType=${type}`, {
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRawFilteredExpenses(data.expenses);
      } else {
        console.error("Failed to fetch expenses for type:", type);
      }
    } catch (error) {
      console.error("Error fetching filtered expenses:", error);
    } finally {
      setLoadingFiltered(false);
    }
  };

  const loadMoreExpenses = () => {
    setPage((prevPage) => prevPage + 1);
  };

  const handleSelectedExpenseTypeChange = (e) => {
    const type = e.target.value;
    setSelectedExpenseType(type);
    if (type) {
      fetchFilteredExpenses(type);
    } else {
      // Clear filtered expenses if "All Expense Types" is selected
      setRawFilteredExpenses([]);
      setGroupedFilteredExpenses({});
    }
  };

  const handleEdit = (id) => {
    navigate(`/edit-expense/${id}`); // Navigate to the EditExpense page with the expense id
  };

  return (
    <div>
      {loadingFiltered && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <Spinner />
        </div>
      )}
      <h1 className="text-2xl font-semibold mb-4">Expense History</h1>

      {/* Expense Type Filter */}
      <div className="mb-4">
        <label className="block mb-2 font-semibold">
          Filter by Expense Type:
        </label>
        <select
          value={selectedExpenseType}
          onChange={handleSelectedExpenseTypeChange}
          className="border p-2 w-full"
        >
          <option value="">All Expense Types</option>
          {expenseTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Filtered Expenses Section (Grouped Monthly) */}
      {selectedExpenseType && (
        <div>
          <h2 className="text-xl font-semibold mb-2">
          Total Expense for {selectedExpenseType}:{" "}
          {rawFilteredExpenses.reduce((sum, expense) => sum + expense.expenseAmount, 0)}
          </h2>
          {Object.keys(groupedFilteredExpenses)
            .sort((a, b) => new Date(b) - new Date(a))
            .map((monthYear) => (
              <React.Fragment key={monthYear}>
                <div>
                  <div className="bg-blue-100 border border-black text-black rounded flex justify-between items-center p-2 font-semibold">
                    <h3 className="text-lg font-semibold">{monthYear}</h3>
                    <p className="font-semibold">
                      Total Expense:{" "}
                      {Array.isArray(groupedFilteredExpenses[monthYear])
                        ? groupedFilteredExpenses[monthYear].reduce(
                            (total, expense) => total + expense.expenseAmount,
                            0
                          )
                        : 0}
                    </p>
                  </div>
                  {Array.isArray(groupedFilteredExpenses[monthYear]) &&
                    groupedFilteredExpenses[monthYear].map((expense) => (
                      <div
                        key={expense._id}
                        className={`flex justify-between items-center px-4 py-3 rounded border border-black ${
                          expense.goodsPayment ? "bg-purple-100" : "bg-gray-100"
                        }`}
                      >
                        <span className="font-semibold">
                          {expense.expenseType}{" "}
                          {new Date(expense.date).toLocaleDateString()}
                        </span>
                        <span className="text-red-500">
                          {expense.expenseAmount}
                          <button
                            onClick={() => handleEdit(expense._id)}
                            className="ml-5 bg-blue-500 hover:bg-blue-700 text-white  px-1 rounded "
                          >
                            Edit
                          </button>
                        </span>
                      </div>
                    ))}
                </div>
              </React.Fragment>
            ))}
          {loadingFiltered && (
            <p className="text-center">Loading filtered expenses...</p>
          )}
        </div>
      )}

      {/* All Expenses Section (Grouped Daily) */}
      <div>
        <h2 className="text-xl font-semibold mb-2 text-center mt-10">All Expenses</h2>
        {Object.keys(groupedExpenses)
          .sort((a, b) => new Date(b) - new Date(a))
          .map((date) => (
            <React.Fragment key={date}>
              <div>
                <div className="bg-red-100 border border-black text-black rounded flex justify-between items-center p-2 font-semibold">
                  <h3 className="text-lg font-semibold">{date}</h3>
                  <p className="font-semibold">
                    Total Expense:{" "}
                    {Array.isArray(groupedExpenses[date])
                      ? groupedExpenses[date].reduce(
                          (total, expense) => total + expense.expenseAmount,
                          0
                        )
                      : 0}
                  </p>
                </div>
                {Array.isArray(groupedExpenses[date]) &&
                  groupedExpenses[date].map((expense) => (
                    <div
                      key={expense._id}
                      className={`flex justify-between items-center px-4 py-3 rounded border border-black ${
                        expense.goodsPayment ? "bg-purple-100" : "bg-gray-100"
                      }`}
                    >
                      <span className="font-semibold">
                        {expense.expenseType}
                      </span>
                      <span className="text-red-500">
                        {expense.expenseAmount}
                        <button
                          onClick={() => handleEdit(expense._id)}
                          className="ml-5 bg-blue-500 hover:bg-blue-700 text-white  px-1 rounded "
                        >
                          Edit
                        </button>
                      </span>
                    </div>
                  ))}
              </div>
            </React.Fragment>
          ))}
        {loading && <p className="text-center">Loading expenses...</p>}
        {expenses.length > 0 && (
          <div className="flex justify-center">
            <button
              onClick={loadMoreExpenses}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
            >
              {loading ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseHistory;
