import React from "react";
import Home from "./Components/Home";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserRoleProvider } from "./auth/UserRoleContext";
import { NavigationLoaderProvider } from "./auth/NavigationLoaderContext";
import RouteChangeListener from "./auth/RouteChangeListener";
import PhoneHome from "./Components/Phone/PhoneHome";
import ProtectedPhoneRoute from "./Components/Phone/ProtectedPhoneRoute";
import FamilyHome from "./Components/Family/FamilyHome";
import ProtectedFamilyRoute from "./Components/Family/ProtectedFamilyRoute";
import { FullScreenSpinner } from "./Components/Loader/FullScreenSpinner"; // adjust path
import { useNavigationLoader } from "./auth/NavigationLoaderContext";

// Inner component so it can consume the NavigationLoaderContext
const AppRoutes = () => {
  const { isNavigating, message } = useNavigationLoader();

  return (
    <>
      {isNavigating && <FullScreenSpinner message={message} />}
      <RouteChangeListener />
      <UserRoleProvider>
        <Routes>
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
          <Route path="/*" element={<Home />} />
        </Routes>
      </UserRoleProvider>
    </>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <NavigationLoaderProvider>
        <AppRoutes />
      </NavigationLoaderProvider>
    </BrowserRouter>
  );
};

export default App;