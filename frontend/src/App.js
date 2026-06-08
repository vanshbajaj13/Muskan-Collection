import React from "react";
import Home from "./Components/Home";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserRoleProvider } from "./auth/UserRoleContext";
import PhoneHome from "./Components/Phone/PhoneHome";
import ProtectedPhoneRoute from "./Components/Phone/ProtectedPhoneRoute";
import FamilyHome from "./Components/Family/FamilyHome";
import ProtectedFamilyRoute from "./Components/Family//ProtectedFamilyRoute";

const App = () => {
  return (
    <BrowserRouter>
      <UserRoleProvider>
        <Routes>
          {/* Phone business — only role "vansh" or "dev" can access */}
          <Route
            path="/vansh/*"
            element={
              <ProtectedPhoneRoute>
                <PhoneHome />
              </ProtectedPhoneRoute>
            }
          />
          <Route
            path="/family/*"
            element={
              <ProtectedFamilyRoute>
                <FamilyHome />
              </ProtectedFamilyRoute>
            }
          />

          {/* All existing Muskan Collection routes — unchanged */}
          <Route path="/*" element={<Home />} />
        </Routes>
      </UserRoleProvider>
    </BrowserRouter>
  );
};

export default App;