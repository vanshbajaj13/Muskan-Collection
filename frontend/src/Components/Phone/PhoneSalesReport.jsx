import React, { useState } from "react";
import PhoneFilters from "./PhoneFilters";

// Soft palette for "sold to" groups — cycles through by index
const BUYER_COLORS = [
  { bg: "bg-blue-50",   border: "border-l-blue-400",   header: "bg-blue-100",   label: "text-blue-700"   },
  { bg: "bg-violet-50", border: "border-l-violet-400", header: "bg-violet-100", label: "text-violet-700" },
  { bg: "bg-amber-50",  border: "border-l-amber-400",  header: "bg-amber-100",  label: "text-amber-700"  },
  { bg: "bg-rose-50",   border: "border-l-rose-400",   header: "bg-rose-100",   label: "text-rose-700"   },
  { bg: "bg-teal-50",   border: "border-l-teal-400",   header: "bg-teal-100",   label: "text-teal-700"   },
  { bg: "bg-orange-50", border: "border-l-orange-400", header: "bg-orange-100", label: "text-orange-700" },
  { bg: "bg-cyan-50",   border: "border-l-cyan-400",   header: "bg-cyan-100",   label: "text-cyan-700"   },
  { bg: "bg-pink-50",   border: "border-l-pink-400",   header: "bg-pink-100",   label: "text-pink-700"   },
];

const DIRECT_STYLE = {
  bg: "bg-white", border: "border-l-gray-300", header: "bg-gray-50", label: "text-gray-500",
};

// Filter keys for the report tab (no search, no status — report shows all)
const INITIAL_FILTERS = {
  dateFrom: "",
  dateTo: "",
  product: "",
  account: "",
  purchasedFrom: "",
  soldTo: "",
  creditCard: "",
  commissionTo: "",
  withGST: "",
  hasCashback: "",
  hasCommission: "",
};

const PhoneSalesReport = () => {
  const today        = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const toDateString = (d) => d.toISOString().split("T")[0];

  // Seed dateFrom / dateTo from the filter object
  const [filters, setFilters] = useState({
    ...INITIAL_FILTERS,
    dateFrom: toDateString(firstOfMonth),
    dateTo: toDateString(today),
  });

  // Column visibility toggles
  const [showAccount,    setShowAccount]    = useState(false);
  const [showCreditCard, setShowCreditCard] = useState(false);
  const [showCashback,   setShowCashback]   = useState(false);
  const [showCharges,    setShowCharges]    = useState(false);
  const [showCommission, setShowCommission] = useState(false);
  const [showProfit,     setShowProfit]     = useState(false);
  const [showStatus,     setShowStatus]     = useState(false);

  const [allDeals, setAllDeals] = useState([]);  // raw fetched deals
  const [loading,  setLoading]  = useState(false);
  const [fetched,  setFetched]  = useState(false);
  const [error,    setError]    = useState("");

  const token = () =>
    JSON.parse(window.localStorage.getItem("userInfo")).token;

  // ── Fetch (date range only — server side) ────────────────────────────────
  const handleFetch = async () => {
    const { dateFrom, dateTo } = filters;
    if (!dateFrom || !dateTo) { setError("Please select both dates."); return; }
    if (new Date(dateFrom) > new Date(dateTo)) {
      setError("From date cannot be after To date."); return;
    }
    setError("");
    setLoading(true);
    try {
      const from = new Date(dateFrom).setHours(0, 0, 0, 0);
      const to   = new Date(dateTo).setHours(23, 59, 59, 999);
      const res  = await fetch(`/api/phones/deals?from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch report");
      const data = await res.json();
      setAllDeals(data.deals || []);
      setFetched(true);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  // ── Client-side filter application ───────────────────────────────────────
  const deals = allDeals.filter((d) => {
    if (filters.product && d.product !== filters.product) return false;
    if (filters.account && d.purchaseAccount !== filters.account) return false;
    if (filters.purchasedFrom && d.purchasedFrom !== filters.purchasedFrom) return false;
    if (filters.soldTo && d.soldTo !== filters.soldTo) return false;
    if (filters.creditCard && d.creditCard !== filters.creditCard) return false;
    if (filters.commissionTo && d.commissionTo !== filters.commissionTo) return false;
    if (filters.withGST === "true" && !d.withGST) return false;
    if (filters.withGST === "false" && d.withGST) return false;
    if (filters.hasCashback === "yes" && !(d.cashback > 0)) return false;
    if (filters.hasCashback === "no" && d.cashback > 0) return false;
    if (filters.hasCommission === "yes" && !(d.commissionAmount > 0)) return false;
    if (filters.hasCommission === "no" && d.commissionAmount > 0) return false;
    return true;
  });

  // ── Aggregates ────────────────────────────────────────────────────────────
  const totalBuying      = deals.reduce((s, d) => s + (d.buyingPrice || 0), 0);
  const totalSelling     = deals.reduce((s, d) => s + (d.sellingPrice || d.effectiveSellingPrice || 0), 0);
  const totalGrossProfit = deals.reduce((s, d) => s + (d.grossProfit || 0), 0);
  const totalNetProfit   = deals.reduce((s, d) => s + (d.netProfit   || 0), 0);
  const totalCashback    = deals.reduce((s, d) => s + (d.cashback    || 0), 0);
  const totalCommission  = deals.reduce((s, d) => s + (d.commissionAmount || 0), 0);
  // eslint-disable-next-line
  const totalCharges     = deals.reduce((s, d) => s + (d.charges     || 0), 0);

  // ── Group by sale/purchase date, then by buyer ────────────────────────────
  const getGroupDate = (deal) => {
    const ts = deal.saleDate || deal.purchaseDate;
    return ts ? new Date(ts).toLocaleDateString("en-IN") : "Unknown Date";
  };

  const buildDayGroups = (daySales) => {
    const buyerOrder = [];
    const buyerMap   = {};
    daySales.forEach((deal) => {
      const key = deal.soldTo ? String(deal.soldTo) : `direct_${deal._id}`;
      if (!buyerMap[key]) {
        buyerMap[key] = { buyer: deal.soldTo || null, deals: [] };
        buyerOrder.push(key);
      }
      buyerMap[key].deals.push(deal);
    });
    let colorCounter = 0;
    return buyerOrder.map((key) => {
      const group   = buyerMap[key];
      const isDirect = !group.buyer;
      return { ...group, key, isDirect, colorIdx: isDirect ? null : (colorCounter++) % BUYER_COLORS.length };
    });
  };

  const grouped = deals.reduce((acc, deal) => {
    const date = getGroupDate(deal);
    if (!acc[date]) acc[date] = [];
    acc[date].push(deal);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(a.split("/").reverse().join("-")) - new Date(b.split("/").reverse().join("-"))
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  const statusLabel = (s) => ({ unsold: "Unsold", pending_payment: "Pending", complete: "Complete" })[s] || s;
  const statusCls   = (s) => ({ unsold: "text-slate-500", pending_payment: "text-amber-600 font-medium", complete: "text-emerald-600 font-medium" })[s] || "";

  const colCount = () =>
    1 + 1 + 1 +
    (showAccount    ? 1 : 0) +
    (showCreditCard ? 1 : 0) +
    1 +
    (showCashback   ? 1 : 0) +
    (showCharges    ? 1 : 0) +
    (showCommission ? 1 : 0) +
    1 +
    (showProfit     ? 2 : 0) +
    (showStatus     ? 1 : 0);

  const ColToggle = ({ label, checked, onChange }) => (
    <label className="flex items-center gap-1.5 cursor-pointer select-none no-print">
      <div
        onClick={onChange}
        className={`w-8 h-4 rounded-full transition-colors relative ${checked ? "bg-indigo-500" : "bg-gray-300"}`}
      >
        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </label>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @media print {
          .no-print  { display: none !important; }
          .print-show { display: block !important; }
          body { font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
        }
        .print-show { display: none; }
      `}</style>

      <div className="p-4 max-w-7xl mx-auto">

        {/* ── Controls panel ── */}
        <div className="no-print">
          <h1 className="text-2xl font-bold mb-1">Phone Sales Report</h1>
          <p className="text-sm text-gray-500 mb-4">
            Date-range deals report. Grouped by sale date and buyer.
          </p>

          {/* ── Shared filter panel ── */}
          <PhoneFilters
            filters={filters}
            onChange={setFilters}
            showSearch={false}
            compact={true}
          />

          {/* ── Action row ── */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
            <div className="flex flex-wrap gap-4 items-end mb-4">
              <button
                onClick={handleFetch} disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-6 rounded disabled:opacity-50"
              >
                {loading ? "Loading…" : "Generate Report"}
              </button>
              {fetched && deals.length > 0 && (
                <button
                  onClick={handlePrint}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-6 rounded"
                >
                  🖨 Print / Save PDF
                </button>
              )}
              {fetched && allDeals.length > 0 && (
                <a
                  href={`/api/phones/deals/meta/export?from=${new Date(filters.dateFrom).getTime()}&to=${new Date(filters.dateTo).setHours(23,59,59,999)}`}
                  className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium py-2 px-6 rounded"
                  download
                >
                  ↓ Export CSV
                </a>
              )}
              {fetched && allDeals.length !== deals.length && (
                <span className="text-xs text-indigo-600 font-medium self-center">
                  Showing {deals.length} of {allDeals.length} deals after filters
                </span>
              )}
            </div>

            {/* Column toggles */}
            <div className="flex flex-wrap gap-5 items-center pt-3 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Columns</span>
              <ColToggle label="Account"     checked={showAccount}    onChange={() => setShowAccount(!showAccount)} />
              <ColToggle label="Credit Card" checked={showCreditCard} onChange={() => setShowCreditCard(!showCreditCard)} />
              <ColToggle label="Cashback"    checked={showCashback}   onChange={() => setShowCashback(!showCashback)} />
              <ColToggle label="Charges"     checked={showCharges}    onChange={() => setShowCharges(!showCharges)} />
              <ColToggle label="Commission"  checked={showCommission} onChange={() => setShowCommission(!showCommission)} />
              <ColToggle label="Status"      checked={showStatus}     onChange={() => setShowStatus(!showStatus)} />
              <span className="mx-2 text-gray-300">|</span>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox" checked={showProfit}
                  onChange={(e) => setShowProfit(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-xs font-medium text-gray-600">Show Profit / Loss</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 text-sm p-3 rounded mb-4">{error}</div>
          )}
        </div>

        {/* ── Report output ── */}
        {fetched && (
          <div>
            {/* Print-only header */}
            <div className="print-show mb-4">
              <h2 className="text-lg font-bold">Phone Sales Report</h2>
              <p className="text-xs text-gray-600">
                Period: {new Date(filters.dateFrom).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
                {" – "}
                {new Date(filters.dateTo).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
                &emsp;|&emsp;Generated: {new Date().toLocaleString("en-IN")}
              </p>
            </div>

            {deals.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                No deals found for the selected period and filters.
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 no-print">
                  <SummaryCard label="Total Deals"    value={deals.length}                                           color="blue"    />
                  <SummaryCard label="Total Purchase" value={`₹${totalBuying.toLocaleString("en-IN")}`}            color="amber"   />
                  <SummaryCard label="Total Sales"    value={`₹${totalSelling.toLocaleString("en-IN")}`}           color="green"   />
                  {showProfit ? (
                    <SummaryCard
                      label="Net Profit"
                      value={`${totalNetProfit >= 0 ? "+" : ""}₹${Math.abs(totalNetProfit).toLocaleString("en-IN")}`}
                      color={totalNetProfit >= 0 ? "emerald" : "red"}
                    />
                  ) : (
                    <SummaryCard label="Total Cashback" value={`₹${totalCashback.toLocaleString("en-IN")}`} color="teal" />
                  )}
                </div>

                {/* Print-only summary */}
                <div className="print-show mb-3 text-xs border border-gray-300 rounded overflow-hidden">
                  <table className="w-full">
                    <tbody>
                      <tr className="bg-gray-50">
                        <td className="px-3 py-1 border-r border-gray-300 font-medium">Deals</td>
                        <td className="px-3 py-1 border-r border-gray-300">{deals.length}</td>
                        <td className="px-3 py-1 border-r border-gray-300 font-medium">Invested</td>
                        <td className="px-3 py-1 border-r border-gray-300">₹{totalBuying.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-1 border-r border-gray-300 font-medium">Revenue</td>
                        <td className="px-3 py-1 border-r border-gray-300">₹{totalSelling.toLocaleString("en-IN")}</td>
                        {showProfit && <>
                          <td className="px-3 py-1 border-r border-gray-300 font-medium">Gross</td>
                          <td className="px-3 py-1 border-r border-gray-300">₹{totalGrossProfit.toLocaleString("en-IN")}</td>
                          <td className="px-3 py-1 border-r border-gray-300 font-medium">Net</td>
                          <td className="px-3 py-1">₹{totalNetProfit.toLocaleString("en-IN")}</td>
                        </>}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Per-date sections */}
                {sortedDates.map((date) => {
                  const daySales    = grouped[date];
                  const dayRevenue  = daySales.reduce((s, d) => s + (d.sellingPrice || d.effectiveSellingPrice || 0), 0);
                  const dayBuying   = daySales.reduce((s, d) => s + (d.buyingPrice || 0), 0);
                  const dayGross    = daySales.reduce((s, d) => s + (d.grossProfit  || 0), 0);
                  const dayNet      = daySales.reduce((s, d) => s + (d.netProfit    || 0), 0);
                  const dayGroups   = buildDayGroups(daySales);

                  return (
                    <div key={date} className="mb-8">
                      {/* Date banner */}
                      <div className="flex flex-wrap justify-between items-center bg-gray-800 text-white px-4 py-2 rounded-t text-sm font-semibold">
                        <span>{date}</span>
                        <span className="flex gap-4 text-xs font-medium opacity-90">
                          <span>Deals — {daySales.length}</span>
                          <span>Revenue: ₹{dayRevenue.toLocaleString("en-IN")}</span>
                          {showProfit && (
                            <span className={dayNet >= 0 ? "text-green-300" : "text-red-300"}>
                              Net: {dayNet >= 0 ? "+" : ""}₹{Math.abs(dayNet).toLocaleString("en-IN")}
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="overflow-x-auto border border-t-0 border-gray-300 rounded-b">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-100 text-gray-600 uppercase tracking-wide">
                              <th className="border-b border-gray-300 px-3 py-2 text-left w-6">#</th>
                              <th className="border-b border-gray-300 px-3 py-2 text-left">Product</th>
                              <th className="border-b border-gray-300 px-3 py-2 text-left">From</th>
                              {showAccount    && <th className="border-b border-gray-300 px-3 py-2 text-left">Account</th>}
                              {showCreditCard && <th className="border-b border-gray-300 px-3 py-2 text-left">Card</th>}
                              <th className="border-b border-gray-300 px-3 py-2 text-right">Buy Price</th>
                              {showCashback   && <th className="border-b border-gray-300 px-3 py-2 text-right">Cashback</th>}
                              {showCharges    && <th className="border-b border-gray-300 px-3 py-2 text-right">Charges</th>}
                              {showCommission && <th className="border-b border-gray-300 px-3 py-2 text-right">Commission</th>}
                              <th className="border-b border-gray-300 px-3 py-2 text-right">Sell Price</th>
                              {showProfit && <>
                                <th className="border-b border-gray-300 px-3 py-2 text-right">Gross P/L</th>
                                <th className="border-b border-gray-300 px-3 py-2 text-right">Net P/L</th>
                              </>}
                              {showStatus && <th className="border-b border-gray-300 px-3 py-2 text-left">Status</th>}
                            </tr>
                          </thead>

                          <tbody>
                            {dayGroups.map((group, gIdx) => {
                              const style          = group.isDirect ? DIRECT_STYLE : BUYER_COLORS[group.colorIdx];
                              const groupRevenue   = group.deals.reduce((s, d) => s + (d.sellingPrice || d.effectiveSellingPrice || 0), 0);
                              const groupBuying    = group.deals.reduce((s, d) => s + (d.buyingPrice || 0), 0);
                              const groupNetProfit = group.deals.reduce((s, d) => s + (d.netProfit  || 0), 0);

                              return (
                                <React.Fragment key={group.key}>
                                  {/* Buyer sub-header */}
                                  {!group.isDirect && (
                                    <tr className={`${style.header} border-t-2 border-gray-300`}>
                                      <td colSpan={colCount()} className={`px-3 py-1.5 ${style.label} font-semibold text-xs`}>
                                        <span className="mr-3">{gIdx + 1}&nbsp;🤝 {group.buyer}</span>
                                        <span className="font-normal opacity-75">
                                          {group.deals.length} deal{group.deals.length !== 1 ? "s" : ""}
                                          &emsp;Purchased: ₹{groupBuying.toLocaleString("en-IN")}
                                          &emsp;Sold: ₹{groupRevenue.toLocaleString("en-IN")}
                                          {showProfit && (
                                            <span className={groupNetProfit >= 0 ? " text-green-700" : " text-red-600"}>
                                              &emsp;Net P/L: {groupNetProfit >= 0 ? "+" : ""}₹{Math.abs(groupNetProfit).toLocaleString("en-IN")}
                                            </span>
                                          )}
                                        </span>
                                      </td>
                                    </tr>
                                  )}

                                  {group.isDirect && gIdx > 0 && (
                                    <tr><td colSpan={99} className="border-t border-gray-200 h-px p-0" /></tr>
                                  )}

                                  {group.deals.map((deal, dIdx) => {
                                    const sellAmt = deal.sellingPrice || deal.effectiveSellingPrice || 0;
                                    const gross   = deal.grossProfit;
                                    const net     = deal.netProfit;
                                    return (
                                      <tr key={deal._id} className={`${style.bg} border-l-4 ${style.border} hover:brightness-95 transition-all`}>
                                        <td className="border-b border-gray-200 px-3 py-2 text-gray-400">
                                          {group.isDirect ? gIdx + 1 : `${gIdx + 1}.${dIdx + 1}`}
                                        </td>
                                        <td className="border-b border-gray-200 px-3 py-2 font-medium text-gray-800">{deal.product}</td>
                                        <td className="border-b border-gray-200 px-3 py-2 text-gray-600">{deal.purchasedFrom}</td>
                                        {showAccount    && <td className="border-b border-gray-200 px-3 py-2 text-gray-500">{deal.purchaseAccount || "—"}</td>}
                                        {showCreditCard && <td className="border-b border-gray-200 px-3 py-2 text-gray-500">{deal.creditCard || "—"}</td>}
                                        <td className="border-b border-gray-200 px-3 py-2 text-right font-semibold">₹{(deal.buyingPrice || 0).toLocaleString("en-IN")}</td>
                                        {showCashback   && <td className="border-b border-gray-200 px-3 py-2 text-right text-emerald-600">{deal.cashback ? `₹${deal.cashback.toLocaleString("en-IN")}` : "—"}</td>}
                                        {showCharges    && <td className="border-b border-gray-200 px-3 py-2 text-right text-rose-500">{deal.charges ? `₹${deal.charges.toLocaleString("en-IN")}` : "—"}</td>}
                                        {showCommission && <td className="border-b border-gray-200 px-3 py-2 text-right text-amber-600">{deal.commissionAmount ? `₹${deal.commissionAmount.toLocaleString("en-IN")}${deal.commissionTo ? ` (${deal.commissionTo})` : ""}` : "—"}</td>}
                                        <td className="border-b border-gray-200 px-3 py-2 text-right font-semibold">{sellAmt ? `₹${sellAmt.toLocaleString("en-IN")}` : <span className="text-gray-300">—</span>}</td>
                                        {showProfit && <>
                                          <td className={`border-b border-gray-200 px-3 py-2 text-right font-medium ${gross === null ? "text-gray-300" : gross >= 0 ? "text-green-700" : "text-red-600"}`}>
                                            {gross === null ? "—" : `${gross >= 0 ? "+" : ""}₹${Math.abs(gross).toLocaleString("en-IN")}`}
                                          </td>
                                          <td className={`border-b border-gray-200 px-3 py-2 text-right font-medium ${net === null ? "text-gray-300" : net >= 0 ? "text-green-700" : "text-red-600"}`}>
                                            {net === null ? "—" : `${net >= 0 ? "+" : ""}₹${Math.abs(net).toLocaleString("en-IN")}`}
                                          </td>
                                        </>}
                                        {showStatus && <td className={`border-b border-gray-200 px-3 py-2 ${statusCls(deal.dealStatus)}`}>{statusLabel(deal.dealStatus)}</td>}
                                      </tr>
                                    );
                                  })}

                                  {/* Buyer subtotal */}
                                  {!group.isDirect && group.deals.length > 1 && (
                                    <tr className={`${style.header} text-xs font-semibold`}>
                                      <td
                                        colSpan={1 + 1 + 1 + (showAccount ? 1 : 0) + (showCreditCard ? 1 : 0)}
                                        className={`px-3 py-1 ${style.label} text-right`}
                                      >
                                        Subtotal
                                      </td>
                                      <td className={`px-3 py-1 text-right ${style.label}`}>₹{groupBuying.toLocaleString("en-IN")}</td>
                                      {showCashback   && <td className="px-3 py-1" />}
                                      {showCharges    && <td className="px-3 py-1" />}
                                      {showCommission && <td className="px-3 py-1" />}
                                      <td className={`px-3 py-1 text-right ${style.label}`}>₹{groupRevenue.toLocaleString("en-IN")}</td>
                                      {showProfit && <>
                                        <td className="px-3 py-1" />
                                        <td className={`px-3 py-1 text-right font-bold ${groupNetProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                                          {groupNetProfit >= 0 ? "+" : ""}₹{Math.abs(groupNetProfit).toLocaleString("en-IN")}
                                        </td>
                                      </>}
                                      {showStatus && <td className="px-3 py-1" />}
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
                                colSpan={1 + 1 + 1 + (showAccount ? 1 : 0) + (showCreditCard ? 1 : 0)}
                                className="px-3 py-2 text-right text-gray-300"
                              >
                                Day Total — {daySales.length} deal{daySales.length !== 1 ? "s" : ""}
                              </td>
                              <td className="px-3 py-2 text-right">₹{dayBuying.toLocaleString("en-IN")}</td>
                              {showCashback   && <td className="px-3 py-2 text-right text-gray-400">—</td>}
                              {showCharges    && <td className="px-3 py-2 text-right text-gray-400">—</td>}
                              {showCommission && <td className="px-3 py-2 text-right text-gray-400">—</td>}
                              <td className="px-3 py-2 text-right">₹{dayRevenue.toLocaleString("en-IN")}</td>
                              {showProfit && <>
                                <td className={`px-3 py-2 text-right ${dayGross >= 0 ? "text-green-300" : "text-red-300"}`}>
                                  {dayGross >= 0 ? "+" : ""}₹{Math.abs(dayGross).toLocaleString("en-IN")}
                                </td>
                                <td className={`px-3 py-2 text-right ${dayNet >= 0 ? "text-green-300" : "text-red-300"}`}>
                                  {dayNet >= 0 ? "+" : ""}₹{Math.abs(dayNet).toLocaleString("en-IN")}
                                </td>
                              </>}
                              {showStatus && <td className="px-3 py-2" />}
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* Grand total */}
                <div className="bg-gray-900 text-white rounded-lg p-4 text-sm font-semibold flex flex-wrap gap-6 justify-between items-center mt-2">
                  <span className="text-gray-300">
                    Grand Total — {deals.length} deal{deals.length !== 1 ? "s" : ""}
                    &nbsp;|&nbsp;{sortedDates.length} day{sortedDates.length !== 1 ? "s" : ""}
                  </span>
                  <span className="flex flex-wrap gap-6">
                    <span>Total Purchased: ₹{totalBuying.toLocaleString("en-IN")}</span>
                    <span>Total Sales: ₹{totalSelling.toLocaleString("en-IN")}</span>
                    {showProfit && <>
                      <span className={totalGrossProfit >= 0 ? "text-green-300" : "text-red-300"}>
                        Gross: {totalGrossProfit >= 0 ? "+" : ""}₹{Math.abs(totalGrossProfit).toLocaleString("en-IN")}
                      </span>
                      <span className={totalNetProfit >= 0 ? "text-green-300" : "text-red-300"}>
                        Net: {totalNetProfit >= 0 ? "+" : ""}₹{Math.abs(totalNetProfit).toLocaleString("en-IN")}
                      </span>
                      {totalCashback > 0 && <span className="text-gray-400">Cashback: ₹{totalCashback.toLocaleString("en-IN")}</span>}
                      {totalCommission > 0 && <span className="text-gray-400">Commission: ₹{totalCommission.toLocaleString("en-IN")}</span>}
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

// ── Summary card ──────────────────────────────────────────────────────────────
const colorMap = {
  blue:    "bg-blue-50 border-blue-200 text-blue-600 text-blue-800",
  green:   "bg-green-50 border-green-200 text-green-600 text-green-800",
  amber:   "bg-amber-50 border-amber-200 text-amber-600 text-amber-800",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-600 text-emerald-800",
  red:     "bg-red-50 border-red-200 text-red-600 text-red-800",
  teal:    "bg-teal-50 border-teal-200 text-teal-600 text-teal-800",
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

export default PhoneSalesReport;