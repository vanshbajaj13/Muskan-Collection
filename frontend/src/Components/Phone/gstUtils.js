// ─────────────────────────────────────────────────────────────────────────────
// GST maths for Phone deals — single source of truth used by the dashboard,
// the deal form's suggestion and the deal cards.
//
//   Actual GST paid = deal.gstCharge  (the amount saved on the deal)
//   Ideal GST       = see GST_METHOD below, applied to the REAL margin
//                     (real selling price − buying price)
//   Difference      = Ideal − Actual   (> 0 means less GST than ideal)
//
// GST_METHOD:
//   "itc"    → margin × 18/118   (DEFAULT)
//              Regular GST on NEW goods bought with a GST invoice and sold
//              with a GST invoice. Both prices include 18% GST, and you claim
//              the purchase GST as ITC, so:
//                 output  = SP × 18/118
//                 ITC     = PP × 18/118
//                 net GST = (SP − PP) × 18/118
//   "margin" → margin × 18%
//              Rule 32(5) margin scheme. Only for SECOND-HAND goods where NO
//              ITC was claimed on the purchase.
//
// Only sold GST deals take part: GST only arises once the phone is sold.
// Ideal is floored at 0 (a deal sold at a loss has no GST to pay).
// ─────────────────────────────────────────────────────────────────────────────

export const GST_RATE = 0.18;
export const GST_METHOD = "itc"; // "itc" | "margin"

// GST on a margin (sell − buy), rounded to the rupee, never negative.
export const gstOnMargin = (margin) => {
  const m = Math.max(0, Number(margin) || 0);
  const factor = GST_METHOD === "margin" ? GST_RATE : GST_RATE / (1 + GST_RATE);
  return Math.round(m * factor);
};

// Short label for the active method, for UI text.
export const GST_METHOD_LABEL =
  GST_METHOD === "margin" ? "18% of margin" : "18/118 of margin";

export const isSoldGstDeal = (d) => !!d && !!d.withGST && Number(d.sellingPrice) > 0;

// Real margin on the deal (can be negative if sold at a loss)
export const realMargin = (d) =>
  isSoldGstDeal(d) ? Number(d.sellingPrice) - (Number(d.buyingPrice) || 0) : 0;

export const idealGst = (d) =>
  isSoldGstDeal(d) ? gstOnMargin(realMargin(d)) : 0;

export const actualGst = (d) =>
  isSoldGstDeal(d) ? Number(d.gstCharge) || 0 : 0;

export const summarizeGst = (deals = []) => {
  const gstDeals = deals.filter((d) => d.withGST);
  const sold = gstDeals.filter(isSoldGstDeal);

  const rows = sold
    .map((d) => {
      const margin = realMargin(d);
      const ideal = idealGst(d);
      const actual = actualGst(d);
      return {
        id: d._id,
        product: d.product,
        soldTo: d.soldTo,
        buyingPrice: Number(d.buyingPrice) || 0,
        sellingPrice: Number(d.sellingPrice) || 0,
        margin,
        ideal,
        actual,
        gap: ideal - actual,
      };
    })
    .sort((a, b) => b.gap - a.gap);

  const sum = (key) => rows.reduce((s, r) => s + r[key], 0);
  const taxableMargin = rows.reduce((s, r) => s + Math.max(0, r.margin), 0);
  const actualPaid = sum("actual");
  const ideal = sum("ideal");

  return {
    gstDealCount: gstDeals.length,
    soldCount: sold.length,
    taxableMargin,
    actualPaid,
    ideal,
    gap: ideal - actualPaid,
    effectiveRate: taxableMargin > 0 ? (actualPaid / taxableMargin) * 100 : null,
    // sold GST deals where nothing was recorded as GST paid (worth a look)
    noGstRecordedCount: rows.filter((r) => r.actual === 0 && r.ideal > 0).length,
    // filing status
    r1Pending: gstDeals.filter((d) => !d.r1Filed).length,
    r1Filed: gstDeals.filter((d) => d.r1Filed).length,
    r3bPending: sold.filter((d) => !d.r2Filed).length, // r2Filed = R3B (legacy field name)
    r3bFiled: sold.filter((d) => d.r2Filed).length,
    rows,
  };
};
