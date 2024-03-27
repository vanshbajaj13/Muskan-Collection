// userRoleContext.jsx

import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const UserRoleContext = createContext();

export const useUserRole = () => useContext(UserRoleContext);

export const UserRoleProvider = ({ children }) => {
  const navigate = useNavigate(); // Fixed typo
  const [userRole, setUserRole] = useState("user");

  useEffect(() => {
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
            navigate("/login"); // Updated to use navigate from the scope
          }
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchUserRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <UserRoleContext.Provider value={[userRole, setUserRole]}> {/* Return setUserRole as part of the value array */}
      {children}
    </UserRoleContext.Provider>
  );
};
