// Toast.js
import React from "react";

const Toast = ({ message, type = "info", onClose }) => {
  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
    info: "bg-blue-500"
  }[type];

  return (
    <div className={`${bgColor} text-white p-4 rounded-md shadow-lg flex justify-between items-center min-w-64`}>
      <span>{message}</span>
      <button onClick={onClose} className="text-white ml-4">
        &times;
      </button>
    </div>
  );
};

export default Toast;