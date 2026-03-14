import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AddBrandProduct = () => {
  const navigate = useNavigate();
  const [brandsData, setBrandsData] = useState([]);
  const [newBrand, setNewBrand] = useState("");
  const [brandTooltip, setBrandTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const token = () => JSON.parse(window.localStorage.getItem("userInfo")).token;

  useEffect(() => {
    if (!window.localStorage.getItem("userInfo")) navigate("/login");
    fetchBrands();
    // eslint-disable-next-line
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await fetch("/api/dropdownoption/products", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (response.ok) {
        const data = await response.json();
        data.sort((a, b) => a.brand.localeCompare(b.brand));
        setBrandsData(data);
      } else if (response.status === 401) {
        window.localStorage.clear();
        navigate("/login");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleAddBrand = async () => {
    if (!newBrand.trim()) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/dropdownoption/products", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ brand: newBrand.trim(), products: [] }),
      });
      if (response.ok) {
        setNewBrand("");
        setBrandTooltip(true);
        setTimeout(() => setBrandTooltip(false), 3000);
        fetchBrands();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrandClick = (index) => {
    const updated = [...brandsData];
    updated[index].expanded = !updated[index].expanded;
    setBrandsData(updated);
  };

  return (
    <div className="p-4 bg-gray-100">
      <h2 className="text-2xl font-bold mb-4">Manage Brands</h2>

      {/* Brands list */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Existing Brands</h3>
        {brandsData.map((brand, index) => (
          <div key={index} className="mb-2 bg-white p-4 rounded shadow-md">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => handleBrandClick(index)}
            >
              <strong>{brand.brand}</strong>
            </div>
          </div>
        ))}
      </div>

      {/* Add brand */}
      <div className="bg-white p-4 rounded shadow-md">
        <label className="block mb-2 font-medium">Add New Brand:</label>
        <input
          type="text"
          placeholder="Enter Brand Name"
          value={newBrand}
          onChange={(e) => setNewBrand(e.target.value.toUpperCase())}
          className="border p-2 w-full mb-2 rounded"
        />
        {brandTooltip && (
          <div className="text-green-500 mb-2">Brand added successfully!</div>
        )}
        <button
          onClick={handleAddBrand}
          disabled={!newBrand.trim() || isLoading}
          className={`bg-green-500 text-white py-2 px-4 rounded ${
            !newBrand.trim() || isLoading
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