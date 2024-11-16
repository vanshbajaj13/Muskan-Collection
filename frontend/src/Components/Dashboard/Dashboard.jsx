import React, { useState, useEffect } from "react";
import { Line, Bar } from "react-chartjs-2";
import "chart.js/auto";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const naviagate = useNavigate();
  const [salesData, setSalesData] = useState();
  const [expensesData, setExpensesData] = useState();
  const [selectedDays, setSelectedDays] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(null); // Default to the current month
  const [dailySalesSum, setDailySalesSum] = useState({});
  const [totalSales, setTotalSales] = useState(0);
  const [productsSold, setProductsSold] = useState({});
  const [profitData, setProfitData] = useState({});
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalGoodsPayment, setTotalGoodsPayment] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showByDays, setShowByDays] = useState(true);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // auto navigate to login
  useEffect(() => {
    function isUserLogedIn() {
      if (!window.localStorage.getItem("userInfo")) {
        naviagate("/login");
      }
    }
    isUserLogedIn();
  }, [naviagate]);

  // calculate things according to selectedDays
  const reCalculate = () => {
    // Calculate daily sales sum for the selected days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - selectedDays);
    startDate.setHours(0, 0, 0, 0); // Set time to midnight

    const lastSelectedDaysSales = salesData?.filter(
      (sale) => new Date(sale.soldAt).setHours(0, 0, 0, 0) > startDate
    );
    const lastSelectedDaysExpense = expensesData?.filter(
      (expense) => new Date(expense.date).setHours(0, 0, 0, 0) > startDate
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

    const profits = lastSelectedDaysSales?.reduce((acc, sale) => {
      const brand = sale.brand;
      if (!acc[brand]) {
        acc[brand] = { sellingPrice: 0, profit: 0 };
      }
      acc[brand].sellingPrice += sale.sellingPrice;
      acc[brand].profit += sale.sellingPrice - sale.mrp;
      return acc;
    }, {});

    setProfitData(profits || {});
    // calculate total profit in selected days
    let totalProfits = 0;
    for (let key in profits) {
      if (profits.hasOwnProperty(key)) {
        totalProfits += profits[key].profit;
      }
    }
    setTotalProfit(totalProfits);

    // Fetch total expenses for the selected days
    const totalExpensesAmount = lastSelectedDaysExpense?.reduce(
      (sum, expense) => sum + expense.expenseAmount,
      0
    );
    const totalExpensesAmountGoodsPayment = lastSelectedDaysExpense?.reduce(
      (sum, expense) => {
        if (expense.goodsPayment === true) {
          return sum + expense.expenseAmount;
        }
        return sum; // Return the sum unchanged if the condition is not met
      },
      0
    );

    setTotalExpenses(totalExpensesAmount || 0);
    setTotalGoodsPayment(totalExpensesAmountGoodsPayment || 0);
    setIsCalculating(false);
  };

  // calculate things according to selectedDays and selectedMonth
  const reCalculateForMonth = () => {
    // Calculate daily sales sum for the selected month
    const currentDate = new Date();

    const currentYear = currentDate.getFullYear();
    const lastSelectedMonthSales = salesData?.filter((sale) => {
      const saleDate = new Date(sale.soldAt);
      return (
        saleDate.getMonth() === selectedMonth &&
        saleDate.getFullYear() === currentYear
      );
    });
    const lastSelectedMonthExpenses = expensesData?.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getMonth() === selectedMonth &&
        expenseDate.getFullYear() === currentYear
      );
    });

    const dailySum = lastSelectedMonthSales?.reduce((acc, sale) => {
      const saleDate = new Date(sale.soldAt).toLocaleDateString();
      acc[saleDate] = (acc[saleDate] || 0) + sale.sellingPrice;
      return acc;
    }, {});

    setDailySalesSum(dailySum || {});

    // Calculate total sales for the selected days
    const total = lastSelectedMonthSales?.reduce(
      (sum, sale) => sum + sale.sellingPrice,
      0
    );
    setTotalSales(total || 0);

    // Calculate products sold
    const productsSoldCount = lastSelectedMonthSales?.reduce((acc, sale) => {
      const product = sale.product;
      acc[product] = (acc[product] || 0) + 1;
      return acc;
    }, {});

    setProductsSold(productsSoldCount || {});

    // Calculate profits for each brand
    const profits = lastSelectedMonthSales?.reduce((acc, sale) => {
      const brand = sale.brand;
      if (!acc[brand]) {
        acc[brand] = { sellingPrice: 0, profit: 0 };
      }
      acc[brand].sellingPrice += sale.sellingPrice;
      acc[brand].profit += sale.sellingPrice - sale.mrp;
      return acc;
    }, {});
    
    setProfitData(profits || {});

    // calculate total profit in selected days
    let totalProfits = 0;
    for (let key in profits) {
      if (profits.hasOwnProperty(key)) {
        totalProfits += profits[key].profit;
      }
    }
    setTotalProfit(totalProfits);

    // Fetch total expenses for the selected days
    const totalExpensesAmount = lastSelectedMonthExpenses?.reduce(
      (sum, expense) => sum + expense.expenseAmount,
      0
    );
    const totalExpensesAmountGoodsPayment = lastSelectedMonthExpenses?.reduce(
      (sum, expense) => {
        if (expense.goodsPayment === true) {
          return sum + expense.expenseAmount;
        }
        return sum; // Return the sum unchanged if the condition is not met
      },
      0
    );

    setTotalExpenses(totalExpensesAmount || 0);
    setTotalGoodsPayment(totalExpensesAmountGoodsPayment || 0);
    setIsCalculating(false);
  };

  // Fetch sales and expenses data from the server
  const fetchSalesAndExpensesData = async () => {
    if (window.localStorage.getItem("userInfo")) {
      setIsCalculating(true);
      try {
        const [salesResponse, expensesResponse] = await Promise.all([
          fetch("/api/saleslog/1year", {
            headers: {
              Authorization: `Bearer ${
                JSON.parse(window.localStorage.getItem("userInfo")).token
              }`,
            },
          }),
          fetch("/api/expenselog/totalexpense/1year", {
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
    setShowByDays(true);
  };

  useEffect(() => {
    if (selectedMonth !== null && initialized) {
      reCalculateForMonth();
    }
    // eslint-disable-next-line
  }, [selectedMonth, initialized]);
  const handleMonthChange = (e) => {
    setSelectedMonth(parseInt(e.target.value, 10));
    setInitialized(true); // Set initialized to true when a month is selected
    setShowByDays(false);
  };

  const generateRandomColors = (numColors) => {
    const colors = [
      "rgba(255, 99, 132, 0.7)",    // Soft Red
      "rgba(54, 162, 235, 0.7)",    // Soft Blue
      "rgba(255, 206, 86, 0.7)",    // Soft Yellow
      "rgba(75, 192, 192, 0.7)",    // Soft Teal
      "rgba(192, 192, 192, 0.7)",   // Soft Gray
      "rgba(153, 102, 255, 0.7)",   // Soft Purple
      "rgba(255, 159, 64, 0.7)",    // Soft Orange
      "rgba(255, 99, 255, 0.7)",    // Soft Pink
      "rgba(54, 235, 162, 0.7)",    // Soft Mint
      "rgba(206, 86, 255, 0.7)",    // Soft Violet
      "rgba(192, 75, 192, 0.7)",    // Soft Magenta
      "rgba(99, 255, 132, 0.7)",    // Soft Green
      "rgba(235, 54, 162, 0.7)",    // Soft Raspberry
      "rgba(86, 255, 206, 0.7)",    // Soft Cyan
      "rgba(255, 192, 75, 0.7)",    // Soft Amber
      "rgba(99, 132, 255, 0.7)",    // Soft Periwinkle
      "rgba(162, 54, 235, 0.7)"     // Soft Orchid
    ];
    // Generate additional colors if needed
    for (let i = colors.length; i < numColors; i++) {
      const randomColor = `rgba(${Math.floor(
        Math.random() * 256
      )}, ${Math.floor(Math.random() * 256)}, ${Math.floor(
        Math.random() * 256
      )}, 0.7)`;
      colors.push(randomColor);
    }

    // Return exactly numColors
    return colors.slice(0, numColors);
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
        backgroundColor: generateRandomColors(Object.keys(productsSold).length),
        // borderColor: "cyan",
        borderWidth: 1,
      },
    ],
  };

  const profitBarData = {
    labels: Object.keys(profitData),
    datasets: [
      {
        label: "Selling Price",
        data: Object.keys(profitData).map(brand => profitData[brand].sellingPrice),
        backgroundColor: generateRandomColors(Object.keys(profitData).length),
        borderWidth: 1,
      },
      {
        label: "Profit",
        data: Object.keys(profitData).map(brand => profitData[brand].profit),
        backgroundColor: generateRandomColors(Object.keys(profitData).length).map((color) =>
          color.replace("0.7", "0.3")
        ),
        borderWidth: 1,
      },
    ],
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
          {[1, 2, 3, 4, 5, 6, 7, 15, 20, 25, 30, 60, 180, 365].map((days) => (
            <option key={days} value={days}>
              {`${days} Day${days > 1 ? "s" : ""}`}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block mb-2 text-lg">Select Month:</label>
        <select
          value={selectedMonth === null ? "" : selectedMonth}
          onChange={handleMonthChange}
          className="border p-2 rounded-md"
        >
          <option value="">-</option>
          {Array.from({ length: 12 }).map((_, monthIndex) => (
            <option key={monthIndex} value={monthIndex}>
              {new Date(new Date().getFullYear(), monthIndex, 1).toLocaleString(
                "default",
                {
                  month: "long",
                }
              )}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">
          Total Sales in{" "}
          {showByDays ? selectedDays + " days " : months[selectedMonth]} :
        </h3>
        <div className="text-xl font-bold">
          ₹
          {isCalculating
            ? " Calculating....."
            : totalSales.toLocaleString("hi")}
        </div>
      </div>
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">
          Total Profit in{" "}
          {showByDays ? selectedDays + " days " : months[selectedMonth]}:
        </h3>
        <div className="text-xl font-bold">
          ₹
          {isCalculating
            ? " Calculating....."
            : totalProfit.toLocaleString("hi")}
        </div>
      </div>
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">
          Avg Profit % in{" "}
          {showByDays ? selectedDays + " days " : months[selectedMonth]}:
        </h3>
        <div className="text-xl font-bold">
          ₹
          {isCalculating
            ? " Calculating....."
            : Math.round(((totalProfit / totalSales)*100)*100)/100 + "%"}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">
          ROI in{" "}
          {showByDays ? selectedDays + " days " : months[selectedMonth]}:
        </h3>
        <div className="text-xl font-bold">
          ₹
          {isCalculating
            ? " Calculating....."
            : Math.round(((totalProfit / (totalSales-totalProfit))*100)*100)/100 + "%"}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Total Expenses in{" "}
          {showByDays ? selectedDays + " days " : months[selectedMonth]}:
        </h3>
        <div className="text-xl font-bold">
          ₹
          {isCalculating
            ? " Calculating....."
            : (totalExpenses - totalGoodsPayment).toLocaleString("hi")}
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Total Payment in{" "}
            {showByDays ? selectedDays + " days " : months[selectedMonth]}:
          </h3>
          <div className="text-xl font-bold">
            ₹
            {isCalculating
              ? " Calculating....."
              : totalGoodsPayment.toLocaleString("hi")}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Sales Over Time</h3>
        <Line data={lineChartData} height={150} />
      </div>
      <div className="mb-8 w-full h-screen">
        <h3 className="text-lg font-semibold mb-2">Products Sold</h3>
        <Bar data={barChartData} options={{ maintainAspectRatio: false }} />
      </div>

      <div className="mb-8 w-full h-screen">
        <h3 className="text-lg font-semibold mb-2">Profits by Brand</h3>
        <Bar data={profitBarData} options={{ maintainAspectRatio: false }} />
      </div>
    </div>
  );
};

export default Dashboard;
