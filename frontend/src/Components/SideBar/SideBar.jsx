import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const SideBar = () => {
  const naviagate = useNavigate();
  const [userRole, setUserRole] = useState("user");

  useEffect(() => {
    // Define a function to fetch the user role
    const fetchUserRole = async () => {
      try {
        if (window.localStorage.getItem("userInfo")) {
          const response = await fetch("/api/role", {
            headers: {
              Authorization: `Bearer ${
                JSON.parse(window.localStorage.getItem("userInfo")).token
              }`,
            },
          });
          if (response.ok) {
            const role = await response.json();
            setUserRole(role.role);
          } else {
            console.error("Failed to fetch role");
            window.localStorage.clear();
            naviagate("/login");
          }
        }
      } catch (error) {
        console.log(error);
      }
    };

    // Call the fetchUserRole function
    fetchUserRole();
    // eslint-disable-next-line
  }, []);

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
  var isAdmin = userRole === "admin";
  return (
    <>
      <div
        className={`bg-gray-800 text-white h-full fixed top-0 w-full p-4 transition-all duration-300 ease-in-out z-50`}
      >
        <div>
          <h2 className="text-2xl font-bold mb-8">Menu</h2>
          {isAdmin && (
            <a
              href="/dashboard"
              className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
            >
              Dashboard
            </a>
          )}
          {isAdmin && (
            <a
              href="/inventory"
              className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
            >
              Inventory
            </a>
          )}
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
