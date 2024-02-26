import React, { useState, useEffect } from "react";

const AddCategory = () => {
  const [categoriesData, setCategoriesData] = useState([]);
  const [newCategoryList, setNewCategoryList] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [isSaveButtonDisabled, setIsSaveButtonDisabled] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch available categories from the server
    const fetchCategoriesData = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:5000/api/dropdownoption/categories"
        );
        if (response.ok) {
          const categoriesData = await response.json();
          setCategoriesData(categoriesData[0].category);
        } else {
          console.error("Failed to fetch categories");
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchCategoriesData();
  }, []);

  const handleNewCategoryChange = (e) => {
    setNewCategory(e.target.value);
  };

  const handleAddCategory = () => {
    // Add new category to the list
    setCategoriesData([...categoriesData, newCategory.trim()]);
    setNewCategoryList([...newCategoryList, newCategory.trim()]);
    setNewCategory("");
    // Calculate whether the Save button should be disabled
    setIsSaveButtonDisabled(false);
  };

  const handleSave = async () => {
    // Save category to the server
    try {
      // Set loading state to true
      setIsLoading(true);
      console.log(newCategoryList);
      const response = await fetch(
        "http://127.0.0.1:5000/api/dropdownoption/categories",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            category: newCategoryList,
          }),
        }
      );

      if (response.ok) {
        setNewCategory("");
        setNewCategoryList([]);
        // Calculate whether the Save button should be disabled
        setIsSaveButtonDisabled(true);
        // Show the tooltip
        setShowTooltip(true);

        // Hide the tooltip after a certain duration
        setTimeout(() => {
          setShowTooltip(false);
        }, 3000);
      } else {
        console.error("Failed to save category");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      // Set loading state to false after the request completes
      setIsLoading(false);
    }
  };

  // Calculate whether the Add Category button should be disabled
  const isAddCategoryButtonDisabled = newCategory.trim() === "";

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Add Category</h2>
      <div className="flex border p-2">
        {/* Category List */}
        <div className="w-1/3 pr-4">
          <h3 className="text-lg font-semibold mb-2">Categories</h3>
          <ul className="space-y-2">
            {categoriesData.map((category, index) => (
              <li key={index} className="cursor-pointer border-b py-2">
                <div key={index} className="border-b pb-1">
                  {category}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Add New Category Section */}
        <div className="w-2/3 pl-4">
          <div className="mt-8">
            <label className="block mb-2">Add New Category:</label>
            <input
              type="text"
              placeholder="Enter New Category"
              value={newCategory}
              onChange={handleNewCategoryChange}
              className="border p-2 w-full"
            />
            <button
              onClick={handleAddCategory}
              disabled={isAddCategoryButtonDisabled}
              className={`bg-green-500 text-white py-2 px-4 rounded focus:outline-none hover:bg-green-700 ${
                isAddCategoryButtonDisabled
                  ? "cursor-not-allowed opacity-50"
                  : ""
              }`}
            >
              Add Category
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

export default AddCategory;
