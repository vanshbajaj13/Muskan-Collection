import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QrScanner from "react-qr-scanner";

const CustomerPurchase = () => {
  const navigate = useNavigate();

  const [customerDetails, setCustomerDetails] = useState({
    phoneNo: "",
    name: "",
  });
  const [purchaseList, setPurchaseList] = useState([]);
  const [newItem, setNewItem] = useState({
    code: "",
    quantitySold: 1,
    sellingPrice: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [availableQuantity, setAvailableQuantity] = useState(0);
  const [fetchingQuantity, setFetchingQuantity] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showInvalidPhoneTooltip, setShowInvalidPhoneTooltip] = useState(false);
  const [addItemtoListButtonDisabled, setAddItemtoListButtonDisabled] =
    useState(true);

  useEffect(() => {
    function isUserLoggedIn() {
      if (!window.localStorage.getItem("userInfo")) {
        navigate("/login");
      }
    }
    isUserLoggedIn();
  }, [navigate]);

  useEffect(() => {
    fetchAvailableQuantity();
    // eslint-disable-next-line
  }, [newItem.code]);

  const fetchAvailableQuantity = async () => {
    try {
      if (newItem.code.length === 7) {
        setFetchingQuantity(true);
        const response = await fetch(
          `/api/availablequantity?code=${newItem.code}`,
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
          if (response.status === 401) {
            window.localStorage.clear();
            navigate("/login");
          }
        }
        setFetchingQuantity(false);
      } else {
        setAvailableQuantity(0);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (
      availableQuantity > 0 &&
      newItem.sellingPrice !== "" &&
      parseFloat(newItem.sellingPrice) > 0 &&
      customerDetails.phoneNo.length === 10
    ) {
      setAddItemtoListButtonDisabled(false);
    } else {
      setAddItemtoListButtonDisabled(true);
    }
  }, [availableQuantity, newItem, customerDetails]);

  // Function to calculate the total amount of the purchase list items
  const calculateTotalAmount = () => {
    let totalAmount = 0;
    purchaseList.forEach((item) => {
      totalAmount += parseFloat(item.sellingPrice);
    });
    return totalAmount;
  };

  const handleCustomerInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "phoneNo") {
      if (!/^\d*$/.test(value)) {
        return;
      }
      if (value.length === 10 || value.length === 0) {
        setShowInvalidPhoneTooltip(false);
      } else {
        setShowInvalidPhoneTooltip(true);
      }
    }

    setCustomerDetails((prevDetails) => ({
      ...prevDetails,
      [name]: value,
    }));
  };

  const handleNewItemChange = (e) => {
    const { name, value } = e.target;

    if (name === "sellingPrice" && parseFloat(value) < 0) {
      return;
    }

    setNewItem((prevItem) => ({
      ...prevItem,
      [name]: value.toUpperCase(),
    }));
  };

  const handleAddItem = () => {
    if (
      newItem.code &&
      newItem.sellingPrice &&
      parseFloat(newItem.sellingPrice) > 0 &&
      newItem.quantitySold > 0
    ) {
      setPurchaseList((prevList) => [...prevList, newItem]);
      setNewItem({ code: "", quantitySold: 1, sellingPrice: "" });
      setAvailableQuantity(0);
    }
  };

  const handleRemoveItem = (index) => {
    setPurchaseList((prevList) => prevList.filter((_, i) => i !== index));
  };

  const handleScan = (data) => {
    const regex = /^[A-Z]{3}\d{4}$/;
    if (data && regex.test(data.text)) {
      setNewItem((prevItem) => ({
        ...prevItem,
        code: data.text,
      }));
      setShowScanner(false);
    }
  };

  const handleError = (error) => {
    console.error("Error while scanning QR code:", error);
  };

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/sell/customerpurchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
        body: JSON.stringify({
          ...customerDetails,
          purchaseList,
        }),
      });

      if (response.ok) {
        setCustomerDetails({ phoneNo: "", name: "" });
        setPurchaseList([]);
        setShowTooltip(true);
        setTimeout(() => {
          setShowTooltip(false);
        }, 3000);
      } else if (response.status === 401) {
        window.localStorage.clear();
        navigate("/login");
      } else {
        console.error("Failed to process customer purchase");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Customer Purchase</h2>

      <div className="mb-4">
        <label
          htmlFor="phoneNo"
          className="block text-sm font-medium text-gray-700"
        >
          Customer Phone No.
        </label>
        <input
          name="phoneNo"
          type="tel"
          placeholder="Customer's phone number"
          value={customerDetails.phoneNo}
          onChange={handleCustomerInputChange}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {showInvalidPhoneTooltip && (
          <div className="mt-2 p-2 bg-red-400 text-white font-bold text-center rounded-md">
            Invalid phone number
          </div>
        )}
      </div>

      <div className="mb-4">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Customer Name
        </label>
        <input
          name="name"
          type="text"
          placeholder="Customer's name"
          value={customerDetails.name}
          onChange={handleCustomerInputChange}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div className="mb-4">
        <label
          htmlFor="code"
          className="block text-sm font-medium text-gray-700"
        >
          Product Code
        </label>
        <input
          name="code"
          type="text"
          placeholder="Product code"
          value={newItem.code}
          onChange={handleNewItemChange}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <p className="mt-2 text-green-500">
          Available Quantity:{" "}
          {fetchingQuantity ? "Fetching Quantity..." : availableQuantity}
        </p>
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
          name="sellingPrice"
          placeholder="Selling price"
          value={newItem.sellingPrice}
          onChange={handleNewItemChange}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <button
        onClick={handleAddItem}
        disabled={addItemtoListButtonDisabled || isLoading}
        className={`w-full py-2 px-4 rounded focus:outline-none focus:shadow-outline-indigo active:bg-indigo-800 ${
          !addItemtoListButtonDisabled
            ? "bg-indigo-500 text-white"
            : "bg-gray-300 text-black opacity-50 cursor-not-allowed"
        }`}
      >
        Add Item
      </button>

      <div className="mt-6">
        <h3 className="text-xl font-bold mb-4">Purchase List</h3>
        {purchaseList.length === 0 ? (
          <p>No items added</p>
        ) : (
          <>
            <div>
              <li className="py-4 flex justify-between items-center text-lg font-semibold">
                <div className="ml-5">
                  <p>Code</p>
                </div>
                <div className="flex">
                  <p className="text-gray-600 mr-10">Selling Price</p>
                </div>
              </li>
            </div>
            <ul className="divide-y divide-gray-200 ">
              {purchaseList.map((item, index) => (
                <li
                  key={index}
                  className="py-4 flex justify-between items-center mb-2 bg-white p-4 rounded shadow-md transition duration-300 hover:bg-gray-100"
                >
                  <div className="">
                    <p>
                      {index + 1}. Code: {item.code}
                    </p>
                  </div>
                  <div className="flex">
                    <p className="text-gray-600 mr-5">
                      Selling Price: ₹{item.sellingPrice.toLocaleString("hi")}
                    </p>
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-red bg-red-500 hover:bg-red-600 px-3 py-1 rounded-full transition duration-300"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        class="bi bi-trash3"
                        viewBox="0 0 16 16"
                      >
                        <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div>
              <li className="py-4 flex justify-between items-center text-lg font-semibold">
                <div className="ml-5">
                  <p>Items : {purchaseList.length}</p>
                </div>
                <div className="flex">
                  <p className="text-gray-600 mr-10">Total :  ₹ {calculateTotalAmount().toLocaleString("en-IN")}</p>
                </div>
              </li>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-center mt-6">
        <button
          onClick={() => {
            setNewItem((prevItem) => ({
              ...prevItem,
              code: "",
            }));
          }}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded m-1"
        >
          Reset QR Code
        </button>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded m-1"
          onClick={() => setShowScanner(!showScanner)}
        >
          Toggle Scanner
        </button>
      </div>
      {showScanner && (
        <QrScanner
          onScan={handleScan}
          onError={handleError}
          constraints={{
            audio: false,
            video: { facingMode: "environment" },
          }}
          style={{ width: "100%" }}
        />
      )}
      {/* {qrCodeScanned && <p>QR Code Scanned: {qrCodeScanned}</p>} */}

      {showTooltip && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 999 }}
        >
          <div
            className="flex items-center justify-center bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative w-full m-5"
            role="alert"
          >
            <strong className="font-bold">
              Purchase recorded successfully
            </strong>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
              <svg
                className="fill-current h-6 w-6 text-green-500 cursor-pointer"
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
      )}

      <button
        onClick={handlePurchase}
        disabled={purchaseList.length === 0 || isLoading}
        className={`w-full py-2 px-4 rounded focus:outline-none focus:shadow-outline-indigo active:bg-indigo-800 ${
          purchaseList.length > 0
            ? "bg-indigo-500 text-white"
            : "bg-gray-300 text-black opacity-50 cursor-not-allowed"
        }`}
      >
        {isLoading ? "Processing..." : "Complete Purchase"}
      </button>
    </div>
  );
};

export default CustomerPurchase;
