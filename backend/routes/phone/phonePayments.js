const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { PhonePayment } = require("../../Models/phone/phonePayment");
const { PhoneDeal } = require("../../Models/phone/phoneDeal");
const protect = require("../../middlewares/authMiddleWare");
const protectVansh = require("../../middlewares/phoneAuthMiddleware");

// ── Helper: build the auto note for a receipt ─────────────────────────────
function buildReceiptNote(amount, allocations, userNote) {
  const breakup = allocations
    .map((a) => `${a.product || "Deal"}${a.soldTo ? ` (${a.soldTo})` : ""}: ₹${a.amount.toLocaleString("en-IN")}`)
    .join(", ");
  const auto =
    allocations.length > 1
      ? `Received ₹${amount.toLocaleString("en-IN")} — split across ${allocations.length} deals: ${breakup}`
      : `Received ₹${amount.toLocaleString("en-IN")} for ${breakup}`;
  return userNote ? `${auto}. Note: ${userNote}` : auto;
}

// ── Helper: build the per-deal payment note for a receipt ─────────────────
function buildDealPaymentNote(receiptAmount, allocAmount, allocations, userNote) {
  if (allocations.length > 1) {
    const base = `Part of ₹${receiptAmount.toLocaleString("en-IN")} payment — ₹${allocAmount.toLocaleString("en-IN")} allocated to this deal`;
    return userNote ? `${base}. ${userNote}` : base;
  }
  return userNote || "";
}

// ── GET all receipts (with optional date range filter) ───────────────────
router.get("/", protect, protectVansh, async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = {};
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = parseInt(from);
      if (to) query.date.$lte = parseInt(to);
    }
    const receipts = await PhonePayment.find(query).sort({ date: -1 });
    res.json({ receipts, total: receipts.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET deals eligible for receiving payment ──────────────────────────────
// Returns deals that are sold (sellingPrice set) and not fully paid,
// plus optionally unsold deals if includeUnsold=true.
// Sorted by paymentPending descending.
router.get("/eligible-deals", protect, protectVansh, async (req, res) => {
  try {
    const { includeUnsold, search } = req.query;

    let query = {};
    if (includeUnsold === "true") {
      // all deals
    } else {
      query.sellingPrice = { $ne: null };
    }

    let deals = await PhoneDeal.find(query).sort({ purchaseDate: -1 });

    // Apply search filter on product/soldTo (case-insensitive)
    if (search) {
      const re = new RegExp(search, "i");
      deals = deals.filter((d) => re.test(d.product) || re.test(d.soldTo || ""));
    }

    // Filter to pending/unsold by default unless includeUnsold/all explicitly requested
    let filtered = deals;
    if (includeUnsold !== "true") {
      filtered = deals.filter((d) => d.dealStatus !== "complete");
    }

    // Sort by paymentPending descending (highest pending first)
    filtered = filtered.sort((a, b) => (b.paymentPending || 0) - (a.paymentPending || 0));

    const result = filtered.map((d) => ({
      _id: d._id,
      product: d.product,
      soldTo: d.soldTo,
      sellingPrice: d.sellingPrice,
      totalPaymentsReceived: d.totalPaymentsReceived,
      paymentPending: d.paymentPending,
      dealStatus: d.dealStatus,
      purchaseDate: d.purchaseDate,
      saleDate: d.saleDate,
    }));

    res.json({ deals: result, total: result.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── CREATE a receipt (with allocations) — the unified entry point ─────────
// Body: { amount, date, note, method, allocations: [{ dealId, amount }] }
// If allocations is omitted/empty and a single dealId+amount is given (legacy
// single-deal add-payment from DealForm/DealCard), wraps it as one allocation.
router.post("/", protect, protectVansh, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { amount, date, note, method, allocations, dealId } = req.body;

    if (!amount || !date) {
      return res.status(400).json({ error: "amount and date are required" });
    }

    // Normalize allocations: support legacy single-deal shorthand
    let allocs = allocations;
    if ((!allocs || allocs.length === 0) && dealId) {
      allocs = [{ dealId, amount: parseFloat(amount) }];
    }
    if (!allocs || allocs.length === 0) {
      return res.status(400).json({ error: "allocations are required" });
    }

    const totalAlloc = allocs.reduce((s, a) => s + Number(a.amount), 0);
    if (Math.abs(totalAlloc - Number(amount)) > 0.01) {
      return res.status(400).json({
        error: `Allocation total (₹${totalAlloc}) does not match received amount (₹${amount})`,
      });
    }

    let savedReceipt;

    await session.withTransaction(async () => {
      // Fetch deals for snapshot info
      const dealIds = allocs.map((a) => a.dealId);
      const deals = await PhoneDeal.find({ _id: { $in: dealIds } }).session(session);
      const dealMap = {};
      deals.forEach((d) => (dealMap[d._id.toString()] = d));

      const enrichedAllocs = allocs.map((a) => {
        const d = dealMap[a.dealId.toString()];
        return {
          dealId: a.dealId,
          amount: Number(a.amount),
          product: d ? d.product : "",
          soldTo: d ? d.soldTo : "",
        };
      });

      const receipt = new PhonePayment({
        amount: Number(amount),
        date: parseInt(date),
        note: buildReceiptNote(Number(amount), enrichedAllocs, note),
        method: method || "",
        allocations: enrichedAllocs,
      });
      await receipt.save({ session });

      // Push corresponding payment sub-docs into each deal
      for (const a of enrichedAllocs) {
        await PhoneDeal.findByIdAndUpdate(
          a.dealId,
          {
            $push: {
              payments: {
                amount: a.amount,
                date: parseInt(date),
                note: buildDealPaymentNote(Number(amount), a.amount, enrichedAllocs, note),
                receiptId: receipt._id,
              },
            },
          },
          { session }
        );
      }

      savedReceipt = receipt;
    });

    res.status(201).json(savedReceipt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  } finally {
    session.endSession();
  }
});

// ── PATCH /api/phones/payments/:id — edit & re-split a receipt ───────────
// 1. Remove all old allocated payment sub-docs from previously-touched deals
// 2. Apply the new allocations to the new (possibly different) set of deals
// 3. Update the receipt document
// All in one transaction — nothing is left half-applied on error.
router.patch("/:id", protect, protectVansh, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const existing = await PhonePayment.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Payment not found" });

    const { amount, date, note, method, allocations } = req.body;

    if (!amount || !date || !allocations || allocations.length === 0) {
      return res.status(400).json({ error: "amount, date, and allocations are required" });
    }

    const totalAlloc = allocations.reduce((s, a) => s + Number(a.amount), 0);
    if (Math.abs(totalAlloc - Number(amount)) > 0.01) {
      return res.status(400).json({
        error: `Allocation total (₹${totalAlloc}) does not match received amount (₹${amount})`,
      });
    }

    let savedReceipt;

    await session.withTransaction(async () => {
      // Step 1 — strip old payment sub-docs from previously allocated deals
      const oldDealIds = existing.allocations.map((a) => a.dealId);
      for (const dealId of oldDealIds) {
        await PhoneDeal.findByIdAndUpdate(
          dealId,
          { $pull: { payments: { receiptId: existing._id } } },
          { session }
        );
      }

      // Step 2 — fetch deal snapshots for new allocations
      const newDealIds = allocations.map((a) => a.dealId);
      const deals = await PhoneDeal.find({ _id: { $in: newDealIds } }).session(session);
      const dealMap = {};
      deals.forEach((d) => (dealMap[d._id.toString()] = d));

      const enrichedAllocs = allocations.map((a) => {
        const d = dealMap[a.dealId.toString()];
        return {
          dealId: a.dealId,
          amount: Number(a.amount),
          product: d ? d.product : "",
          soldTo: d ? d.soldTo : "",
        };
      });

      // Step 3 — update the receipt document in place
      existing.amount = Number(amount);
      existing.date = parseInt(date);
      existing.note = buildReceiptNote(Number(amount), enrichedAllocs, note);
      existing.method = method !== undefined ? method : existing.method;
      existing.allocations = enrichedAllocs;
      await existing.save({ session });

      // Step 4 — push new payment sub-docs into each newly-allocated deal
      for (const a of enrichedAllocs) {
        await PhoneDeal.findByIdAndUpdate(
          a.dealId,
          {
            $push: {
              payments: {
                amount: a.amount,
                date: parseInt(date),
                note: buildDealPaymentNote(Number(amount), a.amount, enrichedAllocs, note),
                receiptId: existing._id,
              },
            },
          },
          { session }
        );
      }

      savedReceipt = existing;
    });

    res.json(savedReceipt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  } finally {
    session.endSession();
  }
});

// ── DELETE a receipt — removes it and all its allocated payments from deals
router.delete("/:id", protect, protectVansh, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const receipt = await PhonePayment.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: "Payment not found" });

    await session.withTransaction(async () => {
      // Remove the linked payment sub-docs from each allocated deal
      for (const a of receipt.allocations) {
        await PhoneDeal.findByIdAndUpdate(
          a.dealId,
          { $pull: { payments: { receiptId: receipt._id } } },
          { session }
        );
      }
      await PhonePayment.findByIdAndDelete(req.params.id).session(session);
    });

    res.json({ message: "Payment deleted and removed from all deals" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    session.endSession();
  }
});

module.exports = router;