import React from "react";
import ReactDOM from "react-dom";

// ── Spinner ───────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 24 }) => (
  <>
    <style>{`@keyframes carSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${Math.max(2, size / 8)}px solid #e2e8f0`,
        borderTop: `${Math.max(2, size / 8)}px solid #4f46e5`,
        animation: "carSpin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  </>
);

// ── Full screen overlay spinner ────────────────────────────────────────────────
export const FullScreenSpinner = ({ message = "Loading…" }) =>
  ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-4"
      style={{
        backgroundColor: "rgba(15,23,42,0.6)",
        backdropFilter: "blur(2px)",
      }}
    >
      <Spinner size={48} />
      <p className="text-white text-base font-medium tracking-wide">
        {message}
      </p>
    </div>,
    document.body,
  );

// ── Field wrapper ─────────────────────────────────────────────────────────────
export const Field = ({ label, children, required, hint, className = "" }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-sm font-semibold text-slate-600">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {hint && <p className="text-xs text-slate-400 -mt-0.5">{hint}</p>}
    {children}
  </div>
);

// ── Input ─────────────────────────────────────────────────────────────────────
export const Input = React.forwardRef(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-base text-slate-800
      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
      bg-white placeholder-slate-300 transition-shadow ${className}`}
    style={{ fontSize: "16px" }}
    {...props}
  />
));

// ── Select ────────────────────────────────────────────────────────────────────
export const Select = ({
  options = [],
  placeholder = "Select…",
  className = "",
  ...props
}) => (
  <select
    className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-base text-slate-800
      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
      bg-white transition-shadow appearance-none ${className}`}
    style={{ fontSize: "16px" }}
    {...props}
  >
    <option value="">{placeholder}</option>
    {options.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
  </select>
);

// ── Textarea ──────────────────────────────────────────────────────────────────
export const Textarea = ({ className = "", ...props }) => (
  <textarea
    className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-base text-slate-800
      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
      bg-white placeholder-slate-300 resize-none transition-shadow ${className}`}
    rows={3}
    style={{ fontSize: "16px" }}
    {...props}
  />
);

// ── Button ────────────────────────────────────────────────────────────────────
export const Btn = ({
  variant = "primary",
  className = "",
  children,
  ...props
}) => {
  const variants = {
    primary:
      "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm",
    secondary:
      "bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200",
    danger:
      "bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-sm",
    success: "bg-green-600 hover:bg-green-700 text-white shadow-sm",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
        text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-6 px-3 pb-6"
      style={{
        backgroundColor: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl w-full ${wide ? "max-w-2xl" : "max-w-lg"}
        max-h-[92vh] flex flex-col overflow-hidden`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400
              hover:text-slate-700 hover:bg-slate-100 transition-colors text-lg font-bold"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );

// ── Status badge ──────────────────────────────────────────────────────────────
export const StatusBadge = ({ status }) => {
  const cfg = {
    sold: {
      label: "Sold",
      cls: "bg-green-100 text-green-700 ring-1 ring-green-200",
    },
    unsold: {
      label: "In Stock",
      cls: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    },
  };
  const { label, cls } = cfg[status] || cfg.unsold;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
};

// ── Profit chip ───────────────────────────────────────────────────────────────
export const ProfitChip = ({ value }) => {
  if (value === null || value === undefined)
    return <span className="text-slate-400 text-sm">—</span>;
  const pos = value >= 0;
  return (
    <span
      className={`font-bold text-base ${pos ? "text-green-600" : "text-red-500"}`}
    >
      {pos ? "+" : "−"}₹{Math.abs(value).toLocaleString("en-IN")}
    </span>
  );
};

// ── Confirm modal ─────────────────────────────────────────────────────────────
export const ConfirmModal = ({ title, body, onConfirm, onCancel, loading }) => {
  const [confirmText, setConfirmText] = React.useState("");
  const canProceed = confirmText === "CONFIRM";

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{
        backgroundColor: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-5 h-5 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1 text-center">
          {title}
        </h3>
        {body && (
          <p className="text-sm text-slate-500 mb-5 text-center">{body}</p>
        )}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 mb-2 text-center">
            Type{" "}
            <span className="text-red-500 font-bold tracking-widest">
              CONFIRM
            </span>{" "}
            to proceed
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="CONFIRM"
            className="text-center uppercase tracking-widest font-bold"
            autoFocus
          />
        </div>
        <div className="flex gap-3">
          <Btn
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Btn>
          <Btn
            variant="danger"
            className="flex-1"
            onClick={onConfirm}
            disabled={loading || !canProceed}
          >
            {loading ? <Spinner size={16} /> : "Confirm"}
          </Btn>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ── Toast ─────────────────────────────────────────────────────────────────────
export const Toast = ({ message, type = "success", onClose }) => {
  const colors = {
    success: "bg-green-600",
    error: "bg-red-500",
    info: "bg-indigo-500",
    warning: "bg-amber-500",
  };
  return (
    <div
      className={`${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-64`}
    >
      <span className="text-sm flex-1 font-medium">{message}</span>
      <button
        onClick={onClose}
        className="text-white/70 hover:text-white text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────
export const StatCard = ({ label, value, sub, color = "blue", icon }) => {
  const colors = {
    blue: "bg-indigo-50 border-indigo-100 text-indigo-700",
    green: "bg-green-50 border-green-100 text-green-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    red: "bg-red-50 border-red-100 text-red-600",
    purple: "bg-purple-50 border-purple-100 text-purple-700",
    slate: "bg-slate-50 border-slate-100 text-slate-600",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      {icon && <div className="text-xl mb-1.5 opacity-70">{icon}</div>}
      <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
        {label}
      </p>
      <p className="text-xl font-extrabold mt-0.5 leading-tight">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
};