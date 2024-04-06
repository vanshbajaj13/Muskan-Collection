import React, { useState, useEffect } from "react";

const SaleHistory = () => {
  const [sales, setSales] = useState([]);
  const [searchedSales, setSearchedSales] = useState(null);
  const [saleNotFound, setSaleNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOption, setSearchOption] = useState("Code"); // Default search option is Sale Code
  const [exactMatch, setExactMatch] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showDeleteTooltip, setShowDeleteTooltip] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [searchedSaleDeleted, setSearchedSaleDeleted] = useState(false);
  const [groupedSales, setGroupedSales] = useState({});

  const toggleExpand = (saleId) => {
    setExpandedSaleId((prevId) => (prevId === saleId ? null : saleId));
  };

  useEffect(() => {
    fetchSales();
    // eslint-disable-next-line
  }, [page]);

  const fetchSaleWithOption = async (option, query) => {
    setSearching(true);
    try {
      const response = await fetch(
        `/api/saleslog/${
          exactMatch ? "exact-search" : "search"
        }/${option}/${query}`,
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
        setSearchedSales(data); // Clear searchedSales state
        setSaleNotFound(false); // Reset saleNotFound state
      } else if (response.status === 401) {
        window.localStorage.clear();
        setSearchedSales(null); // Clear searchedSales state
        setSaleNotFound(true); // Set saleNotFound state to true
        setSearching(false);
        // navigate("/login");
      } else {
        setSearchedSales(null); // Clear searchedSales state
        setSaleNotFound(true); // Set saleNotFound state to true
        setSearching(false);
        // console.error("Failed to fetch sales");
      }
    } catch (error) {
      // console.log(error);
    } finally {
      setSearching(false);
    }
  };

  const fetchSales = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/saleslog/paginate?page=${page}&limit=10`,
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
          setSales(data.sales);
        } else {
          setSales((prevSales) => [...prevSales, ...data.sales]);
        }
      } else {
        console.error("Failed to fetch sales");
        // window.localStorage.clear();
        // navigate("/login");
      }
    } catch (error) {
      console.error("Error fetching sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreSales = () => {
    setPage((prevPage) => prevPage + 1);
  };

  const handleSearch = (e) => {
    const inputValue = e.target.value;
    const alphanumericRegex = /^[a-zA-Z0-9\s]*$/;

    if (!alphanumericRegex.test(inputValue)) {
      // If the input contains special characters, do nothing
      return;
    }

    setSearchQuery(inputValue.toUpperCase());

    if (inputValue === "") {
      setSearchedSales(null);
      setSaleNotFound(false);
    } else {
      fetchSaleWithOption(searchOption, inputValue);
    }
  };

  useEffect(() => {
    fetchSaleWithOption(searchOption, searchQuery);
    // eslint-disable-next-line
  }, [searchOption, exactMatch, searchedSaleDeleted]);

  const handleSearchOptionChange = (e) => {
    setSearchOption(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() === "") {
      setSearchedSales(null);
      setSaleNotFound(false);
    } else {
      fetchSaleWithOption(searchOption, searchQuery);
    }
    setSearchQuery("");
  };

  const handleToggleExactMatch = (e) => {
    e.preventDefault();
    setExactMatch((prevExactMatch) => !prevExactMatch); // Toggle exact match state
  };

  const handleOpenDeleteModal = (code) => {
    setIsDeleteModalOpen(true);
    setDeleteCode(code);
  };

  const handleCloseDeleteModal = () => {
    setConfirmText("");
    setIsDeleteModalOpen(false);
  };

  const handleUserInputChange = (e) => {
    setConfirmText(e.target.value.toUpperCase());
  };
  const handleSaleDelete = async () => {
    if (confirmText === "CONFIRM") {
      try {
        const response = await fetch(`/api/saleslog/${deleteCode}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${
              JSON.parse(window.localStorage.getItem("userInfo")).token
            }`,
          },
        });
        if (response.ok) {
          await fetchSales();
          setSearchedSaleDeleted(!searchedSaleDeleted);
          setDeleteCode("");
          setIsDeleteModalOpen(false);
          setConfirmText("");
        } else {
          console.error("Failed to delete ");
          setConfirmText("");
          setIsDeleteModalOpen(false);
          setShowDeleteTooltip(true);
          setTimeout(() => {
            setShowDeleteTooltip(false);
          }, 3000);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    } else {
    }
  };

  // Use useEffect to preprocess the sales data whenever it changes
  useEffect(() => {
    const groupSalesByDate = () => {
      const grouped = {};
      sales.forEach((sale) => {
        const date = new Date(sale.soldAt).getDate();
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(sale);
      });
      return grouped;
    };

    setGroupedSales(groupSalesByDate());
  }, [sales]);
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Sale History</h1>

      <form onSubmit={handleSubmit} className="mb-4 flex items-center">
        <select
          value={searchOption}
          onChange={handleSearchOptionChange}
          className="border border-gray-300 rounded-l px-4 py-2 w-1/4"
        >
          <option value="Sale Code">Code</option>
          <option value="Customer Name">Brand</option>
          <option value="Product">Product</option>
          <option value="Category">Category</option>
          <option value="Sale Date">Size</option>
        </select>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search by code"
          className="border border-gray-300 rounded-l px-4 py-2 w-2/4"
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r w-1/4"
        >
          {searching ? "Searching" : "Search"}
        </button>
        {/* Toggle button for exact match search */}
      </form>
      <div className="flex justify-center">
        <button
          onClick={handleToggleExactMatch}
          className={`bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded ${
            exactMatch ? "bg-blue-500 hover:bg-blue-700 text-white" : ""
          }`}
        >
          {exactMatch ? "Exact Match Search On" : "Exact Match Search Off"}
        </button>
      </div>

      {searching && (
        <p className="text-green-500 text-center font-semibold">Searching</p>
      )}
      {searchedSales ? (
        <div>
          <h2 className="text-xl font-semibold mb-2">Searched Sales</h2>
          <p>Number of results: {searchedSales.length}</p>
          {searchedSales.map((sale) => (
            <div
              key={sale._id}
              className="bg-gray-200 border border-black text-black px-4 py-3 rounded relative"
            >
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleExpand(sale._id)}
              >
                <div>
                  <p className="font-semibold text-lg">Code: {sale.code}</p>
                  <p className="text-black">Brand: {sale.brand}</p>
                </div>
                <div>
                  {new Date(sale.soldAt).toLocaleString()}
                  <svg
                    className={`h-6 w-6 ${
                      expandedSaleId === sale._id ? "transform rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
              {expandedSaleId === sale._id && (
                <div className="flex items-center justify-evenly border-t border-gray-300 mt-4 pt-4">
                  <div className="text-black">
                    <p className="font-semibold py-1">
                      Product: {sale.product}
                    </p>
                    <p className="font-semibold py-1">
                      Category: {sale.category}
                    </p>
                    <p className="font-semibold py-1">
                      Selling Price: {sale.sellingPrice}
                    </p>
                    {sale.sellingPrice - sale.mrp >= 0 ? (
                      <p className="font-semibold py-1 text-green-500">
                        Profit : {sale.sellingPrice - sale.mrp}
                      </p>
                    ) : (
                      <p className="font-semibold py-1 text-red-500">
                        Loss : {sale.sellingPrice - sale.mrp}
                      </p>
                    )}
                    {showDeleteTooltip && (
                      <div className="text-red-500 text-center text-sm mt-2">
                        Error while Deleting try again..
                      </div>
                    )}
                    {/* Delete Button */}
                    <button
                      onClick={() => {
                        handleOpenDeleteModal(sale.code);
                      }}
                      className="w-full mt-6 py-2 px-4 rounded focus:outline-none bg-red-500 text-white"
                    >
                      Return
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        saleNotFound && (
          <div className="mt-2 p-2 bg-red-500 text-white text-center rounded-md">
            No sale found with this criteria.
          </div>
        )
      )}

      <hr className="my-8 border-t border-gray-300" />

      <div>
        <h2 className="text-xl font-semibold mb-2">All Sales</h2>
        {Object.keys(groupedSales)
          .sort((a, b) => new Date(b) - new Date(a))
          .map((date, index) => {
            const salesForDate = groupedSales[date];
            // Calculate total sale and profit for the current date
            const totalSale = salesForDate.reduce(
              (acc, sale) => acc + sale.sellingPrice,
              0
            );
            const totalProfit = salesForDate.reduce(
              (acc, sale) => acc + (sale.sellingPrice - sale.mrp),
              0
            );
            return (
              <React.Fragment key={date}>
                <div className="bg-green-200 border border-black text-black px-4 py-3 rounded relative flex justify-between items-center cursor-pointer font-semibold">
                  <p>{new Date(salesForDate[0].soldAt).toLocaleDateString()}</p>
                  <p>Sale - {totalSale}</p>
                  {totalProfit >= 0 ? (
                    <p className="font-semibold py-1 text-black">
                      Profit : {totalProfit}
                    </p>
                  ) : (
                    <p className="font-semibold py-1 text-red-500">
                      Loss : {totalProfit}
                    </p>
                  )}
                </div>
                {salesForDate.map((sale) => (
                  <div
                    key={sale._id}
                    className="bg-gray-200 border border-black text-black px-4 py-3 rounded relative"
                  >
                    <div
                      className="flex justify-between items-center cursor-pointer"
                      onClick={() => toggleExpand(sale._id)}
                    >
                      <div>
                        <p className="font-semibold text-lg">
                          Code: {sale.code}
                        </p>
                        <p className="text-black">Brand : {sale.brand}</p>
                      </div>
                      <div>
                        {new Date(sale.soldAt).toLocaleString()}
                        <svg
                          className={`h-6 w-6 ${
                            expandedSaleId === sale._id
                              ? "transform rotate-180"
                              : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                    {expandedSaleId === sale._id && (
                      <div className="flex items-center justify-evenly border-t border-gray-300 mt-4 pt-4">
                        <div className="text-black">
                          <p className="font-semibold py-1">
                            Product: {sale.product}
                          </p>
                          <p className="font-semibold py-1">
                            Category: {sale.category}
                          </p>
                          <p className="font-semibold py-1">
                            Selling Price: {sale.sellingPrice}
                          </p>
                          {sale.sellingPrice - sale.mrp >= 0 ? (
                            <p className="font-semibold py-1 text-green-500">
                              Profit : {sale.sellingPrice - sale.mrp}
                            </p>
                          ) : (
                            <p className="font-semibold py-1 text-red-500">
                              Loss : {sale.sellingPrice - sale.mrp}
                            </p>
                          )}
                          {showDeleteTooltip && (
                            <div className="text-red-500 text-center text-sm mt-2">
                              Error while Deleting try again..
                            </div>
                          )}
                          {/* Delete Button */}
                          <button
                            onClick={() => {
                              handleOpenDeleteModal(sale.code);
                            }}
                            className="w-full mt-6 py-2 px-4 rounded focus:outline-none bg-red-500 text-white"
                          >
                            Return
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </React.Fragment>
            );
          })}

        <div className="flex justify-center">
          <button
            onClick={loadMoreSales}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-1"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      </div>
      {isDeleteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-md">
            <p className="mb-4">Type 'CONFIRM' to delete this item:</p>
            <input
              type="text"
              value={confirmText}
              onChange={handleUserInputChange}
              className="border border-gray-300 p-2 rounded-md mb-4"
            />
            <div className="flex justify-between">
              <button
                onClick={handleCloseDeleteModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md mr-2"
              >
                Cancel
              </button>
              <button
                disabled={confirmText !== "CONFIRM"}
                onClick={handleSaleDelete}
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
      )}
    </div>
  );
};

export default SaleHistory;
