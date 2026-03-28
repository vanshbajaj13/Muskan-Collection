import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QrScanner from "react-qr-scanner";
import Spinner from "../Loader/Spinner";

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
  const [addItemtoListButtonDisabled, setAddItemtoListButtonDisabled] = useState(true);
  const [sellerEmail, setSellerEmail] = useState("");

  // New state for total-paid distribution
  const [totalPaid, setTotalPaid] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState("");
  const [computedPrices, setComputedPrices] = useState({});

  // Reason shown under Add button when blocked
  const [addBlockReason, setAddBlockReason] = useState("");

  useEffect(() => {
    function isUserLoggedIn() {
      const userInfo = window.localStorage.getItem("userInfo");
      if (!userInfo) {
        navigate("/login");
      } else {
        const parsed = JSON.parse(userInfo);
        setSellerEmail(parsed.email);
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
      if (newItem.code.length === 7 || newItem.code.length === 8) {
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
          const { availableQuantity } = await response.json();
          setAvailableQuantity(availableQuantity);
        } else {
          setAvailableQuantity(0);
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

  // Count how many times this code is already in the pending list
  const queuedCount = (code) =>
    purchaseList.filter((item) => item.code === code).length;

  // Net remaining stock after accounting for items already queued
  const remainingAvailable =
    newItem.code ? availableQuantity - queuedCount(newItem.code) : 0;

  // Recompute Add-button state whenever relevant values change
  useEffect(() => {
    const phoneValid =
      customerDetails.phoneNo.length === 10 ||
      customerDetails.phoneNo.length === 0;

    if (!phoneValid) {
      setAddItemtoListButtonDisabled(true);
      setAddBlockReason("");
      return;
    }
    if (!newItem.code || newItem.code.length < 7) {
      setAddItemtoListButtonDisabled(true);
      setAddBlockReason("");
      return;
    }
    if (fetchingQuantity) {
      setAddItemtoListButtonDisabled(true);
      setAddBlockReason("");
      return;
    }
    if (availableQuantity <= 0) {
      setAddItemtoListButtonDisabled(true);
      setAddBlockReason("This item is out of stock.");
      return;
    }
    if (remainingAvailable <= 0) {
      setAddItemtoListButtonDisabled(true);
      setAddBlockReason(
        `All ${availableQuantity} available unit(s) already added to the list.`
      );
      return;
    }

    setAddItemtoListButtonDisabled(false);
    setAddBlockReason("");
  }, [
    availableQuantity,
    remainingAvailable,
    newItem.code,
    customerDetails.phoneNo,
    fetchingQuantity,
  ]);

  // Reset computed prices whenever list length changes (add / remove)
  useEffect(() => {
    setComputedPrices({});
    setCalculationError("");
  }, [purchaseList.length]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getEffectivePrice = (item, index) => {
    if (item.sellingPrice !== "" && parseFloat(item.sellingPrice) > 0)
      return parseFloat(item.sellingPrice);
    if (computedPrices[index] !== undefined) return computedPrices[index];
    return null;
  };

  const calculateTotalAmount = () =>
    purchaseList.reduce((sum, item, idx) => {
      const p = getEffectivePrice(item, idx);
      return sum + (p ?? 0);
    }, 0);

  const allItemsHavePrice = () =>
    purchaseList.length > 0 &&
    purchaseList.every((item, idx) => {
      const p = getEffectivePrice(item, idx);
      return p !== null && p > 0;
    });

  const unpricedCount = purchaseList.filter(
    (item, idx) => getEffectivePrice(item, idx) === null
  ).length;

  // ── MRP-proportional distribution ────────────────────────────────────────
  //
  // 1. Sum all fixed prices.
  // 2. remaining = totalPaid - fixedTotal
  // 3. For each "open" item: computedPrice = (mrp_i / sumMRP_open) * remaining
  // 4. Last item absorbs rounding remainder so grand total is exact.

  const handleCalculateFromTotal = async () => {
    setCalculationError("");

    const total = parseFloat(totalPaid);
    if (!totalPaid || isNaN(total) || total <= 0) {
      setCalculationError("Please enter a valid total paid amount.");
      return;
    }
    if (purchaseList.length === 0) {
      setCalculationError("No items in the purchase list.");
      return;
    }

    const openIndices = purchaseList
      .map((item, idx) => ({ item, idx }))
      .filter(
        ({ item }) =>
          item.sellingPrice === "" || parseFloat(item.sellingPrice) <= 0
      )
      .map(({ idx }) => idx);

    if (openIndices.length === 0) {
      setCalculationError(
        "All items already have a selling price. Nothing to calculate."
      );
      return;
    }

    const fixedTotal = purchaseList.reduce((sum, item, idx) => {
      if (!openIndices.includes(idx)) return sum + parseFloat(item.sellingPrice);
      return sum;
    }, 0);

    const remaining = total - fixedTotal;
    if (remaining <= 0) {
      setCalculationError(
        "Total paid is less than or equal to the sum of already-fixed prices."
      );
      return;
    }

    setIsCalculating(true);
    try {
      const mrpResults = await Promise.all(
        openIndices.map(async (idx) => {
          const code = purchaseList[idx].code;
          const response = await fetch(`/api/item/code/${code}`, {
            headers: {
              Authorization: `Bearer ${
                JSON.parse(window.localStorage.getItem("userInfo")).token
              }`,
            },
          });
          if (!response.ok)
            throw new Error(`Could not fetch details for item ${code}`);
          const data = await response.json();
          return { idx, mrp: data.mrp };
        })
      );

      const sumMRP = mrpResults.reduce((sum, { mrp }) => sum + mrp, 0);
      if (sumMRP <= 0) {
        setCalculationError("Fetched MRP values are invalid (sum is 0).");
        return;
      }

      const newComputed = { ...computedPrices };
      let allocated = 0;

      mrpResults.forEach(({ idx, mrp }, i) => {
        if (i < mrpResults.length - 1) {
          const price = Math.round((mrp / sumMRP) * remaining * 100) / 100;
          newComputed[idx] = price;
          allocated += price;
        } else {
          // Last item absorbs rounding difference
          newComputed[idx] = Math.round((remaining - allocated) * 100) / 100;
        }
      });

      setComputedPrices(newComputed);
      setCalculationError("");
    } catch (err) {
      setCalculationError(err.message || "Error fetching item MRP.");
    } finally {
      setIsCalculating(false);
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCustomerInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "phoneNo") {
      if (!/^\d*$/.test(value)) return;
      setShowInvalidPhoneTooltip(value.length !== 10 && value.length !== 0);
    }
    setCustomerDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewItemChange = (e) => {
    const { name, value } = e.target;
    if (name === "sellingPrice" && value !== "" && parseFloat(value) < 0)
      return;
    setNewItem((prev) => ({
      ...prev,
      [name]: name === "code" ? value.toUpperCase() : value,
    }));
  };

  const handleAddItem = () => {
    if (addItemtoListButtonDisabled) return;
    setPurchaseList((prev) => [...prev, newItem]);
    setNewItem({ code: "", quantitySold: 1, sellingPrice: "" });
    setAvailableQuantity(0);
  };

  const handleRemoveItem = (index) => {
    setPurchaseList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleScan = (data) => {
    const regex = /^[A-Z]{3,4}\d{4}$/;
    if (data && regex.test(data.text)) {
      setNewItem((prev) => ({ ...prev, code: data.text }));
      setShowScanner(false);
    }
  };

  const handleError = (error) => {
    console.error("Error while scanning QR code:", error);
  };

  const buildFinalPurchaseList = () =>
    purchaseList.map((item, index) => ({
      ...item,
      sellingPrice: getEffectivePrice(item, index),
    }));

  const handlePurchase = async () => {
    if (!allItemsHavePrice()) return;
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
          purchaseList: buildFinalPurchaseList(),
          sellerEmail,
        }),
      });

      if (response.ok) {
        setCustomerDetails({ phoneNo: "", name: "" });
        setPurchaseList([]);
        setTotalPaid("");
        setComputedPrices({});
        setCalculationError("");
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 3000);
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white p-6 rounded shadow-lg">
      {isLoading && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 999 }}
        >
          <Spinner />
        </div>
      )}
      <h2 className="text-2xl font-bold mb-6">Customer Purchase</h2>

      {/* Customer Phone */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
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

      {/* Customer Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
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

      {/* Product Code */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
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

        {/* Availability indicator */}
        {newItem.code.length >= 7 ? (
          <p
            className={`mt-2 text-sm font-medium ${
              remainingAvailable <= 0 ? "text-red-500" : "text-green-500"
            }`}
          >
            {fetchingQuantity
              ? "Fetching quantity..."
              : availableQuantity <= 0
              ? "Out of stock"
              : remainingAvailable <= 0
              ? `All ${availableQuantity} unit(s) already added to list`
              : queuedCount(newItem.code) > 0
              ? `Available: ${availableQuantity} (${queuedCount(
                  newItem.code
                )} in list → ${remainingAvailable} remaining)`
              : `Available: ${availableQuantity}`}
          </p>
        ) : (
          <p className="mt-2 text-green-500">
            Available Quantity:{" "}
            {fetchingQuantity ? "Fetching Quantity..." : availableQuantity}
          </p>
        )}
      </div>

      {/* Selling Price — optional */}
      <div className="mb-1">
        <label className="block text-sm font-medium text-gray-700">
          Selling Price{" "}
          <span className="text-gray-400 font-normal">
            (optional — leave blank to auto-calculate)
          </span>
        </label>
        <input
          type="number"
          name="sellingPrice"
          placeholder="Selling price (optional)"
          value={newItem.sellingPrice}
          onChange={handleNewItemChange}
          onWheel={(e) => e.target.blur()}
          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Leave blank to distribute proportionally using "Calculate from Total
        Paid" below.
      </p>

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
      {addBlockReason && (
        <p className="mt-1 text-center text-red-500 text-sm font-medium">
          {addBlockReason}
        </p>
      )}

      {/* ── Purchase List ─────────────────────────────────────────────────── */}
      <div className="mt-6">
        <h3 className="text-xl font-bold mb-4">Purchase List</h3>
        {purchaseList.length === 0 ? (
          <p>No items added</p>
        ) : (
          <>
            <li className="py-2 flex justify-between items-center text-lg font-semibold list-none">
              <div className="ml-5">
                <p>Code</p>
              </div>
              <p className="text-gray-600 mr-10">Selling Price</p>
            </li>
            <ul className="divide-y divide-gray-200">
              {purchaseList.map((item, index) => {
                const fixedPrice =
                  item.sellingPrice !== "" &&
                  parseFloat(item.sellingPrice) > 0
                    ? parseFloat(item.sellingPrice)
                    : null;
                const computed = computedPrices[index];
                const hasNoPrice =
                  fixedPrice === null && computed === undefined;

                return (
                  <li
                    key={index}
                    className={`py-4 flex justify-between items-center mb-2 p-4 rounded shadow-md transition duration-300 hover:bg-gray-100 ${
                      hasNoPrice
                        ? "bg-yellow-50 border border-yellow-300"
                        : "bg-white"
                    }`}
                  >
                    <div>
                      <p>
                        {index + 1}. Code: {item.code}
                      </p>
                      {hasNoPrice && (
                        <p className="text-xs text-yellow-600 mt-1">
                          ⚠ No price — use "Calculate from Total Paid"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center">
                      <div className="text-right mr-5">
                        {fixedPrice !== null ? (
                          <p className="text-gray-600">
                            ₹{fixedPrice.toLocaleString("en-IN")}{" "}
                            <span className="text-xs text-gray-400">
                              (fixed)
                            </span>
                          </p>
                        ) : computed !== undefined ? (
                          <p className="text-blue-600">
                            ₹{computed.toLocaleString("en-IN")}{" "}
                            <span className="text-xs text-blue-400">
                              (auto)
                            </span>
                          </p>
                        ) : (
                          <p className="text-yellow-500 text-sm">Not set</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-full transition duration-300"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5" />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <li className="py-4 flex justify-between items-center text-lg font-semibold list-none">
              <div className="ml-5">
                <p>Items: {purchaseList.length}</p>
              </div>
              <p className="text-gray-600 mr-10">
                Total: ₹{calculateTotalAmount().toLocaleString("en-IN")}
                {unpricedCount > 0 && (
                  <span className="text-yellow-500 text-sm ml-2">
                    ({unpricedCount} item{unpricedCount > 1 ? "s" : ""} not
                    priced)
                  </span>
                )}
              </p>
            </li>
          </>
        )}
      </div>

      {/* ── Calculate from Total Paid ─────────────────────────────────────── */}
      {purchaseList.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            Calculate Selling Prices from Total Paid
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Enter the total amount paid. Items without a fixed price will be
            priced proportionally by MRP. Fixed-price items are untouched.
          </p>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Amount Paid (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 8000"
                value={totalPaid}
                onChange={(e) => {
                  setTotalPaid(e.target.value);
                  setCalculationError("");
                }}
                onWheel={(e) => e.target.blur()}
                className="w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <button
              onClick={handleCalculateFromTotal}
              disabled={isCalculating || purchaseList.length === 0}
              className={`py-2 px-4 rounded font-semibold transition-colors ${
                isCalculating || purchaseList.length === 0
                  ? "bg-blue-200 text-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isCalculating ? "Calculating..." : "Calculate"}
            </button>
          </div>

          {calculationError && (
            <p className="mt-2 text-red-600 text-sm">{calculationError}</p>
          )}

          {Object.keys(computedPrices).length > 0 && !calculationError && (
            <div className="mt-3 p-3 bg-white border border-blue-200 rounded">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Auto-calculated prices (proportional to MRP):
              </p>
              {Object.entries(computedPrices).map(([idx, price]) => (
                <div
                  key={idx}
                  className="flex justify-between text-sm text-gray-600 py-1 border-b border-gray-100"
                >
                  <span>
                    Item {parseInt(idx) + 1} —{" "}
                    {purchaseList[parseInt(idx)]?.code}
                  </span>
                  <span className="font-medium text-blue-700">
                    ₹{price.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold text-gray-800 pt-2">
                <span>Grand Total</span>
                <span>₹{calculateTotalAmount().toLocaleString("en-IN")}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scanner controls */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => setNewItem((prev) => ({ ...prev, code: "" }))}
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

      {/* Success toast */}
      {showTooltip && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 999 }}
        >
          <div
            className="flex items-center justify-center bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative w-full m-5"
            role="alert"
          >
            <strong className="font-bold">Purchase recorded successfully</strong>
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

      {purchaseList.length > 0 && !allItemsHavePrice() && (
        <p className="mt-4 text-center text-yellow-600 text-sm font-medium">
          ⚠ {unpricedCount} item{unpricedCount > 1 ? "s are" : " is"} missing a
          price. Enter prices manually or use "Calculate from Total Paid" above.
        </p>
      )}

      <button
        onClick={handlePurchase}
        disabled={
          purchaseList.length === 0 || isLoading || !allItemsHavePrice()
        }
        className={`w-full mt-4 py-2 px-4 rounded focus:outline-none focus:shadow-outline-indigo active:bg-indigo-800 ${
          purchaseList.length > 0 && allItemsHavePrice()
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