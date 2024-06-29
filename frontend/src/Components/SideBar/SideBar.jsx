import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "../../auth/UserRoleContext";

const SideBar = () => {
  const naviagate = useNavigate();
  const [userRole] = useUserRole();

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
  var isDev = userRole === "dev";
  return (
    <>
      <div
        className={`bg-gray-800 text-white h-full fixed top-0 w-full p-4 transition-all duration-300 ease-in-out z-50 max-h-screen overflow-y-auto hide-scrollbar`}

      >
        <div>
          <h2 className="text-2xl font-bold mb-8">Menu</h2>
          {(isAdmin || isDev) && (
            <a
              href="/dashboard"
              className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
            >
              Dashboard
            </a>
          )}
          {(isAdmin || isDev) && (
            <a
              href="/inventory"
              className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
            >
              Inventory
            </a>
          )}
          <a
            href="/sale"
            className="text-green-500 block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Sale
          </a>
          <a
            href="/add-expense"
            className="text-red-500 block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Add Expense
          </a>
          <a
            href="/purchase"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Purchase
          </a>
          <a
            href="/customer-purchase"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Customer Purchase
          </a>
          {(isAdmin || isDev) && (
            <a
              href="/repurchase"
              className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
            >
              Re-Purchase
            </a>
          )}
          {(isAdmin || isDev) && (
            <a
              href="/history"
              className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
            >
              History
            </a>
          )}
          {(isAdmin || isDev) && (
            <a
              href="/sale-history"
              className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
            >
              Sale History / Return
            </a>
          )}
          <a
            href="/expense-history"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Expense History
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
            href="/print-tag"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Print Tags
          </a>
          <a
            href="/login"
            className="font-bold block py-2 px-4 text-red-500 rounded transition duration-300 hover:bg-gray-700"
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
