import React from "react";

// ── Spinner ──────────────────────────────────────────────────────────────
export const Spinner = ({ size = 18 }) => {
  const spinnerStyle = {
    border: `${Math.max(2, size / 8)}px solid #e2e8f0`,
    borderTop: `${Math.max(2, size / 8)}px solid #4f46e5`,
    borderRadius: "50%",
    width: `${size}px`,
    height: `${size}px`,
    animation: "spin 0.8s linear infinite",
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      <div style={spinnerStyle} />
    </>
  );
};

// ── Status badge ──────────────────────────────────────────────────────────────
export const StatusBadge = ({ status }) => {
  const config = {
    unsold:          { label: "Unsold",           cls: "bg-slate-100 text-slate-600 border border-slate-200" },
    pending_payment: { label: "Payment Pending",  cls: "bg-amber-50 text-amber-700 border border-amber-200" },
    complete:        { label: "Complete",          cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  };
  const { label, cls } = config[status] || config.unsold;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
};

// ── Profit chip ───────────────────────────────────────────────────────────────
export const ProfitChip = ({ value, label = "" }) => {
  if (value === null || value === undefined) {
    return <span className="text-slate-400 text-sm">—</span>;
  }
  const positive = value >= 0;
  return (
    <span className={`font-semibold text-sm ${positive ? "text-emerald-600" : "text-rose-500"}`}>
      {positive ? "+" : ""}₹{Math.abs(value).toLocaleString("en-IN")}
      {label && <span className="font-normal text-xs ml-1 opacity-70">{label}</span>}
    </span>
  );
};

// ── Simple labeled input ─────────────────────────────────────────────────────
export const Field = ({ label, children, required, hint }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
      {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-slate-400">{hint}</p>}
  </div>
);

// ── Text input ────────────────────────────────────────────────────────────────
export const Input = React.forwardRef(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 
      focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
      bg-white placeholder-slate-300 ${className}`}
    {...props}
  />
));

// ── Select dropdown ───────────────────────────────────────────────────────────
export const Select = ({ options = [], placeholder = "Select…", className = "", ...props }) => (
  <select
    className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 
      focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
      bg-white ${className}`}
    {...props}
  >
    <option value="">{placeholder}</option>
    {options.map((o) => (
      <option key={o} value={o}>{o}</option>
    ))}
  </select>
);

// ── Textarea ──────────────────────────────────────────────────────────────────
export const Textarea = ({ className = "", ...props }) => (
  <textarea
    className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 
      focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
      bg-white placeholder-slate-300 resize-none ${className}`}
    rows={3}
    {...props}
  />
);

// ── Button ────────────────────────────────────────────────────────────────────
export const Btn = ({ variant = "primary", className = "", children, ...props }) => {
  const variants = {
    primary:   "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm",
    secondary: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm",
    danger:    "bg-rose-500 hover:bg-rose-600 text-white shadow-sm",
    ghost:     "bg-transparent hover:bg-slate-100 text-slate-600",
    success:   "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg 
        text-sm font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// ── Modal wrapper ─────────────────────────────────────────────────────────────
export const Modal = ({ title, onClose, children, wide = false }) => (
  <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
    style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-4xl" : "max-w-xl"} 
      max-h-[85vh] flex flex-col overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        <button onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center
            text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          ✕
        </button>
      </div>
      {/* Body */}
      <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
    </div>
  </div>
);

// ── Summary card ──────────────────────────────────────────────────────────────
export const SummaryCard = ({ label, value, sub, accent = "indigo" }) => {
  const colors = {
    indigo:  "bg-indigo-50 border-indigo-100 text-indigo-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    amber:   "bg-amber-50 border-amber-100 text-amber-700",
    rose:    "bg-rose-50 border-rose-100 text-rose-600",
    slate:   "bg-slate-50 border-slate-100 text-slate-600",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[accent]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
    </div>
  );
};

// ── Toast notification ────────────────────────────────────────────────────────
export const Toast = ({ message, type = "success", onClose }) => {
  const colors = {
    success: "bg-emerald-600",
    error:   "bg-rose-500",
    info:    "bg-indigo-500",
    warning: "bg-amber-500",
  };
  return (
    <div className={`${colors[type]} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-64`}>
      <span className="text-sm flex-1">{message}</span>
      <button onClick={onClose} className="text-white/70 hover:text-white text-lg leading-none">✕</button>
    </div>
  );
};

// ── Confirm delete modal ──────────────────────────────────────────────────────
export const ConfirmModal = ({
  title,
  body,
  onConfirm,
  onCancel,
  loading,
  confirmTextRequired = false,
}) => {
  const [confirmText, setConfirmText] = React.useState("");

  const canProceed = !confirmTextRequired || confirmText === "CONFIRM";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-rose-500 text-xl">⚠</span>
        </div>

        <h3 className="text-center font-semibold text-slate-800 mb-2">
          {title}
        </h3>

        {body && (
          <p className="text-center text-sm text-slate-500 mb-5">
            {body}
          </p>
        )}

        {confirmTextRequired && (
          <div className="mb-5">

            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="CONFIRM"
              className="text-center uppercase tracking-wide font-medium"
            />
          </div>
        )}

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
            {loading ? "Processing..." : "Confirm"}
          </Btn>
        </div>
      </div>
    </div>
  );
};

// Confirm Rename Model
export const RenameConfirmModal = ({
  oldValue,
  newValue,
  onConfirm,
  onCancel,
  loading,
}) => {
  const [confirmation, setConfirmation] = React.useState("");

  const canProceed =
    confirmation.trim() === newValue.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-amber-600 text-xl">
            ✏️
          </span>
        </div>

        <h3 className="text-center font-semibold text-slate-800 mb-2">
          Confirm Rename
        </h3>

        <div className="text-sm text-slate-600 mb-4 text-center">

          <p className="mt-2">
            <span className="font-medium text-rose-500">
              {oldValue}
            </span>
          </p>

          <p className="text-center font-extrabold text-xl">↓</p>

          <p>
            <span className="font-medium text-emerald-600">
              {newValue}
            </span>
          </p>
        </div>

        <div className="mb-5">
          <p className="text-xs text-slate-500 mb-2">
            Type the new value exactly to confirm:
          </p>

          <Input
            value={confirmation}
            onChange={(e) =>
              setConfirmation(e.target.value)
            }
            placeholder={newValue}
            autoFocus
            className="text-center tracking-wide font-medium"
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
            variant="primary"
            className="flex-1"
            onClick={onConfirm}
            disabled={!canProceed || loading}
          >
            {loading
              ? "Renaming..."
              : "Confirm Rename"}
          </Btn>
        </div>
      </div>
    </div>
  );
};