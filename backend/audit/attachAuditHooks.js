/**
 * Attaches audit logging by directly wrapping the PhoneDeal / PhonePayment
 * model methods (.save(), findOneAndUpdate, findOneAndDelete).
 *
 * IMPORTANT: we only wrap findOneAndUpdate / findOneAndDelete — NOT
 * findByIdAndUpdate / findByIdAndDelete separately. Mongoose's
 * findByIdAndUpdate/findByIdAndDelete are just sugar that internally call
 * findOneAndUpdate/findOneAndDelete under the hood. Wrapping both would
 * mean every findByIdAndUpdate call fires our wrapped findOneAndUpdate a
 * second time internally — that was causing the duplicate log entries.
 *
 * We also always read snapshots with `{ virtuals: false }`. phoneDeal.js
 * sets `schema.set("toObject", { virtuals: true })` globally, which means
 * calling .toObject() normally injects computed fields (effectiveSellingPrice,
 * dealStatus, grossProfit, id, etc). Comparing a lean() "before" (no virtuals)
 * against a toObject() "after" (virtuals included) made every virtual look
 * like a real change. Forcing virtuals off on both sides fixes that.
 *
 * Still requires ZERO changes to phoneDeal.js / phonePayment.js.
 *
 * Require this file exactly ONCE, at app startup, before app.listen():
 *   require("./audit/attachAuditHooks");
 */
const { PhoneDeal } = require("../Models/phone/phoneDeal");
const { PhonePayment } = require("../Models/phone/phonePayment");
const { PhoneAuditLog } = require("../Models/phone/phoneAuditLog");
const { getCurrentAuditUser } = require("../middlewares/auditContext");

const IGNORED_FIELDS = new Set([
  "updatedAt",
  "createdAt",
  "__v",
  "id",
  "payments",
]);

const plain = (doc) => {
  if (!doc) return null;
  return doc.toObject ? doc.toObject({ virtuals: false, getters: false }) : doc;
};

function diffDocs(oldObj, newObj) {
  const changes = [];
  const keys = new Set([
    ...Object.keys(oldObj || {}),
    ...Object.keys(newObj || {}),
  ]);
  keys.forEach((key) => {
    if (IGNORED_FIELDS.has(key) || key === "_id") return;
    const oldVal = oldObj ? oldObj[key] : undefined;
    const newVal = newObj ? newObj[key] : undefined;
    const oldStr = JSON.stringify(oldVal ?? null);
    const newStr = JSON.stringify(newVal ?? null);
    if (oldStr !== newStr) {
      changes.push({
        field: key,
        oldValue: oldVal ?? null,
        newValue: newVal ?? null,
      });
    }
  });
  return changes;
}

function summaryFor(entityType, doc) {
  if (!doc) return "";
  if (entityType === "PhoneDeal") {
    return `${doc.product || "Deal"}${doc.soldTo ? ` → ${doc.soldTo}` : ""}`;
  }
  if (entityType === "PhonePayment") {
    return `Payment of ₹${Number(doc.amount || 0).toLocaleString("en-IN")}`;
  }
  return "";
}

function logSafely(payload) {
  PhoneAuditLog.create(payload)
    .then(() =>
      console.log(
        `[audit] logged ${payload.action} on ${payload.entityType} ${payload.entityId}`,
      ),
    )
    .catch((e) =>
      console.error(
        `[audit] FAILED to write log for ${payload.entityType}:`,
        e.message,
      ),
    );
}

function attachAuditHooks(Model, entityType) {
  // ── .save() — covers `new Model(...).save()` AND load→mutate→.save() ───
  const originalSave = Model.prototype.save;
  Model.prototype.save = async function (...args) {
    const isNew = this.isNew;
    let before = null;
    if (!isNew) {
      try {
        before = await Model.findById(this._id).lean();
      } catch (e) {
        before = null;
      }
    }

    const result = await originalSave.apply(this, args);

    try {
      const after = plain(result);
      if (isNew) {
        logSafely({
          entityType,
          entityId: after._id,
          action: "create",
          snapshot: after,
          summary: summaryFor(entityType, after),
          performedBy: getCurrentAuditUser(),
          performedAt: Date.now(),
        });
      } else {
        const changes = diffDocs(plain(before), after);
        if (changes.length) {
          logSafely({
            entityType,
            entityId: after._id,
            action: "update",
            changes,
            summary: summaryFor(entityType, after),
            performedBy: getCurrentAuditUser(),
            performedAt: Date.now(),
          });
        }
      }
    } catch (e) {
      console.error(`[audit] failed to log save for ${entityType}:`, e.message);
    }

    return result;
  };

  // ── findOneAndUpdate ──────────────────────────────────────────────────
  // NOTE: do NOT also wrap findByIdAndUpdate — it calls this internally,
  // which would double-log every id-based update.
  const originalFindOneAndUpdate = Model.findOneAndUpdate.bind(Model);
  Model.findOneAndUpdate = async function (...args) {
    let before = null;
    try {
      before = await Model.findOne(args[0]).lean();
    } catch (e) {
      before = null;
    }

    const result = await originalFindOneAndUpdate(...args);

    try {
      if (result) {
        const after = plain(result);
        const changes = diffDocs(before, after);
        if (changes.length) {
          logSafely({
            entityType,
            entityId: after._id,
            action: "update",
            changes,
            summary: summaryFor(entityType, after),
            performedBy: getCurrentAuditUser(),
            performedAt: Date.now(),
          });
        }
      }
    } catch (e) {
      console.error(
        `[audit] failed to log update for ${entityType}:`,
        e.message,
      );
    }

    return result;
  };

  // ── findOneAndDelete ──────────────────────────────────────────────────
  // NOTE: do NOT also wrap findByIdAndDelete — same internal-call reason.
  const originalFindOneAndDelete = Model.findOneAndDelete.bind(Model);
  Model.findOneAndDelete = async function (...args) {
    const result = await originalFindOneAndDelete(...args);

    try {
      if (result) {
        const doc = plain(result);
        logSafely({
          entityType,
          entityId: doc._id,
          action: "delete",
          snapshot: doc,
          summary: summaryFor(entityType, doc),
          performedBy: getCurrentAuditUser(),
          performedAt: Date.now(),
        });
      }
    } catch (e) {
      console.error(
        `[audit] failed to log delete for ${entityType}:`,
        e.message,
      );
    }

    return result;
  };
}

attachAuditHooks(PhoneDeal, "PhoneDeal");
attachAuditHooks(PhonePayment, "PhonePayment");

module.exports = {};
