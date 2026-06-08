import React from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { FamilyPlannerProvider } from "./FamilyPlannerContext";
import FPDashboard from "./FPDashboard";
import FPIncome from "./FPIncome";
import FPExpenses from "./FPExpenses";
import FPBusiness from "./FPBusiness";
import FPDebts from "./FPDebts";
import FPSavings from "./FPSavings";
import FPSettings from "./FPSettings";
import MenuBtn from "../MenuBtn";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: "", path: "" },
  { key: "income",    label: "Income",    icon: "", path: "income" },
  { key: "expenses",  label: "Expenses",  icon: "", path: "expenses" },
  { key: "business",  label: "Business",  icon: "", path: "business" },
  { key: "debts",     label: "Debts",     icon: "", path: "debts" },
  { key: "savings",   label: "Goals",     icon: "", path: "savings" },
  { key: "settings",  label: "Settings",  icon: "",  path: "settings" },
];

export default function FamilyHome() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeKey = (() => {
    const seg = location.pathname.split("/family/")[1] || "";
    const found = TABS.slice(1).find(t => seg === t.path || seg.startsWith(t.path + "/"));
    return found ? found.key : "dashboard";
  })();

  const go = (tab) => navigate(tab.path ? `/family/${tab.path}` : "/family");

  return (
    <FamilyPlannerProvider>
      <div className="min-h-screen bg-slate-50 font-sans">
        {/* ── Top bar ── */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl"></span>
              <div>
                <p className="text-base font-bold text-slate-800 leading-tight">Family Planner</p>
                <p className="text-xs text-slate-400">Financial overview</p>
              </div>
            </div>
            <MenuBtn></MenuBtn>
          </div>

          {/* ── Tab nav ── */}
          <div className="max-w-5xl mx-auto px-4 overflow-x-auto hide-scrollbar">
            <div className="flex gap-1 pb-0">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => go(t)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors
                    ${activeKey === t.key
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    }`}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="max-w-5xl mx-auto px-4 py-5 pb-20">
          <Routes>
            <Route index element={<FPDashboard />} />
            <Route path="income" element={<FPIncome />} />
            <Route path="expenses" element={<FPExpenses />} />
            <Route path="business" element={<FPBusiness />} />
            <Route path="debts" element={<FPDebts />} />
            <Route path="savings" element={<FPSavings />} />
            <Route path="settings" element={<FPSettings />} />
          </Routes>
        </main>
      </div>
    </FamilyPlannerProvider>
  );
}