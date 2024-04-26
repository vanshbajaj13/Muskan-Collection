import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Repurchase = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [productDetails, setProductDetails] = useState(null);
  const [newQuantity, setNewQuantity] = useState({ value: "", isValid: false });
  const [isLoading, setIsLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function isUserLoggedIn() {
      if (!window.localStorage.getItem("userInfo")) {
        navigate("/login");
      }
    }
    isUserLoggedIn();
  }, [navigate]);

  const fetchProductDetails = async () => {
    try {
      setFetching(true);
      const response = await fetch(`/api/item/code/${code}`, {
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch item details");
      }
      const item = await response.json();
      setProductDetails(item);
      setError("");
    } catch (error) {
      setError("No Product found or Error...");
      setProductDetails(null);
    } finally {
      setFetching(false);
    }
  };

  const handleQuantityIncrease = async () => {
    if (!productDetails || !newQuantity.isValid) return;

    setIsLoading(true);
    try {
      const updatedQuantity =
        parseInt(productDetails.quantityBuy, 10) + parseInt(newQuantity.value, 10);
      const response = await fetch(`/api/item/${code}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantityBuy: updatedQuantity }),
      });
      if (response.ok) {
        setProductDetails((prevDetails) => ({
          ...prevDetails,
          quantityBuy: updatedQuantity,
        }));
        setError("");
        setNewQuantity({ ...newQuantity, value: "", isValid: false });
      } else {
        setError("Failed to update quantity");
      }
    } catch (error) {
      setError("Error updating quantity");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    if(parseFloat(value) < 0)
    {
        return;
    }
    const isValid = !isNaN(value) && value !== "" && parseInt(value) >= 0;
    setNewQuantity({ value, isValid });
  };

  return (
    <div className="bg-white p-6 shadow-md rounded-md">
      <h2 className="text-2xl font-semibold mb-6">Increase Quantity to Buy</h2>

      <div className="flex mb-4">
        <input
          type="text"
          placeholder="Enter Code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="w-full p-2 border rounded-md mr-2"
        />
        <button
          onClick={fetchProductDetails}
          disabled={fetching}
          className={`px-4 py-2 bg-indigo-500 text-white rounded-md focus:outline-none ${
            fetching ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {fetching ? "Searching..." : "Search"}
        </button>
      </div>

      {productDetails && (
        <>
        <div className="flex items-center justify-evenly border-t border-gray-300 mt-4 pt-4">
                <div className="text-black">
                  <p className="font-semibold py-1">Product: {productDetails.product}</p>
                  <p className="font-semibold py-1">
                    Category: {productDetails.category}
                  </p>
                  <p className="font-semibold py-1">Size: {productDetails.size}</p>
                  <p className="font-semibold py-1">
                    Quantity Available: {productDetails.quantityBuy - productDetails.quantitySold}
                  </p>
                  <p className="font-semibold py-1">
                    Quantity Sold: {productDetails.quantitySold}
                  </p>
                  <p className="font-semibold py-1">MRP: {productDetails.mrp}</p>
                </div>
              </div>
          <input
            type="number"
            placeholder="Enter New Quantity"
            value={newQuantity.value}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md mb-4"
          />


          <button
            onClick={handleQuantityIncrease}
            disabled={!newQuantity.isValid || isLoading}
            className={`w-full py-2 px-4 rounded-md focus:outline-none ${
                !newQuantity.isValid || isLoading
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-indigo-500 text-white"
            }`}
          >
            {isLoading ? "Updating..." : "Increase Quantity"}
          </button>
        </>
      )}
          {error && <p className="text-red-500 text-center">{error}</p>}
    </div>
  );
};

export default Repurchase;
