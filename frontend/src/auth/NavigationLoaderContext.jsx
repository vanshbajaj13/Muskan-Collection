// NavigationLoaderContext.jsx
import React, { createContext, useContext, useState, useCallback } from "react";

const NavigationLoaderContext = createContext();

export const useNavigationLoader = () => useContext(NavigationLoaderContext);

export const NavigationLoaderProvider = ({ children }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  // eslint-disable-next-line
  const [message, setMessage] = useState("Loading…");

  const startNavigation = useCallback((msg = "Loading…") => {
    setMessage(msg);
    setIsNavigating(true);
  }, []);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
  }, []);

  return (
    <NavigationLoaderContext.Provider
      value={{ isNavigating, startNavigation, stopNavigation }}
    >
      {children}
    </NavigationLoaderContext.Provider>
  );
};