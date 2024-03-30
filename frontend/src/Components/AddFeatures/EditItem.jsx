import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const EditItem = () => {
  const navigate = useNavigate();
  const { code } = useParams();
  const [originalProductDetails, setOriginalProductDetails] = useState({
    brand: "",
    product: "",
    category: "",
    size: "",
    mrp: "",
    quantityBuy: "",
  });
  const [productDetails, setProductDetails] = useState({
    ...originalProductDetails,
  });
  const [dropdownOptions, setDropdownOptions] = useState({
    products: [],
    categories: [],
    sizes: [{ size: [] }],
  });
  const [isFormValid, setIsFormValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [showUpdateTooltip, setShowUpdateTooltip] = useState(false);
  const [showDeleteTooltip, setShowDeleteTooltip] = useState(false);
  const [confirmBox, setConfirmBox] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    function isUserLoggedIn() {
      if (!window.localStorage.getItem("userInfo")) {
        navigate("/login");
      }
    }
    isUserLoggedIn();
  }, [navigate]);

  // Fetch item details and dropdown options from the server
  const fetchDropdownOptions = async () => {
    try {
      setFetching(true);
      if (!window.localStorage.getItem("userInfo")) {
        throw new Error("User not logged in");
      }

      const [itemResponse, dropdownResponse] = await Promise.all([
        fetch(`/api/item/code/${code}`, {
          headers: {
            Authorization: `Bearer ${
              JSON.parse(window.localStorage.getItem("userInfo")).token
            }`,
          },
        }),
        fetch("/api/dropdownoption/dropdownoptions", {
          headers: {
            Authorization: `Bearer ${
              JSON.parse(window.localStorage.getItem("userInfo")).token
            }`,
          },
        }),
      ]);

      if (!itemResponse.ok) {
        throw new Error("Failed to fetch item details");
      }
      const item = await itemResponse.json();
      setOriginalProductDetails(item);
      setProductDetails(item);

      if (!dropdownResponse.ok) {
        throw new Error("Failed to fetch dropdown options");
      }
      const options = await dropdownResponse.json();
      // Filter products based on the brand
      const filteredProducts = options.products.filter(
        (product) => product.brand === item.brand
      );
      // Sort products within each brand
      filteredProducts.forEach((brand) => {
        brand.products.sort();
      });
      options.categories[0].category.sort((a, b) => a.localeCompare(b));
      setDropdownOptions({ ...options, products: filteredProducts });
    } catch (error) {
      console.error("Error fetching dropdown options and item details:", error);
      // Handle error here, for example, redirect to login page or display error message
      window.localStorage.clear();
      navigate("/login");
    } finally {
      setFetching(false);
    }
  };

  // Form validation
  const checkFormValidity = () => {
    const isAnyFieldChanged = Object.keys(originalProductDetails).some(
      // eslint-disable-next-line
      (key) => originalProductDetails[key] != productDetails[key]
    );
    var valid = isAnyFieldChanged && productDetails.mrp !== "" && productDetails.quantityBuy !== "";
    setIsFormValid(valid);
  };

  useEffect(() => {
    checkFormValidity();
    // eslint-disable-next-line
  }, [productDetails]);

  useEffect(() => {
    fetchDropdownOptions();
    // eslint-disable-next-line
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Ensure quantity and mrp are positive values
    if (name === "mrp" && parseFloat(value) < 0) {
      return;
    }
    if (name === "quantityBuy" && parseFloat(value) < 0) {
      return;
    }

    setProductDetails((prevDetails) => ({
      ...prevDetails,
      [name]: value,
    }));
  };

  const handleItemUpdate = async () => {
    setIsLoading(true);

    try {
      // Filter out fields that have been changed compared to the original product details
      const changedFields = Object.entries(productDetails).reduce(
        (acc, [key, value]) => {
          if (originalProductDetails[key] !== value) {
            acc[key] = value;
          }
          return acc;
        },
        {}
      );
      const response = await fetch(`/api/item/${code}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changedFields), // Send only non-empty fields
      });
      if (response.ok) {
        navigate("/history");
      } else {
        console.error("Failed to update purchase");
        setShowUpdateTooltip(true);
        setTimeout(() => {
          setShowUpdateTooltip(false);
        }, 3000);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDeleteModal = () => {
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setConfirmText("");
    setIsDeleteModalOpen(false);
  };

  const handleUserInputChange = (e) => {
    setConfirmText(e.target.value.toUpperCase());
  };

  const handleItemDelete = async () => {
    if (confirmText === "CONFIRM") {
      try {
        const response = await fetch(`/api/item/${code}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${
              JSON.parse(window.localStorage.getItem("userInfo")).token
            }`,
          },
        });
        if (response.ok) {
          navigate("/history");
        } else {
          console.error("Failed to delete item");
          setIsDeleteModalOpen(false);
          setShowDeleteTooltip(true);
          setTimeout(() => {
            setShowDeleteTooltip(false);
          }, 3000);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    } else {
    }
  };

  return (
    <div className="bg-white p-6 shadow-md rounded-md">
      <h2 className="text-2xl font-semibold mb-6">Edit Page</h2>

      {confirmBox && (
        <>
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 999 }}
          >
            <div
              className="bg-white border  px-4 py-3 rounded relative w-full m-5"
              role="alert"
            >
              <strong className="font-bold text-center">
                Are you sure ?
              </strong>
              <div>
                <button
                  className={`w-full mt-6 py-2 px-4 rounded focus:outline-none ${
                    isFormValid
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-500 text-gray-500 opacity-50 cursor-not-allowed"
                  }`}
                  onClick={handleItemUpdate}
                >
                  Confirm
                </button>
              </div>
              <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
                <svg
                  className="fill-current h-6 w-6  cursor-pointer"
                  role="button"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  onClick={() => setConfirmBox(false)}
                >
                  <title>Close</title>
                  <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" />
                </svg>
              </span>
            </div>
          </div>
        </>
      )}
      {fetching ? (
        <h1 className="text-green-500 text-center text-2xl font-semibold mb-6">
          Loading....
        </h1>
      ) : (
        <>
          <select
            name="brand"
            value={productDetails.brand}
            disabled // Disable brand selection
            className="w-full p-2 border rounded-md"
          >
            <option value={productDetails.brand}>{productDetails.brand}</option>
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
            {dropdownOptions.products.map((productObj) =>
              productObj.products.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))
            )}
          </select>

          <select
            name="category"
            value={productDetails.category}
            onChange={handleInputChange}
            className="w-full mt-4 p-2 border rounded-md"
          >
            <option value="" disabled>
              Select Category
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
            placeholder="MRP"
            name="mrp"
            value={productDetails.mrp}
            onChange={handleInputChange}
            className="w-full mt-4 p-2 border rounded-md"
          />
          <input
            type="number"
            placeholder="Quantity Buy"
            name="quantityBuy"
            value={productDetails.quantityBuy}
            onChange={handleInputChange}
            className="w-full mt-4 p-2 border rounded-md"
          />
        </>
      )}
      {showUpdateTooltip && (
        <div className="text-red-500 text-center text-sm mt-2">
          Error while updating try again
        </div>
      )}

      <button
        onClick={() => {
          setConfirmBox(true);
        }}
        disabled={!isFormValid || isLoading}
        className={`w-full mt-6 py-2 px-4 rounded focus:outline-none ${
          isFormValid
            ? "bg-indigo-500 text-white"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
      >
        {isLoading ? "Updating..." : "Update"}
      </button>
      {showDeleteTooltip && (
        <div className="text-red-500 text-center text-sm mt-2">
          Error while Deleting try again..
        </div>
      )}
      {/* Delete Button */}
      <button
        onClick={handleOpenDeleteModal}
        className="w-full mt-6 py-2 px-4 rounded focus:outline-none bg-red-500 text-white"
      >
        Delete This Product
      </button>

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-md">
            <p className="mb-4">Type 'CONFIRM' to delete this item:</p>
            <input
              type="text"
              value={confirmText}
              onChange={handleUserInputChange}
              className="border border-gray-300 p-2 rounded-md mb-4"
            />
            <div className="flex justify-between">
              <button
                onClick={handleCloseDeleteModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md mr-2"
              >
                Cancel
              </button>
              <button
                disabled={confirmText !== "CONFIRM"}
                onClick={handleItemDelete}
                className={`px-4 py-2 rounded-md ${
                  confirmText !== "CONFIRM"
                    ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                    : "bg-red-500 text-white"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditItem;
