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
        border: `${Math.max(2, size / 8)}px solid #e5e7eb`,
        borderTop: `${Math.max(2, size / 8)}px solid #1d4ed8`,
        animation: "carSpin 0.8s linear infinite",
      }}
    />
  </>
);

// ── Full screen overlay spinner ────────────────────────────────────────────────
export const FullScreenSpinner = ({ message = "Loading…" }) =>
  ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <Spinner size={56} />
      <p className="text-white text-xl font-bold">{message}</p>
    </div>,
    document.body,
  );

// ── Big labeled field wrapper (large font for elderly user) ───────────────────
export const Field = ({ label, children, required, hint }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-base font-bold text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {hint && <p className="text-sm text-gray-400 -mt-1">{hint}</p>}
    {children}
  </div>
);

// ── Large text input ───────────────────────────────────────────────────────────
export const Input = React.forwardRef(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg text-gray-800
      focus:outline-none focus:border-blue-500 bg-white placeholder-gray-300 ${className}`}
    style={{ fontSize: "16px" }}
    {...props}
  />
));

// ── Large select dropdown ──────────────────────────────────────────────────────
export const Select = ({
  options = [],
  placeholder = "— चुनें / Select —",
  className = "",
  ...props
}) => (
  <select
    className={`w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg text-gray-800
      focus:outline-none focus:border-blue-500 bg-white ${className}`}
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

// ── Large textarea ─────────────────────────────────────────────────────────────
export const Textarea = ({ className = "", ...props }) => (
  <textarea
    className={`w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-lg text-gray-800
      focus:outline-none focus:border-blue-500 bg-white placeholder-gray-300 resize-none ${className}`}
    rows={3}
    style={{ fontSize: "16px" }}
    {...props}
  />
);

// ── Big button ────────────────────────────────────────────────────────────────
export const Btn = ({
  variant = "primary",
  className = "",
  children,
  ...props
}) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow",
    secondary:
      "bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow",
    success: "bg-green-600 hover:bg-green-700 text-white shadow",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-600",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl
        text-base font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-3"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-3xl" : "max-w-xl"}
        max-h-[90vh] flex flex-col overflow-hidden`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400
              hover:text-gray-700 hover:bg-gray-100 text-xl font-bold transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );

// ── Status badge ──────────────────────────────────────────────────────────────
export const StatusBadge = ({ status }) => {
  const cfg = {
    sold: {
      label: "✅ बिका / Sold",
      cls: "bg-green-100 text-green-700 border border-green-300",
    },
    unsold: {
      label: "🚗 स्टॉक में / In Stock",
      cls: "bg-amber-100 text-amber-700 border border-amber-300",
    },
  };
  const { label, cls } = cfg[status] || cfg.unsold;
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${cls}`}
    >
      {label}
    </span>
  );
};

// ── Profit chip ───────────────────────────────────────────────────────────────
export const ProfitChip = ({ value }) => {
  if (value === null || value === undefined)
    return <span className="text-gray-400">—</span>;
  const pos = value >= 0;
  return (
    <span
      className={`font-bold text-lg ${pos ? "text-green-600" : "text-red-500"}`}
    >
      {pos ? "▲ +" : "▼ "}₹{Math.abs(value).toLocaleString("en-IN")}
    </span>
  );
};

// ── Confirm modal — always requires typing CONFIRM ────────────────────────────
export const ConfirmModal = ({ title, body, onConfirm, onCancel, loading }) => {
  const [confirmText, setConfirmText] = React.useState("");
  const canProceed = confirmText === "CONFIRM";

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7">
        <div className="text-5xl mb-4 text-center">⚠️</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">
          {title}
        </h3>
        {body && (
          <p className="text-base text-gray-500 mb-4 text-center">{body}</p>
        )}
        <div className="mb-5">
          <p className="text-sm font-bold text-gray-500 mb-2 text-center">
            आगे बढ़ने के लिए{" "}
            <span className="text-red-500 font-extrabold tracking-widest">
              CONFIRM
            </span>{" "}
            टाइप करें
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
            रद्द करें / Cancel
          </Btn>
          <Btn
            variant="danger"
            className="flex-1"
            onClick={onConfirm}
            disabled={loading || !canProceed}
          >
            {loading ? <Spinner size={20} /> : "✓ Confirm"}
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
    info: "bg-blue-500",
    warning: "bg-amber-500",
  };
  return (
    <div
      className={`${colors[type]} text-white px-5 py-4 rounded-xl shadow-xl flex items-center gap-3 min-w-72`}
    >
      <span className="text-base flex-1">{message}</span>
      <button
        onClick={onClose}
        className="text-white/70 hover:text-white text-xl"
      >
        ✕
      </button>
    </div>
  );
};

// ── Summary stat card ─────────────────────────────────────────────────────────
export const StatCard = ({ label, value, sub, color = "blue", icon }) => {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    red: "bg-red-50 border-red-200 text-red-600",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    slate: "bg-gray-50 border-gray-200 text-gray-600",
  };
  return (
    <div className={`rounded-2xl border-2 p-5 ${colors[color]}`}>
      {icon && <div className="text-3xl mb-2">{icon}</div>}
      <p className="text-sm font-semibold uppercase tracking-wide opacity-60">
        {label}
      </p>
      <p className="text-2xl font-extrabold mt-1">{value}</p>
      {sub && <p className="text-sm mt-1 opacity-60">{sub}</p>}
    </div>
  );
};
