import React from "react";
import ReactDOM from "react-dom";

// ── Color palette ─────────────────────────────────────────────────────────────
export const COLORS = {
  income: "#10b981",   // emerald
  expense: "#f43f5e",  // rose
  net: "#6366f1",      // indigo
  biz: "#f59e0b",      // amber
  debt: "#ef4444",     // red
  lent: "#3b82f6",     // blue
  savings: "#8b5cf6",  // violet
};

export const CHART_PALETTE = [
  "#6366f1","#10b981","#f59e0b","#f43f5e","#3b82f6","#8b5cf6",
  "#ec4899","#14b8a6","#f97316","#84cc16","#06b6d4","#a855f7",
];
export const getColor = (i) => CHART_PALETTE[i % CHART_PALETTE.length];

// ── Badge ─────────────────────────────────────────────────────────────────────
export const Badge = ({ children, color = "slate" }) => {
  const map = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-rose-50 text-rose-700 border-rose-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[color] || map.slate}`}>
      {children}
    </span>
  );
};

// ── Summary card ──────────────────────────────────────────────────────────────
export const SummaryCard = ({ label, value, sub, color = "slate", icon }) => {
  const accent = {
    green: "bg-emerald-50 border-emerald-100 text-emerald-700",
    red: "bg-rose-50 border-rose-100 text-rose-600",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-700",
    violet: "bg-violet-50 border-violet-100 text-violet-700",
    slate: "bg-slate-50 border-slate-200 text-slate-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${accent[color] || accent.slate}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-lg">{icon}</span>}
        <p className="text-xs font-semibold uppercase tracking-wide opacity-60">{label}</p>
      </div>
      <p className="text-xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
    </div>
  );
};

// ── Section header ────────────────────────────────────────────────────────────
export const SectionHead = ({ title, sub, children }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      {sub && <p className="text-sm text-slate-400 mt-0.5">{sub}</p>}
    </div>
    <div className="flex items-center gap-2">{children}</div>
  </div>
);

// ── Field wrapper ─────────────────────────────────────────────────────────────
export const Field = ({ label, children, required, hint, className = "" }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
      {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-slate-400">{hint}</p>}
  </div>
);

// ── Input ─────────────────────────────────────────────────────────────────────
export const FPInput = React.forwardRef(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 
      focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white
      placeholder-slate-300 ${className}`}
    style={{ fontSize: "16px" }}
    {...props}
  />
));

// ── Select ────────────────────────────────────────────────────────────────────
export const FPSelect = ({ options = [], placeholder = "Select…", className = "", ...props }) => (
  <select
    className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 
      focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white ${className}`}
    style={{ fontSize: "16px" }}
    {...props}
  >
    <option value="">{placeholder}</option>
    {options.map((o) => (
      <option key={o} value={o}>{o}</option>
    ))}
  </select>
);

// ── Textarea ──────────────────────────────────────────────────────────────────
export const FPTextarea = ({ className = "", ...props }) => (
  <textarea
    rows={2}
    className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 
      focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white resize-none ${className}`}
    style={{ fontSize: "16px" }}
    {...props}
  />
);

// ── Button ────────────────────────────────────────────────────────────────────
export const Btn = ({ variant = "primary", className = "", children, ...props }) => {
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm",
    secondary: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm",
    danger: "bg-rose-500 hover:bg-rose-600 text-white shadow-sm",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
    amber: "bg-amber-500 hover:bg-amber-600 text-white shadow-sm",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg
        text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// ── Modal ─────────────────────────────────────────────────────────────────────
export const Modal = ({ title, onClose, children, wide = false }) =>
  ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-3xl" : "max-w-xl"}
        max-h-[85vh] flex flex-col overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center
              text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );

// ── Confirm modal ─────────────────────────────────────────────────────────────
export const ConfirmModal = ({ title, body, onConfirm, onCancel, loading }) => {
  const [text, setText] = React.useState("");
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-rose-500 text-xl">⚠</span>
        </div>
        <h3 className="text-center font-semibold text-slate-800 mb-2">{title}</h3>
        {body && <p className="text-center text-sm text-slate-500 mb-4">{body}</p>}
        <FPInput value={text} onChange={e => setText(e.target.value.toUpperCase())}
          placeholder="CONFIRM" className="text-center uppercase tracking-wide font-medium mb-4" />
        <div className="flex gap-3">
          <Btn variant="secondary" className="flex-1" onClick={onCancel} disabled={loading}>Cancel</Btn>
          <Btn variant="danger" className="flex-1" onClick={onConfirm}
            disabled={loading || text !== "CONFIRM"}>{loading ? "…" : "Confirm"}</Btn>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── Toast ─────────────────────────────────────────────────────────────────────
export const Toast = ({ message, type = "success", onClose }) => {
  const colors = {
    success: "bg-emerald-600",
    error: "bg-rose-500",
    info: "bg-indigo-500",
    warning: "bg-amber-500",
  };
  return (
    <div className={`${colors[type]} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-64`}>
      <span className="text-sm flex-1">{message}</span>
      <button onClick={onClose} className="text-white/70 hover:text-white text-lg leading-none">✕</button>
    </div>
  );
};

// ── FullScreenSpinner ─────────────────────────────────────────────────────────
export const FullSpinner = ({ message = "Loading…" }) =>
  ReactDOM.createPortal(
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-4 bg-white/20 backdrop-blur-sm">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-slate-700 font-medium">{message}</p>
    </div>,
    document.body
  );

// ── Pill tabs ─────────────────────────────────────────────────────────────────
export const PillTabs = ({ tabs, active, onChange }) => (
  <div className="flex bg-slate-100 rounded-lg p-1 gap-1 overflow-x-auto">
    {tabs.map(t => (
      <button key={t.key} onClick={() => onChange(t.key)}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap
          ${active === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
        {t.label}
      </button>
    ))}
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────
export const EmptyState = ({ icon, title, sub, action }) => (
  <div className="text-center py-14 bg-white rounded-xl border border-slate-200">
    <p className="text-4xl mb-3">{icon}</p>
    <p className="font-semibold text-slate-600">{title}</p>
    {sub && <p className="text-sm text-slate-400 mt-1">{sub}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);