import React, { useState } from "react";
import { PhoneProvider } from "./PhoneContext";
import PhoneDeals from "./PhoneDeals";
import DropdownManager from "./DropdownManager";
import ExpenseTracker from "./ExpenseTracker";
import PhoneDashboard from "./PhoneDashboard";

const TABS = [
  { key: "deals",     label: "📱 Deals",     component: <PhoneDeals /> },
  { key: "dashboard", label: "📊 Dashboard", component: <PhoneDashboard /> },
  { key: "expenses",  label: "💳 Expenses",  component: <ExpenseTracker /> },
  { key: "dropdowns", label: "⚙️ Options",   component: <DropdownManager /> },
];

const PhoneHome = () => {
  const [activeTab, setActiveTab] = useState("deals");

  const current = TABS.find((t) => t.key === activeTab);

  return (
    <PhoneProvider>
      <div className="min-h-screen bg-slate-50">
        {/* ── Top bar ─────────────────────────────────────────────── */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4">
            {/* Title row */}
            <div className="flex items-center gap-3 py-3 border-b border-slate-100">
              <span className="text-2xl">📱</span>
              <div>
                <h1 className="font-bold text-slate-800 text-base leading-tight">Vansh Phones</h1>
                <p className="text-xs text-slate-400">Phone resale tracker</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 py-2 overflow-x-auto hide-scrollbar">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                    ${activeTab === tab.key
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tab content ─────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 py-6">
          {current?.component}
        </div>
      </div>
    </PhoneProvider>
  );
};

export default PhoneHome;