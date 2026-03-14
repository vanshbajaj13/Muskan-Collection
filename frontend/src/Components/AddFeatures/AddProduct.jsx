import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AddProduct = () => {
  const navigate = useNavigate();
  const [productList, setProductList] = useState([]);
  const [newProduct, setNewProduct] = useState("");
  const [productTooltip, setProductTooltip] = useState({ show: false, message: "", success: true });
  const [productLoading, setProductLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, confirmText: "" });

  const token = () => JSON.parse(window.localStorage.getItem("userInfo")).token;

  useEffect(() => {
    if (!window.localStorage.getItem("userInfo")) navigate("/login");
    fetchProductList();
    // eslint-disable-next-line
  }, []);

  const fetchProductList = async () => {
    try {
      const response = await fetch("/api/dropdownoption/productlist", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProductList(data);
      } else if (response.status === 401) {
        window.localStorage.clear();
        navigate("/login");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.trim()) return;
    setProductLoading(true);
    try {
      const response = await fetch("/api/dropdownoption/productlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ name: newProduct.trim() }),
      });
      if (response.ok) {
        setNewProduct("");
        setProductTooltip({ show: true, message: "Product added successfully!", success: true });
        fetchProductList();
      } else {
        const err = await response.json();
        setProductTooltip({ show: true, message: err.error || "Failed to add product", success: false });
      }
    } catch (error) {
      console.error(error);
      setProductTooltip({ show: true, message: "Something went wrong", success: false });
    } finally {
      setProductLoading(false);
      setTimeout(() => setProductTooltip({ show: false, message: "", success: true }), 3000);
    }
  };

  const handleDeleteProduct = async () => {
    if (deleteModal.confirmText !== "CONFIRM") return;
    try {
      await fetch(`/api/dropdownoption/productlist/${deleteModal.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      setDeleteModal({ open: false, id: null, confirmText: "" });
      fetchProductList();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
    {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-md w-80">
            <p className="mb-4 font-medium">
              Type <span className="font-mono text-red-600">CONFIRM</span> to delete this product:
            </p>
            <div className="flex justify-center mb-4">
              <input
                type="text"
                value={deleteModal.confirmText}
                onChange={(e) =>
                  setDeleteModal((prev) => ({ ...prev, confirmText: e.target.value.toUpperCase() }))
                }
                className="border p-2 rounded-md text-center w-full"
                placeholder="Type CONFIRM"
              />
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setDeleteModal({ open: false, id: null, confirmText: "" })}
                className="w-full m-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={deleteModal.confirmText !== "CONFIRM"}
                className={` w-full m-1 px-4 py-2 rounded-md ${
                  deleteModal.confirmText !== "CONFIRM"
                    ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                    : "bg-red-500 text-white hover:bg-red-700"
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Manage Products</h2>
      <p className="text-sm text-gray-500 mb-6">
        Products are independent of brands and available across all purchases.
      </p>

      {/* Add new product */}
      <div className="bg-white p-4 rounded shadow-md mb-4">
        <label className="block mb-2 font-medium">Add New Product:</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter product name"
            value={newProduct}
            onChange={(e) => setNewProduct(e.target.value.toLowerCase())}
            className="border p-2 flex-1 rounded"
          />
          <button
            onClick={handleAddProduct}
            disabled={!newProduct.trim() || productLoading}
            className={`bg-green-500 text-white py-2 px-4 rounded ${
              !newProduct.trim() || productLoading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-green-700"
            }`}
          >
            {productLoading ? "Adding..." : "Add"}
          </button>
        </div>
        {productTooltip.show && (
          <div className={`mt-2 font-medium ${productTooltip.success ? "text-green-500" : "text-red-500"}`}>
            {productTooltip.message}
          </div>
        )}
      </div>

      {/* Product list */}
      <div className="bg-white p-4 rounded shadow-md">
        <p className="text-sm text-gray-500 mb-3">{productList.length} products total</p>
        <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
          {productList.map((p) => (
            <div
              key={p._id}
              className="flex justify-between items-center border rounded px-3 py-2"
            >
              <span className="text-sm">{p.name}</span>
              <button
                onClick={() => setDeleteModal({ open: true, id: p._id, confirmText: "" })}
                className="text-red-400 w-5 hover:text-red-600 text-lg ml-2 hover:scale-110"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
    </>
  );
};

export default AddProduct;