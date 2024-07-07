import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const EditSelectedItems = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedItems } = location.state;

  const [commonDetails, setCommonDetails] = useState({
    brand: "",
    product: "",
    category: "",
    size: "",
    mrp: "",
    quantityBuy: "",
  });

  const [initialCommonDetails, setInitialCommonDetails] = useState({});
  const [commonAttributes, setCommonAttributes] = useState([]);
  const [dropdownOptions, setDropdownOptions] = useState({
    products: [],
    categories: [],
    sizes: [{ size: [] }],
  });

  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isUpdateDisabled, setIsUpdateDisabled] = useState(true);
  const [showTooltip, setShowTooltip] = useState({
    status: false,
    color: "",
    message: "",
  });
  const [confirmBox, setConfirmBox] = useState(false);
  const [changingField, setChangingField] = useState({ from: "", to: "" });

  // Fetch dropdown options from the server
  const fetchDropdownOptions = async () => {
    try {
      if (window.localStorage.getItem("userInfo")) {
        const response = await fetch("/api/dropdownoption/dropdownoptions", {
          headers: {
            Authorization: `Bearer ${
              JSON.parse(window.localStorage.getItem("userInfo")).token
            }`,
          },
        });
        if (response.ok) {
          const options = await response.json();
          // Sort dropdown options alphabetically
          options.products.sort((a, b) => a.brand.localeCompare(b.brand));
          // Sort products within each brand
          options.products.forEach((brand) => {
            brand.products.sort();
          });
          options.categories[0].category.sort((a, b) => a.localeCompare(b));
          setDropdownOptions(options);
        } else {
          console.error("Failed to fetch dropdown options");
          window.localStorage.clear();
          navigate("/login");
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchDropdownOptions();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (selectedItems && selectedItems.length > 0) {
      const firstItem = selectedItems[0];
      const common = {
        brand: firstItem.brand,
        product: firstItem.product,
        category: firstItem.category,
        size: firstItem.size,
        mrp: firstItem.mrp,
        quantityBuy: firstItem.quantityBuy,
      };

      selectedItems.forEach((item) => {
        Object.keys(common).forEach((key) => {
          if (common[key] !== item[key]) {
            common[key] = "";
          }
        });
      });

      setCommonDetails(common);
      setInitialCommonDetails(common);

      const commonAttrs = Object.keys(common).filter(
        (key) => common[key] !== ""
      );
      setCommonAttributes(commonAttrs);
    }
  }, [selectedItems]);

  useEffect(() => {
    if (commonDetails.brand) {
      const selectedBrand = dropdownOptions.products.find(
        (brandObj) => brandObj.brand === commonDetails.brand
      );
      setFilteredProducts(selectedBrand ? selectedBrand.products : []);
    } else {
      setFilteredProducts([]);
    }
  }, [commonDetails.brand, dropdownOptions.products]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Ensure quantity and mrp are positive values
    if (name === "mrp" && parseFloat(value) < 0) {
      return;
    }
    if (name === "quantityBuy" && parseFloat(value) < 0) {
      return;
    }
    // Track changes
    setChangingField({ from: initialCommonDetails[name], to: value });
    setCommonDetails((prevDetails) => ({
      ...prevDetails,
      [name]: value,
    }));
  };

  const checkFormValidity = () => {
    const isAnyFieldChanged = Object.keys(initialCommonDetails).some(
      // eslint-disable-next-line
      (key) => initialCommonDetails[key] != commonDetails[key]
    );
    var valid =
      isAnyFieldChanged &&
      commonDetails.mrp !== "" &&
      commonDetails.quantityBuy !== "";
    setIsUpdateDisabled(!valid);
  };

  useEffect(() => {
    checkFormValidity();
    // eslint-disable-next-line
  }, [commonDetails]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const changedFields = {};

    Object.keys(commonDetails).forEach((key) => {
      if (commonDetails[key] !== initialCommonDetails[key]) {
        changedFields[key] = commonDetails[key];
      }
    });

    if (Object.keys(changedFields).length > 0) {
      const updatePromises = selectedItems.map((item) => ({
        code: item.code,
        updateFields: changedFields,
      }));
      try {
        const response = await fetch(
          "/api/item/updateAll",
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${
                JSON.parse(window.localStorage.getItem("userInfo")).token
              }`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatePromises),
          }
        );

        if (response.ok) {
          const results = await response.json();
          // Optionally, navigate or show a success message
          setShowTooltip({
            status: true,
            color: "green",
            message: "Updated Successfully",
          });
          setTimeout(() => {
            setShowTooltip({ status: false, color: "", message: "" });
            navigate("/history");
          }, 1000);
        } else {
          console.error("Failed to update items");
          setShowTooltip({
            status: true,
            color: "red",
            message: "Failed to update item",
          });
          setTimeout(() => {
            setShowTooltip({ status: false, color: "", message: "" });
          }, 3000);
        }
      } catch (error) {
        console.error("Error updating items:", error);
        setShowTooltip({
          status: true,
          color: "red",
          message: "Failed to update item",
        });
        setTimeout(() => {
          setShowTooltip({ status: false, color: "", message: "" });
        }, 3000);
      }
    } else {
      setShowTooltip({
        status: true,
        color: "red",
        message: "No field changed",
      });
      setTimeout(() => {
        setShowTooltip({ status: false, color: "", message: "" });
      }, 3000);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Update Common Details</h1>
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
              <div className="flex justify-center">
                <strong className="font-bold text-center">
                  Are you sure ?
                </strong>
              </div>
              <div className="text-sm mt-4">
                {Object.keys(changingField).length > 0 && (
                  <p className="text-center">
                    {changingField.from} -----&rarr; {changingField.to}
                  </p>
                )}
              </div>
              <div>
                <button
                  className={`w-full mt-6 py-2 px-4 rounded focus:outline-none ${
                    !isUpdateDisabled
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-500 text-gray-500 opacity-50 cursor-not-allowed"
                  }`}
                  onClick={isUpdateDisabled ? null : handleUpdate}
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
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4">
        <h2 className="font-semibold text-lg">Common Details</h2>
        <>
          {commonAttributes.includes("brand") && (
            <select
              name="brand"
              value={commonDetails.brand}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md"
            >
              <option value="" disabled>
                Select Brand
              </option>
              {dropdownOptions.products.map((brandObj) => (
                <option key={brandObj.brand} value={brandObj.brand}>
                  {brandObj.brand}
                </option>
              ))}
            </select>
          )}

          {commonAttributes.includes("product") && (
            <select
              name="product"
              value={commonDetails.product}
              onChange={handleInputChange}
              className="w-full mt-4 p-2 border rounded-md"
              disabled={!commonDetails.brand}
            >
              <option value="" disabled>
                Select Product
              </option>
              {filteredProducts.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          )}

          {commonAttributes.includes("category") && (
            <select
              name="category"
              value={commonDetails.category}
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
          )}

          {commonAttributes.includes("size") && (
            <select
              name="size"
              value={commonDetails.size}
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
          )}

          {commonAttributes.includes("mrp") && (
            <input
              type="number"
              placeholder="MRP"
              name="mrp"
              value={commonDetails.mrp}
              onChange={handleInputChange}
              className="w-full mt-4 p-2 border rounded-md"
            />
          )}

          {commonAttributes.includes("quantityBuy") && (
            <input
              type="number"
              placeholder="Quantity Buy"
              name="quantityBuy"
              value={commonDetails.quantityBuy}
              onChange={handleInputChange}
              className="w-full mt-4 p-2 border rounded-md"
            />
          )}
          <div className="flex justify-center">
            <button
              type="submit"
              className={`px-4 py-2 rounded mt-4 ${
                isUpdateDisabled ? "bg-gray-500" : "bg-green-500"
              } text-white`}
              disabled={isUpdateDisabled}
              onClick={() => {
                setConfirmBox(true);
              }}
            >
              Update Items
            </button>
          </div>
        </>
      </div>

      {selectedItems.map((item) => (
        <div
          key={item._id}
          className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4"
        >
          <div className="flex justify-between items-center cursor-pointer">
            <div>
              <p className="font-semibold text-lg">Code: {item.code}</p>
              <p className="text-black">Brand: {item.brand}</p>
            </div>
          </div>
          <div className="flex items-center justify-evenly border-t border-gray-300 mt-4 pt-4">
            <div className="text-black">
              <p className="font-semibold py-1">Product: {item.product}</p>
              <p className="font-semibold py-1">Category: {item.category}</p>
              <p className="font-semibold py-1">Size: {item.size}</p>
              <p className="font-semibold py-1">
                Quantity Available: {item.quantityBuy - item.quantitySold}
              </p>
              <p className="font-semibold py-1">
                Quantity Sold: {item.quantitySold}
              </p>
              <p className="font-semibold py-1">MRP: {item.mrp}</p>
            </div>
          </div>
        </div>
      ))}
      {showTooltip.status && (
        <>
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 999 }}
          >
            <div
              className={`flex items-center justify-center px-4 py-3 rounded relative w-full m-5 border-2 ${
                showTooltip.color === "red"
                  ? "bg-red-100 border-red-700 text-red-700"
                  : "bg-green-100 border-green-700 text-green-700"
              }`}
              role="alert"
            >
              <strong className="font-bold">{showTooltip.message}</strong>
              <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
                <svg
                  className={`fill-current h-6 w-6 cursor-pointer ${
                    showTooltip.color === "red"
                      ? "text-red-500"
                      : "text-green-500"
                  }`}
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
    </div>
  );
};

export default EditSelectedItems;
