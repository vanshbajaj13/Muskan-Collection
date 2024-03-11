import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const userInfo = window.localStorage.getItem("userInfo");
    if (userInfo) {
      navigate("/");
    }
    // eslint-disable-next-line
  }, []);

  const [loginDetails, setLoginDetails] = useState({
    email: "",
    password: "",
  });

  const [validationErrors, setValidationErrors] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const isFormValid =
    !validationErrors.email && loginDetails.password.length >= 8;

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
        },
      };

      const { data } = await axios.post(
        "/login",
        {
          email: loginDetails.email,
          password: loginDetails.password,
        },
        config
      );
      if (typeof data === "object") {
        window.localStorage.setItem("userInfo", JSON.stringify(data));
        navigate("/");
      } else {
        if (data) {
          setShowTooltip(true);
          setTimeout(() => {
            setShowTooltip(false);
          }, 3000);
        }
      }
    } catch (error) {
      console.error(error);
    }
    setLoginDetails({
      email: "",
      password: "",
    });
    setLoading(false);
  };

  const validateEmail = () => {
    const { email } = loginDetails;
    let errors = {};

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    setValidationErrors(errors);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Login
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={loginDetails.email}
                onChange={(e) =>
                  setLoginDetails({
                    ...loginDetails,
                    email: e.target.value,
                  })
                }
                onBlur={validateEmail}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
              {validationErrors.email && (
                <p className="text-red-500 text-sm mt-1">
                  {validationErrors.email}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={loginDetails.password}
                onChange={(e) =>
                  setLoginDetails({
                    ...loginDetails,
                    password: e.target.value,
                  })
                }
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
              {validationErrors.password && (
                <p className="text-red-500 text-sm mt-1">
                  {validationErrors.password}
                </p>
              )}
            </div>
          </div>

          {showTooltip && (
            <div className="mt-2 p-2 bg-red-500 text-white text-center rounded-md">
              Wrong credentials. Please try again.
            </div>
          )}
          <div>
            <button
              type="submit"
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white  ${
                isFormValid
                  ? "bg-indigo-500 hover:bg-indigo-700 text-white"
                  : "bg-gray-500 opacity-50 cursor-not-allowed text-black"
              }`}
              disabled={!isFormValid}
            >
              {loading ? "Loading..." : "Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
