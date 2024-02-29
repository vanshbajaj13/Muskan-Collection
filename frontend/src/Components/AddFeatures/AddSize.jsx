import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
const AddSize = () => {
  const naviagate = useNavigate();
  const [sizesData, setSizesData] = useState([]);
  const [newSizeList, setNewSizeList] = useState([]);
  const [newSize, setNewSize] = useState("");
  const [isSaveButtonDisabled, setIsSaveButtonDisabled] = useState(true);
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
    // Fetch available sizes from the server
    const fetchSizesData = async () => {
      if (window.localStorage.getItem("userInfo")) {
        try {
          const response = await fetch(
            "http://127.0.0.1:5000/api/dropdownoption/sizes",
            {
              headers: {
                Authorization: `Bearer ${
                  JSON.parse(window.localStorage.getItem("userInfo")).token
                }`,
              },
            }
          );
          if (response.ok) {
            const sizesData = await response.json();
            setSizesData(sizesData[0].size);
          } else if (response.status === 401) {
            window.localStorage.clear();
            naviagate("/login");
          } else {
            console.error("Failed to fetch sizes");
          }
        } catch (error) {
          console.log(error);
        }
      }
    };

    fetchSizesData();
    // eslint-disable-next-line
  }, []);

  const handleNewSizeChange = (e) => {
    setNewSize(e.target.value);
  };

  const handleAddSize = () => {
    // Add new size to the list
    setSizesData([...sizesData, newSize.trim()]);
    setNewSizeList([...newSizeList, newSize.trim()]);
    setNewSize("");
    // Calculate whether the Save button should be disabled
    setIsSaveButtonDisabled(false);
  };

  const handleSave = async () => {
    // Save size to the server
    try {
      // Set loading state to true
      setIsLoading(true);

      const response = await fetch(
        "http://127.0.0.1:5000/api/dropdownoption/sizes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              JSON.parse(window.localStorage.getItem("userInfo")).token
            }`,
          },
          body: JSON.stringify({
            size: newSizeList,
          }),
        }
      );

      if (response.ok) {
        setNewSize("");
        setNewSizeList([]);
        // Calculate whether the Save button should be disabled
        setIsSaveButtonDisabled(true);
        // Show the tooltip
        setShowTooltip(true);

        // Hide the tooltip after a certain duration
        setTimeout(() => {
          setShowTooltip(false);
        }, 3000);
      } else if (response.status === 401) {
        window.localStorage.clear();
        naviagate("/login");
      } else {
        console.error("Failed to save size");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      // Set loading state to false after the request completes
      setIsLoading(false);
    }
  };

  // Calculate whether the Add Size button should be disabled
  const isAddSizeButtonDisabled = newSize.trim() === "";

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Add Size</h2>
      <div className="flex border p-2">
        {/* Size List */}
        <div className="w-1/3 pr-4">
          <h3 className="text-lg font-semibold mb-2">Sizes</h3>
          <ul className="space-y-2">
            {sizesData.map((size, index) => (
              <li key={index} className="cursor-pointer border-b py-2">
                <div key={index} className="border-b pb-1">
                  {size}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Add New Size Section */}
        <div className="w-2/3 pl-4">
          <div className="mt-8">
            <label className="block mb-2">Add New Size:</label>
            <input
              type="text"
              placeholder="Enter New Size"
              value={newSize}
              onChange={handleNewSizeChange}
              className="border p-2 w-full"
            />
            <button
              onClick={handleAddSize}
              disabled={isAddSizeButtonDisabled}
              className={`bg-green-500 text-white py-2 px-4 rounded focus:outline-none hover:bg-green-700 ${
                isAddSizeButtonDisabled ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              Add Size
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-2">
        {showTooltip && (
          <div className="text-green-500 mt-0">Data saved successfully!</div>
        )}
        <button
          onClick={handleSave}
          disabled={isSaveButtonDisabled}
          className={`py-2 px-4 rounded focus:outline-none ${
            isSaveButtonDisabled
              ? "bg-gray-500 opacity-50 cursor-not-allowed text-black"
              : "bg-indigo-500 hover:bg-indigo-700 text-white"
          }`}
        >
          {isLoading ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
};

export default AddSize;
