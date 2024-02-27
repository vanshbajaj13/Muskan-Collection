import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Sale from "./SalePage/Sales";
import Purchase from "./PurchasePage/Purchase";
import SideBar from "./SideBar/SideBar";
import Dashboard from "./Dashboard/Dashboard";
import MenuBtn from "./MenuBtn";
import AddBrandProduct from "./AddFeatures/AddBrandProduct";
import AddCategory from "./AddFeatures/AddCategory";
import AddSize from "./AddFeatures/AddSize";
import AddExpense from "./AddFeatures/AddExpense";

const Home = () => {
  return (
    <>
      <MenuBtn></MenuBtn>
      <BrowserRouter>
        <Routes>
          <Route exact path="/menu" element={<SideBar />} />
          <Route exact path="/sale" element={<Sale />} />
          <Route exact path="/purchase" element={<Purchase />} />
          <Route
            exact
            path="/add-brand-product"
            element={<AddBrandProduct />}
          />
          <Route exact path="/add-category" element={<AddCategory />} />
          <Route exact path="/add-size" element={<AddSize />} />
          <Route exact path="/dashboard" element={<Dashboard />} />
          <Route exact path="/add-expense" element={<AddExpense />} />
          <Route path="*" element={<SideBar />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

export default Home;
