import React, { useEffect, useMemo, useState } from "react";
import { usePhone } from "./PhoneContext";
import { Modal, Btn, Spinner, ConfirmModal } from "./PhoneUI";

// ─────────────────────────────────────────────────────────────────────────────
// Monthly GST filing helper.
//
// R1 and R3B are filed once a month, so instead of opening every deal this lets
// you pick a return + month and mark all matching GST deals as Filed in one go
// (or flip a month back to Pending if something was marked by mistake).
//
//   R1  → matched on purchase date   (GST deals bought in that month)
//   R3B → matched on sale date       (GST deals sold in that month)
//
// Note: R3B is stored in the legacy r2Filed / r2FiledDate fields — only the
// label changed — so no data had to be migrated.
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const RETURNS = {
  r1: {
    label: "R1",
    fileKey: "r1Filed",
    dateOf: (d) => d.purchaseDate,
    dateLabel: "Bought",
    amountOf: (d) => d.buyingPrice,
    partyOf: (d) => d.purchasedFrom,
  },
  r3b: {
    label: "R3B",
    fileKey: "r2Filed",
    dateOf: (d) => d.saleDate || d.purchaseDate,
    dateLabel: "Sold",
    amountOf: (d) => d.sellingPrice,
    partyOf: (d) => d.soldTo,
  },
};

const localISO = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;

const Segmented = ({ value, onChange, options }) => (
  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
    {options.map((o) => (
      <button
        key={o.key}
        type="button"
        onClick={() => onChange(o.key)}
        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
          value === o.key
            ? "bg-white text-indigo-700 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const selectCls =
  "border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent";

const GstFilingModal = ({ onClose, onDone, initialReturn = "r1" }) => {
  const { getDeals, setGstFiling, formatCurrency, formatDate, tsFromDate } =
    usePhone();

  const now = new Date();
  // Returns for a month are normally filed in the following month,
  // so default to last month.
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false); // typed-CONFIRM step

  const [returnType, setReturnType] = useState(initialReturn);
  const [mode, setMode] = useState("filed"); // "filed" | "pending"
  const [year, setYear] = useState(prev.getFullYear());
  const [month, setMonth] = useState(prev.getMonth()); // 0-based
  const [includeOlder, setIncludeOlder] = useState(true);
  const [filedDate, setFiledDate] = useState(localISO(now));
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getDeals({});
        if (alive) setDeals(data?.deals || []);
      } catch (e) {
        if (alive) setError(e.message || "Failed to load deals");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cfg = RETURNS[returnType];
  const monthStart = new Date(year, month, 1).getTime();
  const monthEnd = new Date(year, month + 1, 1).getTime(); // exclusive

  const candidates = useMemo(() => {
    const c = RETURNS[returnType];
    return deals
      .filter((d) => {
        if (!d.withGST) return false;
        if (returnType === "r3b" && !(d.sellingPrice > 0)) return false;
        const isFiled = !!d[c.fileKey];
        const ts = c.dateOf(d) || 0;
        if (mode === "filed") {
          if (isFiled) return false;
          return ts < monthEnd && (includeOlder || ts >= monthStart);
        }
        // mode === "pending": only filed deals from the chosen month
        if (!isFiled) return false;
        return ts >= monthStart && ts < monthEnd;
      })
      .sort((a, b) => (c.dateOf(a) || 0) - (c.dateOf(b) || 0));
  }, [deals, returnType, mode, includeOlder, monthStart, monthEnd]);

  // Whenever the list changes, start with everything ticked
  useEffect(() => {
    setSelected(new Set(candidates.map((d) => d._id)));
  }, [candidates]);

  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const allTicked = candidates.length > 0 && selected.size === candidates.length;
  const monthLabel = `${MONTHS[month]} ${year}`;
  const verb = mode === "filed" ? "Filed" : "Pending";

  const submit = async () => {
    const ids = candidates.filter((d) => selected.has(d._id)).map((d) => d._id);
    if (!ids.length) return;
    setSaving(true);
    setError(null);
    try {
      const res = await setGstFiling({
        returnType,
        filed: mode === "filed",
        dealIds: ids,
        filedDate: mode === "filed" ? tsFromDate(filedDate) : undefined,
      });
      const n = res?.updated ?? ids.length;
      onDone?.(`${n} deal${n !== 1 ? "s" : ""} marked ${cfg.label} ${verb}`);
      onClose();
    } catch (e) {
      setError(e.message || "Failed to update GST filing");
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 3 + i);

  return (
    <Modal title="GST Filing — R1 / R3B" onClose={onClose}>
      {confirming && (
        <ConfirmModal
          title={`Mark ${selected.size} deal${selected.size !== 1 ? "s" : ""} as ${cfg.label} ${verb}?`}
          body={`${cfg.label} · ${monthLabel}${
            mode === "filed" && includeOlder ? " (and older pending deals)" : ""
          }. Type CONFIRM to proceed.`}
          confirmTextRequired={true}
          onConfirm={submit}
          onCancel={() => setConfirming(false)}
          loading={saving}
        />
      )}
      <div className="space-y-4">
        {/* Return + action */}
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            value={returnType}
            onChange={setReturnType}
            options={[
              { key: "r1", label: "R1" },
              { key: "r3b", label: "R3B" },
            ]}
          />
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { key: "filed", label: "Mark as Filed" },
              { key: "pending", label: "Mark as Pending" },
            ]}
          />
        </div>

        {/* Month */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="text-xs text-slate-400 font-medium mb-1">Month</p>
            <select
              className={selectCls}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium mb-1">Year</p>
            <select
              className={selectCls}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {mode === "filed" && (
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">
                Filing date
              </p>
              <input
                type="date"
                className={selectCls}
                value={filedDate}
                onChange={(e) => setFiledDate(e.target.value)}
              />
            </div>
          )}
        </div>

        {mode === "filed" && (
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 accent-indigo-600"
              checked={includeOlder}
              onChange={(e) => setIncludeOlder(e.target.checked)}
            />
            Also include older deals that are still pending (before{" "}
            {MONTHS[month]})
          </label>
        )}

        <p className="text-xs text-slate-400">
          {cfg.label} is matched on {returnType === "r1" ? "purchase" : "sale"}{" "}
          date.{" "}
          {mode === "filed"
            ? `Showing pending ${cfg.label} deals up to the end of ${monthLabel}.`
            : `Showing ${cfg.label} deals marked filed in ${monthLabel}.`}
        </p>

        {/* Deal list */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 accent-indigo-600"
                checked={allTicked}
                disabled={!candidates.length}
                onChange={() =>
                  setSelected(
                    allTicked
                      ? new Set()
                      : new Set(candidates.map((d) => d._id)),
                  )
                }
              />
              Select all
            </label>
            <span className="text-xs text-slate-400">
              {selected.size} of {candidates.length} selected
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : candidates.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                {mode === "filed"
                  ? `Nothing pending for ${cfg.label} 🎉`
                  : `No ${cfg.label}-filed deals in ${monthLabel}`}
              </p>
            ) : (
              candidates.map((d) => {
                const ts = cfg.dateOf(d) || 0;
                const older = mode === "filed" && ts < monthStart;
                return (
                  <label
                    key={d._id}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-indigo-600 shrink-0"
                      checked={selected.has(d._id)}
                      onChange={() => toggle(d._id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {d.product}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {cfg.dateLabel} {formatDate(ts)}
                        {cfg.partyOf(d) ? ` · ${cfg.partyOf(d)}` : ""}
                        {older && (
                          <span className="ml-2 text-amber-600 font-semibold">
                            older
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 shrink-0">
                      {formatCurrency(cfg.amountOf(d))}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {error && <p className="text-sm text-rose-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Btn variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Btn>
          <Btn
            variant={mode === "filed" ? "success" : "primary"}
            onClick={() => {
              setError(null);
              setConfirming(true);
            }}
            disabled={saving || selected.size === 0}
          >
            {saving
              ? "Saving…"
              : `Mark ${selected.size} deal${selected.size !== 1 ? "s" : ""} ${cfg.label} ${verb}`}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

export default GstFilingModal;
