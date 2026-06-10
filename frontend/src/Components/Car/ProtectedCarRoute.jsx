import React from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "../../auth/UserRoleContext";
import Spinner from "../Loader/Spinner";

const ProtectedCarRoute = ({ children }) => {
  const [userRole] = useUserRole();

  if (userRole === "loading") {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 999 }}
      >
        <Spinner />
      </div>
    );
  }

  if (userRole !== "dev" && userRole !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedCarRoute;