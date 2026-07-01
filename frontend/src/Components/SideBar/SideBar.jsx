import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "../../auth/UserRoleContext";
import Spinner from "../Loader/Spinner";
import NavLink from "../NavLink"; // adjust path to match your structure

const SideBar = () => {
  const navigate = useNavigate();
  const [userRole] = useUserRole();

  // auto navigate to login
  useEffect(() => {
    function isUserLogedIn() {
      if (!window.localStorage.getItem("userInfo")) {
        navigate("/login");
      }
    }
    isUserLogedIn();
  }, [navigate]);

  function Logout() {
    window.localStorage.clear();
    // navigate is called by NavLink after this runs
  }

  var isAdmin = userRole === "admin";
  var isDev = userRole === "dev";
  var isLoading = userRole === "loading";

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 999 }}
      >
        <Spinner />
      </div>
    );
  }

  return (
    <div
      className={`bg-gray-800 text-white h-full fixed top-0 w-full p-4 transition-all duration-300 ease-in-out z-50 max-h-screen overflow-y-auto hide-scrollbar`}
    >
      <div>
        <h2 className="text-2xl font-bold mb-8">Menu</h2>

        <NavLink
          href="/search"
          className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
        >
          <div className="flex">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
            </svg>
            <p className="ml-1">Search</p>
          </div>
        </NavLink>

        {(isAdmin || isDev) && (
          <NavLink
            href="/dashboard"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Dashboard
          </NavLink>
        )}

        {isDev && (
          <NavLink
            href="/vansh"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Vansh
          </NavLink>
        )}

        {isDev && (
          <NavLink
            href="/family"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Family Expenses
          </NavLink>
        )}
        {(isAdmin || isDev)  && (
          <NavLink
            href="/cars"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            🚗 Car Business
          </NavLink>
        )}

        {(isAdmin || isDev) && (
          <NavLink
            href="/inventory"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Inventory
          </NavLink>
        )}

        {(isAdmin || isDev) && (
          <NavLink
            href="/item-activity"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            📜 Item Activity History
          </NavLink>
        )}

        <NavLink
          href="/sale"
          className="text-green-500 block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
        >
          Sale
        </NavLink>

        <NavLink
          href="/add-expense"
          className="text-red-500 block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
        >
          Add Expense
        </NavLink>

        <NavLink
          href="/purchase"
          className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
        >
          Purchase
        </NavLink>

        <NavLink
          href="/customer-purchase"
          className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
        >
          Customer Purchase
        </NavLink>

        {(isAdmin || isDev) && (
          <NavLink
            href="/repurchase"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Re-Purchase
          </NavLink>
        )}

        {(isAdmin || isDev) && (
          <NavLink
            href="/history"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            History
          </NavLink>
        )}

        {(isAdmin || isDev) && (
          <NavLink
            href="/sale-history"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Sale History / Return
          </NavLink>
        )}

        {isDev && (
          <NavLink
            href="/verification"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Stock Verification
          </NavLink>
        )}

        {(isAdmin || isDev) && (
          <NavLink
            href="/sales-report"
            className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
          >
            Sales Report (CA/GST)
          </NavLink>
        )}

        <NavLink
          href="/expense-history"
          className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
        >
          Expense History
        </NavLink>

        <NavLink
          href="/add-brand-product"
          className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
        >
          Add Brand
        </NavLink>

        <NavLink
          href="/add-product"
          className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
        >
          Add Product
        </NavLink>

        <NavLink
          href="/add-size"
          className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
        >
          Add Size
        </NavLink>

        <NavLink
          href="/add-category"
          className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
        >
          Add Category
        </NavLink>

        <NavLink
          href="/add-expense-type"
          className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
        >
          Add Expense Type
        </NavLink>

        <NavLink
          href="/print-tag"
          className="block py-2 px-4 rounded transition duration-300 hover:bg-gray-700"
        >
          Print Tags
        </NavLink>

        <NavLink
          href="/login"
          className="font-bold block py-2 px-4 text-red-500 rounded transition duration-300 hover:bg-gray-700"
          onClick={Logout}
        >
          Log Out
        </NavLink>
      </div>
    </div>
  );
};

export default SideBar;
