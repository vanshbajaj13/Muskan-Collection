import React from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "../../auth/UserRoleContext";
import Spinner from "../Loader/Spinner";

/**
 * Guards all /vansh/* routes.
 * Uses the same UserRoleContext your entire app already uses —
 * no extra localStorage reading, perfectly consistent with Home.jsx pattern.
 * Only "vansh" and "dev" roles are allowed through.
 */
const ProtectedPhoneRoute = ({ children }) => {
  const [userRole] = useUserRole();
    console.log(userRole);
    
  const allowed = ["vansh", "dev"];
  const isLoading = userRole === "loading";
  if (isLoading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 999 }}
      >
        <Spinner></Spinner>
      </div>
    );
  }
  if (!allowed.includes(userRole)) {
    // Redirect to home silently — same as how Home.jsx hides routes for non-admins
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedPhoneRoute;