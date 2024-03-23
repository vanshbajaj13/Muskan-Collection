import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const History = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [searchedItems, setSearchedItem] = useState(null);
  const [itemNotFound, setItemNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOption, setSearchOption] = useState("Code"); // Default search option is Code

  const toggleExpand = (itemId) => {
    setExpandedItemId((prevId) => (prevId === itemId ? null : itemId));
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line
  }, [page]);

  const fetchItemWithOption = async (option, query) => {
    setSearching(true);
    try {
      const response = await fetch(`/api/item/search/${option}/${query}`, {
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSearchedItem(data); // Clear searchedItem state
        setItemNotFound(false); // Reset itemNotFound state
      } else if (response.status === 401) {
        window.localStorage.clear();
        setSearchedItem(null); // Clear searchedItem state
        setItemNotFound(true); // Set itemNotFound state to true
        setSearching(false);
        // naviagate("/login");
      } else {
        setSearchedItem(null); // Clear searchedItem state
        setItemNotFound(true); // Set itemNotFound state to true
        setSearching(false);
        // console.error("Failed to fetch items");
      }
    } catch (error) {
      // console.log(error);
    } finally {
      setSearching(false);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/item/paginate?page=${page}&limit=10`, {
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (page === 1) {
          setItems(data.items);
        } else {
          setItems((prevItems) => [...prevItems, ...data.items]);
        }
      } else {
        console.error("Failed to fetch items");
        window.localStorage.clear();
        navigate("/login");
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreItems = () => {
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
      setSearchedItem(null);
      setItemNotFound(false);
    } else {
      fetchItemWithOption(searchOption, inputValue);
    }
  };

  useEffect(() => {
    fetchItemWithOption(searchOption, searchQuery);
    // eslint-disable-next-line
  }, [searchOption]);

  const handleSearchOptionChange = (e) => {
    setSearchOption(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() === "") {
      setSearchedItem(null);
      setItemNotFound(false);
    } else {
      fetchItemWithOption(searchOption, searchQuery);
    }
    setSearchQuery("");
  };

  // Function to handle navigation to the EditItem page with the item's code
  const handleEdit = (code) => {
    navigate(`/edit-item/${code}`); // Navigate to the EditItem page with the item's code
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Purchase History</h1>

      <form onSubmit={handleSubmit} className="mb-4 flex items-center">
        <select
          value={searchOption}
          onChange={handleSearchOptionChange}
          className="border border-gray-300 rounded-l px-4 py-2"
        >
          <option value="Code">Code</option>
          <option value="Brand">Brand</option>
          <option value="Product">Product</option>
          <option value="Category">Category</option>
          <option value="Size">Size</option>
        </select>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search by code"
          className="border border-gray-300 rounded-l px-4 py-2 flex-grow"
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r"
        >
          {searching ? "Serahcing" : "Search"}
        </button>
      </form>

      {searching && (
        <p className="text-green-500 text-center font-semibold"> Searching</p>
      )}
      {searchedItems ? (
        <div>
          <h2 className="text-xl font-semibold mb-2">Searched Item</h2>
          <p>Number of result = {searchedItems.length}</p>
          {searchedItems.map((item) => (
            <div
              key={item._id}
              className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative"
            >
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleExpand(item._id)}
              >
                <div>
                  <p className="font-semibold text-lg">Code: {item.code}</p>
                  <p className="text-black">Brand: {item.brand}</p>
                </div>
                <svg
                  className={`h-6 w-6 ${
                    expandedItemId === item._id ? "transform rotate-180" : ""
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
              {expandedItemId === item._id && (
                <div className="flex items-center justify-evenly border-t border-gray-300 mt-4 pt-4">
                  <div className="text-black">
                    <p className="font-semibold py-1">
                      Product: {item.product}
                    </p>
                    <p className="font-semibold py-1">
                      Category: {item.category}
                    </p>
                    <p className="font-semibold py-1">Size: {item.size}</p>
                    <p className="font-semibold py-1">
                      Quantity Available: {item.quantityBuy - item.quantitySold}
                    </p>
                    <p className="font-semibold py-1">MRP: {item.mrp}</p>
                    <button
                      onClick={() => handleEdit(item.code)}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-1 mr-2"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        itemNotFound && (
          <div className="mt-2 p-2 bg-red-500 text-white text-center rounded-md">
            No product found with this code.
          </div>
        )
      )}

      <hr className="my-8 border-t border-gray-300" />

      <div>
        <h2 className="text-xl font-semibold mb-2">All Items</h2>
        {items.map((item) => (
          <div
            key={item._id}
            className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative"
          >
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => toggleExpand(item._id)}
            >
              <div>
                <p className="font-semibold text-lg">Code: {item.code}</p>
                <p className="text-black">Brand: {item.brand}</p>
              </div>
              <svg
                className={`h-6 w-6 ${
                  expandedItemId === item._id ? "transform rotate-180" : ""
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
            {expandedItemId === item._id && (
              <div className="flex items-center justify-evenly border-t border-gray-300 mt-4 pt-4">
                <div className="text-black">
                  <p className="font-semibold py-1">Product: {item.product}</p>
                  <p className="font-semibold py-1">
                    Category: {item.category}
                  </p>
                  <p className="font-semibold py-1">Size: {item.size}</p>
                  <p className="font-semibold py-1">
                    Quantity Available: {item.quantityBuy - item.quantitySold}
                  </p>
                  <p className="font-semibold py-1">MRP: {item.mrp}</p>
                  <button
                    onClick={() => handleEdit(item.code)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-1 mr-2"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        <div className="flex justify-center">
          <button
            onClick={loadMoreItems}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-1"
          >
            {loading ? "loading...." : "Load More"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default History;
