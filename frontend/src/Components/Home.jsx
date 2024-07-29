import React from "react";
import { Route, Routes } from "react-router-dom";
import Sale from "./SalePage/Sales";
import Purchase from "./PurchasePage/Purchase";
import SideBar from "./SideBar/SideBar";
import Dashboard from "./Dashboard/Dashboard";
import MenuBtn from "./MenuBtn";
import AddBrandProduct from "./AddFeatures/AddBrandProduct";
import AddCategory from "./AddFeatures/AddCategory";
import AddSize from "./AddFeatures/AddSize";
import AddExpense from "./AddFeatures/AddExpense";
import Login from "./LoginPage/Login";
import Inventory from "./Inventory/Inventory";
import History from "./HistoryPage/History";
import EditItem from "./AddFeatures/EditItem";
import SaleHistory from "./HistoryPage/SaleHistory";
import { useUserRole } from "../auth/UserRoleContext";
import PrintTag from "./AddFeatures/PrintTag";
import ExpenseHistory from "./HistoryPage/ExpenseHistory";
import Repurchase from "./RepurchasePage/Repurchase";
import CustomerPurchase from "./SalePage/CustomerPurchase";
import EditSelectedItems from "./AddFeatures/EditSelectedItems";
import Search from "./SearchPage/Search";

const Home = () => {
  const [userRole] = useUserRole();

  const isAdmin = userRole === "admin";
  var isDev = userRole === "dev";
  return (
    <>
      <MenuBtn></MenuBtn>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/menu" element={<SideBar />} />
        <Route path="/sale" element={<Sale />} />
        <Route path="/customer-purchase" element={<CustomerPurchase />} />
        <Route path="/purchase" element={<Purchase />} />
        <Route path="/print-tag" element={<PrintTag />} />
        {(isAdmin || isDev) && (
          <Route path="/dashboard" element={<Dashboard />} />
        )}
        <Route path="/add-brand-product" element={<AddBrandProduct />} />
        <Route path="/add-category" element={<AddCategory />} />
        <Route path="/add-size" element={<AddSize />} />
        {(isAdmin || isDev) && (
          <Route path="/inventory" element={<Inventory />} />
        )}
        <Route path="/add-expense" element={<AddExpense />} />
        {(isAdmin || isDev) && <Route path="/history" element={<History />} />}
        {(isAdmin || isDev) && <Route path="/repurchase" element={<Repurchase />} />}
        {(isAdmin || isDev) && <Route path="/search" element={<Search />} />}
        {(isAdmin || isDev) && (
          <Route path="/sale-history" element={<SaleHistory />} />
        )}
        {(isDev) && (
          <Route path="/sale-history/:code" element={<SaleHistory />} />
        )}
        {(isDev) && (
          <Route path="/edit-selected-items" element={<EditSelectedItems />} />
        )}
          <Route path="/expense-history" element={<ExpenseHistory />} />
        {isDev && <Route path="/edit-item/:code" element={<EditItem />} />}
        <Route path="*" element={<SideBar />} />
      </Routes>
    </>
  );
};

export default Home;
