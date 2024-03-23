import React, { useState, useEffect } from "react";
import { Line, Bar } from "react-chartjs-2";
import "chart.js/auto";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const naviagate = useNavigate();
  const [salesData, setSalesData] = useState();
  const [expensesData, setExpensesData] = useState();
  const [selectedDays, setSelectedDays] = useState(30);
  const [dailySalesSum, setDailySalesSum] = useState({});
  const [totalSales, setTotalSales] = useState(0);
  const [productsSold, setProductsSold] = useState({});
  const [profitData, setProfitData] = useState({});
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);

  // auto navigate to login
  useEffect(() => {
    function isUserLogedIn() {
      if (!window.localStorage.getItem("userInfo")) {
        naviagate("/login");
      }
    }
    isUserLogedIn();
  }, [naviagate]);

  // Helper function to convert irregular profit data to regular data
  const convertToRegularData = (irregularData) => {
    const dates = Object.keys(irregularData);
    const brands = Array.from(
      new Set(dates.flatMap((date) => Object.keys(irregularData[date] || {})))
    );

    const regularData = dates.reduce((acc, date) => {
      acc[date] = brands.reduce((brandAcc, brand) => {
        brandAcc[brand] = irregularData[date]?.[brand] || 0;
        return brandAcc;
      }, {});
      return acc;
    }, {});

    return regularData;
  };

  // calculate things according to selectedDays
  const reCalculate = () => {
    // Calculate daily sales sum for the selected days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - selectedDays);

    const lastSelectedDaysSales = salesData?.filter(
      (sale) => new Date(sale.soldAt) > startDate
    );
    const lastSelectedDaysExpense = expensesData?.filter(
      (expense) => new Date(expense.date) > startDate
    );

    const dailySum = lastSelectedDaysSales?.reduce((acc, sale) => {
      const saleDate = new Date(sale.soldAt).toLocaleDateString();
      acc[saleDate] = (acc[saleDate] || 0) + sale.sellingPrice;
      return acc;
    }, {});

    setDailySalesSum(dailySum || {});

    // Calculate total sales for the selected days
    const total = lastSelectedDaysSales?.reduce(
      (sum, sale) => sum + sale.sellingPrice,
      0
    );
    setTotalSales(total || 0);

    // Calculate products sold
    const productsSoldCount = lastSelectedDaysSales?.reduce((acc, sale) => {
      const product = sale.product;
      acc[product] = (acc[product] || 0) + 1;
      return acc;
    }, {});

    setProductsSold(productsSoldCount || {});

    // Calculate profits for each brand
    const profits = lastSelectedDaysSales?.reduce((acc, sale) => {
      const saleDate = new Date(sale.soldAt).toLocaleDateString();
      const brand = sale.brand;
      const profit = sale.sellingPrice - sale.mrp;
      acc[saleDate] = acc[saleDate] || {};
      acc[saleDate][brand] = (acc[saleDate][brand] || 0) + profit;
      return acc;
    }, {});

    const convertedProfits = convertToRegularData(profits || {});
    setProfitData(convertedProfits);

    // calculate total profit in selected days
    const totalProfits = profits
      ? Object.values(profits).reduce((acc, dateProfits) => {
          return (
            acc +
            Object.values(dateProfits).reduce((brandAcc, profit) => {
              return brandAcc + profit;
            }, 0)
          );
        }, 0)
      : 0;

    setTotalProfit(totalProfits);

    // Fetch total expenses for the selected days
    const totalExpensesAmount = lastSelectedDaysExpense?.reduce(
      (sum, expense) => sum + expense.expenseAmount,
      0
    );
    setTotalExpenses(totalExpensesAmount || 0);
  };

  // Fetch sales and expenses data from the server
  const fetchSalesAndExpensesData = async () => {
    if (window.localStorage.getItem("userInfo")) {
      try {
        const [salesResponse, expensesResponse] = await Promise.all([
          fetch("/api/saleslog", {
            headers: {
              Authorization: `Bearer ${
                JSON.parse(window.localStorage.getItem("userInfo")).token
              }`,
            },
          }),
          fetch("/api/expenselog/totalexpense", {
            headers: {
              Authorization: `Bearer ${
                JSON.parse(window.localStorage.getItem("userInfo")).token
              }`,
            },
          }),
        ]);

        if (!salesResponse.ok) {
          console.error("Failed to fetch sales data");
          window.localStorage.clear();
          naviagate("/login");
          return;
        }

        const salesData = await salesResponse.json();
        setSalesData(salesData);

        if (expensesResponse.ok) {
          const expensesData = await expensesResponse.json();
          setExpensesData(expensesData);
        } else {
          console.error("Failed to fetch expenses data");
        }
      } catch (error) {
        console.log(error);
      }
    }
  };

  useEffect(() => {
    fetchSalesAndExpensesData();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    reCalculate();
    // eslint-disable-next-line
  }, [selectedDays, salesData, expensesData]);

  const handleDaysChange = (e) => {
    setSelectedDays(parseInt(e.target.value, 10));
  };

  const lineChartData = {
    labels: Object.keys(dailySalesSum),
    datasets: [
      {
        label: "Daily Sales Sum",
        data: Object.values(dailySalesSum),
        fill: true,
        backgroundColor: "rgba(75,192,192,0.2)",
        borderColor: "rgba(75,192,192,1)",
      },
    ],
  };

  const barChartData = {
    labels: Object.keys(productsSold),
    datasets: [
      {
        label: "Products Sold",
        data: Object.values(productsSold),
        backgroundColor: "rgba(54, 162, 235, 0.5)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  };

  const profitLineData = {
    labels: Object.keys(profitData),
    datasets: Object.keys(profitData[Object.keys(profitData)[0]] || {}).map(
      (brand, index) => ({
        label: brand,
        data: Object.keys(profitData).map(
          (date) => profitData[date][brand] || 0
        ),
        fill: false,
        borderColor: `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(
          Math.random() * 256
        )}, ${Math.floor(Math.random() * 256)}, 0.7)`,
      })
    ),
  };

  return (
    <div className="p-4 bg-gray-100 rounded-md shadow-md">
      <h2 className="text-3xl font-bold mb-4">Sales Dashboard</h2>

      <div className="mb-4">
        <label className="block mb-2 text-lg">Select Days:</label>
        <select
          value={selectedDays}
          onChange={handleDaysChange}
          className="border p-2 rounded-md"
        >
          {[1, 3, 5, 7, 15, 30, 180, 365].map((days) => (
            <option key={days} value={days}>
              {`${days} Day${days > 1 ? "s" : ""}`}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">
          Total Sales in {selectedDays} days:
        </h3>
        <div className="text-xl font-bold">₹{totalSales}</div>
      </div>
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">
          Total Profit in {selectedDays} days:
        </h3>
        <div className="text-xl font-bold">₹{totalProfit}</div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">
          Total Expenses in {selectedDays} days:
        </h3>
        <div className="text-xl font-bold">₹{totalExpenses}</div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Sales Over Time</h3>
        <Line data={lineChartData} height={150} />
      </div>

      <div className="mb-8 w-screen h-screen">
        <h3 className="text-lg font-semibold mb-2">Products Sold</h3>
        <Bar data={barChartData} options={{ maintainAspectRatio: false }} />
      </div>

      <div className="mb-8 w-screen h-screen">
        <h3 className="text-lg font-semibold mb-2">Profits by Brand</h3>
        <Line data={profitLineData} options={{ maintainAspectRatio: false }} />
      </div>
    </div>
  );
};

export default Dashboard;
