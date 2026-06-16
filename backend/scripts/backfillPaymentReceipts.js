/**
 * backfillPaymentReceipts.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Place this file in  backend/scripts/  (same folder as insertPhoneDeals.js)
 * and run:
 *
 *   node backfillPaymentReceipts.js          (dry run — logs only, writes nothing)
 *   node backfillPaymentReceipts.js --apply  (actually creates receipts & links them)
 *
 * ── What it does ──────────────────────────────────────────────────────────────
 * Finds every PhoneDeal.payments[] entry that has no receiptId (i.e. it predates
 * the PhonePayment unification — like the ones inserted by insertPhoneDeals.js).
 * For each one it:
 *   1. Creates a PhonePayment document with a single allocation pointing back
 *      at that deal (amount, product, soldTo snapshot).
 *   2. Writes an auto-generated note onto the receipt, in the same style the
 *      live /api/phones/payments route uses for single-deal receipts:
 *        "Received ₹X for <product> (<soldTo>)"  [+ ". Note: <original note>"]
 *   3. Sets deal.payments[i].receiptId to the new receipt's _id.
 *      The original payment.note is left untouched — for a single-deal
 *      allocation that's already the correct per-deal note (matches what
 *      buildDealPaymentNote() would produce for non-split payments).
 *
 * Already-linked payments (receiptId set) are skipped — safe to re-run.
 *
 * ── Safety ────────────────────────────────────────────────────────────────────
 * Defaults to DRY RUN (no writes). Pass --apply to actually persist changes.
 * Each deal's updates are wrapped in a session/transaction so a failure on one
 * payment within a deal doesn't leave that deal half-migrated.
 */

const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path");

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

const { PhoneDeal } = require("../Models/phone/phoneDeal");
const { PhonePayment } = require("../Models/phone/phonePayment");

const APPLY = process.argv.includes("--apply");

// ── note builder — mirrors buildReceiptNote() in routes/phone/phonePayments.js
// for the single-allocation case, so backfilled receipts read identically to
// ones created via the live endpoint. ─────────────────────────────────────────
function buildReceiptNote(amount, allocation, userNote) {
  const breakup = `${allocation.product || "Deal"}${
    allocation.soldTo ? ` (${allocation.soldTo})` : ""
  }: ₹${amount.toLocaleString("en-IN")}`;
  const auto = `Received ₹${amount.toLocaleString("en-IN")} for ${breakup}`;
  return userNote ? `${auto}. Note: ${userNote}` : auto;
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌  MONGO_URI not found in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅  Connected to MongoDB");
  console.log(APPLY ? "⚠️  Running in APPLY mode — changes WILL be written." : "ℹ️  Running in DRY RUN mode — no changes will be written. Pass --apply to persist.");

  // Only deals that actually have at least one un-linked payment
  const deals = await PhoneDeal.find({
    "payments.0": { $exists: true },
    "payments.receiptId": null,
  });

  console.log(`🔎  Found ${deals.length} deal(s) with at least one un-linked payment.`);

  let dealsTouched = 0;
  let receiptsCreated = 0;
  let paymentsSkipped = 0;
  let errors = 0;

  for (const deal of deals) {
    const session = await mongoose.startSession();
    let dealChanged = false;

    try {
      await session.withTransaction(async () => {
        for (const payment of deal.payments) {
          if (payment.receiptId) {
            paymentsSkipped++;
            continue;
          }

          const allocation = {
            dealId: deal._id,
            amount: payment.amount,
            product: deal.product,
            soldTo: deal.soldTo,
          };

          const receiptNote = buildReceiptNote(payment.amount, allocation, payment.note);

          console.log(
            `  [${deal.product}] → ₹${payment.amount.toLocaleString("en-IN")} on ` +
            `${new Date(payment.date).toLocaleDateString("en-IN")}` +
            (payment.note ? ` (note: "${payment.note}")` : "")
          );

          if (APPLY) {
            const receipt = new PhonePayment({
              amount: payment.amount,
              date: payment.date,
              note: receiptNote,
              method: "",
              allocations: [allocation],
            });
            await receipt.save({ session });

            payment.receiptId = receipt._id;
            dealChanged = true;
            receiptsCreated++;
          } else {
            // Dry run — count what *would* be created without writing
            receiptsCreated++;
          }
        }

        if (APPLY && dealChanged) {
          await deal.save({ session });
        }
      });

      if (dealChanged || !APPLY) dealsTouched++;
    } catch (err) {
      errors++;
      console.error(`❌  Failed to migrate deal ${deal._id} (${deal.product}):`, err.message);
    } finally {
      session.endSession();
    }
  }

  console.log("\n── Summary ──────────────────────────────────────────────");
  console.log(`Deals touched:         ${dealsTouched}`);
  console.log(`Receipts created:      ${receiptsCreated}${APPLY ? "" : " (dry run — not written)"}`);
  console.log(`Payments already linked (skipped): ${paymentsSkipped}`);
  console.log(`Errors:                 ${errors}`);
  console.log(APPLY ? "✅  Done. Changes written." : "ℹ️  Dry run complete. Re-run with --apply to persist.");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌  Migration failed:", err.message);
  process.exit(1);
});