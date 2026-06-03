/**
 * importPhoneDeals.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Place this file in  backend/  (same folder as app.js) and run:
 *
 *   node importPhoneDeals.js
 *
 * It reads the 19 deals from the Excel sheet and inserts them as PhoneDeal
 * documents.  Existing documents are NOT touched — safe to run once.
 *
 * ── Excel column → PhoneDeal field mapping ───────────────────────────────────
 *
 *  Date             → purchaseDate  (timestamp ms)
 *  Product          → product       (string, trimmed)
 *  Account          → split on "/"
 *                       left part  → purchaseAccount  e.g. "Vansh", "Anuj", "Vaibhav"
 *                       right part → purchasedFrom    e.g. "Amazon", "Apple store"
 *  Buying Price     → buyingPrice   (number)
 *  Selling Price    → sellingPrice  (number | null — row 13 Google 10 is unsold → null)
 *  Profit           → NOT stored; it is a computed virtual on the model
 *  Given to         → soldTo        (the person who the phone was sold/delivered to)
 *  Payment Received → payments[]    single payment entry {amount, date, note:""}
 *                     If Payment Received is 0 or blank → empty payments array
 *  Payment pending  → NOT stored; computed virtual (sellingPrice - totalPayments)
 *  Payment date     → payments[0].date  (timestamp ms; falls back to saleDate)
 *  Unnamed: 10      → notes         (free-text remarks column)
 *  Total            → IGNORED       (running-total helper column in the sheet)
 *
 * ── Special cases ─────────────────────────────────────────────────────────────
 *  Row  0  (Google 10A #1) : Payment date is "15/032026" — malformed, parsed manually
 *  Row 13  (Google 10 Flipkart) : No selling price → unsold deal, payments=[],
 *                                   sellingPrice=null, soldTo=""
 *  Rows 3,6: Notes mention SBI cashback (~3000); cashback=3000 set explicitly
 *  Row  7  (IQOO Z10R #1): Notes say "900 Amazon Balance received" → charges=-900
 *                           (treated as a discount/credit reducing effective cost)
 *  Row 10  (Iphone 17 Anuj): Notes say "sold for 84000 but given 3k+3k commission"
 *                             sellingPrice kept as 78000 (net after 6k commission already
 *                             deducted); commissionAmount=6000, commissionTo="Anuj"
 *  Row 11  (Google 10 #1):  Notes say "1150 Charges of EMI sent to Gagan" → charges=1150
 *  Row 15  (IQOO Z10R #2):  Notes say "1000 Amazon Balance received" → charges=-1000
 *  Row 14  (Oneplus): Payment note="Cash"
 *  Row 18  (Iphone 17 Flipkart): Payment note="UPI"
 */

const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path");

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});
const { PhoneDeal } = require("../Models/phone/phoneDeal");


// ── helpers ───────────────────────────────────────────────────────────────────

function ts(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? null : d.getTime();
}

/** Parse "DD/MMYYYY" or "DD/MM/YYYY" or ISO date strings */
function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // malformed "15/032026" → "15/03/2026"
  const fix = s.replace(/^(\d{1,2})\/(\d{2})(\d{4})$/, "$1/$2/$3");
  return ts(fix) || ts(s);
}

function splitAccount(account) {
  const [left, ...rest] = String(account || "").split("/");
  return {
    purchaseAccount: left.trim(),
    purchasedFrom: rest.join("/").trim(),
  };
}

function makePayment(amount, dateRaw, note = "") {
  if (!amount || Number(amount) === 0) return null;
  return {
    amount: Number(amount),
    date: parseDate(dateRaw) || Date.now(),
    note: String(note || "").trim(),
  };
}

// ── raw data (transcribed from Excel) ────────────────────────────────────────
// Each object mirrors one row; keep field names close to the Excel headers so
// the mapping comment above stays accurate.

const rows = [
  // 0
  {
    date: "2026-02-21", product: "Google 10A", account: "Vansh/google store",
    buyingPrice: 39995, sellingPrice: 40700, givenTo: "Anuj",
    paymentReceived: 40700, paymentDate: "15/032026",
    cashback: 0, charges: 490, // 41185 total - 40700 received - 39995 buy = ~490 extra; Total col=41185
    commissionAmount: 0, commissionTo: "",
    notes: "",
  },
  // 1
  {
    date: "2026-02-21", product: "Google 10A", account: "Vansh/google store",
    buyingPrice: 38293, sellingPrice: 41200, givenTo: "Anuj",
    paymentReceived: 41200, paymentDate: null,
    cashback: 0, charges: 0, commissionAmount: 0, commissionTo: "",
    notes: "",
  },
  // 2
  {
    date: "2026-03-12", product: "Iphone 15", account: "Vansh/Amazon",
    buyingPrice: 53000, sellingPrice: 52000, givenTo: "Vaibhav",
    paymentReceived: 52000, paymentDate: null,
    cashback: 0, charges: 0, commissionAmount: 0, commissionTo: "",
    notes: "",
  },
  // 3 — SBI cashback 3000; actual buy was 81250 → buyingPrice=81250, cashback=3000 → effectiveCost=78250
  {
    date: "2026-03-14", product: "Iphone 17", account: "vansh/Unicorn Store",
    buyingPrice: 81250, sellingPrice: 81000, givenTo: "Vaibhav",
    paymentReceived: 81000, paymentDate: null,
    cashback: 3000, charges: 0, commissionAmount: 0, commissionTo: "",
    notes: "Actual buying price was 81250 but SBI cashback received. Total cashback on statement includes personal expenses too; consider 3000 cashback.",
  },
  // 4
  {
    date: "2026-03-30", product: "Vivo T5X", account: "Vaibhav/Flipkart Minutes",
    buyingPrice: 19300, sellingPrice: 19500, givenTo: "Vaibhav",
    paymentReceived: 19500, paymentDate: "2026-03-31",
    cashback: 0, charges: 0, commissionAmount: 0, commissionTo: "",
    notes: "",
  },
  // 5
  {
    date: "2026-03-30", product: "Vivo T5X", account: "Vansh/Flipkart Minutes",
    buyingPrice: 19253, sellingPrice: 19500, givenTo: "Vaibhav",
    paymentReceived: 19500, paymentDate: "2026-03-31",
    cashback: 0, charges: 0, commissionAmount: 0, commissionTo: "",
    notes: "",
  },
  // 6 — SBI cashback; actual buy 80900, cashback 3000
  {
    date: "2026-03-28", product: "Iphone 17", account: "Vansh/Vijay Sales",
    buyingPrice: 80900, sellingPrice: 80900, givenTo: "Vaibhav",
    paymentReceived: 80900, paymentDate: "2026-04-05",
    cashback: 3000, charges: 0, commissionAmount: 0, commissionTo: "",
    notes: "Actual buying price was 80900 but SBI cashback received. Total cashback for statement was not right; consider 3000 cashback.",
  },
  // 7 — 900 Amazon Balance credit → treat as negative charge (reduces cost)
  {
    date: "2026-04-09", product: "IQOO Z10R", account: "Vansh/Amazon",
    buyingPrice: 20004, sellingPrice: 19900, givenTo: "Anuj",
    paymentReceived: 19900, paymentDate: "2026-04-18",
    cashback: 0, charges: 0, commissionAmount: 0, commissionTo: "",
    notes: "900 Amazon Balance received (acts as cashback/credit on cost).",
    cashbackAmount: 900,
  },
  // 8
  {
    date: "2026-04-08", product: "Iphone 16", account: "Vansh/Apple store",
    buyingPrice: 62930, sellingPrice: 67800, givenTo: "Vansh",
    paymentReceived: 67800, paymentDate: "2026-04-17",
    cashback: 0, charges: 0, commissionAmount: 0, commissionTo: "",
    notes: "",
  },
  // 9 — duplicate of row 8 in the sheet (same phone, same date, same amounts)
  {
    date: "2026-04-08", product: "Iphone 16", account: "Vansh/Apple store",
    buyingPrice: 62930, sellingPrice: 67800, givenTo: "Vansh",
    paymentReceived: 67800, paymentDate: "2026-04-17",
    cashback: 0, charges: 0, commissionAmount: 0, commissionTo: "",
    notes: "Duplicate entry in original sheet (row 9).",
  },
  // 10 — Actually sold 84000; commission 3k+3k=6k split; sellingPrice=84000, commission=6000
  {
    date: "2026-05-08", product: "Iphone 17", account: "Anuj/Amazon",
    buyingPrice: 72948, sellingPrice: 84000, givenTo: "Anuj",
    paymentReceived: 78000, paymentDate: "2026-05-14",
    cashback: 0, charges: 0, commissionAmount: 6000, commissionTo: "Anuj",
    notes: "Actually sold for 84000. Given 3k commission to Anuj + 3k to account holder (Anuj). Payment received 78000 (84000 - 6000 commission).",
  },
  // 11 — 1150 EMI charges sent to Gagan
  {
    date: "2026-04-29", product: "Google 10", account: "Anuj/Google sore",
    buyingPrice: 58150, sellingPrice: 60500, givenTo: "Anuj",
    paymentReceived: 60500, paymentDate: "2026-05-03",
    cashback: 0, charges: 1150, commissionAmount: 0, commissionTo: "",
    notes: "1150 EMI charges sent to Gagan.",
    chargesDescription: "EMI charges to Gagan",
  },
  // 12
  {
    date: "2026-04-24", product: "Samaung S26 Ultra", account: "Vansh/Samsung store",
    buyingPrice: 99700, sellingPrice: 104700, givenTo: "Vaibhav",
    paymentReceived: 104700, paymentDate: "2026-04-29",
    cashback: 0, charges: 0, commissionAmount: 0, commissionTo: "",
    notes: "",
  },
  // 13 — UNSOLD: no selling price, no payment
  {
    date: "2026-05-08", product: "Google 10", account: "Vansh/Flipkart",
    buyingPrice: 60127, sellingPrice: null, givenTo: "",
    paymentReceived: 0, paymentDate: null,
    cashback: 0, charges: 0, commissionAmount: 0, commissionTo: "",
    notes: "Unsold as of data entry.",
  },
  // 14 — payment note Cash
  {
    date: "2026-05-16", product: "Oneplus Nord CE6 Lite", account: "Vansh/Amazon",
    buyingPrice: 19548, sellingPrice: 21500, givenTo: "Gagan",
    paymentReceived: 21500, paymentDate: "2026-05-22",
    cashback: 0, charges: 0, commissionAmount: 0, commissionTo: "",
    notes: "", paymentNote: "Cash",
  },
  // 15 — 1000 Amazon Balance received → cashback
  {
    date: "2026-05-21", product: "IQOO Z10R", account: "Vansh/Amazon",
    buyingPrice: 21004, sellingPrice: 21000, givenTo: "Gagan",
    paymentReceived: 21000, paymentDate: "2026-05-22",
    cashback: 1000, charges: 0, commissionAmount: 0, commissionTo: "",
    notes: "1000 Amazon Balance received (treated as cashback).",
  },
  // 16 — EMI charges pending after EMI closure
  {
    date: "2026-05-18", product: "Google 10", account: "Anuj/Google sore",
    buyingPrice: 51058, sellingPrice: 54000, givenTo: "Anuj",
    paymentReceived: 54000, paymentDate: null,
    cashback: 0, charges: 0, commissionAmount: 0, commissionTo: "",
    notes: "EMI charges are yet to be given after EMI closure.",
  },
  // 17 — EMI charges pending; profit will come from 7500 Google Store credit
  {
    date: "2026-05-18", product: "Google 10A", account: "Anuj/Google sore",
    buyingPrice: 40846, sellingPrice: 41500, givenTo: "Anuj",
    paymentReceived: 41500, paymentDate: null,
    cashback: 0, charges: 0, commissionAmount: 0, commissionTo: "",
    notes: "EMI charges yet to be given. Profit will come from 7500 Google Store credit.",
  },
  // 18 — payment note UPI
  {
    date: "2026-05-18", product: "Iphone 17", account: "Vansh/Flipkart",
    buyingPrice: 79506, sellingPrice: 84300, givenTo: "Vaibhav",
    paymentReceived: 84300, paymentDate: "2026-05-19",
    cashback: 0, charges: 0, commissionAmount: 0, commissionTo: "",
    notes: "", paymentNote: "UPI",
  },
];

// ── build PhoneDeal documents ─────────────────────────────────────────────────

function buildDeal(r) {
  const { purchaseAccount, purchasedFrom } = splitAccount(r.account);

  const payments = [];
  const payment = makePayment(
    r.paymentReceived,
    r.paymentDate,
    r.paymentNote || ""
  );
  if (payment) payments.push(payment);

  // saleDate: use paymentDate if available, else purchaseDate + ~1 day (unknown)
  const saleDate = r.paymentDate ? parseDate(r.paymentDate) : (r.sellingPrice ? ts(r.date) : null);

  return {
    purchaseDate: ts(r.date),
    product: String(r.product).trim(),
    purchasedFrom,
    purchaseAccount,
    buyingPrice: Number(r.buyingPrice),
    creditCard: "",            // not tracked in the Excel sheet
    cashback: r.cashbackAmount || r.cashback || 0,
    cashbackDate: null,        // not tracked per-deal in sheet
    charges: r.charges || 0,
    chargesDescription: r.chargesDescription || "",
    withGST: false,            // not tracked in sheet
    commissionAmount: r.commissionAmount || 0,
    commissionTo: r.commissionTo || "",
    soldTo: String(r.givenTo || "").trim(),
    sellingPrice: r.sellingPrice != null ? Number(r.sellingPrice) : null,
    saleDate,
    payments,
    notes: r.notes || "",
  };
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌  MONGO_URI not found in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅  Connected to MongoDB");

  const deals = rows.map(buildDeal);

  const result = await PhoneDeal.insertMany(deals, { ordered: false });
  console.log(`✅  Inserted ${result.length} PhoneDeal documents`);

  // Print a quick summary
  result.forEach((d, i) => {
    console.log(
      `  [${String(i).padStart(2, "0")}] ${d.product.padEnd(22)} | ` +
      `buy ₹${d.buyingPrice} | sell ₹${d.sellingPrice ?? "—"} | ` +
      `soldTo: ${d.soldTo || "—"} | status: ${d.dealStatus}`
    );
  });

  await mongoose.disconnect();
  console.log("✅  Done. Disconnected.");
}

// Commented to prevent accidental re-runs; uncomment to run once and import the deals. 
// main().catch((err) => {
//   console.error("❌  Import failed:", err.message);
//   process.exit(1);
// });