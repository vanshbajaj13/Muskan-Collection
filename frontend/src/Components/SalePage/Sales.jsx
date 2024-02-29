import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Sale = () => {
  const naviagate = useNavigate();

  const [productDetails, setProductDetails] = useState({
    brand: "",
    product: "",
    category: "",
    size: "",
    quantitySold: "",
    sellingPrice: "",
  });

  const [dropdownOptions, setDropdownOptions] = useState({
    products: [],
    categories: [],
    sizes: [],
  });

  const [productOfSelectedBrand, setProductOfSelectedBrand] = useState([]);
  const [availableQuantity, setAvailableQuantity] = useState(0);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    function isUserLogedIn() {
      if (!window.localStorage.getItem("userInfo")) {
        naviagate("/login");
      }
    }
    isUserLogedIn();
  }, [naviagate]);

  // Fetch available quantity when brand, product, category, or size changes
  const fetchAvailableQuantity = async () => {
    try {
      if (
        productDetails.brand &&
        productDetails.product &&
        productDetails.category &&
        productDetails.size
      ) {
        const response = await fetch(
          `http://localhost:5000/api/availablequantity?brand=${productDetails.brand}&product=${productDetails.product}&category=${productDetails.category}&size=${productDetails.size}`,
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
        } else {
          setAvailableQuantity(0);
          console.log("Failed to fetch available quantity");
        }
      } else {
        setAvailableQuantity(0);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // Fetch dropdown options from the server
  const fetchDropdownOptions = async () => {
    if (window.localStorage.getItem("userInfo")) {
      try {
        const response = await fetch(
          "http://127.0.0.1:5000/api/dropdownoption/dropdownoptions",
          {
            headers: {
              Authorization: `Bearer ${
                JSON.parse(window.localStorage.getItem("userInfo")).token
              }`,
            },
          }
        );
        if (response.ok) {
          const options = await response.json();
          setDropdownOptions(options);
        } else {
          console.error("Failed to fetch dropdown options");
          window.localStorage.clear();
          naviagate("/login");
        }
      } catch (error) {
        console.log(error);
      }
    }
  };

  // form validation
  const checkFormValidity = ({
    brand,
    product,
    category,
    size,
    quantitySold,
    sellingPrice,
  }) =>
    brand !== "" &&
    product !== "" &&
    category !== "" &&
    size !== "" &&
    availableQuantity > 0 &&
    parseInt(quantitySold) > 0 &&
    parseInt(sellingPrice) > 0;

  useEffect(() => {
    fetchDropdownOptions();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    fetchAvailableQuantity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    productDetails.brand,
    productDetails.product,
    productDetails.category,
    productDetails.size,
  ]);

  useEffect(() => {
    setIsFormValid(checkFormValidity(productDetails));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productDetails, availableQuantity]);

  // handle changes in inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Ensure quantitySold and sellingPrice are positive values
    if (
      (name === "quantitySold" || name === "sellingPrice") &&
      parseFloat(value) < 0
    ) {
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

  const handleSale = async () => {
    // Validation: Check if all fields are filled
    if (!isFormValid) {
      console.error(
        "Please fill in all fields and ensure the quantity sold and selling price are positive values."
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/sell", {
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
          brand: "",
          product: "",
          category: "",
          size: "",
          quantitySold: "",
          sellingPrice: "",
        });
        console.log("Product sold from inventory successfully!");
        setShowTooltip(true);
        setTimeout(() => {
          setShowTooltip(false);
        }, 3000);
      }
      else if (response.status === 401) {
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
          htmlFor="brand"
          className="block text-sm font-medium text-gray-700"
        >
          Brand
        </label>
        <select
          name="brand"
          value={productDetails.brand}
          onChange={handleBrandChange}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
      </div>

      <div className="mb-4">
        <label
          htmlFor="product"
          className="block text-sm font-medium text-gray-700"
        >
          Product
        </label>
        <select
          name="product"
          value={productDetails.product}
          onChange={handleInputChange}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
      </div>

      <div className="mb-4">
        <label
          htmlFor="category"
          className="block text-sm font-medium text-gray-700"
        >
          Sub-category
        </label>
        <select
          name="category"
          value={productDetails.category}
          onChange={handleInputChange}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
      </div>

      <div className="mb-4">
        <label
          htmlFor="size"
          className="block text-sm font-medium text-gray-700"
        >
          Size
        </label>
        <select
          name="size"
          value={productDetails.size}
          onChange={handleInputChange}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
      </div>

      <p className="mb-4">Available Quantity: {availableQuantity}</p>

      <div className="mb-4">
        <label
          htmlFor="quantitySold"
          className="block text-sm font-medium text-gray-700"
        >
          Quantity Sold
        </label>
        <input
          type="number"
          placeholder="Quantity Sold"
          name="quantitySold"
          value={productDetails.quantitySold}
          onChange={handleInputChange}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
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

      {showTooltip && (
        <div className="text-green-500 text-sm mb-4">
          Product sold from inventory successfully!
        </div>
      )}

      <button
        onClick={handleSale}
        disabled={!isFormValid || isLoading}
        className={`w-full py-2 px-4 rounded focus:outline-none focus:shadow-outline-indigo active:bg-indigo-800 ${
          isFormValid
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
