
/**
 * getCodesByDateAndBrand.js   (SCRIPT 1 of 2)
 * ─────────────────────────────────────────────────────────────
 * Finds every Item CREATED between FROM_DATE and TO_DATE
 * (both inclusive) for the given BRAND.
 *
 * READ-ONLY – does not change anything in the database.
 */

// ───────────── EDIT THESE ─────────────
const BRAND = "SP HISAR";
const FROM_DATE = "2026-10-01";
const TO_DATE = "2026-11-14";
// ──────────────────────────────────────

const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const { Item } = require("../Models/item");

function parseLocalDate(str, endOfDay) {
  const [y, m, d] = str.split("-").map(Number);
  return endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const from = parseLocalDate(FROM_DATE, false);
  const to = parseLocalDate(TO_DATE, true);

  const items = await Item.find({
    brand: {
      $regex: `^${escapeRegex(BRAND.trim())}$`,
      $options: "i",
    },
    createdAt: { $gte: from, $lte: to },
  })
    .select("code")
    .sort({ createdAt: 1 })
    .lean();

  const codes = items.map((i) => i.code);
  const totalCodes = codes.length;

  console.log(`\nBrand: ${BRAND}`);
  console.log(`Range: ${from.toLocaleString()} -> ${to.toLocaleString()}`);
  console.log(`\nTotal Number of Codes: ${totalCodes}`);
  console.log("\nCodes Array (copy into script 2):\n");
  console.log(JSON.stringify(codes, null, 2));
  console.log("");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
