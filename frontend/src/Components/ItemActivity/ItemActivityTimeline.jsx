import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// Color/label config per event type so the whole page is easy to scan at a glance.
const TYPE_CONFIG = {
  added: {
    label: "Added",
    bg: "bg-emerald-50",
    border: "border-emerald-400",
    badge: "bg-emerald-500 text-white",
  },
  updated: {
    label: "Updated",
    bg: "bg-blue-50",
    border: "border-blue-400",
    badge: "bg-blue-500 text-white",
  },
  sold: {
    label: "Sold",
    bg: "bg-yellow-50",
    border: "border-yellow-400",
    badge: "bg-yellow-500 text-white",
  },
  deleted: {
    label: "Deleted",
    bg: "bg-red-50",
    border: "border-red-400",
    badge: "bg-red-500 text-white",
  },
};

const FIELD_LABELS = {
  quantityBuy: "Quantity Bought",
  mrp: "MRP",
  brand: "Brand",
  product: "Product",
  category: "Category",
  size: "Size",
  secretCode: "Secret Code",
};

const formatValue = (field, value) => {
  if (field === "mrp") return `₹${value}`;
  return value;
};

// Highlights the matched substring inside a code, e.g. searching "ABC"
// inside "XABC9" bolds the "ABC" part.
const HighlightMatch = ({ text, query }) => {
  if (!query) return <>{text}</>;
  const idx = text.toUpperCase().indexOf(query.toUpperCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-amber-200 rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
};

// Renders the "what changed" line(s) for an updated-type event.
const ChangeSummary = ({ changes }) => (
  <div className="space-y-1">
    {changes.map((c, idx) => {
      const label = FIELD_LABELS[c.field] || c.field;
      if (c.field === "quantityBuy") {
        const diff = Number(c.to) - Number(c.from);
        const isIncrease = diff > 0;
        return (
          <div key={idx} className="text-sm flex flex-wrap items-center gap-1">
            <span className="font-semibold">{label}:</span>
            <span>{c.from}</span>
            <span className="text-gray-400">→</span>
            <span>{c.to}</span>
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                isIncrease
                  ? "bg-green-200 text-green-800"
                  : "bg-red-200 text-red-800"
              }`}
            >
              {isIncrease ? `+${diff} restocked` : `${diff} corrected`}
            </span>
          </div>
        );
      }
      return (
        <div key={idx} className="text-sm">
          <span className="font-semibold">{label}:</span>{" "}
          {formatValue(c.field, c.from)} → {formatValue(c.field, c.to)}
        </div>
      );
    })}
  </div>
);

const EventCard = ({ event, searchQuery }) => {
  const cfg = TYPE_CONFIG[event.type];
  const dateObj = new Date(event.date);

  return (
    <div
      className={`border-l-4 ${cfg.border} ${cfg.bg} rounded-md shadow-sm p-4 mb-3`}
    >
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-2 py-1 rounded-full ${cfg.badge}`}
          >
            {cfg.label}
          </span>
          <span className="font-semibold text-gray-800">
            <HighlightMatch text={event.code} query={searchQuery} />
          </span>
        </div>
        <div className="text-xs text-gray-500 whitespace-nowrap">
          {dateObj.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      <div className="text-sm text-gray-700 mt-1">
        {event.brand} • {event.product}
        {event.category ? ` • ${event.category}` : ""}
        {event.size ? ` • Size ${event.size}` : ""}
      </div>

      <div className="mt-2">
        {event.type === "added" && (
          <div className="text-sm">
            Added <span className="font-semibold">{event.quantityBuy}</span>{" "}
            pcs @ <span className="font-semibold">₹{event.mrp}</span> MRP
          </div>
        )}

        {event.type === "updated" && <ChangeSummary changes={event.changes} />}

        {event.type === "sold" && (
          <div className="text-sm">
            Sold for{" "}
            <span className="font-semibold">₹{event.sellingPrice}</span>
            {event.mrp ? ` (MRP ₹${event.mrp})` : ""}
            {event.customerPhoneNo ? ` • Customer: ${event.customerPhoneNo}` : ""}
            {event.soldBy ? ` • By: ${event.soldBy}` : ""}
          </div>
        )}

        {event.type === "deleted" && (
          <div className="text-sm">
            Removed from inventory — had {event.quantityBuy} bought,{" "}
            {event.quantitySold} sold (MRP ₹{event.mrp})
          </div>
        )}
      </div>
    </div>
  );
};

// Compact page-number strip: shows first, last, current ±1, and "…" gaps.
const PageControls = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  const add = (p) => pages.push(p);
  const addGap = () => pages.push("gap");

  add(1);
  if (page > 3) addGap();
  for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) {
    add(p);
  }
  if (page < totalPages - 2) addGap();
  if (totalPages > 1) add(totalPages);

  return (
    <div className="flex items-center justify-center gap-1 flex-wrap mt-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded border text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        Prev
      </button>
      {pages.map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-2 text-gray-400 text-sm">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-3 py-1.5 rounded border text-sm ${
              p === page
                ? "bg-blue-600 text-white border-blue-600"
                : "hover:bg-gray-50"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 rounded border text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        Next
      </button>
    </div>
  );
};

const PAGE_SIZE = 100;

const ItemActivityTimeline = () => {
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().slice(0, 10);
  const firstOfMonthStr = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .slice(0, 10);

  const [filterMode, setFilterMode] = useState("month"); // "month" | "range"
  const [selectedMonth, setSelectedMonth] = useState(todayStr.slice(0, 7));
  const [startDate, setStartDate] = useState(firstOfMonthStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [typeFilters, setTypeFilters] = useState({
    added: true,
    updated: true,
    sold: true,
    deleted: true,
  });

  // Raw text the user is typing, vs. the debounced value actually sent to the API.
  const [codeInput, setCodeInput] = useState("");
  const [codeQuery, setCodeQuery] = useState("");
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCodeQuery(codeInput.trim().toUpperCase());
      setPage(1); // any new search always resets to page 1
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [codeInput]);

  const [page, setPage] = useState(1);
  const [feed, setFeed] = useState(null); // { summary, events, pagination }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const getRangeForFetch = () => {
    if (filterMode === "month") {
      const [y, m] = selectedMonth.split("-").map(Number);
      const from = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const to = new Date(y, m, 0, 23, 59, 59, 999);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    const from = new Date(startDate + "T00:00:00.000");
    const to = new Date(endDate + "T23:59:59.999");
    return { from: from.toISOString(), to: to.toISOString() };
  };

  const fetchFeed = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError("");
    try {
      const { from, to } = getRangeForFetch();
      const params = new URLSearchParams({
        from,
        to,
        page: String(targetPage),
        limit: String(PAGE_SIZE),
      });
      if (codeQuery) params.set("code", codeQuery);

      const response = await fetch(`/api/item/history-feed?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.localStorage.clear();
          navigate("/login");
          return;
        }
        setError("Failed to fetch history");
        setFeed(null);
        return;
      }

      const data = await response.json();
      setFeed(data);
      setPage(data.pagination?.page || targetPage);
      setHasSearched(true);
    } catch (err) {
      console.log(err);
      setError("Something went wrong fetching the history");
      setFeed(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode, selectedMonth, startDate, endDate, codeQuery, navigate]);

  // Re-fetch whenever the code search settles (debounced) or the page changes,
  // but only after the user has run the initial search at least once.
  useEffect(() => {
    if (hasSearched) fetchFeed(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeQuery]);

  useEffect(() => {
    if (hasSearched) fetchFeed(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const toggleTypeFilter = (type) => {
    setTypeFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const visibleEvents = feed
    ? feed.events.filter((e) => typeFilters[e.type])
    : [];

  const pagination = feed?.pagination;

  return (
    <div className="p-4 bg-gray-100 rounded-md shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Item Activity History</h2>

      {/* Controls */}
      <div className="bg-white rounded-md shadow p-4 mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="month">By Month</option>
            <option value="range">By Date Range</option>
          </select>

          {filterMode === "month" ? (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="p-2 border rounded"
            />
          ) : (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-2 border rounded"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-2 border rounded"
              />
            </>
          )}

          <button
            onClick={() => fetchFeed(1)}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? "Loading..." : "Get History"}
          </button>
        </div>

        {/* Code search */}
        <div className="relative">
          <input
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Search by product code, e.g. ABC"
            className="w-full p-2 pr-8 border rounded uppercase placeholder:normal-case placeholder:capitalize"
          />
          {codeInput && (
            <button
              onClick={() => setCodeInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        {codeQuery && (
          <div className="text-xs text-gray-500">
            Showing items whose code contains <span className="font-semibold">{codeQuery}</span>
          </div>
        )}

        {/* Type filter chips */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
            <button
              key={type}
              onClick={() => toggleTypeFilter(type)}
              className={`text-xs font-semibold px-3 py-1 rounded-full border transition ${
                typeFilters[type]
                  ? `${cfg.badge} border-transparent`
                  : "bg-white text-gray-400 border-gray-300"
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="text-red-600 mb-3">{error}</div>}

      {feed && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-green-100 border border-green-400 rounded-md p-3 text-center">
            <div className="text-xs text-gray-600">Added</div>
            <div className="text-xl font-bold text-green-700">
              {feed.summary.totalAdded}
            </div>
          </div>
          <div className="bg-blue-100 border border-blue-400 rounded-md p-3 text-center">
            <div className="text-xs text-gray-600">Updated</div>
            <div className="text-xl font-bold text-blue-700">
              {feed.summary.totalUpdated}
            </div>
          </div>
          <div className="bg-yellow-100 border border-yellow-400 rounded-md p-3 text-center">
            <div className="text-xs text-gray-600">Sold</div>
            <div className="text-xl font-bold text-yellow-700">
              {feed.summary.totalSold}
            </div>
          </div>
          <div className="bg-red-100 border border-red-400 rounded-md p-3 text-center">
            <div className="text-xs text-gray-600">Deleted</div>
            <div className="text-xl font-bold text-red-700">
              {feed.summary.totalDeleted}
            </div>
          </div>
        </div>
      )}

      {pagination && pagination.totalEvents > 0 && (
        <div className="text-xs text-gray-500 mb-2 px-1">
          Showing {(pagination.page - 1) * pagination.limit + 1}–
          {Math.min(pagination.page * pagination.limit, pagination.totalEvents)} of{" "}
          {pagination.totalEvents} events • Page {pagination.page} of {pagination.totalPages}
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-gray-100/60 flex items-center justify-center z-10 rounded-md">
            <span className="text-sm text-gray-500">Loading…</span>
          </div>
        )}

        {feed && visibleEvents.length === 0 && (
          <div className="text-gray-500 text-center py-8">
            No activity found for this period / filter / search.
          </div>
        )}
        {visibleEvents.map((event, idx) => (
          <EventCard
            key={`${event.type}-${event.code}-${event.date}-${idx}`}
            event={event}
            searchQuery={codeQuery}
          />
        ))}
      </div>

      {pagination && (
        <PageControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          onChange={(p) => setPage(p)}
        />
      )}
    </div>
  );
};

export default ItemActivityTimeline;