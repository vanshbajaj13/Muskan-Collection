import React from "react";
import NavLink from "./NavLink"; // adjust path to match your structure

const MenuBtn = () => {
  return (
    <div className="fixed top-0 right-0 p-4">
      <NavLink href="/menu" className="text-black hover:text-gray-300">
        Menu
      </NavLink>
    </div>
  );
};

export default MenuBtn;