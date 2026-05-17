import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// Soft palette for customer groups — cycles through these by index
const CUSTOMER_COLORS = [
  { bg: "bg-blue-50",   border: "border-l-blue-400",   header: "bg-blue-100",   label: "text-blue-700"   },
  { bg: "bg-violet-50", border: "border-l-violet-400", header: "bg-violet-100", label: "text-violet-700" },
  { bg: "bg-amber-50",  border: "border-l-amber-400",  header: "bg-amber-100",  label: "text-amber-700"  },
  { bg: "bg-rose-50",   border: "border-l-rose-400",   header: "bg-rose-100",   label: "text-rose-700"   },
  { bg: "bg-teal-50",   border: "border-l-teal-400",   header: "bg-teal-100",   label: "text-teal-700"   },
  { bg: "bg-orange-50", border: "border-l-orange-400", header: "bg-orange-100", label: "text-orange-700" },
  { bg: "bg-cyan-50",   border: "border-l-cyan-400",   header: "bg-cyan-100",   label: "text-cyan-700"   },
  { bg: "bg-pink-50",   border: "border-l-pink-400",   header: "bg-pink-100",   label: "text-pink-700"   },
];

const WALKIN_STYLE = {
  bg: "bg-white", border: "border-l-gray-300", header: "bg-gray-50", label: "text-gray-500",
};

const SalesReport = () => {
  const navigate = useNavigate();

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const toDateString = (d) => d.toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(toDateString(firstOfMonth));
  const [toDate, setToDate]     = useState(toDateString(today));
  const [showProfit, setShowProfit] = useState(false);

  // Column visibility toggles
  const [showTime,     setShowTime]     = useState(false);
  const [showBrand,    setShowBrand]    = useState(false);
  const [showSize,     setShowSize]     = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [showSoldBy, setShowSoldBy] = useState(false);

  const [sales,   setSales]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error,   setError]   = useState("");

  const token = () =>
    JSON.parse(window.localStorage.getItem("userInfo")).token;

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const handleFetch = async () => {
    if (!fromDate || !toDate) { setError("Please select both dates."); return; }
    if (new Date(fromDate) > new Date(toDate)) {
      setError("From date cannot be after To date."); return;
    }
    setError("");
    setLoading(true);
    try {
      const from = new Date(fromDate).setHours(0, 0, 0, 0);
      const to   = new Date(toDate).setHours(23, 59, 59, 999);
      const res  = await fetch(`/api/salesreport?from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.status === 401) { window.localStorage.clear(); navigate("/login"); return; }
      if (!res.ok) throw new Error("Failed to fetch report");
      const data = await res.json();
      setSales(data.sales);
      setFetched(true);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  // ── Aggregates ────────────────────────────────────────────────────────────
  const totalRevenue = sales.reduce((s, r) => s + (r.sellingPrice || 0), 0);
  const totalMRP     = sales.reduce((s, r) => s + (r.mrp || 0), 0);
  const totalProfit  = totalRevenue - totalMRP;

  // ── Group by date, then by customer within each date ──────────────────────
  //
  // Within a single day we collect all sales for a given phone number together,
  // preserving the order in which that customer FIRST appeared.
  // Walk-ins (no phone) each become their own single-item "group".
  //
  // Result shape per date:
  //   [ { phone, customerName, colorIdx, sales: [...] }, ... ]
  //
  const buildDayGroups = (daySales) => {
    const phoneOrder = [];      // tracks insertion order of unique phones
    const phoneMap   = {};      // phone -> { customerName, sales: [] }

    daySales.forEach((sale) => {
      const key = sale.customerPhoneNo
        ? String(sale.customerPhoneNo)
        : `walkin_${sale._id}`;          // unique key per walk-in

      if (!phoneMap[key]) {
        phoneMap[key] = {
          phone:        sale.customerPhoneNo || null,
          customerName: sale.customerName   || "",
          sales:        [],
        };
        phoneOrder.push(key);
      }
      phoneMap[key].sales.push(sale);
    });

    // Assign a color index to each REAL customer (not walk-ins).
    // Walk-ins always get WALKIN_STYLE.
    let colorCounter = 0;
    return phoneOrder.map((key) => {
      const group = phoneMap[key];
      const isWalkin = !group.phone;
      return {
        ...group,
        key,
        isWalkin,
        colorIdx: isWalkin ? null : (colorCounter++) % CUSTOMER_COLORS.length,
      };
    });
  };

  // Group all sales by date
  const grouped = sales.reduce((acc, sale) => {
    const date = new Date(sale.soldAt).toLocaleDateString("en-IN");
    if (!acc[date]) acc[date] = [];
    acc[date].push(sale);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));

  // ── Column helper ─────────────────────────────────────────────────────────
  const ColToggle = ({ label, checked, onChange }) => (
    <label className="flex items-center gap-1.5 cursor-pointer select-none no-print">
      <div
        onClick={onChange}
        className={`w-8 h-4 rounded-full transition-colors relative ${
          checked ? "bg-indigo-500" : "bg-gray-300"
        }`}
      >
        <div
          className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </label>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-show { display: block !important; }
          body { font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          .customer-block { page-break-inside: avoid; }
        }
        .print-show { display: none; }
      `}</style>

      <div className="p-4 max-w-7xl mx-auto">

        {/* ── Controls panel ── */}
        <div className="no-print">
          <h1 className="text-2xl font-bold mb-1">Sales Report</h1>
          <p className="text-sm text-gray-500 mb-5">
            Date-range sales report for CA / GST filing. Normal sales and customer
            purchases are both included.
          </p>

          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
            {/* Row 1: dates + generate */}
            <div className="flex flex-wrap gap-4 items-end mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                <input
                  type="date" value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                <input
                  type="date" value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={handleFetch} disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-6 rounded disabled:opacity-50"
              >
                {loading ? "Loading…" : "Generate Report"}
              </button>
              {fetched && sales.length > 0 && (
                <button
                  onClick={handlePrint}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-6 rounded"
                >
                  🖨 Print / Save PDF
                </button>
              )}
            </div>

            {/* Row 2: column toggles + profit toggle */}
            <div className="flex flex-wrap gap-5 items-center pt-3 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Columns
              </span>
              <ColToggle label="Time"     checked={showTime}     onChange={() => setShowTime(!showTime)} />
              <ColToggle label="Brand"    checked={showBrand}    onChange={() => setShowBrand(!showBrand)} />
              <ColToggle label="Size"     checked={showSize}     onChange={() => setShowSize(!showSize)} />
              <ColToggle label="Category" checked={showCategory} onChange={() => setShowCategory(!showCategory)} />
              <ColToggle label="Sold By"  checked={showSoldBy}   onChange={() => setShowSoldBy(!showSoldBy)} />

              <span className="mx-2 text-gray-300">|</span>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox" checked={showProfit}
                  onChange={(e) => setShowProfit(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-xs font-medium text-gray-600">
                  Show MRP &amp; Profit / Loss
                </span>
              </label>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 text-sm p-3 rounded mb-4">
              {error}
            </div>
          )}
        </div>

        {/* ── Report output ── */}
        {fetched && (
          <div>
            {/* Print-only header */}
            <div className="print-show mb-4">
              <h2 className="text-lg font-bold">Sales Report</h2>
              <p className="text-xs text-gray-600">
                Period: {new Date(fromDate).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
                {" – "}
                {new Date(toDate).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
                &emsp;|&emsp;Generated: {new Date().toLocaleString("en-IN")}
              </p>
            </div>

            {sales.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                No sales found for the selected period.
              </div>
            ) : (
              <>
                {/* ── Summary cards (screen only) ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 no-print">
                  <SummaryCard label="Total Orders"  value={sales.length}        color="blue"   prefix="" />
                  <SummaryCard label="Total Revenue" value={`₹${totalRevenue.toLocaleString("en-IN")}`} color="green" prefix="" />
                  {showProfit && <>
                    <SummaryCard label="Total MRP"   value={`₹${totalMRP.toLocaleString("en-IN")}`}    color="amber" prefix="" />
                    <SummaryCard
                      label="Gross Profit"
                      value={`${totalProfit >= 0 ? "+" : ""}₹${totalProfit.toLocaleString("en-IN")}`}
                      color={totalProfit >= 0 ? "emerald" : "red"}
                      prefix=""
                    />
                  </>}
                </div>

                {/* ── Print-only summary row ── */}
                <div className="print-show mb-3 text-xs border border-gray-300 rounded overflow-hidden">
                  <table className="w-full">
                    <tbody>
                      <tr className="bg-gray-50">
                        <td className="px-3 py-1 border-r border-gray-300 font-medium">Orders</td>
                        <td className="px-3 py-1 border-r border-gray-300">{sales.length}</td>
                        <td className="px-3 py-1 border-r border-gray-300 font-medium">Revenue</td>
                        <td className="px-3 py-1 border-r border-gray-300">₹{totalRevenue.toLocaleString("en-IN")}</td>
                        {showProfit && <>
                          <td className="px-3 py-1 border-r border-gray-300 font-medium">MRP Total</td>
                          <td className="px-3 py-1 border-r border-gray-300">₹{totalMRP.toLocaleString("en-IN")}</td>
                          <td className="px-3 py-1 border-r border-gray-300 font-medium">Gross Profit</td>
                          <td className="px-3 py-1">₹{totalProfit.toLocaleString("en-IN")}</td>
                        </>}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ── Per-date sections ── */}
                {sortedDates.map((date) => {
                  const daySales   = grouped[date];
                  const dayRevenue = daySales.reduce((s, r) => s + (r.sellingPrice || 0), 0);
                  const dayProfit  = daySales.reduce((s, r) => s + ((r.sellingPrice||0)-(r.mrp||0)), 0);
                  const dayGroups  = buildDayGroups(daySales);

                  return (
                    <div key={date} className="mb-8">
                      {/* Date banner */}
                      <div className="flex flex-wrap justify-between items-center bg-gray-800 text-white px-4 py-2 rounded-t text-sm font-semibold">
                        <span>{date}</span>
                        <span className="flex gap-4 text-xs font-medium opacity-90">
                          <span>Product sold - {daySales.length}</span>
                          <span>Revenue: ₹{dayRevenue.toLocaleString("en-IN")}</span>
                          {showProfit && (
                            <span className={dayProfit >= 0 ? "text-green-300" : "text-red-300"}>
                              Profit: {dayProfit >= 0 ? "+" : ""}₹{dayProfit.toLocaleString("en-IN")}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Column headers */}
                      <div className="overflow-x-auto border border-t-0 border-gray-300 rounded-b">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-100 text-gray-600 uppercase tracking-wide">
                              <th className="border-b border-gray-300 px-3 py-2 text-left w-6">#</th>
                              {showTime     && <th className="border-b border-gray-300 px-3 py-2 text-left">Time</th>}
                              <th className="border-b border-gray-300 px-3 py-2 text-left">Code</th>
                              {showBrand    && <th className="border-b border-gray-300 px-3 py-2 text-left">Brand</th>}
                              <th className="border-b border-gray-300 px-3 py-2 text-left">Product</th>
                              {showCategory && <th className="border-b border-gray-300 px-3 py-2 text-left">Category</th>}
                              {showSize     && <th className="border-b border-gray-300 px-3 py-2 text-left">Size</th>}
                              <th className="border-b border-gray-300 px-3 py-2 text-right">Selling Price</th>
                              {showProfit   && <>
                                <th className="border-b border-gray-300 px-3 py-2 text-right">MRP</th>
                                <th className="border-b border-gray-300 px-3 py-2 text-right">P/L</th>
                              </>}
                              {showSoldBy   && <th className="border-b border-gray-300 px-3 py-2 text-left no-print">Sold By</th>}
                            </tr>
                          </thead>

                          <tbody>
                            {dayGroups.map((group, gIdx) => {
                              const style   = group.isWalkin
                                ? WALKIN_STYLE
                                : CUSTOMER_COLORS[group.colorIdx];

                              const groupRevenue = group.sales.reduce((s, r) => s + (r.sellingPrice||0), 0);
                              const groupProfit  = group.sales.reduce((s, r) => s + ((r.sellingPrice||0)-(r.mrp||0)), 0);

                              return (
                                <React.Fragment key={group.key}>
                                  {/* Customer sub-header row — only for real customers */}
                                  {!group.isWalkin && (
                                    <tr className={`${style.header} border-t-2 border-gray-300`}>
                                      <td
                                        colSpan={
                                          /* count visible columns */
                                          2 + /* # + price */
                                          (showTime ? 1 : 0) +
                                          (showBrand ? 1 : 0) +
                                          (showCategory ? 1 : 0) +
                                          (showSize ? 1 : 0) +
                                          (showProfit ? 2 : 0) +
                                          1 /* product */ +
                                          (showSoldBy ? 1 : 0)
                                        }
                                        className={`px-3 py-1.5 ${style.label} font-semibold text-xs`}
                                      >
                                        <span className="mr-3">
                                            {gIdx+1}
                                          👤 {group.customerName || "Customer"} — {group.phone}
                                        </span>
                                        <span className="font-normal opacity-75">
                                          {group.sales.length} item{group.sales.length !== 1 ? "s" : ""}
                                          &emsp;Total: ₹{groupRevenue.toLocaleString("en-IN")}
                                          {showProfit && (
                                            <span className={groupProfit >= 0 ? " text-green-700" : " text-red-600"}>
                                              &emsp;P/L: {groupProfit >= 0 ? "+" : ""}₹{groupProfit.toLocaleString("en-IN")}
                                            </span>
                                          )}
                                        </span>
                                      </td>
                                    </tr>
                                  )}

                                  {/* Walk-in spacer every new group (subtle top border) */}
                                  {group.isWalkin && gIdx > 0 && (
                                    <tr>
                                      <td
                                        colSpan={99}
                                        className="border-t border-gray-200 h-px p-0"
                                      />
                                    </tr>
                                  )}

                                  {/* Sale rows */}
                                  {group.sales.map((sale, sIdx) => {
                                    const pl = (sale.sellingPrice||0) - (sale.mrp||0);
                                    return (
                                      <tr
                                        key={sale._id}
                                        className={`
                                          ${style.bg}
                                          border-l-4 ${style.border}
                                          hover:brightness-95 transition-all
                                        `}
                                      >
                                        <td className="border-b border-gray-200 px-3 py-2 text-gray-400">
                                          {group.isWalkin ? gIdx+1: `${gIdx+1}.${sIdx+1}` }
                                        </td>
                                        {showTime && (
                                          <td className="border-b border-gray-200 px-3 py-2 whitespace-nowrap text-gray-500">
                                            {new Date(sale.soldAt).toLocaleTimeString("en-IN", {
                                              hour: "2-digit", minute: "2-digit",
                                            })}
                                          </td>
                                        )}
                                        <td className="border-b border-gray-200 px-3 py-2 font-mono font-medium">
                                          {sale.code}
                                        </td>
                                        {showBrand && (
                                          <td className="border-b border-gray-200 px-3 py-2">{sale.brand}</td>
                                        )}
                                        <td className="border-b border-gray-200 px-3 py-2">{sale.product}</td>
                                        {showCategory && (
                                          <td className="border-b border-gray-200 px-3 py-2 text-gray-500">{sale.category}</td>
                                        )}
                                        {showSize && (
                                          <td className="border-b border-gray-200 px-3 py-2">{sale.size}</td>
                                        )}
                                        <td className="border-b border-gray-200 px-3 py-2 text-right font-semibold">
                                          ₹{(sale.sellingPrice||0).toLocaleString("en-IN")}
                                        </td>
                                        {showProfit && <>
                                          <td className="border-b border-gray-200 px-3 py-2 text-right text-gray-400">
                                            ₹{(sale.mrp||0).toLocaleString("en-IN")}
                                          </td>
                                          <td className={`border-b border-gray-200 px-3 py-2 text-right font-medium ${pl >= 0 ? "text-green-700" : "text-red-600"}`}>
                                            {pl >= 0 ? "+" : ""}₹{pl.toLocaleString("en-IN")}
                                          </td>
                                        </>}
                                        {showSoldBy && (
                                          <td className="border-b border-gray-200 px-3 py-2 text-gray-400 text-xs no-print">
                                            {sale.soldBy || "—"}
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}

                                  {/* Customer subtotal footer (only for multi-item customers) */}
                                  {!group.isWalkin && group.sales.length > 1 && (
                                    <tr className={`${style.header} text-xs font-semibold`}>
                                      <td
                                        colSpan={
                                          1 + /* # */
                                          (showTime ? 1 : 0) +
                                          (showBrand ? 1 : 0) +
                                          (showCategory ? 1 : 0) +
                                          (showSize ? 1 : 0) +
                                          1 /* code */ +
                                          1 /* product */
                                        }
                                        className={`px-3 py-1 ${style.label} text-right`}
                                      >
                                        Subtotal
                                      </td>
                                      <td className={`px-3 py-1 text-right ${style.label}`}>
                                        ₹{groupRevenue.toLocaleString("en-IN")}
                                      </td>
                                      {showProfit && <>
                                        <td className={`px-3 py-1 text-right ${style.label}`}>—</td>
                                        <td className={`px-3 py-1 text-right font-bold ${groupProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                                          {groupProfit >= 0 ? "+" : ""}₹{groupProfit.toLocaleString("en-IN")}
                                        </td>
                                      </>}
                                      <td className="no-print" />
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>

                          {/* Day total footer */}
                          <tfoot>
                            <tr className="bg-gray-800 text-white text-xs font-semibold">
                              <td
                                colSpan={
                                  1 + /* # */
                                  (showTime ? 1 : 0) +
                                  (showBrand ? 1 : 0) +
                                  (showCategory ? 1 : 0) +
                                  (showSize ? 1 : 0) +
                                  1 /* code */ +
                                  1 /* product */
                                }
                                className="px-3 py-2 text-right text-gray-300"
                              >
                                Day Total — {daySales.length} products sold
                              </td>
                              <td className="px-3 py-2 text-right">
                                ₹{dayRevenue.toLocaleString("en-IN")}
                              </td>
                              {showProfit && <>
                                <td className="px-3 py-2 text-right text-gray-400">—</td>
                                <td className={`px-3 py-2 text-right ${dayProfit >= 0 ? "text-green-300" : "text-red-300"}`}>
                                  {dayProfit >= 0 ? "+" : ""}₹{dayProfit.toLocaleString("en-IN")}
                                </td>
                              </>}
                              <td className="no-print" />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* ── Grand total ── */}
                <div className="bg-gray-900 text-white rounded-lg p-4 text-sm font-semibold flex flex-wrap gap-6 justify-between items-center mt-2">
                  <span className="text-gray-300">
                    Grand Total — {sales.length} products sold
                    &nbsp;|&nbsp;
                    {sortedDates.length} day{sortedDates.length !== 1 ? "s" : ""}
                  </span>
                  <span className="flex gap-6">
                    <span>Revenue: ₹{totalRevenue.toLocaleString("en-IN")}</span>
                    {showProfit && <>
                      <span className="text-gray-400">MRP: ₹{totalMRP.toLocaleString("en-IN")}</span>
                      <span className={totalProfit >= 0 ? "text-green-300" : "text-red-300"}>
                        Profit: {totalProfit >= 0 ? "+" : ""}₹{totalProfit.toLocaleString("en-IN")}
                      </span>
                    </>}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};

// Small helper card component
const colorMap = {
  blue:    "bg-blue-50 border-blue-200 text-blue-600 text-blue-800",
  green:   "bg-green-50 border-green-200 text-green-600 text-green-800",
  amber:   "bg-amber-50 border-amber-200 text-amber-600 text-amber-800",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-600 text-emerald-800",
  red:     "bg-red-50 border-red-200 text-red-600 text-red-800",
};

const SummaryCard = ({ label, value, color }) => {
  const [bg, border, labelCls, valueCls] = colorMap[color]?.split(" ") ?? Array(4).fill("");
  return (
    <div className={`${bg} border ${border} rounded-lg p-4 text-center`}>
      <p className={`text-xs uppercase font-medium ${labelCls}`}>{label}</p>
      <p className={`text-xl font-bold mt-1 ${valueCls}`}>{value}</p>
    </div>
  );
};

export default SalesReport;