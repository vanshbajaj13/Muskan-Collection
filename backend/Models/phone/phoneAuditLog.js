const mongoose = require("mongoose");

// One row per changed field, for update actions
const changeSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const phoneAuditLogSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      enum: ["PhoneDeal", "PhonePayment"],
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    action: {
      type: String,
      required: true,
      enum: ["create", "update", "delete"],
    },
    // Populated for "update" — one entry per changed field
    changes: [changeSchema],
    // Populated for "create" / "delete" — full document at that moment
    snapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    // Short human-readable label, e.g. "iPhone 17 → Gagan" or "Payment of ₹25,000"
    summary: { type: String, default: "" },
    performedBy: { type: String, default: "system" },
    performedAt: { type: Number, required: true }, // timestamp
  },
  { timestamps: true }
);

phoneAuditLogSchema.index({ entityType: 1, entityId: 1, performedAt: -1 });
phoneAuditLogSchema.index({ performedAt: -1 });

const PhoneAuditLog = mongoose.model("PhoneAuditLog", phoneAuditLogSchema);
module.exports = { PhoneAuditLog };