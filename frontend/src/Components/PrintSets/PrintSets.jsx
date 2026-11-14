import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode.react";
import { useReactToPrint } from "react-to-print";
import { useUserRole } from "../../auth/UserRoleContext";
import {
  PRESETS,
  buildPrintList,
  calcTagPrice,
  flattenSets,
  formatAddedAt,
  formatINR,
  getPresetRange,
  groupItemsIntoSets,
  mrpLabel,
  rangeToIso,
  summarize,
} from "./printSetsUtils";

const getToken = () => {
  try {
    return JSON.parse(window.localStorage.getItem("userInfo")).token;
  } catch (e) {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------
const StatTile = ({ label, value, hint }) => (
  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-xl font-semibold text-gray-900">{value}</p>
    {hint && <p className="text-xs text-gray-400">{hint}</p>}
  </div>
);

const CodeChip = ({ item, selected, onToggle }) => (
  <button
    type="button"
    onClick={() => onToggle(item.code)}
    aria-pressed={selected}
    className={`flex items-center gap-2 border rounded-md px-2 py-1 text-sm ${
      selected
        ? "bg-blue-50 border-blue-400 text-blue-900"
        : "bg-gray-50 border-gray-300 text-gray-400"
    }`}
  >
    <span
      className={`inline-flex items-center justify-center w-4 h-4 rounded border text-xs ${
        selected
          ? "bg-blue-600 border-blue-600 text-white"
          : "bg-white border-gray-300"
      }`}
    >
      {selected ? "✓" : ""}
    </span>
    <span
      className={`font-mono font-semibold ${selected ? "" : "line-through"}`}
    >
      {item.code}
    </span>
    <span>· {item.size}</span>
    <span className="text-xs">×{item.quantityBuy}</span>
  </button>
);

const PriceInputs = ({
  margin,
  setMargin,
  customCharges,
  setCustomCharges,
}) => {
  const marginInvalid = !(parseFloat(margin) > 0);
  return (
    <div className="flex gap-3 flex-wrap items-end">
      <label className="text-sm">
        <span className="block text-gray-600 mb-1">Margin</span>
        <input
          type="number"
          step="0.1"
          value={margin}
          onChange={(e) => setMargin(e.target.value)}
          onWheel={(e) => e.target.blur()}
          className={`w-24 p-2 border rounded-md ${
            marginInvalid ? "border-red-500" : "border-gray-300"
          }`}
        />
      </label>
      <label className="text-sm">
        <span className="block text-gray-600 mb-1">Custom charges</span>
        <input
          type="number"
          value={customCharges}
          onChange={(e) => setCustomCharges(e.target.value)}
          onWheel={(e) => e.target.blur()}
          className="w-28 p-2 border border-gray-300 rounded-md"
        />
      </label>
      {marginInvalid && (
        <p className="text-sm text-red-600">
          Enter a margin to enable printing.
        </p>
      )}
    </div>
  );
};

const SetBlock = ({
  set,
  deselected,
  printed,
  showProduct,
  onToggleCode,
  onSelectAll,
  onSelectNone,
  onOpen,
}) => {
  const sum = summarize(set.items);
  const selectedCount = set.items.filter((i) => !deselected.has(i.code)).length;
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-lg">{set.prefix}</span>
            {set.type === "multiset" && (
              <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                Set {set.setLetter} of {set.setCount}
              </span>
            )}
            {printed && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                Printed ✓
              </span>
            )}
          </div>
          {showProduct && (
            <p className="text-sm text-gray-700">
              {set.brand} · {set.product} · {set.category}
            </p>
          )}
          <p className="text-xs text-gray-500">
            {formatAddedAt(set.newestAt)} · MRP {mrpLabel(set.items)} ·{" "}
            {sum.codes} codes · qty {sum.quantity} · {selectedCount} selected
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onSelectAll}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
          >
            All
          </button>
          <button
            type="button"
            onClick={onSelectNone}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
          >
            None
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
          >
            Print ▸
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {set.items.map((item) => (
          <CodeChip
            key={item._id || item.code}
            item={item}
            selected={!deselected.has(item.code)}
            onToggle={onToggleCode}
          />
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const PrintSets = () => {
  const navigate = useNavigate();
  const [userRole] = useUserRole();
  const canSeeValue = userRole === "admin" || userRole === "dev";

  // date range
  const [initialFrom, initialTo] = useMemo(() => getPresetRange("today"), []);
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);

  // data
  const [items, setItems] = useState([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  // filters / selection
  const [brandFilter, setBrandFilter] = useState([]);
  const [deselected, setDeselected] = useState(() => new Set());
  const [copyMode, setCopyMode] = useState("single"); // "single" | "qty"
  const [copiesOverride, setCopiesOverride] = useState({});
  const [printedKeys, setPrintedKeys] = useState(() => new Set());

  // price (same formula as Purchase / Print Tag)
  const [margin, setMargin] = useState("2");
  const [customCharges, setCustomCharges] = useState("0");
  const marginNum = parseFloat(margin);
  const marginValid = marginNum > 0;
  const customNum = Number(customCharges) || 0;

  // print station
  const [stationKey, setStationKey] = useState(null);
  const printRef = useRef(null);
  const overlayRef = useRef(null);
  const printMeta = useRef({ key: null, advanceTo: null });

  // ---- load items for the date range -------------------------------------
  const rangeInvalid = !fromDate || !toDate || fromDate > toDate;

  const loadItems = useCallback(async () => {
    if (!fromDate || !toDate || fromDate > toDate) return;
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }
    const myRequest = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const { from, to } = rangeToIso(fromDate, toDate);
      const response = await fetch(
        `/api/printsets?from=${encodeURIComponent(from)}&to=${encodeURIComponent(
          to,
        )}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (myRequest !== requestId.current) return; // a newer request replaced this one
      if (response.status === 401) {
        window.localStorage.clear();
        navigate("/login");
        return;
      }
      if (!response.ok) throw new Error("Request failed");
      const data = await response.json();
      if (myRequest !== requestId.current) return;
      setItems(data.items || []);
      setTruncated(!!data.truncated);
    } catch (e) {
      if (myRequest !== requestId.current) return;
      setError("Could not load items. Check your connection and try Refresh.");
    } finally {
      if (myRequest === requestId.current) setLoading(false);
    }
  }, [fromDate, toDate, navigate]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // ---- derived data ------------------------------------------------------
  const brandStats = useMemo(() => {
    const map = new Map();
    items.forEach((it) => {
      const s = map.get(it.brand) || { codes: 0, quantity: 0 };
      s.codes += 1;
      s.quantity += Number(it.quantityBuy) || 0;
      map.set(it.brand, s);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const activeBrands = useMemo(
    () => brandFilter.filter((b) => brandStats.some(([name]) => name === b)),
    [brandFilter, brandStats],
  );

  const filteredItems = useMemo(
    () =>
      activeBrands.length
        ? items.filter((it) => activeBrands.includes(it.brand))
        : items,
    [items, activeBrands],
  );

  const parents = useMemo(
    () => groupItemsIntoSets(filteredItems),
    [filteredItems],
  );
  const flatSets = useMemo(() => flattenSets(parents), [parents]);
  const rangeStats = useMemo(() => summarize(filteredItems), [filteredItems]);

  const copiesFor = useCallback(
    (item) => {
      if (copiesOverride[item.code] !== undefined)
        return copiesOverride[item.code];
      return copyMode === "qty"
        ? Math.max(0, Number(item.quantityBuy) || 0)
        : 1;
    },
    [copiesOverride, copyMode],
  );

  const hasSelection = useCallback(
    (set) => set.items.some((i) => !deselected.has(i.code)),
    [deselected],
  );

  const selectionStats = useMemo(() => {
    let codes = 0;
    let tags = 0;
    flatSets.forEach((s) =>
      s.items.forEach((it) => {
        if (!deselected.has(it.code)) {
          codes += 1;
          tags += copiesFor(it);
        }
      }),
    );
    return { codes, tags };
  }, [flatSets, deselected, copiesFor]);

  // ---- selection helpers -------------------------------------------------
  const toggleCode = (code) =>
    setDeselected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const setSetSelection = (set, selected) =>
    setDeselected((prev) => {
      const next = new Set(prev);
      set.items.forEach((i) => {
        if (selected) next.delete(i.code);
        else next.add(i.code);
      });
      return next;
    });

  const changeCopyMode = (mode) => {
    setCopyMode(mode);
    setCopiesOverride({});
  };

  const setCopies = (code, value) =>
    setCopiesOverride((prev) => ({
      ...prev,
      [code]: Math.max(0, Math.min(999, parseInt(value, 10) || 0)),
    }));

  const toggleBrand = (brand) =>
    setBrandFilter((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand],
    );

  const applyPreset = (id) => {
    const [f, t] = getPresetRange(id);
    setFromDate(f);
    setToDate(t);
  };
  const activePreset = PRESETS.find((p) => {
    const [f, t] = getPresetRange(p.id);
    return f === fromDate && t === toDate;
  });

  // ---- print station -----------------------------------------------------
  const currentIndex = stationKey
    ? flatSets.findIndex((s) => s.key === stationKey)
    : -1;
  const currentSet = currentIndex >= 0 ? flatSets[currentIndex] : null;
  const stationOpen = !!stationKey;

  // Next / Previous skip sets where every code has been deselected.
  const findAdjacent = useCallback(
    (from, dir) => {
      for (let i = from + dir; i >= 0 && i < flatSets.length; i += dir) {
        if (hasSelection(flatSets[i])) return i;
      }
      return -1;
    },
    [flatSets, hasSelection],
  );
  const prevIdx = currentIndex >= 0 ? findAdjacent(currentIndex, -1) : -1;
  const nextIdx = currentIndex >= 0 ? findAdjacent(currentIndex, 1) : -1;

  // Close the station if its set disappears (e.g. date range / brand changed).
  useEffect(() => {
    if (stationKey && currentIndex === -1) setStationKey(null);
  }, [stationKey, currentIndex]);

  // Lock page scroll behind the station and jump to the top for each set.
  useEffect(() => {
    if (!stationOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [stationOpen]);

  useEffect(() => {
    if (stationKey && overlayRef.current) overlayRef.current.scrollTop = 0;
  }, [stationKey]);

  useEffect(() => {
    if (!stationKey) return undefined;
    const onKey = (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "ArrowLeft" && prevIdx !== -1) {
        setStationKey(flatSets[prevIdx].key);
      } else if (e.key === "ArrowRight" && nextIdx !== -1) {
        setStationKey(flatSets[nextIdx].key);
      } else if (e.key === "Escape") {
        setStationKey(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stationKey, prevIdx, nextIdx, flatSets]);

  const printEntries = currentSet
    ? currentSet.items
        .filter((i) => !deselected.has(i.code))
        .map((item) => ({ item, copies: copiesFor(item) }))
    : [];
  const printList = buildPrintList(printEntries);
  // Tags are printed two per row (106mm roll). If the count is odd, add one
  // blank slot so the last row is complete (nothing extra gets printed on it).
  const paddedList =
    printList.length % 2 === 1 ? [...printList, null] : printList;

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    onAfterPrint: () => {
      const { key, advanceTo } = printMeta.current;
      if (key) setPrintedKeys((prev) => new Set(prev).add(key));
      if (advanceTo) setStationKey(advanceTo);
      printMeta.current = { key: null, advanceTo: null };
    },
  });

  const startPrint = (advance) => {
    if (!currentSet || printList.length === 0 || !marginValid) return;
    printMeta.current = {
      key: currentSet.key,
      advanceTo: advance && nextIdx !== -1 ? flatSets[nextIdx].key : null,
    };
    handlePrint();
  };

  const togglePrinted = (key) =>
    setPrintedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const openFirstSelected = () => {
    const first = flatSets.find(hasSelection);
    if (first) setStationKey(first.key);
  };

  // ---- render ------------------------------------------------------------
  return (
    <div className="p-3 sm:p-4 max-w-4xl mx-auto pb-28">
      <h1 className="text-2xl font-semibold">Print Sets</h1>
      <p className="text-sm text-gray-500 mb-4">
        Reprint tags for items you already added. Pick a date range, tick the
        codes you want, then print set by set.
      </p>

      {/* Filters */}
      <section className="bg-white border border-gray-200 rounded-lg p-3 mb-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`px-3 py-1 rounded-full text-sm border ${
                activePreset && activePreset.id === p.id
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="p-2 border border-gray-300 rounded-md"
            />
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="p-2 border border-gray-300 rounded-md"
            />
          </label>
          <button
            type="button"
            onClick={loadItems}
            disabled={loading || rangeInvalid}
            className="px-4 py-2 bg-gray-800 text-white rounded-md disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
        {rangeInvalid && (
          <p className="text-sm text-red-600">
            Choose a valid range (the From date must not be after the To date).
          </p>
        )}
        <PriceInputs
          margin={margin}
          setMargin={setMargin}
          customCharges={customCharges}
          setCustomCharges={setCustomCharges}
        />
      </section>

      {error && (
        <div className="mb-3 p-3 rounded-md bg-red-100 text-red-700 text-sm">
          {error}
        </div>
      )}
      {truncated && (
        <div className="mb-3 p-3 rounded-md bg-yellow-100 text-yellow-800 text-sm">
          Too many items in this range, so only the newest 5000 are shown. Use a
          smaller date range to see the rest.
        </div>
      )}

      {/* Brand filter */}
      {brandStats.length > 0 && (
        <section className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-gray-700">Brands</p>
            {activeBrands.length > 0 && (
              <button
                type="button"
                onClick={() => setBrandFilter([])}
                className="text-sm text-blue-600"
              >
                Show all brands
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {brandStats.map(([brand, s]) => {
              const on = activeBrands.includes(brand);
              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => toggleBrand(brand)}
                  aria-pressed={on}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    on
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {brand} · {s.codes}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Insights */}
      <section className="mb-4">
        <div
          className={`grid gap-2 grid-cols-2 ${
            canSeeValue ? "sm:grid-cols-4" : "sm:grid-cols-3"
          }`}
        >
          <StatTile label="Sets" value={flatSets.length} />
          <StatTile label="Total codes" value={rangeStats.codes} />
          <StatTile label="Total quantity" value={rangeStats.quantity} />
          {canSeeValue && (
            <StatTile
              label="Total value"
              value={formatINR(rangeStats.value)}
              hint="MRP × quantity"
            />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Showing items <b>added</b> in this range
          {activeBrands.length > 0 ? ` for ${activeBrands.join(", ")}` : ""}.
          Quantity is each code's current total quantity (re-purchases added
          later are included). Selected for printing:{" "}
          <b>{selectionStats.codes}</b> codes, <b>{selectionStats.tags}</b>{" "}
          tags.
        </p>
      </section>

      {/* Sets */}
      {loading && items.length === 0 && (
        <p className="text-center text-gray-500 py-8">Loading...</p>
      )}
      {!loading && !error && flatSets.length === 0 && (
        <p className="text-center text-gray-500 py-8">
          No items were added in this date range
          {activeBrands.length > 0 ? " for the selected brands" : ""}.
        </p>
      )}

      <div className="space-y-3">
        {parents.map((parent) => {
          if (parent.type === "single") {
            const set = parent.sets[0];
            return (
              <SetBlock
                key={set.key}
                set={set}
                deselected={deselected}
                printed={printedKeys.has(set.key)}
                showProduct
                onToggleCode={toggleCode}
                onSelectAll={() => setSetSelection(set, true)}
                onSelectNone={() => setSetSelection(set, false)}
                onOpen={() => setStationKey(set.key)}
              />
            );
          }
          const all = parent.sets.flatMap((s) => s.items);
          const sum = summarize(all);
          const first = parent.sets[0];
          return (
            <div
              key={parent.key}
              className="border border-indigo-200 bg-indigo-50 rounded-lg p-2 space-y-2"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap px-1">
                <div>
                  <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                    Multi-set {parent.prefix}
                  </span>
                  <p className="text-sm text-gray-800 mt-1">
                    {first.brand} · {first.product} · {first.category}
                  </p>
                  <p className="text-xs text-gray-500">
                    {parent.sets.length} sets · {sum.codes} codes · qty{" "}
                    {sum.quantity}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStationKey(first.key)}
                  className="px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold"
                >
                  Print from Set {first.setLetter} ▸
                </button>
              </div>
              {parent.sets.map((set) => (
                <SetBlock
                  key={set.key}
                  set={set}
                  deselected={deselected}
                  printed={printedKeys.has(set.key)}
                  showProduct={false}
                  onToggleCode={toggleCode}
                  onSelectAll={() => setSetSelection(set, true)}
                  onSelectNone={() => setSetSelection(set, false)}
                  onOpen={() => setStationKey(set.key)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Sticky action bar */}
      {flatSets.length > 0 && !stationKey && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-3 flex items-center justify-between gap-3"
          style={{ zIndex: 40 }}
        >
          <p className="text-sm text-gray-700">
            <b>{selectionStats.codes}</b> codes · <b>{selectionStats.tags}</b>{" "}
            tags selected
          </p>
          <button
            type="button"
            onClick={openFirstSelected}
            disabled={selectionStats.codes === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold disabled:opacity-50"
          >
            Start printing ▸
          </button>
        </div>
      )}

      {/* Print station */}
      {currentSet && (
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-gray-100 overflow-y-auto"
          style={{ zIndex: 999 }}
        >
          <div className="sticky top-0 bg-white border-b border-gray-300 p-3 z-10">
            <div className="max-w-3xl mx-auto flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setStationKey(null)}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
              >
                ✕ Close
              </button>
              <select
                value={currentSet.key}
                onChange={(e) => setStationKey(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 max-w-full"
                aria-label="Jump to set"
              >
                {flatSets.map((s, i) => (
                  <option key={s.key} value={s.key}>
                    {i + 1}. {s.prefix} · {s.brand} · {s.product}
                    {printedKeys.has(s.key) ? " ✓" : ""}
                    {hasSelection(s) ? "" : " (nothing selected)"}
                  </option>
                ))}
              </select>
              <div className="ml-auto flex gap-2 items-center">
                <span className="text-sm text-gray-600">
                  Set {currentIndex + 1} / {flatSets.length}
                </span>
                <button
                  type="button"
                  onClick={() => setStationKey(flatSets[prevIdx].key)}
                  disabled={prevIdx === -1}
                  className="px-3 py-1 border border-gray-400 rounded disabled:opacity-40 hover:bg-gray-100"
                >
                  ◀ Previous
                </button>
                <button
                  type="button"
                  onClick={() => setStationKey(flatSets[nextIdx].key)}
                  disabled={nextIdx === -1}
                  className="px-3 py-1 border border-gray-400 rounded disabled:opacity-40 hover:bg-gray-100"
                >
                  Next ▶
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto p-3 space-y-3 pb-32">
            {/* Set info */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-xl">
                  {currentSet.prefix}
                </span>
                {currentSet.type === "multiset" && (
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                    Multi-set {currentSet.base} · Set {currentSet.setLetter} of{" "}
                    {currentSet.setCount}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => togglePrinted(currentSet.key)}
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    printedKeys.has(currentSet.key)
                      ? "bg-green-100 text-green-800 border-green-300"
                      : "bg-white text-gray-500 border-gray-300"
                  }`}
                  title="Tap to mark / unmark as printed"
                >
                  {printedKeys.has(currentSet.key)
                    ? "Printed ✓ (tap to undo)"
                    : "Not printed yet"}
                </button>
              </div>
              <p className="text-sm text-gray-700 mt-1">
                {currentSet.brand} · {currentSet.product} ·{" "}
                {currentSet.category}
              </p>
              <p className="text-xs text-gray-500">
                Added {formatAddedAt(currentSet.newestAt)} · MRP{" "}
                {mrpLabel(currentSet.items)}
              </p>
            </div>

            {/* Price + tag count mode */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
              <PriceInputs
                margin={margin}
                setMargin={setMargin}
                customCharges={customCharges}
                setCustomCharges={setCustomCharges}
              />
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => changeCopyMode("single")}
                  className={`px-3 py-1 rounded-md text-sm ${
                    copyMode === "single"
                      ? "bg-indigo-700 text-white"
                      : "bg-indigo-100 text-indigo-800"
                  }`}
                >
                  1 tag per code
                </button>
                <button
                  type="button"
                  onClick={() => changeCopyMode("qty")}
                  className={`px-3 py-1 rounded-md text-sm ${
                    copyMode === "qty"
                      ? "bg-indigo-700 text-white"
                      : "bg-indigo-100 text-indigo-800"
                  }`}
                >
                  Tags = quantity (S M L, S M L…)
                </button>
              </div>
            </div>

            {/* Codes */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">
                  Codes in this set
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setSetSelection(currentSet, true)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetSelection(currentSet, false)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {currentSet.items.map((item) => {
                  const selected = !deselected.has(item.code);
                  const copies = copiesFor(item);
                  return (
                    <div
                      key={item._id || item.code}
                      className={`flex items-center gap-3 py-2 ${
                        selected ? "" : "opacity-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleCode(item.code)}
                        className="w-5 h-5"
                        aria-label={`Select ${item.code}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono font-semibold">
                          {item.code}{" "}
                          <span className="font-sans font-normal text-gray-600">
                            · Size {item.size}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          qty {item.quantityBuy}
                          {item.quantitySold > 0
                            ? ` · sold ${item.quantitySold}`
                            : ""}{" "}
                          · tag price{" "}
                          {marginValid
                            ? calcTagPrice(item.mrp, marginNum, customNum)
                            : "-"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500 mr-1">Tags</span>
                        <button
                          type="button"
                          disabled={!selected}
                          onClick={() => setCopies(item.code, copies - 1)}
                          className="w-7 h-7 border border-gray-300 rounded disabled:opacity-40"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={copies}
                          disabled={!selected}
                          onChange={(e) => setCopies(item.code, e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          className="w-12 h-7 text-center border border-gray-300 rounded"
                        />
                        <button
                          type="button"
                          disabled={!selected}
                          onClick={() => setCopies(item.code, copies + 1)}
                          className="w-7 h-7 border border-gray-300 rounded disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preview (this exact block is what gets printed) */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Preview · {printList.length} tag
                {printList.length === 1 ? "" : "s"}
              </p>
              {printList.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Nothing selected in this set. Tick a code above, or use Next
                  to move on.
                </p>
              ) : (
                <div className="overflow-x-auto bg-gray-200 p-2 rounded">
                  <div className="mx-auto" style={{ width: "106mm" }}>
                    <div
                      style={{ width: "106mm" }}
                      ref={printRef}
                      className="flex flex-wrap"
                    >
                      {paddedList.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-evenly"
                        >
                          <div
                            style={{
                              width: "50mm",
                              height: "25mm",
                              padding: 0,
                              marginLeft: "1.3mm",
                              marginRight: "1.3mm",
                            }}
                            className="flex justify-evenly bg-white"
                          >
                            {item && (
                              <>
                                <div className="p-2 pr-0">
                                  <QRCode value={item.code} size={60} />
                                  <p className="text-black">{item.code}</p>
                                </div>
                                <div className="relative font-bold text-black pt-1">
                                  <div className="flex justify-center">
                                    <img
                                      src={`Images/Ganesha.jpg`}
                                      alt="project"
                                      width={"25mm"}
                                    />
                                  </div>
                                  <div>
                                    <p>
                                      MRP:{" "}
                                      {calcTagPrice(
                                        item.mrp,
                                        marginNum,
                                        customNum,
                                      )}
                                      /-
                                    </p>
                                    <p>Size: {item.size}</p>
                                    <div>
                                      <p className="absolute right-1 bottom-1 text-sm font-normal">
                                        {item.secretCode}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Station action bar */}
          <div
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-3"
            style={{ zIndex: 1000 }}
          >
            <div className="max-w-3xl mx-auto flex gap-2 items-center flex-wrap">
              <button
                type="button"
                onClick={() => startPrint(false)}
                disabled={printList.length === 0 || !marginValid}
                className="flex-1 min-w-[8rem] px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold disabled:opacity-40"
              >
                🖨 Print {printList.length} tag
                {printList.length === 1 ? "" : "s"}
              </button>
              <button
                type="button"
                onClick={() => startPrint(true)}
                disabled={
                  printList.length === 0 || !marginValid || nextIdx === -1
                }
                className="flex-1 min-w-[8rem] px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold disabled:opacity-40"
              >
                🖨 Print &amp; Next ▶
              </button>
            </div>
            <p className="max-w-3xl mx-auto text-xs text-gray-500 mt-1">
              Tip: ← → keys switch sets. Next / Previous skip sets where every
              code is deselected.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintSets;
