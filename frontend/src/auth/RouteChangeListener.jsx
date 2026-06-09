// RouteChangeListener.jsx
// Mount this once inside <BrowserRouter>. It watches the current location
// and turns off the navigation spinner as soon as the route changes,
// i.e. after the new page component starts rendering.
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useNavigationLoader } from "./NavigationLoaderContext"; // adjust path as needed

const RouteChangeListener = () => {
  const location = useLocation();
  const { stopNavigation } = useNavigationLoader();
  const firstRender = useRef(true);

  useEffect(() => {
    // Don't fire on the very first mount — no navigation happened yet.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // New route is rendering — hide the spinner.
    stopNavigation();
  }, [location.pathname, stopNavigation]);

  return null;
};

export default RouteChangeListener;