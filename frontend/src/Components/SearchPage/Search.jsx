import React, { useState, useEffect } from "react";
import QrScanner from "react-qr-scanner";

const Search = () => {
  const [searchedItems, setSearchedItem] = useState(null);
  const [itemNotFound, setItemNotFound] = useState(false);
  const [searching, setSearching] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [qrCodeScanned, setQrCodeScanned] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const toggleExpand = (itemId) => {
    setExpandedItemId((prevId) => (prevId === itemId ? null : itemId));
  };

  const fetchItemWithOption = async (query) => {
    if (query.length >= 3) {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/item/search/Code/${query}`,
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
    }
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
      fetchItemWithOption(inputValue);
    }
  };

  // Handle QR code scan
  const handleScan = (data) => {
    // Check if the scanned code matches the specified format (3 uppercase letters followed by 4 numbers)
    const regex = /^[A-Z]{3}\d{4}$/;
    if (data && regex.test(data.text)) {
      setSearchQuery(data.text.substring(0,4));
      setQrCodeScanned(data.text);
      setShowScanner(false);
    }
  };

  // Handle error during QR code scan
  const handleError = (error) => {
    console.error("Error while scanning QR code:", error);
  };

  useEffect(() => {
    fetchItemWithOption(searchQuery);
    // eslint-disable-next-line
  }, [qrCodeScanned]);



  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() === "") {
      setSearchedItem(null);
      setItemNotFound(false);
    } else {
      fetchItemWithOption(searchQuery);
    }
    setSearchQuery("");
  };

  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Search</h1>

      <form onSubmit={handleSubmit} className="mb-4 flex items-center">
       
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search by code"
          className="border border-gray-300 rounded-l px-4 py-2 w-3/4"
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r w-1/4"
        >
          {searching ? "Serahcing" : "Search"}
        </button>
        {/* Toggle button for exact match search */}
      </form>
      <div className="flex justify-center">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded m-1"
          onClick={() => setShowScanner(!showScanner)}
        >
          Toggle Scanner
        </button>
      </div>
      {showScanner && (
        <QrScanner
          onScan={handleScan}
          onError={handleError}
          constraints={{
            audio: false,
            video: { facingMode: "environment" },
          }}
          style={{ width: "100%" }}
        />
      )}

      {qrCodeScanned && <p>QR Code Scanned: {qrCodeScanned}</p>}

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
              className={`bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative ${
                item.quantityBuy - item.quantitySold <= 0
                  ? "bg-red-100 border border-red-400 text-red-700"
                  : ""
              }`}
            >
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleExpand(item._id)}
              >
                <div>
                  <p className="font-semibold text-lg">Code: {item.code}</p>
                  <p className="font-semibold text-lg">Size: {item.size}</p>
                  <p className="text-black">Brand: {item.brand}</p>
                </div>
              </div>
              {expandedItemId === item._id && (
                <div
                  className={`flex items-center justify-evenly border-t border-gray-500 mt-4 pt-4 ${
                    item.quantityBuy - item.quantitySold <= 0
                      ? "bg-red-100  text-red-700"
                      : ""
                  }`}
                >
                  <div className="text-black">
                    <p className="font-semibold py-1">
                      Product: {item.product}
                    </p>
                    <p className="font-semibold py-1">
                      Category: {item.category}
                    </p>
                    <p className={`font-semibold py-1 ${
                    item.quantityBuy - item.quantitySold <= 0
                      ? "text-red-700"
                      : "text-green-700"
                  }`}
                    >
                      Quantity Available: {item.quantityBuy - item.quantitySold}
                    </p>
                    <p className="font-semibold py-1">
                      Quantity Sold: {item.quantitySold}
                    </p>
                    <p className="font-semibold py-1">MRP: {item.mrp}</p>
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
    </>
  );
};

export default Search;
