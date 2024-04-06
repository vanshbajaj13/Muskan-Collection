import React, { useState, useEffect } from "react";
import QRCode from "qrcode.react";
import { useReactToPrint } from "react-to-print";

const PrintTag = () => {
  const componentRef = React.useRef();
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  function calculateMRP(mrp) {
    // Round the number to the nearest multiple of 100
    mrp -= 100;
    var roundedNumber = Math.ceil(mrp / 100) * 100;
    return roundedNumber * 2 + 100 - 4;
  }

  // Fetch items function similar to History component
  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/item/paginate?page=${page}&limit=10`, {
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (page === 1) {
          setItems(data.items);
        } else {
          setItems((prevItems) => [...prevItems, ...data.items]);
        }
      } else {
        console.error("Failed to fetch items");
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line
  }, [page]);

  // Function to handle selecting an item
  const handleSelectItem = (item) => {
    setSelectedItems((prevSelectedItems) => {
      const itemIndex = prevSelectedItems.findIndex(
        (selectedItem) => selectedItem._id === item._id
      );
      if (itemIndex !== -1) {
        // Item exists, remove it from the selected items list
        return prevSelectedItems.filter(
          (selectedItem) => selectedItem._id !== item._id
        );
      } else {
        // Item does not exist, add it to the selected items list
        return [...prevSelectedItems, item];
      }
    });
  };

  // Function to handle printing selected items
  const handlePrintButton = () => {
    console.log(selectedItems);
    setIsModalOpen(true);
  };

  // Function to load more items
  const loadMoreItems = () => {
    setPage((prevPage) => prevPage + 1);
  };
  const toggleExpand = (itemId) => {
    setExpandedItemId((prevId) => (prevId === itemId ? null : itemId));
  };
  // Function to print the component
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Print Tags</h1>
      <div className="flex justify-center">
        <button
          onClick={handlePrintButton}
          disabled={selectedItems.length === 0}
          className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-1 mr-2 ${
            selectedItems.length === 0 ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          Print Selected
        </button>
      </div>
      {isModalOpen && (
        <>
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 999 }}
          >
            <div
              className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative w-full m-5"
              role="alert"
              contentEditable
            >
              <strong className="font-bold">Items added to inventory:</strong>
              <div className="flex justify-center">
                <div
                  style={{ width: "106mm" }}
                  ref={componentRef}
                  className="flex flex-wrap"
                >
                  {selectedItems.length % 2 !== 0 &&
                    selectedItems.push({
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
                  {selectedItems.map((item, index) => (
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
                  ))}
                </div>
              </div>
              <button
                onClick={handlePrint}
                disabled={selectedItems.length === 0}
                className={`w-full py-2 px-4 rounded focus:outline-none focus:shadow-outline-indigo active:bg-indigo-800 ${
                  selectedItems.length !== 0
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
        </>
      )}
      <div>
        {items.map((item) => (
          <div key={item._id}>
            <div
              key={item._id}
              className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative"
            >
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleExpand(item._id)}
              >
                <div>
                  <p className="font-semibold text-lg">Code: {item.code}</p>
                  <p className="text-black">Brand: {item.brand}</p>
                </div>
                <div>
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item)}
                    onChange={() => handleSelectItem(item)}
                  />
                  <svg
                    className={`h-6 w-6 ${
                      expandedItemId === item._id ? "transform rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {/* <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    /> */}
                  </svg>
                </div>
              </div>
              {expandedItemId === item._id && (
                <div className="flex items-center justify-evenly border-t border-gray-300 mt-4 pt-4">
                  <div className="text-black">
                    <p className="font-semibold py-1">
                      Product: {item.product}
                    </p>
                    <p className="font-semibold py-1">
                      Category: {item.category}
                    </p>
                    <p className="font-semibold py-1">Size: {item.size}</p>
                    <p className="font-semibold py-1">
                      Quantity Available: {item.quantityBuy - item.quantitySold}
                    </p>
                    <p className="font-semibold py-1">MRP: {item.mrp}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={loadMoreItems}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-1"
        >
          {loading ? "Loading..." : "Load More"}
        </button>
      </div>
    </div>
  );
};

export default PrintTag;
