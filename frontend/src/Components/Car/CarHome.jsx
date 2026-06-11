import React, { useState } from "react";
import { CarProvider } from "./CarContext";
import CarDeals from "./CarDeals";
import CarDashboard from "./CarDashboard";
import CarDropdownManager from "./CarDropdownManager";
import MenuBtn from "../MenuBtn";

const TABS = [
  { key: "deals",     label: "Deals",     component: <CarDeals /> },
  { key: "dashboard", label: "Reports",   component: <CarDashboard /> },
  { key: "options",   label: "Options",   component: <CarDropdownManager /> },
];

const CarHome = () => {
  const [activeTab, setActiveTab] = useState("deals");
  const current = TABS.find((t) => t.key === activeTab);

  return (
    <CarProvider>
      <div className="min-h-screen bg-slate-50 overflow-y-auto hide-scrollbar">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-2xl mx-auto px-4">
            {/* Title row */}
            <div className="flex items-center gap-3 py-3.5 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8 7h8M8 11h5m-9 8h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-slate-800 text-base leading-tight">Car Business</h1>
                <p className="text-xs text-slate-400">Vehicle buy/sell tracker</p>
              </div>
              <MenuBtn />
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 py-2">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors
                    ${activeTab === tab.key
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div key={activeTab} className="max-w-2xl mx-auto px-4 py-5 animate-enter">
          {current?.component}
        </div>
      </div>
    </CarProvider>
  );
};

export default CarHome;