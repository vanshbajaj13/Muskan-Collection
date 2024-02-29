import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SideBar = () => {
  const naviagate = useNavigate();
  // auto navigate to login
  useEffect(() => {
    function isUserLogedIn() {
      if (!window.localStorage.getItem("userInfo")) {
        naviagate("/login");
      }
    }
    isUserLogedIn();
  }, [naviagate]);

  function Logout() {
    window.localStorage.clear();
    naviagate("/login");
  }

  return (
    <>
      <div
        className={`bg-gray-800 text-white h-full fixed top-0 w-full p-4 transition-all duration-300 ease-in-out z-50`}
      >
        <div>
          <h2 className="text-2xl font-bold mb-8">Menu</h2>
          <a
            href="/dashboard"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Dashboard
          </a>
          <a
            href="/inventory"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Inventory
          </a>
          <a
            href="/sale"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Sale
          </a>
          <a
            href="/purchase"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Purchase
          </a>
          <a
            href="/add-expense"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Add Expense
          </a>
          <a
            href="/add-brand-product"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Add Brand and Product
          </a>
          <a
            href="/add-size"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Add Size
          </a>
          <a
            href="/add-category"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Add Category
          </a>
          <a
            href="/login"
            className="block py-2 px-4 text-red-600 rounded transition duration-300 hover:bg-gray-700"
            onClick={Logout}
          >
            Log Out
          </a>
        </div>
      </div>
    </>
  );
};

export default SideBar;
