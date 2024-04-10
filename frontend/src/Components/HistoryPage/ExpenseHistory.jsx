import React, { useState, useEffect } from "react";

const ExpenseHistory = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [groupedExpenses, setGroupedExpenses] = useState({});

  // Use useEffect to preprocess the data whenever it changes
  useEffect(() => {
    const groupExpensesByDate = () => {
      const grouped = {};
      expenses.forEach((expense) => {
        const date = new Date(expense.date).toLocaleDateString();
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(expense);
      });
      return grouped;
    };
    setGroupedExpenses(groupExpensesByDate());
  }, [expenses]);

  useEffect(() => {
    fetchExpenses();
  }, [page]);

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

  const loadMoreExpenses = () => {
    setPage((prevPage) => prevPage + 1);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Expense History</h1>
      <div>
        <h2 className="text-xl font-semibold mb-2">All Expenses</h2>
        {Object.keys(groupedExpenses)
          .sort((a, b) => new Date(b) - new Date(a))
          .map((date) => (
            <React.Fragment key={date}>
              <div key={date}>
                <div className="bg-red-100 border border-black text-black  rounded relative flex justify-between items-center cursor-pointer font-semibold pr-2 pl-2">
                  <h3 className="text-lg font-semibold">{date}</h3>

                  <p className="font-semibold">
                    Total Expense:{" "}
                    {groupedExpenses[date].reduce(
                      (total, expense) => total + expense.expenseAmount,
                      0
                    )}
                  </p>
                </div>
                {groupedExpenses[date].map((expense) => (
                  <div
                    key={expense._id}
                    className="flex justify-between items-center cursor-pointer bg-gray-100 border border-black text-black px-4 py-3 rounded relative"
                  >
                    <span className="font-semibold">{expense.expenseType}</span>
                    <span className="text-red-500">
                      {expense.expenseAmount}
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
