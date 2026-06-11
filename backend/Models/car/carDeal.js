const mongoose = require("mongoose");

// Each partner's stake in the car
const partnerShareSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sharePercent: { type: Number, required: true }, // 0–100
  },
  { _id: true },
);

// Expenses done on the car before selling (repair, RC transfer, etc.)
const carExpenseSchema = new mongoose.Schema(
  {
    description: { type: String, trim: true },
    amount: { type: Number, required: true },
    date: { type: Number, default: null },
  },
  { _id: true },
);

// Commission paid to someone for facilitating the deal
const commissionSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    amount: { type: Number, required: true },
    note: { type: String, default: "" },
  },
  { _id: true },
);

const carDealSchema = new mongoose.Schema(
  {
    // ── Car Details ──────────────────────────────────────────────
    carNumber: { type: String, required: true, trim: true }, // e.g. "HR26DK1234"
    carDescription: { type: String, default: "" }, // e.g. "Swift 2019 White"
    make: { type: String, default: "" }, // e.g. "Maruti Suzuki"
    model: { type: String, default: "" }, // e.g. "Swift VXI"
    year: { type: Number, default: null }, // e.g. 2019

    // ── Purchase ─────────────────────────────────────────────────
    buyingPrice: { type: Number, required: true },
    boughtFrom: { type: String, default: "" },
    purchaseDate: { type: Number, required: true }, // timestamp ms
    purchaseNotes: { type: String, default: "" },

    // ── Partners ─────────────────────────────────────────────────
    // Each partner's share % of the total cost (buying + expenses)
    // If empty → 100% owned by self
    partners: { type: [partnerShareSchema], default: [] },

    // ── Expenses on car ──────────────────────────────────────────
    expenses: { type: [carExpenseSchema], default: [] },

    // ── Sale ─────────────────────────────────────────────────────
    sellingPrice: { type: Number, default: null }, // null = unsold
    soldTo: { type: String, default: "" },
    saleDate: { type: Number, default: null },
    saleNotes: { type: String, default: "" },

    // ── Commission ────────────────────────────────────────────────
    commissions: { type: [commissionSchema], default: [] },

    // ── Meta ─────────────────────────────────────────────────────
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

// ── Virtuals ─────────────────────────────────────────────────────────────────

// Total expenses
carDealSchema.virtual("totalExpenses").get(function () {
  return this.expenses.reduce((s, e) => s + e.amount, 0);
});

// Total cost = buying price + all expenses
carDealSchema.virtual("totalCost").get(function () {
  return this.buyingPrice + this.totalExpenses;
});

// Total commission paid out
carDealSchema.virtual("totalCommission").get(function () {
  return this.commissions.reduce((s, c) => s + c.amount, 0);
});

// Gross profit = selling price - total cost
carDealSchema.virtual("grossProfit").get(function () {
  if (this.sellingPrice === null || this.sellingPrice === undefined)
    return null;
  return this.sellingPrice - this.totalCost;
});

// Net profit = gross profit - commissions
carDealSchema.virtual("netProfit").get(function () {
  const gross = this.grossProfit;
  if (gross === null) return null;
  return gross - this.totalCommission;
});

// Deal status
carDealSchema.virtual("dealStatus").get(function () {
  if (!this.sellingPrice) return "unsold";
  return "sold";
});

carDealSchema.virtual("partnerBreakdown").get(function () {
  if (!this.partners || this.partners.length === 0) return [];
  const netProfit = this.netProfit;
  return this.partners.map((p) => {
    const costShare = (this.totalCost * p.sharePercent) / 100;
    
    // ✅ Deduct total commission before splitting revenue
    const revenueShare = this.sellingPrice
      ? ((this.sellingPrice - this.totalCommission) * p.sharePercent) / 100
      : null;

    const profitShare =
      netProfit !== null ? (netProfit * p.sharePercent) / 100 : null;

    return {
      name: p.name,
      sharePercent: p.sharePercent,
      costShare: Math.round(costShare),
      revenueShare: revenueShare !== null ? Math.round(revenueShare) : null,
      profitShare: profitShare !== null ? Math.round(profitShare) : null,
    };
  });
});

carDealSchema.set("toJSON", { virtuals: true });
carDealSchema.set("toObject", { virtuals: true });

const CarDeal = mongoose.model("CarDeal", carDealSchema);
module.exports = { CarDeal };