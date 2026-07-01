import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Doughnut, Bar } from "react-chartjs-2";
import "chart.js/auto";

const Inventory = () => {
  const navigate = useNavigate();
  const [inventoryData, setInventoryData] = useState([]);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [doughnutChartData, setDoughnutChartData] = useState([]);
  const [productChartData, setProductChartData] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productSizesChartData, setProductSizesChartData] = useState([]);
  const [categoryChartData, setCategoryChartData] = useState([]);

  // --- New Stock Added (date range) state ---
  const todayStr = new Date().toISOString().slice(0, 10);
  const firstOfMonthStr = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .slice(0, 10);
  const [stockFilterMode, setStockFilterMode] = useState("month"); // "month" | "range"
  const [selectedMonth, setSelectedMonth] = useState(todayStr.slice(0, 7)); // YYYY-MM
  const [startDate, setStartDate] = useState(firstOfMonthStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [stockReport, setStockReport] = useState(null); // { summary, rows }
  const [stockReportLoading, setStockReportLoading] = useState(false);
  const [stockReportError, setStockReportError] = useState("");
  const [showStockRows, setShowStockRows] = useState(false);

  const getRangeForFetch = () => {
    if (stockFilterMode === "month") {
      const [y, m] = selectedMonth.split("-").map(Number);
      const from = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const to = new Date(y, m, 0, 23, 59, 59, 999); // last day of month
      return { from: from.toISOString(), to: to.toISOString() };
    }
    const from = new Date(startDate + "T00:00:00.000");
    const to = new Date(endDate + "T23:59:59.999");
    return { from: from.toISOString(), to: to.toISOString() };
  };

  const fetchStockAddedReport = async () => {
    setStockReportLoading(true);
    setStockReportError("");
    try {
      const { from, to } = getRangeForFetch();
      const response = await fetch(
        `/api/item/stock-added?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        {
          headers: {
            Authorization: `Bearer ${
              JSON.parse(window.localStorage.getItem("userInfo")).token
            }`,
          },
        },
      );

      if (!response.ok) {
        setStockReportError("Failed to fetch stock added report");
        setStockReport(null);
        return;
      }

      const data = await response.json();
      setStockReport(data);
    } catch (error) {
      console.log(error);
      setStockReportError("Something went wrong fetching the report");
      setStockReport(null);
    } finally {
      setStockReportLoading(false);
    }
  };

  // Group stock-added rows by brand, with per-brand subtotals
  const groupStockRowsByBrand = (rows) => {
    const groups = rows.reduce((acc, row) => {
      let group = acc.find((g) => g.brand === row.brand);
      if (!group) {
        group = { brand: row.brand, rows: [], totalQty: 0, totalAmount: 0 };
        acc.push(group);
      }
      group.rows.push(row);
      group.totalQty += row.quantityAdded;
      group.totalAmount += row.amount;
      return acc;
    }, []);

    // Sort groups by total amount desc, and rows within each group by date
    groups.forEach((g) =>
      g.rows.sort((a, b) => new Date(a.date) - new Date(b.date)),
    );
    return groups.sort((a, b) => b.totalAmount - a.totalAmount);
  };

  // Function to rearrange data and calculate total value for each brand
  const rearrangeBrandData = (data) => {
    const groupedData = data.reduce((acc, item) => {
      const brand = item.brand;

      // Check if the brand is already in the accumulator array
      const existingBrand = acc.find((group) => group.brand === brand);

      if (existingBrand) {
        // If the brand exists, update its totalValue
        existingBrand.quantityBuy += item.quantityBuy;
        existingBrand.quantitySold += item.quantitySold;
        existingBrand.totalValue +=
          (item.quantityBuy - item.quantitySold) * item.mrp;
        existingBrand.totalValueBuy += item.quantityBuy * item.mrp;
        existingBrand.totalValueSold += item.quantitySold * item.mrp;
      } else {
        // If the brand doesn't exist, add it to the accumulator array
        acc.push({
          brand,
          quantityBuy: item.quantityBuy,
          quantitySold: item.quantitySold,
          totalValue: (item.quantityBuy - item.quantitySold) * item.mrp,
          totalValueBuy: item.quantityBuy * item.mrp,
          totalValueSold: item.quantitySold * item.mrp,
        });
      }

      return acc;
    }, []);

    return groupedData;
  };

  // Function to rearrange data and calculate total value for each product
  const rearrangeProductData = (data) => {
    const groupedData = data.reduce((acc, item) => {
      const product = item.product;

      // Check if the product is already in the accumulator array
      const existingProduct = acc.find((group) => group.product === product);

      if (existingProduct) {
        // If the product exists, update its totalValue and totalPieces
        existingProduct.totalValue +=
          (item.quantityBuy - item.quantitySold) * item.mrp;
        existingProduct.totalPieces += item.quantityBuy - item.quantitySold;
        existingProduct.quantityBuy += item.quantityBuy;
        existingProduct.quantitySold += item.quantitySold;
      } else {
        // If the product doesn't exist, add it to the accumulator array
        acc.push({
          product,
          totalValue: (item.quantityBuy - item.quantitySold) * item.mrp,
          totalPieces: item.quantityBuy - item.quantitySold,
          quantityBuy: item.quantityBuy,
          quantitySold: item.quantitySold,
        });
      }

      return acc;
    }, []);

    return groupedData;
  };

  const rearrangeCategoryData = (data) => {
    const grouped = data.reduce((acc, item) => {
      const category = item.category;
      const available = item.quantityBuy - item.quantitySold;
      const existing = acc.find((g) => g.category === category);
      if (existing) {
        existing.totalAvailable += available;
        existing.totalValue += available * item.mrp;
      } else {
        acc.push({
          category,
          totalAvailable: available,
          totalValue: available * item.mrp,
        });
      }
      return acc;
    }, []);
    return grouped.sort((a, b) => b.totalValue - a.totalValue);
  };

  // Function to generate sizes data for the selected product
  const generateSizesChartData = (data) => {
    const sizesData = data.reduce((acc, item) => {
      const size = item.size;

      // Check if the size is already in the accumulator array
      const existingSize = acc.find((group) => group.size === size);

      if (existingSize) {
        // If the size exists, update its quantity
        existingSize.quantity += item.quantityBuy - item.quantitySold;
      } else {
        // If the size doesn't exist, add it to the accumulator array
        acc.push({
          size,
          quantity: item.quantityBuy - item.quantitySold,
        });
      }

      return acc;
    }, []);

    return sizesData;
  };

  // Fetch inventory data from the server
  const fetchInventoryData = async () => {
    try {
      const response = await fetch("/api/item", {
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch inventory data");
        window.localStorage.clear();
        navigate("/login");
        return;
      }

      const data = await response.json();
      setInventoryData(data);

      // Rearrange data for Doughnut charts
      const rearrangedBrandData = rearrangeBrandData(data);
      const rearrangedProductData = rearrangeProductData(data);
      const rearrangedCategoryData = rearrangeCategoryData(data);
      setDoughnutChartData(rearrangedBrandData);
      setProductChartData(rearrangedProductData);
      setCategoryChartData(rearrangedCategoryData);
      // Calculate total inventory value
      const totalValue = data.reduce(
        (sum, item) => sum + (item.quantityBuy - item.quantitySold) * item.mrp,
        0,
      );
      setTotalInventoryValue(totalValue);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchInventoryData();
    // eslint-disable-next-line
  }, []);

  // Handle product selection
  const handleProductChange = (product) => {
    setSelectedProduct(product);

    // Fetch sizes data for the selected product
    const selectedProductData = inventoryData.filter(
      (item) => item.product === product,
    );
    const sizesChartData = generateSizesChartData(selectedProductData);
    setProductSizesChartData(sizesChartData);
  };

  // Create data for Doughnut charts

  const generateRandomColors = (numColors) => {
    const colors = [
      "rgba(255, 99, 132, 0.7)", // Soft Red
      "rgba(54, 162, 235, 0.7)", // Soft Blue
      "rgba(255, 206, 86, 0.7)", // Soft Yellow
      "rgba(75, 192, 192, 0.7)", // Soft Teal
      "rgba(192, 192, 192, 0.7)", // Soft Gray
      "rgba(153, 102, 255, 0.7)", // Soft Purple
      "rgba(255, 159, 64, 0.7)", // Soft Orange
      "rgba(255, 99, 255, 0.7)", // Soft Pink
      "rgba(54, 235, 162, 0.7)", // Soft Mint
      "rgba(206, 86, 255, 0.7)", // Soft Violet
      "rgba(192, 75, 192, 0.7)", // Soft Magenta
      "rgba(99, 255, 132, 0.7)", // Soft Green
      "rgba(235, 54, 162, 0.7)", // Soft Raspberry
      "rgba(86, 255, 206, 0.7)", // Soft Cyan
      "rgba(255, 192, 75, 0.7)", // Soft Amber
      "rgba(99, 132, 255, 0.7)", // Soft Periwinkle
      "rgba(162, 54, 235, 0.7)", // Soft Orchid
    ];
    for (let i = 4; i < numColors; i++) {
      const randomColor = `rgba(${Math.floor(
        Math.random() * 256,
      )}, ${Math.floor(Math.random() * 256)}, ${Math.floor(
        Math.random() * 256,
      )}, 0.7)`;
      colors.push(randomColor);
    }
    return colors.slice(0, numColors);
  };

  const baseColors = generateRandomColors(doughnutChartData.length);
  const brandChartData = {
    labels: doughnutChartData.map((item) => item.brand),
    datasets: [
      {
        data: doughnutChartData.map((item) => item.totalValue),
        backgroundColor: baseColors,
        borderWidth: 1,
        label: "Worth",
      },
      {
        data: doughnutChartData.map((item) => item.totalValueSold),
        backgroundColor: baseColors.map((color) => color.replace("0.7", "0.3")), // Use lighter color for Amount Sold,
        borderWidth: 1,
        label: "Total Value Sold",
      },
      {
        data: doughnutChartData.map((item) => item.totalValueBuy),
        backgroundColor: baseColors.map((color) => color.replace("0.3", "1")), // Use lighter color for quantitySold,
        borderWidth: 1,
        label: "Total Buy",
      },
    ],
  };

  // Doughnut Chart for Product
  const doughnutProductChartData = {
    labels: productChartData.map((item) => item.product),
    datasets: [
      {
        data: productChartData.map((item) => item.quantityBuy),
        backgroundColor: generateRandomColors(productChartData.length),
        borderWidth: 1,
        label: "Quantity Buy",
      },
      {
        data: productChartData.map((item) => item.quantitySold),
        backgroundColor: generateRandomColors(productChartData.length).map(
          (color) => color.replace("0.7", "0.3"),
        ), // Use lighter color for quantitySold
        borderWidth: 1,
        label: "Quantity Sold",
      },
    ],
  };

  // Chart data for sizes of the selected product
  const sizesChartData = {
    labels: productSizesChartData.map((item) => item.size),
    datasets: [
      {
        data: productSizesChartData.map((item) => item.quantity),
        backgroundColor: generateRandomColors(productSizesChartData.length),
        borderWidth: 1,
        label: "Quantity Available",
      },
    ],
  };

  //   chart for comparing brands

  const brandColorList = generateRandomColors(doughnutChartData.length);

  const comparingBrandData = {
    labels: doughnutChartData.map((item) => item.brand),
    datasets: [
      {
        data: doughnutChartData.map((item) => item.quantityBuy),
        backgroundColor: brandColorList,
        borderWidth: 1,
        label: "Quantity Buy",
      },
      {
        data: doughnutChartData.map((item) => item.quantitySold),
        backgroundColor: brandColorList.map((color) =>
          color.replace("0.7", "0.3"),
        ), // Use lighter color for quantitySold
        borderWidth: 1,
        label: "Quantity Sold",
      },
    ],
  };
  const categoryChartDataset = {
    labels: categoryChartData.map((item) => item.category),
    datasets: [
      {
        label: "Available Quantity",
        data: categoryChartData.map((item) => item.totalAvailable),
        backgroundColor: generateRandomColors(categoryChartData.length),
        borderWidth: 1,
      },
      {
        label: "Inventory Value (₹)",
        data: categoryChartData.map((item) => item.totalValue),
        backgroundColor: generateRandomColors(categoryChartData.length).map(
          (color) => color.replace("0.7", "0.3"),
        ),
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="p-4 bg-gray-100 rounded-md shadow-md">
      <h2 className="text-3xl font-bold mb-4">Inventory</h2>
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Total Inventory Value:</h3>
        <div className="text-xl font-bold">
          ₹
          {totalInventoryValue
            ? totalInventoryValue.toLocaleString("hi")
            : "  Calculating......."}
        </div>
      </div>
      {/* New Stock Added (date range / month) */}
      <div className="mb-8 p-5 sm:p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">
            New Stock Added
          </h3>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {["month", "range"].map((mode) => (
              <button
                key={mode}
                onClick={() => setStockFilterMode(mode)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 ${
                  stockFilterMode === mode
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {mode === "month" ? "By Month" : "By Date Range"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {stockFilterMode === "month" ? (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
              />
            ) : (
              <>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
                />
              </>
            )}
          </div>

          <button
            onClick={fetchStockAddedReport}
            disabled={stockReportLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-medium rounded-lg shadow-sm transition-all duration-150 disabled:opacity-50 disabled:active:scale-100"
          >
            {stockReportLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Loading...
              </span>
            ) : (
              "Get Report"
            )}
          </button>
        </div>

        {stockReportError && (
          <div className="text-red-600 text-sm mb-3 p-2 bg-red-50 rounded-lg animate-enter">
            {stockReportError}
          </div>
        )}

        {/* Results */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            stockReport
              ? "grid-rows-[1fr] opacity-100 mt-1"
              : "grid-rows-[0fr] opacity-0"
          } overflow-hidden`}
        >
          <div className="min-h-0 overflow-hidden">
            {stockReport && (
              <div className="animate-enter">
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex-1 min-w-[140px] p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">
                      Products Added
                    </div>
                    <div className="text-xl font-bold text-gray-800">
                      {stockReport.summary.totalQuantity}
                    </div>
                  </div>
                  <div className="flex-1 min-w-[140px] p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">
                      Total Amount
                    </div>
                    <div className="text-xl font-bold text-gray-800">
                      ₹{stockReport.summary.totalAmount.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                {stockReport.rows.length > 0 && (
                  <button
                    onClick={() => setShowStockRows((prev) => !prev)}
                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium mb-2 transition-colors"
                  >
                    {showStockRows ? "Hide" : "View"} products bought in this
                    period
                    <svg
                      className={`w-3.5 h-3.5 transition-transform duration-300 ${showStockRows ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                )}

                {/* Collapsible table */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    showStockRows
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  } overflow-hidden`}
                >
                  <div className="min-h-0 overflow-hidden">
                    {stockReport.rows.length > 0 && (
                      <div className="overflow-x-auto rounded-lg border border-gray-100">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="p-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Date
                              </th>
                              <th className="p-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Code
                              </th>
                              <th className="p-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Product
                              </th>
                              <th className="p-2.5 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Size
                              </th>
                              <th className="p-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Qty
                              </th>
                              <th className="p-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">
                                MRP
                              </th>
                              <th className="p-2.5 text-right font-medium text-gray-500 text-xs uppercase tracking-wide">
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {groupStockRowsByBrand(stockReport.rows).map(
                              (group) => (
                                <React.Fragment key={group.brand}>
                                  {/* Brand group header */}
                                  <tr className="bg-blue-50/60">
                                    <td
                                      colSpan={7}
                                      className="p-2 px-2.5 text-xs font-semibold text-blue-700 uppercase tracking-wide"
                                    >
                                      {group.brand}{" "}
                                      <span className="text-blue-400 font-normal">
                                        ({group.rows.length} item
                                        {group.rows.length > 1 ? "s" : ""})
                                      </span>
                                      <span className="text-blue-400 font-normal">
                                        {" - "}₹
                                        {group.totalAmount.toLocaleString(
                                          "en-IN",
                                        )}
                                      </span>
                                    </td>
                                  </tr>

                                  {group.rows.map((row, idx) => (
                                    <tr
                                      key={`${row.code}-${row.date}-${idx}`}
                                      className="hover:bg-gray-50 transition-colors"
                                    >
                                      <td className="p-2.5 text-gray-600">
                                        {new Date(row.date).toLocaleDateString(
                                          "en-IN",
                                        )}
                                      </td>
                                      <td className="p-2.5 text-gray-600">
                                        {row.code}
                                      </td>
                                      <td className="p-2.5 text-gray-800 font-medium">
                                        <span className="inline-flex items-center gap-1.5 flex-wrap">
                                          {row.product}
                                          {row.type === "restocked" && (
                                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 uppercase tracking-wide">
                                              restocked
                                            </span>
                                          )}
                                          {row.corrected && (
                                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 uppercase tracking-wide">
                                              corrected
                                            </span>
                                          )}
                                        </span>
                                      </td>
                                      <td className="p-2.5 text-gray-600">
                                        {row.size}
                                      </td>
                                      <td className="p-2.5 text-right text-gray-600">
                                        {row.quantityAdded}
                                      </td>
                                      <td className="p-2.5 text-right text-gray-600">
                                        ₹{row.mrp}
                                      </td>
                                      <td className="p-2.5 text-right font-medium text-gray-800">
                                        ₹{row.amount.toLocaleString("en-IN")}
                                      </td>
                                    </tr>
                                  ))}

                                  {/* Brand subtotal */}
                                  <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                                    <td
                                      colSpan={4}
                                      className="p-2.5 text-right text-gray-600 text-xs"
                                    >
                                      Subtotal — {group.brand}
                                    </td>
                                    <td className="p-2.5 text-right text-gray-800">
                                      {group.totalQty}
                                    </td>
                                    <td className="p-2.5" />
                                    <td className="p-2.5 text-right text-gray-800">
                                      ₹
                                      {group.totalAmount.toLocaleString(
                                        "en-IN",
                                      )}
                                    </td>
                                  </tr>
                                </React.Fragment>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {stockReport.rows.length === 0 && (
                  <div className="text-gray-400 text-sm text-center py-6 bg-gray-50 rounded-lg">
                    No stock was added in this period.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Doughnut Chart for Brand */}
      <h3 className="text-lg font-semibold mb-2">Inventory by Brand</h3>
      <div className="flex items-center justify-center ">
        <div className="w-screen h-screen">
          <Doughnut
            data={brandChartData}
            options={{ maintainAspectRatio: false }}
          />
        </div>
      </div>
      {/* Doughnut Chart for Product */}
      <h3 className="text-lg font-semibold mb-2">Inventory by Product</h3>
      <div className="flex items-center justify-center">
        <div className="w-screen h-screen">
          <Doughnut
            data={doughnutProductChartData}
            options={{ maintainAspectRatio: false }}
          />
        </div>
      </div>
      <select
        value={selectedProduct}
        onChange={(e) => handleProductChange(e.target.value)}
        className="mt-4 p-2 border rounded"
      >
        <option value="" disabled>
          Select a Product
        </option>
        {productChartData.map((product) => (
          <option key={product.product} value={product.product}>
            {product.product}
          </option>
        ))}
      </select>

      {selectedProduct && (
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Sizes and Quantity for {selectedProduct}
          </h3>
          <div className="flex items-center justify-center">
            <div className="w-auto">
              <Doughnut data={sizesChartData} height={100} />
            </div>
          </div>
        </div>
      )}
      {/* Category — Available Quantity */}
      <h3 className="text-lg font-semibold mb-2 mt-6">Inventory by Category</h3>
      <div className="flex items-center justify-center">
        <div className="w-screen h-screen">
          <Doughnut
            data={categoryChartDataset}
            options={{
              maintainAspectRatio: false,
              plugins: {
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      if (ctx.datasetIndex === 0) return ` Qty: ${ctx.parsed}`;
                      return ` Value: ₹${ctx.parsed.toLocaleString("en-IN")}`;
                    },
                  },
                },
              },
            }}
          />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-2">
        Quantity Bought and Sold by Brand
      </h3>
      <div className="flex items-center justify-center">
        <div className="w-screen h-screen">
          <Bar
            data={comparingBrandData}
            options={{ maintainAspectRatio: false }}
          />
        </div>
      </div>
    </div>
  );
};

export default Inventory;