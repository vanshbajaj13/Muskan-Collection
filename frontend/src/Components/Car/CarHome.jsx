import React, { useState } from "react";
import { CarProvider } from "./CarContext";
import CarDeals from "./CarDeals";
import CarDashboard from "./CarDashboard";
import CarDropdownManager from "./CarDropdownManager";
import MenuBtn from "../MenuBtn";

const TABS = [
  { key: "deals",     label: "🚗 डील / Deals",       component: <CarDeals /> },
  { key: "dashboard", label: "📊 रिपोर्ट / Report",   component: <CarDashboard /> },
  { key: "options",   label: "⚙️ विकल्प / Options",   component: <CarDropdownManager /> },
];

const CarHome = () => {
  const [activeTab, setActiveTab] = useState("deals");
  const current = TABS.find((t) => t.key === activeTab);

  return (
    <CarProvider>
      <div className="min-h-screen bg-gray-100 overflow-y-auto hide-scrollbar">
        {/* Top bar */}
        <div className="bg-white border-b-2 border-gray-200 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4">
            {/* Title */}
            <div className="flex items-center gap-3 py-4 border-b-2 border-gray-100">
              <span className="text-3xl">🚗</span>
              <div>
                <h1 className="font-extrabold text-gray-800 text-xl leading-tight">
                  गाड़ी व्यापार / Car Business
                </h1>
                <p className="text-sm text-gray-400">गाड़ियों की खरीद−बिक्री का हिसाब</p>
              </div>
              <MenuBtn />
            </div>

            {/* Tabs — large, easy to tap */}
            <div className="flex gap-2 py-3 overflow-x-auto hide-scrollbar">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-3 rounded-xl text-base font-bold whitespace-nowrap transition-colors
                    ${activeTab === tab.key
                      ? "bg-blue-600 text-white shadow"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div key={activeTab} className="max-w-4xl mx-auto px-4 py-6 animate-enter">
          {current?.component}
        </div>
      </div>
    </CarProvider>
  );
};

export default CarHome;