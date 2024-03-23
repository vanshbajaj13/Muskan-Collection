import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AddBrandProduct = () => {
  const navigate = useNavigate();

  const [brandsData, setBrandsData] = useState([]);
  const [newBrand, setNewBrand] = useState("");
  const [newBrandProducts, setNewBrandProducts] = useState([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch available brands and products from the server
    const fetchBrandsData = async () => {
      try {
        const response = await fetch("/api/dropdownoption/products", {
          headers: {
            Authorization: `Bearer ${
              JSON.parse(window.localStorage.getItem("userInfo")).token
            }`,
          },
        });

        if (response.ok) {
          const brandsData = await response.json();
          sortBrandsAndProducts(brandsData);
          setBrandsData(brandsData);
        } else if (response.status === 401) {
          window.localStorage.clear();
          navigate("/login");
        } else {
          console.error("Failed to fetch brands and products");
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchBrandsData();
  }, [navigate]);

  // function to sort brand and product
  function sortBrandsAndProducts(data) {
    // Sort brands alphabetically
    data.sort((a, b) => a.brand.localeCompare(b.brand));

    // Sort products within each brand alphabetically
    data.forEach((brand) => {
      brand.products.sort((a, b) => a.localeCompare(b));
    });

    return data;
  }
  useEffect(() => {
    sortBrandsAndProducts(brandsData);
  }, [brandsData]);

  const handleNewBrandChange = (e) => {
    setNewBrand((e.target.value).toUpperCase());
  };

  const handleNewBrandProductsChange = (e) => {
    setNewBrandProducts(
      e.target.value.split(",").map((product) => product.trim())
    );
  };

  const handleAddBrand = async () => {
    if (newBrand.trim() !== "") {
      try {
        setIsLoading(true);
        const response = await fetch("/api/dropdownoption/products", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              JSON.parse(window.localStorage.getItem("userInfo")).token
            }`,
          },
          body: JSON.stringify({
            brand: newBrand,
            products: newBrandProducts,
          }),
        });

        if (response.ok) {
          const updatedBrandsData = [...brandsData];
          updatedBrandsData.push({
            brand: newBrand,
            products: newBrandProducts,
          });

          setBrandsData(updatedBrandsData);
          setNewBrand("");
          setNewBrandProducts([]);
          setShowTooltip(true);

          setTimeout(() => {
            setShowTooltip(false);
          }, 3000);
          setIsLoading(false);
        } else {
          console.error("Failed to add brand");
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  const isAddBrandButtonDisabled = newBrand.trim() === "";

  const handleBrandClick = (index) => {
    const updatedBrandsData = [...brandsData];
    updatedBrandsData[index].expanded = !updatedBrandsData[index].expanded;
    setBrandsData(updatedBrandsData);
  };

  return (
    <div className="p-4 bg-gray-100">
      <h2 className="text-2xl font-bold mb-4">Add Brand and Product</h2>

      {/* Display Brands and Products */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Brands and Products</h3>
        {brandsData.map((brand, index) => (
          <div key={index} className="mb-2 bg-white p-4 rounded shadow-md">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => handleBrandClick(index)}
            >
              <strong>{brand.brand}</strong>
              <p
                className={`transition transform ${
                  brand.expanded ? "" : "rotate-180"
                }`}
              >
                ^
              </p>
            </div>
            {brand.expanded && (
              <ul className="list-disc ml-6">
                {brand.products.map((product, productIndex) => (
                  <li
                    key={productIndex}
                    className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-200"
                  >
                    {product}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Add New Brand Section */}
      <div className="mb-4 bg-white p-4 rounded shadow-md">
        <label className="block mb-2">Add New Brand:</label>
        <input
          type="text"
          placeholder="Enter New Brand"
          value={newBrand}
          onChange={handleNewBrandChange}
          className="border p-2 w-full mb-2"
        />
        <textarea
          placeholder="Enter Products (comma-separated)"
          value={newBrandProducts.join(", ")}
          onChange={handleNewBrandProductsChange}
          className="border p-2 w-full"
        />
        {showTooltip && (
          <div className="text-green-500 mt-2">Brand added successfully!</div>
        )}
        <button
          onClick={handleAddBrand}
          disabled={isAddBrandButtonDisabled}
          className={`bg-green-500 text-white py-2 px-4 rounded focus:outline-none ${
            isAddBrandButtonDisabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-green-700"
          }`}
        >
          {isLoading ? "Adding..." : "Add Brand"}
        </button>
      </div>
    </div>
  );
};

export default AddBrandProduct;
