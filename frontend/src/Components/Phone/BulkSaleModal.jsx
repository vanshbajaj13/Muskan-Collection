import React, { useEffect, useMemo, useState } from "react";
import { usePhone } from "./PhoneContext";
import {
  Modal,
  Btn,
  Spinner,
  ConfirmModal,
  Field,
  Input,
  ComboBox,
} from "./PhoneUI";
import { gstOnMargin } from "./gstUtils";

// ─────────────────────────────────────────────────────────────────────────────
// Bulk sale details.
//
// When several phones go out on ONE bill, pick them all here and fill
//   Sold To · Sale Date · Selling Bill URL
// once. Selling price is handled per deal:
//   • type a price in "Same price for all" and hit Apply, or
//   • type a different price on each row (price is PER UNIT; the saved
//     selling price is unit price × quantity), or
//   • leave a row blank to keep that deal's current selling price.
//
// Quantity: if a deal has quantity 4 and only 2 went out on this bill, set
// "Qty sold" to 2. The deal is SPLIT: the original becomes the sold part
// (qty 2) and a new unsold deal is created for the remaining 2. Buying price,
// cashback, charges and commission are split in proportion to quantity.
// Splitting is only allowed for unsold deals with no payments yet; Qty sold
// can never exceed the quantity bought.
//
// Any common field left blank is left unchanged on the deals.
// Nothing new is needed on the backend — each deal is saved with the normal
// PATCH /deals/:id (so audit logging keeps working).
// ─────────────────────────────────────────────────────────────────────────────

const round2 = (n) => Math.round(n * 100) / 100;

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const BulkSaleModal = ({ onClose, onDone }) => {
  const {
    getDeals,
    updateDeal,
    createDeal,
    deleteDeal,
    opts,
    addDropdown,
    formatCurrency,
    formatDate,
    tsFromDate,
  } = usePhone();

  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const [showSold, setShowSold] = useState(false); // include already-sold deals
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());

  // Common sale details
  const [soldTo, setSoldTo] = useState("");
  const [saleDate, setSaleDate] = useState(todayISO());
  const [billUrl, setBillUrl] = useState("");

  // Price per unit, keyed by deal id (string while typing)
  const [prices, setPrices] = useState({});
  // Quantity sold per deal id (raw string while typing); default = full quantity
  const [soldQtys, setSoldQtys] = useState({});
  const [sameUnitPrice, setSameUnitPrice] = useState("");

  const load = async () => {
    try {
      const data = await getDeals({});
      setDeals(data?.deals || []);
    } catch (e) {
      setError(e.message || "Failed to load deals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deals
      .filter((d) => (showSold ? true : !d.sellingPrice))
      .filter(
        (d) =>
          !q ||
          (d.product || "").toLowerCase().includes(q) ||
          (d.imeiNumber || "").toLowerCase().includes(q) ||
          (d.purchasedFrom || "").toLowerCase().includes(q) ||
          (d.soldTo || "").toLowerCase().includes(q),
      )
      .sort((a, b) => (b.purchaseDate || 0) - (a.purchaseDate || 0));
  }, [deals, showSold, search]);

  const chosen = useMemo(
    () => deals.filter((d) => selected.has(d._id)),
    [deals, selected],
  );

  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const allShownTicked =
    shown.length > 0 && shown.every((d) => selected.has(d._id));

  const toggleAllShown = () =>
    setSelected((s) => {
      const n = new Set(s);
      if (allShownTicked) shown.forEach((d) => n.delete(d._id));
      else shown.forEach((d) => n.add(d._id));
      return n;
    });

  const qtyOf = (d) => Math.max(1, Number(d.quantity) || 1);

  // Partial quantity can only be sold from a deal that is still unsold and has no payments
  const canSplit = (d) =>
    qtyOf(d) > 1 && !d.sellingPrice && !(d.payments || []).length;

  // Units going out on this bill (1..quantity bought)
  const sellQtyOf = (d) => {
    if (!canSplit(d)) return qtyOf(d);
    const n = parseInt(soldQtys[d._id], 10);
    if (Number.isNaN(n)) return qtyOf(d);
    return Math.min(qtyOf(d), Math.max(1, n));
  };

  // Total selling price for the units sold (null = untouched)
  const totalFor = (d) => {
    const unit = parseFloat(prices[d._id]);
    return Number.isNaN(unit) ? null : round2(unit * sellQtyOf(d));
  };

  const applySame = () => {
    if (sameUnitPrice === "") return;
    setPrices((p) => {
      const n = { ...p };
      chosen.forEach((d) => {
        n[d._id] = sameUnitPrice;
      });
      return n;
    });
  };

  const billTotal = chosen.reduce((s, d) => {
    const t = totalFor(d);
    return s + (t !== null ? t : Number(d.sellingPrice) || 0);
  }, 0);

  const splitCount = chosen.filter((d) => sellQtyOf(d) < qtyOf(d)).length;

  const hasSomethingToApply =
    soldTo.trim() !== "" ||
    saleDate !== "" ||
    billUrl.trim() !== "" ||
    chosen.some((d) => totalFor(d) !== null);

  const buildPayload = (d) => {
    const p = {};
    if (soldTo.trim()) p.soldTo = soldTo.trim();
    if (saleDate) p.saleDate = tsFromDate(saleDate);
    // Selling bill only applies to GST deals (same rule as the deal form)
    if (billUrl.trim() && d.withGST) p.sellingBillUrl = billUrl.trim();
    const total = totalFor(d);
    // Cost of the units actually sold (proportional when splitting)
    const q = qtyOf(d);
    const sq = sellQtyOf(d);
    const part = (v) => (sq < q ? round2(((Number(v) || 0) * sq) / q) : Number(v) || 0);
    const soldBuying = part(d.buyingPrice);
    if (total !== null) {
      p.sellingPrice = total;
      // Same behaviour as the deal form: suggest GST for a GST deal that has
      // no GST charge saved yet. A GST charge already saved is never touched.
      if (d.withGST && !(Number(d.gstCharge) > 0)) {
        p.gstCharge = gstOnMargin(total - soldBuying);
      }
    }
    return p;
  };

  // Fields copied to the leftover (still unsold) deal when a deal is split
  const COPY_FIELDS = [
    "purchaseDate", "product", "purchasedFrom", "purchaseAccount", "creditCard",
    "cashbackExpected", "cashbackDate", "chargesDescription", "withGST",
    "itemReceivedDate", "purchaseBillUrl", "r1Filed", "r1FiledDate",
    "commissionTo", "notes",
  ];

  // Splits d into a sold part (updated in place) and a new unsold remainder.
  const saveSplit = async (d, payload) => {
    const q = qtyOf(d);
    const sq = sellQtyOf(d);
    const part = (v) => round2(((Number(v) || 0) * sq) / q);
    const sold = {
      quantity: sq,
      buyingPrice: part(d.buyingPrice),
      cashback: part(d.cashback),
      charges: part(d.charges),
      commissionAmount: part(d.commissionAmount),
    };
    const rest = {
      quantity: q - sq,
      buyingPrice: round2((Number(d.buyingPrice) || 0) - sold.buyingPrice),
      cashback: round2((Number(d.cashback) || 0) - sold.cashback),
      charges: round2((Number(d.charges) || 0) - sold.charges),
      commissionAmount: round2(
        (Number(d.commissionAmount) || 0) - sold.commissionAmount,
      ),
      gstCharge: 0,
      sellingPrice: null,
      imeiNumber: "", // original IMEI(s) stay on the sold part
    };
    COPY_FIELDS.forEach((k) => {
      rest[k] = d[k];
    });
    // Create the remainder first; if updating the sold part then fails, remove it again
    const created = await createDeal(rest);
    try {
      await updateDeal(d._id, { ...sold, ...payload });
    } catch (e) {
      if (created?._id) {
        try {
          await deleteDeal(created._id);
        } catch (_) {
          /* leave it; user can delete manually */
        }
      }
      throw e;
    }
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    let ok = 0;
    const failed = [];
    for (const d of chosen) {
      const payload = buildPayload(d);
      if (!Object.keys(payload).length) continue;
      try {
        if (sellQtyOf(d) < qtyOf(d)) await saveSplit(d, payload);
        else await updateDeal(d._id, payload);
        ok += 1;
      } catch (e) {
        failed.push(`${d.product} (${e.message || "failed"})`);
      }
    }
    setSaving(false);
    setConfirming(false);
    if (ok > 0) onDone?.(`${ok} deal${ok !== 1 ? "s" : ""} updated`);
    if (failed.length) {
      setError(`Updated ${ok}, failed ${failed.length}: ${failed.join("; ")}`);
      setSelected(new Set());
      await load();
    } else {
      onClose();
    }
  };

  return (
    <Modal title="Bulk Sale Details" onClose={onClose} wide>
      {confirming && (
        <ConfirmModal
          title={`Update ${chosen.length} deal${chosen.length !== 1 ? "s" : ""}?`}
          body={`Sold to ${soldTo.trim() || "(unchanged)"} · bill total ${formatCurrency(billTotal)}.${
            splitCount
              ? ` ${splitCount} deal${splitCount !== 1 ? "s" : ""} will be split, leftover units stay unsold.`
              : ""
          } Type CONFIRM to proceed.`}
          confirmTextRequired={true}
          onConfirm={submit}
          onCancel={() => setConfirming(false)}
          loading={saving}
        />
      )}

      <div className="space-y-5">
        {/* 1 ── Common details */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3 pb-1 border-b border-slate-100">
            1 · Common bill details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Sold To">
              <ComboBox
                value={soldTo}
                onChange={setSoldTo}
                options={opts("soldTo")}
                onAddNew={async (v) => {
                  setSoldTo(v);
                  await addDropdown("soldTo", v);
                }}
                placeholder="Type or select…"
              />
            </Field>
            <Field label="Sale Date">
              <Input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </Field>
            <Field
              label="Selling Bill URL"
              hint="Applied to GST deals only"
            >
              <Input
                type="url"
                placeholder="https://drive.google.com/…"
                value={billUrl}
                onChange={(e) => setBillUrl(e.target.value)}
              />
            </Field>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Anything left blank is left unchanged on the selected deals.
          </p>
        </section>

        {/* 2 ── Pick deals */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3 pb-1 border-b border-slate-100">
            2 · Pick the deals on this bill
          </h3>

          <div className="flex flex-wrap items-center gap-3 mb-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, IMEI, seller…"
              className="flex-1 min-w-[180px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 accent-indigo-600"
                checked={showSold}
                onChange={(e) => setShowSold(e.target.checked)}
              />
              Include already-sold deals
            </label>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-indigo-600"
                  checked={allShownTicked}
                  disabled={!shown.length}
                  onChange={toggleAllShown}
                />
                Select all shown
              </label>
              <span className="text-xs text-slate-400">
                {chosen.length} selected
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : shown.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  {showSold ? "No deals found" : "No unsold deals 🎉"}
                </p>
              ) : (
                shown.map((d) => (
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
                        {qtyOf(d) > 1 && (
                          <span className="ml-1.5 text-xs font-semibold text-indigo-600">
                            ×{qtyOf(d)}
                          </span>
                        )}
                        {d.withGST && (
                          <span className="ml-1.5 text-[10px] font-semibold text-indigo-500 bg-indigo-50 border border-indigo-100 px-1 rounded">
                            GST
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        Bought {formatDate(d.purchaseDate)}
                        {d.purchasedFrom ? ` · ${d.purchasedFrom}` : ""}
                        {d.imeiNumber ? ` · ${d.imeiNumber}` : ""}
                        {d.soldTo ? ` · sold to ${d.soldTo}` : ""}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 shrink-0">
                      {formatCurrency(d.buyingPrice)}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 3 ── Selling price */}
        {chosen.length > 0 && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3 pb-1 border-b border-slate-100">
              3 · Selling price
            </h3>

            <div className="flex flex-wrap items-end gap-2 mb-3">
              <div className="w-44">
                <Field label="Same price for all (₹ per unit)">
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 78000"
                    value={sameUnitPrice}
                    onChange={(e) => setSameUnitPrice(e.target.value)}
                    onWheel={(e) => e.target.blur()}
                  />
                </Field>
              </div>
              <Btn
                type="button"
                variant="secondary"
                onClick={applySame}
                disabled={sameUnitPrice === ""}
              >
                Apply to all
              </Btn>
              <p className="text-xs text-slate-400 pb-2">
                Then tweak any row that sold for a different price.
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {chosen.map((d) => {
                const total = totalFor(d);
                const soldCost =
                  ((Number(d.buyingPrice) || 0) * sellQtyOf(d)) / qtyOf(d);
                const margin = total !== null ? total - soldCost : null;
                return (
                  <div
                    key={d._id}
                    className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {d.product}
                        {qtyOf(d) > 1 && (
                          <span className="ml-1.5 text-xs font-semibold text-indigo-600">
                            ×{qtyOf(d)}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        Bought for {formatCurrency(d.buyingPrice)}
                        {sellQtyOf(d) < qtyOf(d)
                          ? ` · ${qtyOf(d) - sellQtyOf(d)} stay unsold`
                          : ""}
                        {d.sellingPrice
                          ? ` · current price ${formatCurrency(d.sellingPrice)}`
                          : ""}
                      </p>
                    </div>
                    {qtyOf(d) > 1 && (
                      <div className="w-24">
                        {canSplit(d) ? (
                          <>
                            <Input
                              type="number"
                              min="1"
                              max={qtyOf(d)}
                              step="1"
                              value={soldQtys[d._id] ?? qtyOf(d)}
                              onChange={(e) =>
                                setSoldQtys((s) => ({
                                  ...s,
                                  [d._id]: e.target.value,
                                }))
                              }
                              onBlur={() =>
                                setSoldQtys((s) => ({
                                  ...s,
                                  [d._id]: String(sellQtyOf(d)),
                                }))
                              }
                              onWheel={(e) => e.target.blur()}
                            />
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              sold of {qtyOf(d)}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-slate-400 text-center">
                            all {qtyOf(d)}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="w-36">
                      <Input
                        type="number"
                        min="0"
                        placeholder={
                          qtyOf(d) > 1 ? "per unit ₹" : "keep current"
                        }
                        value={prices[d._id] ?? ""}
                        onChange={(e) =>
                          setPrices((p) => ({ ...p, [d._id]: e.target.value }))
                        }
                        onWheel={(e) => e.target.blur()}
                      />
                    </div>
                    <div className="w-28 text-right">
                      {total !== null ? (
                        <>
                          <p className="text-sm font-semibold text-slate-800">
                            {formatCurrency(total)}
                          </p>
                          <p
                            className={`text-xs ${margin >= 0 ? "text-emerald-600" : "text-rose-500"}`}
                          >
                            {margin >= 0 ? "+" : "−"}
                            {formatCurrency(Math.abs(margin))}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50">
                <span className="text-xs font-semibold text-slate-600">
                  Bill total ({chosen.length} deal
                  {chosen.length !== 1 ? "s" : ""})
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {formatCurrency(billTotal)}
                </span>
              </div>
            </div>
          </section>
        )}

        {error && <p className="text-sm text-rose-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Btn variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            onClick={() => {
              setError(null);
              setConfirming(true);
            }}
            disabled={saving || chosen.length === 0 || !hasSomethingToApply}
          >
            {saving
              ? "Saving…"
              : `Update ${chosen.length} deal${chosen.length !== 1 ? "s" : ""}`}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

export default BulkSaleModal;