import React from "react";
import Home from "./Components/Home";
import { BrowserRouter } from "react-router-dom";
import { UserRoleProvider } from "./auth/UserRoleContext";

const App = () => {
  return (
    <BrowserRouter>
      <UserRoleProvider>
        <Home />
      </UserRoleProvider>
    </BrowserRouter>
  );
};

export default App;
