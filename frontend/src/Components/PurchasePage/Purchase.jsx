import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode.react";
import { useReactToPrint } from "react-to-print";

const Purchase = () => {
  const naviagate = useNavigate();
  const componentRef = React.useRef();
  const [productDetails, setProductDetails] = useState({
    brand: "",
    product: "",
    category: "",
    size: [],
    quantityBuy: 1,
    mrp: "",
  });

  const [dropdownOptions, setDropdownOptions] = useState({
    products: [],
    categories: [],
    sizes: [{ size: [] }],
  });
  const [productOfSelectedBrand, setProductOfSelectedBrand] = useState([]);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [returnedCode, setReturnedCode] = useState([]);
  const [buttonActive, setButtonActive] = useState(false);
  const [isQRCodeView, setIsQRCodeView] = useState(false);
  const [printMode, setPrintMode] = useState("single"); // 'single' or 'multiple'
  const [printList, setPrintList] = useState([]); // Separate list for multiple prints
  const [autoReset, setAutoReset] = useState(true);
  const [margin, setMargin] = useState(2); // default is 2

  const toggleView = () => {
    setIsQRCodeView((prevIsQRCodeView) => !prevIsQRCodeView);
  };

  useEffect(() => {
    function isUserLogedIn() {
      if (!window.localStorage.getItem("userInfo")) {
        naviagate("/login");
      }
    }
    isUserLogedIn();
  }, [naviagate]);

  useEffect(() => {
    if (returnedCode.length > 0) {
      setButtonActive(true);
    } else {
      setButtonActive(false);
    }
  }, [returnedCode]);
  useEffect(() => {
    if (returnedCode.length > 1) {
      let newList = [];
      let n = 0;
      let i = -1;
      let returnedCodeCopy = [...returnedCode]; // Create a shallow copy of returnedCode

      while (true) {
        // Reset index if we reach the end of the list
        if (i >= returnedCodeCopy.length - 1) {
          n++;
          i = 0;
        } else {
          i++;
        }
        if (n < returnedCodeCopy[i].quantityBuy) {
          newList.push(returnedCodeCopy[i]); // Push a copy of the item
        } else {
          returnedCodeCopy.splice(i, 1); // Remove the item once its quantityBuy has been processed
          i--;
        }

        // Exit loop if all items have been processed
        if (returnedCodeCopy.length === 0) {
          break;
        }
      }

      setPrintList(newList);
    }
  }, [returnedCode]);

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
          naviagate("/login");
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  // Form validation
  const checkFormValidity = () => {
    const isFormValid =
      Object.values(productDetails).every((value) => value !== "") &&
      productDetails.size.length > 0; // Check if at least one size is selected
    setIsFormValid(isFormValid);
  };

  useEffect(() => {
    fetchDropdownOptions();
    // eslint-disable-next-line
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

  // Handle size selection change
  const handleSizeChange = (e) => {
    const { value } = e.target;
    let updatedSizes = [...productDetails.size];

    if (updatedSizes.includes(value)) {
      // If size already exists in the array, remove it
      updatedSizes = updatedSizes.filter((size) => size !== value);
    } else {
      // If size doesn't exist in the array, add it
      updatedSizes.push(value);
    }

    // Reorder the updatedSizes array based on the index of the selected value in the size list
    updatedSizes.sort((a, b) => {
      const indexA = dropdownOptions.sizes[0].size.indexOf(a);
      const indexB = dropdownOptions.sizes[0].size.indexOf(b);
      return indexA - indexB;
    });

    // Update the productDetails state with the new sizes array
    setProductDetails((prevDetails) => ({
      ...prevDetails,
      size: updatedSizes,
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

  function calculateMRP(mrp) {
    // Round the number to the nearest multiple of 100
    // mrp -= 100;
    // adding 10 to round off to 40
    var roundedNumber = mrp * margin + 10;
    roundedNumber = Math.round(roundedNumber / 100) * 100;
    return roundedNumber - 4;
  }

  const handlePurchase = async () => {
    // Validation: Check if all fields are filled
    if (!isFormValid) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/purchase", {
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
        const { items } = await response.json();
        // Set the returned code and open the modal
        setReturnedCode(items);
        if (autoReset) {
          setProductDetails({
            brand: "",
            product: "",
            category: "",
            size: [],
            quantityBuy: 1,
            mrp: "",
          });
        } else {
          setProductDetails((prevDetails) => ({
            ...prevDetails,
            mrp: "",
            quantityBuy: 1,
          }));
        }
        setIsModalOpen(true);
        setShowTooltip(true);
        setTimeout(() => {
          setShowTooltip(false);
        }, 3000);
      } else if (response.status === 401) {
        window.localStorage.clear();
        naviagate("/login");
      } else {
        console.error("Failed to add product to inventory");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to print the component
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });
  return (
    <div className="bg-white p-6 shadow-md rounded-md">
      <h2 className="text-2xl font-semibold mb-6">Purchase</h2>
      <div className="flex items-center mt-4">
        <label className="mr-4">Auto Reset:</label>
        <input
          type="radio"
          name="autoReset"
          value="enabled"
          checked={autoReset === true}
          onChange={() => setAutoReset(true)}
          className="mr-2"
        />{" "}
        Enabled
        <input
          type="radio"
          name="autoReset"
          value="disabled"
          checked={autoReset === false}
          onChange={() => setAutoReset(false)}
          className="ml-4 mr-2"
        />{" "}
        Disabled
      </div>

      {isModalOpen &&
        (isQRCodeView ? (
          <>
            <div
              className="fixed inset-0 flex items-center justify-center"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 999 }}
            >
              <div
                className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative w-full m-5"
                role="alert"
              >
                <div className="max-h-[80vh] overflow-y-auto hide-scrollbar">
                  <strong className="font-bold">
                    Items added to inventory:
                  </strong>
                  <div className="flex justify-center m-4">
                    <button
                      onClick={() => setPrintMode("single")}
                      className={`px-4 py-2 mx-2 ${
                        printMode === "single"
                          ? "bg-indigo-700"
                          : "bg-indigo-300"
                      } text-white rounded-md focus:outline-none`}
                    >
                      Print Single Tags
                    </button>
                    <button
                      onClick={() => setPrintMode("multiple")}
                      className={`px-4 py-2 mx-2 ${
                        printMode === "multiple"
                          ? "bg-indigo-700"
                          : "bg-indigo-300"
                      } text-white rounded-md focus:outline-none`}
                    >
                      Print Multiple Tags
                    </button>
                  </div>

                  <div className="flex justify-center m-4">
                    <button
                      onClick={toggleView}
                      className="px-4 py-2 bg-indigo-500 text-white rounded-md focus:outline-none"
                    >
                      {isQRCodeView ? "Show Code and Size" : "Show QR Code"}
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <div
                      style={{ width: "106mm" }}
                      ref={componentRef}
                      className="flex flex-wrap"
                    >
                      {returnedCode.length % 2 !== 0 &&
                        returnedCode.push({
                          code: "",
                          brand: "",
                          product: "",
                          category: "",
                          size: "",
                          quantityBuy: 0,
                          quantitySold: 0,
                          mrp: 100,
                          secretCode: "",
                        })}
                      {(printMode === "single" ? returnedCode : printList).map(
                        (item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-evenly"
                          >
                            <div
                              style={{
                                width: "50mm",
                                height: "25mm",
                                // border: "1px solid black",
                                padding: 0,
                                marginLeft: "1.3mm",
                                marginRight: "1.3mm",
                              }}
                              className="flex justify-evenly bg-white"
                            >
                              <div className="p-2 pr-0">
                                <QRCode value={item.code} size={60} />
                                <p className="text-black">{item.code}</p>
                              </div>
                              <div className="relative font-bold text-black pt-1">
                                <div className="flex justify-center">
                                  <img
                                    src={`Images/Ganesha.jpg`}
                                    alt="project"
                                    width={"25mm"}
                                  />
                                </div>
                                <div>
                                  <p>MRP: {calculateMRP(item.mrp)}/-</p>
                                  <p>Size: {item.size}</p>
                                  <div>
                                    <p className="absolute right-1 bottom-1 text-sm font-normal">
                                      {item.secretCode}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handlePrint}
                    disabled={!buttonActive}
                    className={`w-full py-2 px-4 rounded focus:outline-none focus:shadow-outline-indigo active:bg-indigo-800 ${
                      buttonActive
                        ? "bg-indigo-500 text-white"
                        : "bg-gray-300 text-black opacity-50 cursor-not-allowed"
                    }`}
                  >
                    Print
                  </button>
                  <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
                    <svg
                      className="fill-current h-6 w-6 text-green-500 cursor-pointer"
                      role="button"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      onClick={() => setIsModalOpen(false)}
                    >
                      <title>Close</title>
                      <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              className="fixed inset-0 flex items-center justify-center"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 999 }}
            >
              <div
                className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative w-full m-5"
                role="alert"
              >
                <strong className="font-bold">Items added to inventory:</strong>
                <div className="flex justify-center m-4">
                  <button
                    onClick={toggleView}
                    className="px-4 py-2 bg-indigo-500 text-white rounded-md focus:outline-none"
                  >
                    {isQRCodeView ? "Show Code and Size" : "Show QR Code"}
                  </button>
                </div>
                {returnedCode.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-evenly mb-2"
                  >
                    <div className="rounded-md p-2 mr-2">
                      <span className="block sm:inline font-semibold">
                        Code:
                      </span>
                      <span className="block sm:inline ml-1">{item.code}</span>
                    </div>
                    <div className="rounded-md p-2">
                      <span className="block sm:inline font-semibold">
                        Size:
                      </span>
                      <span className="block sm:inline ml-1">{item.size}</span>
                    </div>
                  </div>
                ))}
                <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
                  <svg
                    className="fill-current h-6 w-6 text-green-500 cursor-pointer"
                    role="button"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    onClick={() => setIsModalOpen(false)}
                  >
                    <title>Close</title>
                    <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" />
                  </svg>
                </span>
              </div>
            </div>
          </>
        ))}

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
      {/* Size selection with checkboxes */}
      <div className="mt-4">
        <p className="font-semibold mb-1">Select Size:</p>
        <div className="flex flex-wrap">
          {dropdownOptions.sizes[0].size.map((size, index) => (
            <div key={index} className="flex items-center mr-4 mb-2">
              <input
                type="checkbox"
                id={size}
                name={size}
                value={size}
                checked={productDetails.size.includes(size)}
                onChange={handleSizeChange}
                className="mr-1"
              />
              <label htmlFor={size}>{size}</label>
            </div>
          ))}
        </div>
      </div>
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
        placeholder="Quantity to Purchase"
        name="quantityBuy"
        value={productDetails.quantityBuy}
        onChange={handleInputChange}
        className="w-full mt-4 p-2 border rounded-md"
      />
      <input
        type="number"
        step="0.1"
        placeholder="Enter Margin (e.g. 1.8)"
        value={margin}
        onChange={(e) => setMargin(parseFloat(e.target.value) || 1)}
        onWheel={(e) => e.target.blur()}
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
      <button
        onClick={() =>
          setProductDetails({
            brand: "",
            product: "",
            category: "",
            size: [],
            quantityBuy: 1,
            mrp: "",
          })
        }
        className="w-full mt-2 py-2 px-4 rounded bg-red-500 text-white"
      >
        Reset All Fields
      </button>
    </div>
  );
};

export default Purchase;
