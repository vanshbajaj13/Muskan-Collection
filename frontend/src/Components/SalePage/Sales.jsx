import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Sale = () => {
  const naviagate = useNavigate();

  const [productDetails, setProductDetails] = useState({
    code: "",
    sellingPrice: "",
    quantitySold: 1,
  });

  const [buttonActive, setButtonActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [availableQuantity, setAvailableQuantity] = useState(0);
  const [fetchingQuantity, setFetchingQuantity] = useState(false);

  useEffect(() => {
    function isUserLoggedIn() {
      if (!window.localStorage.getItem("userInfo")) {
        naviagate("/login");
      }
    }
    isUserLoggedIn();
  }, [naviagate]);

  // Fetch available quantity when brand, product, category, mrp, or size changes
  const fetchAvailableQuantity = async () => {
    try {
      if (productDetails.code) {
        setFetchingQuantity(true);
        const response = await fetch(
          `/api/availablequantity?code=${productDetails.code}`,
          {
            headers: {
              Authorization: `Bearer ${
                JSON.parse(window.localStorage.getItem("userInfo")).token
              }`,
            },
          }
        );
        if (response.ok) {
          var { availableQuantity } = await response.json();
          setAvailableQuantity(availableQuantity);
          if (availableQuantity > 0) {
            setButtonActive(true);
          }
        } else {
          setButtonActive(false);
          setAvailableQuantity(0);
          console.log("Failed to fetch available quantity");
          if (response.status === 401) {
            window.localStorage.clear();
            naviagate("/login");
          }
        }
        setFetchingQuantity(false);
      } else {
        setAvailableQuantity(0);
      }
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    fetchAvailableQuantity();
    // eslint-disable-next-line
  }, [productDetails.code]);

  // handle changes in inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Ensure quantitySold and sellingPrice are positive values
    if (name === "sellingPrice" && parseFloat(value) < 0) {
      return;
    }

    setProductDetails((prevDetails) => ({
      ...prevDetails,
      [name]: value.toUpperCase(),
    }));
  };

  const handleSale = async () => {
    setIsLoading(true);
    setButtonActive(false);
    try {
      const response = await fetch("/api/sell", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
        body: JSON.stringify(productDetails),
      });

      if (response.ok) {
        // Reset the form after successful sale
        setProductDetails({
          code: "",
          sellingPrice: "",
          quantitySold: 1,
        });
        console.log("Product sold from inventory successfully!");
        setShowTooltip(true);
        setTimeout(() => {
          setShowTooltip(false);
        }, 3000);
      } else if (response.status === 401) {
        window.localStorage.clear();
        naviagate("/login");
      } else {
        console.error("Failed to sell product from inventory");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Sale</h2>

      <div className="mb-4">
        <label
          htmlFor="code"
          className="block text-sm font-medium text-gray-700"
        >
          Code
        </label>
        <input
          name="code"
          type="string"
          placeholder="Product code"
          value={productDetails.code}
          onChange={handleInputChange}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        ></input>
      </div>
      <div className="mb-4">
        <label
          htmlFor="sellingPrice"
          className="block text-sm font-medium text-gray-700"
        >
          Selling Price
        </label>
        <input
          type="number"
          placeholder="Selling price"
          name="sellingPrice"
          value={productDetails.sellingPrice}
          onChange={handleInputChange}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <p className="mb-4 text-green-500">
        {/* Update with your available quantity logic */}
        Available Quantity:{" "}
        {fetchingQuantity ? "Fetching Quantity..." : availableQuantity}
      </p>

      {showTooltip && (
        <>
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 999 }}
          >
            <div
              className="flex items-center justify-center bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative w-full m-5"
              role="alert"
            >
              <strong className="font-bold">Product sold</strong>
              <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
                <svg
                  className="fill-current h-6 w-6 text-green-500 cursor-pointer"
                  role="button"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  onClick={() => setShowTooltip(false)}
                >
                  <title>Close</title>
                  <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" />
                </svg>
              </span>
            </div>
          </div>
        </>
      )}

      <button
        onClick={handleSale}
        disabled={!buttonActive || isLoading}
        className={`w-full py-2 px-4 rounded focus:outline-none focus:shadow-outline-indigo active:bg-indigo-800 ${
          buttonActive
            ? "bg-indigo-500 text-white"
            : "bg-gray-300 text-black opacity-50 cursor-not-allowed"
        }`}
      >
        {isLoading ? "Selling..." : "Sell"}
      </button>
    </div>
  );
};

export default Sale;
