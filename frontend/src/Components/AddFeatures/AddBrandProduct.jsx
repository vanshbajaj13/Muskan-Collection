// AddBrandAndProduct.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AddBrandProduct = () => {
  const naviagate = useNavigate();
  const [brandsData, setBrandsData] = useState([]);
  const [newBrand, setNewBrand] = useState("");
  const [newBrandProducts, setNewBrandProducts] = useState([""]);
  const [selectedBrandIndex, setSelectedBrandIndex] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // auto navigate to login
  useEffect(() => {
    function isUserLogedIn() {
      if (!window.localStorage.getItem("userInfo")) {
        naviagate("/login");
      }
    }
    isUserLogedIn();
  }, [naviagate]);
  useEffect(() => {
    // Fetch available brands and products from the server
    const fetchBrandsData = async () => {
      if (window.localStorage.getItem("userInfo")) {
        try {
          const response = await fetch(
            "/api/dropdownoption/products",
            {
              headers: {
                Authorization: `Bearer ${
                  JSON.parse(window.localStorage.getItem("userInfo")).token
                }`,
              },
            }
          );
          if (response.ok) {
            const brandsData = await response.json();
            setBrandsData(brandsData);
          } else if (response.status === 401) {
            window.localStorage.clear();
            naviagate("/login");
          } else {
            console.error("Failed to fetch brands and products");
          }
        } catch (error) {
          console.log(error);
        }
      }
    };

    fetchBrandsData();
    // eslint-disable-next-line
  }, []);

  const handleBrandChange = (brandIndex) => {
    setSelectedBrandIndex(brandIndex);
    setNewBrand("");
    setNewBrandProducts([""]);
  };

  const handleNewBrandChange = (e) => {
    setNewBrand(e.target.value);
  };

  const handleAddBrand = () => {
    // Add new brand to the list
    if (newBrand.trim() !== "") {
      setBrandsData([...brandsData, { brand: newBrand, products: [] }]);
      setNewBrand("");
    }
  };

  const handleProductChange = (productIndex, product) => {
    const updatedProducts = [...newBrandProducts];
    updatedProducts[productIndex] = product;
    setNewBrandProducts(updatedProducts);
  };

  const handleAddProduct = () => {
    // Add new product to the list
    setNewBrandProducts([...newBrandProducts, ""]);
  };

  const handleSave = async () => {
    // Save brand and products to the server
    // Set loading state to true
    setIsLoading(true);
    const selectedBrand = brandsData[selectedBrandIndex];
    try {
      const response = await fetch(
        "/api/dropdownoption/products",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${
              JSON.parse(window.localStorage.getItem("userInfo")).token
            }`,
          },
          body: JSON.stringify({
            brand: selectedBrand.brand,
            products: newBrandProducts.filter(
              (product) => product.trim() !== ""
            ),
          }),
        }
      );
      console.log("here");
      if (response.ok) {
        // Update brandsData with the saved data
        const updatedBrandsData = [...brandsData];
        const selectedBrand = updatedBrandsData[selectedBrandIndex];

        // Filter out any empty strings from newBrandProducts
        const filteredNewProducts = newBrandProducts.filter(
          (product) => product.trim() !== ""
        );

        // Append the new products to the existing products for the selected brand
        selectedBrand.products = [
          ...selectedBrand.products,
          ...filteredNewProducts,
        ];

        setBrandsData(updatedBrandsData);
        setNewBrand("");
        setNewBrandProducts([""]);
        setSelectedBrandIndex(null);
        // Show the tooltip
        setShowTooltip(true);

        // Hide the tooltip after a certain duration
        setTimeout(() => {
          setShowTooltip(false);
        }, 3000);
      } else {
        console.error("Failed to save brand and products");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      // Set loading state to false after the request completes
      setIsLoading(false);
    }
  };

  const isAddProductButtonDisabled = newBrandProducts.every(
    (product) => product.trim() === ""
  );

  const isAddBrandButtonDisabled = newBrand.trim() === "";

  const isSaveButtonEnabled =
    newBrand.trim() !== "" ||
    newBrandProducts.some((product) => product.trim() !== "");

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Add Brand and Product</h2>
      <div className="flex border p-2">
        {/* Brand List */}
        <div className="w-1/3 pr-4">
          <h3 className="text-lg font-semibold mb-2">Brands</h3>
          <ul className="space-y-2">
            {brandsData.map((brand, index) => (
              <li
                key={index}
                className={`cursor-pointer border-b py-2 ${
                  index === selectedBrandIndex ? "font-bold" : ""
                }`}
                onClick={() => handleBrandChange(index)}
              >
                {brand.brand}
              </li>
            ))}
          </ul>
        </div>

        {/* Products Column */}
        <div className="w-2/3 pl-4">
          {selectedBrandIndex !== null && (
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Products for {brandsData[selectedBrandIndex].brand}
              </h3>
              <ul className="space-y-2">
                {brandsData[selectedBrandIndex].products.map(
                  (product, index) => (
                    <li key={index} className="border-b py-2">
                      {product}
                    </li>
                  )
                )}
              </ul>
              <div className="mt-4">
                {newBrandProducts.map((product, index) => (
                  <div key={index} className="mb-2">
                    <input
                      type="text"
                      placeholder={`Product ${index + 1}`}
                      value={product}
                      onChange={(e) =>
                        handleProductChange(index, e.target.value)
                      }
                      className="border p-2 w-full"
                    />
                  </div>
                ))}
                <button
                  onClick={handleAddProduct}
                  className={`bg-blue-500 text-white py-2 px-4 rounded focus:outline-none hover:bg-blue-700 ${
                    isAddProductButtonDisabled
                      ? "cursor-not-allowed opacity-50"
                      : ""
                  }`}
                  disabled={isAddProductButtonDisabled}
                >
                  Add Product
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Add New Brand Section */}
      <div className="mt-8">
        <label className="block mb-2">Add New Brand:</label>
        <input
          type="text"
          placeholder="Enter New Brand"
          value={newBrand}
          onChange={handleNewBrandChange}
          className="border p-2 w-full"
        />
        <button
          onClick={handleAddBrand}
          className={`bg-green-500 text-white py-2 px-4 rounded focus:outline-none hover:bg-green-700 ${
            isAddBrandButtonDisabled ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={isAddBrandButtonDisabled}
        >
          Add Brand
        </button>
      </div>

      {/* Save Button */}
      <div className="mt-8">
        {showTooltip && (
          <div className="text-green-500 mt-0">Data saved successfully!</div>
        )}
        <button
          onClick={handleSave}
          disabled={!isSaveButtonEnabled}
          className={`py-2 px-4 rounded focus:outline-none ${
            isSaveButtonEnabled
              ? "bg-indigo-500 hover:bg-indigo-700 text-white"
              : "bg-gray-500 text-black opacity-50 cursor-not-allowed"
          }`}
        >
          {isLoading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
};

export default AddBrandProduct;
