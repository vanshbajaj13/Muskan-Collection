const express = require("express");
const router = express.Router();
const { PhoneAuditLog } = require("../../Models/phone/phoneAuditLog");
const protect = require("../../middlewares/authMiddleWare");
const protectVansh = require("../../middlewares/phoneAuthMiddleware");

// ── GET /api/phones/audit — paginated, filterable log list ────────────────
// Query params: entityType, entityId, action, from, to, search, page, limit
router.get("/", protect, protectVansh, async (req, res) => {
  try {
    const {
      entityType,
      entityId,
      action,
      from,
      to,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    let query = {};
    if (entityType && entityType !== "all") query.entityType = entityType;
    if (entityId) query.entityId = entityId;
    if (action && action !== "all") query.action = action;
    if (from || to) {
      query.performedAt = {};
      if (from) query.performedAt.$gte = parseInt(from);
      if (to) query.performedAt.$lte = parseInt(to);
    }
    if (search) {
      query.summary = { $regex: search, $options: "i" };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      PhoneAuditLog.find(query)
        .sort({ performedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      PhoneAuditLog.countDocuments(query),
    ]);

    res.json({
      logs,
      total,
      page: pageNum,
      pages: Math.max(1, Math.ceil(total / limitNum)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/phones/audit/entity/:entityType/:entityId ─────────────────────
// Full history for a single deal or payment — used for an "Activity" panel
// on a specific record.
router.get("/entity/:entityType/:entityId", protect, protectVansh, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const logs = await PhoneAuditLog.find({ entityType, entityId }).sort({
      performedAt: -1,
    });
    res.json({ logs, total: logs.length });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/phones/audit/meta/stats — summary counts for the header cards ─
router.get("/meta/stats", protect, protectVansh, async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = {};
    if (from || to) {
      query.performedAt = {};
      if (from) query.performedAt.$gte = parseInt(from);
      if (to) query.performedAt.$lte = parseInt(to);
    }
    const logs = await PhoneAuditLog.find(query).select(
      "action performedBy entityType"
    );

    const byAction = { create: 0, update: 0, delete: 0 };
    const byUser = {};
    const byEntityType = { PhoneDeal: 0, PhonePayment: 0 };

    logs.forEach((l) => {
      byAction[l.action] = (byAction[l.action] || 0) + 1;
      byUser[l.performedBy] = (byUser[l.performedBy] || 0) + 1;
      byEntityType[l.entityType] = (byEntityType[l.entityType] || 0) + 1;
    });

    res.json({ total: logs.length, byAction, byUser, byEntityType });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;