/**
 * markCodesVerified.js   (SCRIPT 2 of 2)
 * ─────────────────────────────────────────────────────────────
 * Place in:  backend/scripts/
 * Run with:  node backend/scripts/markCodesVerified.js
 *
 * What it does:
 *   For every code in CODES, marks that item as verified in the given
 *   verification session – exactly what scanning it does, except it sets
 *   verifiedQuantity = expectedQuantity (so variance = 0, status "verified")
 *   instead of adding 1 per scan.
 *
 *   - Safe to re-run: items already fully verified are skipped.
 *   - Codes not in the session (e.g. added after the session started)
 *     are listed at the end as "not in session".
 *   - Also writes a VerificationLog entry per item and refreshes the
 *     session totals, same as the /verify/scan route does.
 *
 * Edit SESSION_ID and CODES below (paste the array from script 1).
 */

// ───────────── EDIT THESE ─────────────
const SESSION_ID = "VER-MW0NQYQ2-Z9LV8";
const CODES = [
  "LCW1869",
  "LCW1870",
  "KYG1196",
  "KYG1197",
  "KYG1198",
  "BMW4804",
  "BMW4805",
  "BMW4806",
  "UBC2229",
  "UBC2230",
  "UBC2231",
  "ZPKA9406",
  "ZPKA9407",
  "ZPKB9406",
  "ZPKB9407",
  "LZD2725",
  "LZD2726",
  "LZD2727",
  "BRA9434",
  "BRA9435",
  "BRA9436",
  "WPQ8977",
  "WPQ8978",
  "WPQ8979",
  "ZIM3314",
  "ZIM3315",
  "ZIM3316",
  "DUU5840",
  "DUU5841",
  "DUU5842",
  "TAH5968",
  "TAH5969",
  "TAH5970",
  "GDNA2638",
  "GDNA2639",
  "GDNB2638",
  "GDNB2639",
  "GDNC2638",
  "GDNC2639",
  "ULS3932",
  "ULS3933",
  "ULS3934",
  "RZE9245",
  "RZE9246",
  "RZE9247",
  "VTD2834",
  "VTD2835",
  "VTD2836",
  "XMB5212",
  "XMB5213",
  "XMB5214",
  "GFA9297",
  "GFA9298",
  "GFA9299",
  "TOO7502",
  "TOO7503",
  "TOO7504",
  "FWT5208",
  "FWT5209",
  "FWT5210",
  "NHO1048",
  "NHO1049",
  "NHO1050",
  "UQQ9124",
  "UQQ9125",
  "UQQ9126",
  "BPF7606",
  "BPF7607",
  "BPF7608",
  "YNC7208",
  "YNC7209",
  "YNC7210",
  "CKT4084",
  "CKT4085",
  "CKT4086",
  "DPC5667",
  "DPC5668",
  "DPC5669",
  "RWV1777",
  "RWV1778",
  "RWV1779",
  "ACY2594",
  "ACY2595",
  "FUK3241",
  "FUK3242",
  "KIF7981",
  "KIF7982",
  "LCV7820",
  "LCV7821",
  "TAO3181",
  "TAO3182",
  "JVU7185",
  "JVU7186",
  "ZQP5554",
  "ZQP5555",
  "NMS4215",
  "NMS4216",
  "PTI7073",
  "PTI7074",
  "ESC4536",
  "ESC4537",
  "ESC4538",
  "RQA1990",
  "RQA1991",
  "RQA1992",
  "RFW3578",
  "RFW3579",
  "RFW3580",
  "WLQ1251",
  "WLQ1252",
  "WLQ1253",
  "RBP2632",
  "RBP2633",
  "RBP2634",
  "RFE8585",
  "RFE8586",
  "RFE8587",
  "QNE4033",
  "QNE4034",
  "QNE4035",
  "OWV2804",
  "OWV2805",
  "OWV2806",
  "ZWX4699",
  "ZWX4700",
  "ZWX4701",
  "CDD8360",
  "CDD8361",
  "CDD8362",
  "QLW5375",
  "QLW5376",
  "XZH1435",
  "XZH1436",
  "GEI6071",
  "GEI6072",
  "VYI6070",
  "VYI6071",
  "NYK2659",
  "NYK2660",
  "YJG4557",
  "YJG4558",
  "HIO6101",
  "HIO6102",
  "RSK7444",
  "RSK7445",
  "NXC7752",
  "NXC7753",
  "NXC7754",
  "UXN8169",
  "UXN8170",
  "UXN8171",
  "KJO3039",
  "KJO3040",
  "KJO3041",
  "UAN1680",
  "UAN1681",
  "UAN1682",
  "ZZC4617",
  "ZZC4618",
  "ZZC4619",
  "EBK8184",
  "EBK8185",
  "EBK8186",
  "JNQ5917",
  "JNQ5918",
  "JNQ5919",
  "SRT9896",
  "SRT9897",
  "SRT9898",
  "ITD3731",
  "ITD3732",
  "TCU1736",
  "TCU1737",
  "TCU1738",
  "VGW7745",
  "VGW7746",
  "AQQ5791",
  "AQQ5792",
  "AQQ5793",
  "LHJ3545",
  "LHJ3546",
  "LHJ3547",
  "YGA8507",
  "YGA8508",
  "YGA8509",
  "XVE2551",
  "XVE2552",
  "XVE2553",
  "GGM7047",
  "GGM7048",
  "GGM7049",
  "TJF1277",
  "TJF1278",
  "TJF1279",
  "JFT6062",
  "JFT6063",
  "LDP4576",
  "LDP4577",
  "LDP4578",
  "NER4102",
  "NER4103",
  "NER4104",
  "WDG9277",
  "WDG9278",
  "WDG9279",
  "AAI8962",
  "AAI8963",
  "AAI8964",
  "KCL3033",
  "KCL3034",
  "KCL3035"
];
// ──────────────────────────────────────

const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const { VerificationSession } = require("../Models/verificationSession");
const { VerificationItem } = require("../Models/verificationItem");
const { VerificationLog } = require("../Models/verificationLog");

const PERFORMED_BY = "script"; // shows up in verifiedBy / log as who did it

// Copied from routes/verification.js (same logic) so session totals stay correct
async function updateSessionStatistics(sessionId) {
  const items = await VerificationItem.find({ sessionId });
  const verifiedItems = items.filter((i) => i.verificationStatus !== "pending");
  const discrepancies = items.filter((i) =>
    ["discrepancy", "overage", "not_found"].includes(i.verificationStatus)
  );
  const actualValue = items.reduce((total, i) => {
    if (i.verificationStatus !== "pending") {
      return total + i.verifiedQuantity * i.originalDetails.mrp;
    }
    return total + i.expectedQuantity * i.originalDetails.mrp;
  }, 0);
  const varianceValue = items.reduce((total, i) => total + (i.varianceValue || 0), 0);

  await VerificationSession.findOneAndUpdate(
    { sessionId },
    {
      totalVerifiedItems: verifiedItems.length,
      totalDiscrepancies: discrepancies.length,
      actualFinancialValue: actualValue,
      varianceValue: varianceValue,
    }
  );
}

async function main() {
  if (CODES.length === 0) {
    console.log("CODES array is empty - paste the array from script 1 first.");
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);

  const session = await VerificationSession.findOne({
    sessionId: SESSION_ID,
    status: { $in: ["active", "paused"] },
  });
  if (!session) {
    console.log(`No active/paused session found with id ${SESSION_ID}`);
    await mongoose.disconnect();
    return;
  }

  const uniqueCodes = [...new Set(CODES.map((c) => String(c).trim()))];
  const done = [];
  const alreadyDone = [];
  const notInSession = [];

  for (const code of uniqueCodes) {
    const vItem = await VerificationItem.findOne({ sessionId: SESSION_ID, itemCode: code });

    if (!vItem) {
      notInSession.push(code);
      continue;
    }

    // how many more units we need to "scan" so verified == expected
    const toAdd = vItem.expectedQuantity - vItem.verifiedQuantity;
    if (toAdd <= 0) {
      alreadyDone.push(code);
      continue;
    }

    const newVerified = vItem.verifiedQuantity + toAdd;
    const variance = newVerified - vItem.expectedQuantity; // 0
    vItem.verifiedQuantity = newVerified;
    vItem.varianceQuantity = variance;
    vItem.varianceValue = variance * vItem.originalDetails.mrp;
    vItem.verificationStatus = "verified";
    vItem.verifiedBy = PERFORMED_BY;
    vItem.verifiedAt = Date.now();
    await vItem.save();

    await new VerificationLog({
      sessionId: SESSION_ID,
      action: "scan",
      itemCode: code,
      newQuantity: toAdd,
      performedBy: PERFORMED_BY,
      details: `Bulk-marked by script: Expected ${vItem.expectedQuantity}, Found ${toAdd} more`,
    }).save();

    done.push(code);
  }

  await updateSessionStatistics(SESSION_ID);

  console.log(`\nMarked verified : ${done.length}`);
  console.log(`Already verified: ${alreadyDone.length}`);
  console.log(`Not in session  : ${notInSession.length}`);
  if (notInSession.length) console.log(JSON.stringify(notInSession));
  console.log("");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});