import React, { useEffect, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
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

const Home = () => {
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

  const isAdmin = userRole === "admin";

  return (
    <>
      <MenuBtn></MenuBtn>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/menu" element={<SideBar />} />
        <Route path="/sale" element={<Sale />} />
        <Route path="/purchase" element={<Purchase />} />
        {isAdmin && <Route path="/dashboard" element={<Dashboard />} />}
        <Route path="/add-brand-product" element={<AddBrandProduct />} />
        <Route path="/add-category" element={<AddCategory />} />
        <Route path="/add-size" element={<AddSize />} />
        {isAdmin && <Route path="/inventory" element={<Inventory />} />}
        <Route path="/add-expense" element={<AddExpense />} />
        <Route path="*" element={<SideBar />} />
      </Routes>
    </>
  );
};

export default Home;
