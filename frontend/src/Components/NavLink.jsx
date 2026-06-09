// NavLink.jsx
// Drop-in replacement for <a href="..."> in SideBar and MenuBtn.
// Shows the global navigation spinner immediately on click,
// then navigates using React Router (no hard page reload).
import React from "react";
import { useNavigate } from "react-router-dom";
import { useNavigationLoader } from "../auth/NavigationLoaderContext";

const NavLink = ({ href, children, className, onClick, message }) => {
  const navigate = useNavigate();
  const { startNavigation } = useNavigationLoader();

  const handleClick = (e) => {
    e.preventDefault();

    // Run any extra onClick logic (e.g. Logout clearing localStorage)
    if (onClick) onClick(e);

    // Show the spinner immediately
    startNavigation(message);

    // Navigate — React Router will unmount this page and mount the next.
    // RouteChangeListener (in App.js) will clear the spinner once the new
    // route finishes rendering.
    navigate(href);
  };

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
};

export default NavLink;
