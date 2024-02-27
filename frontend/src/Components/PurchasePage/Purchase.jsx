import React, { useState, useEffect } from "react";

const Purchase = () => {
  const [productDetails, setProductDetails] = useState({
    brand: "",
    product: "",
    category: "",
    size: "",
    quantityBuy: "",
    mrp: "",
  });

  const [dropdownOptions, setDropdownOptions] = useState({
    products: [],
    categories: [],
    sizes: [],
  });
  const [productOfSelectedBrand, setProductOfSelectedBrand] = useState([]);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Fetch dropdown options from the server
  const fetchDropdownOptions = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/dropdownoption/dropdownoptions"
      );
      if (response.ok) {
        const options = await response.json();
        setDropdownOptions(options);
      } else {
        console.error("Failed to fetch dropdown options");
      }
    } catch (error) {
      console.log(error);
    }
  };

  // form validation
  const checkFormValidity = () => {
    const isFormValid = Object.values(productDetails).every(
      (value) => value !== ""
    );
    setIsFormValid(isFormValid);
  };

  useEffect(() => {
    fetchDropdownOptions();
  }, []);

  useEffect(() => {
    // Check form validity whenever any form field changes
    checkFormValidity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productDetails]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Ensure quantity and mrp are positive values
    if ((name === "quantityBuy" || name === "mrp") && parseFloat(value) < 0) {
      return;
    }

    setProductDetails((prevDetails) => ({
      ...prevDetails,
      [name]: value,
    }));
  };

  const handleBrandChange = (e) => {
    const { name, value } = e.target;
    var selectedBrandProducts = dropdownOptions.products.filter(
      (product) => product.brand === value
    );
    selectedBrandProducts = selectedBrandProducts[0]?.products || [];
    setProductOfSelectedBrand(selectedBrandProducts);
    setProductDetails((prevDetails) => ({
      ...prevDetails,
      [name]: value,
    }));
  };

  const handlePurchase = async () => {
    // Validation: Check if all fields are filled
    if (!isFormValid) { 
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productDetails),
      });

      if (response.ok) {
        // Reset the form after successful purchase
        setProductDetails({
          brand: "",
          product: "",
          category: "",
          size: "",
          quantityBuy: "",
          mrp: "",
        });
        console.log("Product added to inventory successfully!");
        setShowTooltip(true);
        setTimeout(() => {
          setShowTooltip(false);
        }, 3000);
      } else {
        console.error("Failed to add product to inventory");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 shadow-md rounded-md">
      <h2 className="text-2xl font-semibold mb-6">Purchase</h2>

      <select
        name="brand"
        value={productDetails.brand}
        onChange={handleBrandChange}
        className="w-full p-2 border rounded-md"
      >
        <option value="" disabled>
          Select Brand
        </option>
        {dropdownOptions.products.map((product) => (
          <option key={product._id} value={product.brand}>
            {product.brand}
          </option>
        ))}
      </select>

      <select
        name="product"
        value={productDetails.product}
        onChange={handleInputChange}
        className="w-full mt-4 p-2 border rounded-md"
      >
        <option value="" disabled>
          Select Product
        </option>
        {productOfSelectedBrand.map((product) => (
          <option key={product} value={product}>
            {product}
          </option>
        ))}
      </select>

      <select
        name="category"
        value={productDetails.category}
        onChange={handleInputChange}
        className="w-full mt-4 p-2 border rounded-md"
      >
        <option value="" disabled>
          Select Sub-category
        </option>
        {dropdownOptions.categories.map((categoryObj) =>
          categoryObj.category.map((subcategory) => (
            <option key={subcategory} value={subcategory}>
              {subcategory}
            </option>
          ))
        )}
      </select>

      <select
        name="size"
        value={productDetails.size}
        onChange={handleInputChange}
        className="w-full mt-4 p-2 border rounded-md"
      >
        <option value="" disabled>
          Select Size
        </option>
        {dropdownOptions.sizes.map((sizeObj) =>
          sizeObj.size.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))
        )}
      </select>

      <input
        type="number"
        placeholder="Quantity Buy"
        name="quantityBuy"
        value={productDetails.quantityBuy}
        onChange={handleInputChange}
        className="w-full mt-4 p-2 border rounded-md"
      />

      <input
        type="number"
        placeholder="MRP"
        name="mrp"
        value={productDetails.mrp}
        onChange={handleInputChange}
        className="w-full mt-4 p-2 border rounded-md"
      />

      {showTooltip && (
        <div className="text-green-500 text-sm mt-2">
          Product added to inventory
        </div>
      )}

      <button
        onClick={handlePurchase}
        disabled={!isFormValid || isLoading}
        className={`w-full mt-6 py-2 px-4 rounded focus:outline-none ${
          isFormValid
            ? "bg-indigo-500 text-white"
            : "bg-gray-500 text-gray-500 opacity-50 cursor-not-allowed"
        }`}
      >
        {isLoading ? "Adding..." : "Add to Inventory"}
      </button>
    </div>
  );
};

export default Purchase;
