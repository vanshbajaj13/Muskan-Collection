/**
 * getCodesByDateAndBrand.js   (SCRIPT 1 of 2)
 * ─────────────────────────────────────────────────────────────
 * Place in:  backend/scripts/
 * Run with:  node backend/scripts/getCodesByDateAndBrand.js
 *            (or from inside backend/scripts:  node getCodesByDateAndBrand.js)
 *
 * What it does:
 *   Finds every Item CREATED between FROM_DATE and TO_DATE (both inclusive)
 *   for the given BRAND, and prints an array of their codes.
 *   READ-ONLY – it does not change anything in the database.
 *
 * Edit the 3 values below, run it, copy the printed array.
 */

// ───────────── EDIT THESE ─────────────
const BRAND = "Your Brand Name"; // case-insensitive, must match the whole brand name
const FROM_DATE = "2026-11-01";  // YYYY-MM-DD (start of this day, your local time)
const TO_DATE = "2026-11-14";    // YYYY-MM-DD (end of this day, your local time)
// ──────────────────────────────────────

const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });
const { Item } = require("../Models/item");

// "2026-11-01" -> local Date at 00:00:00 ; endOfDay = true -> 23:59:59.999
function parseLocalDate(str, endOfDay) {
  const [y, m, d] = str.split("-").map(Number);
  return endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0);
}

// so brands like "H&M" or "U.S. Polo" don't break the regex
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const from = parseLocalDate(FROM_DATE, false);
  const to = parseLocalDate(TO_DATE, true);

  const items = await Item.find({
    brand: { $regex: `^${escapeRegex(BRAND.trim())}$`, $options: "i" },
    createdAt: { $gte: from, $lte: to },
  })
    .select("code")
    .sort({ createdAt: 1 })
    .lean();

  const codes = items.map((i) => i.code);

  console.log(`\nBrand: ${BRAND}`);
  console.log(`Range: ${from.toLocaleString()}  ->  ${to.toLocaleString()}`);
  console.log(`Found ${codes.length} codes\n`);
  console.log("Copy this array into script 2:\n");
  console.log(JSON.stringify(codes));
  console.log("");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});