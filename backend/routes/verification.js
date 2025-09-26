// backend/routes/verification.js
const express = require("express");
const router = express.Router();
const { VerificationSession } = require("../Models/verificationSession");
const { VerificationItem } = require("../Models/verificationItem");
const { VerificationLog } = require("../Models/verificationLog");
const { InventorySnapshot } = require("../Models/inventorySnapshot");
const { Item } = require("../Models/item");
const protect = require("../middlewares/authMiddleWare");

// Generate unique session ID
function generateSessionId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `VER-${timestamp}-${random}`.toUpperCase();
}

// Create new verification session
router.post("/session", protect, async (req, res) => {
  try {
    const { sessionName, sessionType, categories, notes } = req.body;
    const userId = req.user?.id || "system"; // Adjust based on your auth system

    const sessionId = generateSessionId();

    // Build query for inventory snapshot
    let inventoryQuery = {};
    if (sessionType === "category" && categories && categories.length > 0) {
      inventoryQuery.category = { $in: categories };
    }

    // Get all items for snapshot
    const items = await Item.find(inventoryQuery);

    // Create inventory snapshots
    const snapshots = items.map((item) => ({
      sessionId,
      itemCode: item.code,
      snapshotData: {
        brand: item.brand,
        product: item.product,
        category: item.category,
        size: item.size,
        quantityBuy: item.quantityBuy,
        quantitySold: item.quantitySold,
        availableQuantity: item.quantityBuy - item.quantitySold,
        mrp: item.mrp,
        secretCode: item.secretCode,
        sales: item.sales,
      },
    }));

    await InventorySnapshot.insertMany(snapshots);

    // Create verification items
    const verificationItems = items.map((item) => ({
      sessionId,
      itemCode: item.code,
      originalDetails: {
        brand: item.brand,
        product: item.product,
        category: item.category,
        size: item.size,
        mrp: item.mrp,
        secretCode: item.secretCode,
      },
      expectedQuantity: item.quantityBuy - item.quantitySold,
      verificationMethod: "qr_scan",
      verifiedBy: userId,
    }));

    await VerificationItem.insertMany(verificationItems);

    // Calculate expected financial value
    const expectedValue = items.reduce((total, item) => {
      return total + (item.quantityBuy - item.quantitySold) * item.mrp;
    }, 0);

    // Create verification session
    const session = new VerificationSession({
      sessionId,
      sessionName,
      sessionType,
      startedBy: userId,
      participants: [{ userId, userName: "Current User", role: "admin" }],
      totalExpectedItems: items.length,
      categories: sessionType === "category" ? categories : [],
      expectedFinancialValue: expectedValue,
      notes,
    });

    await session.save();

    // Log session creation
    const log = new VerificationLog({
      sessionId,
      action: "session_start",
      performedBy: userId,
      details: `Started ${sessionType} verification session: ${sessionName}`,
    });
    await log.save();

    res.status(201).json({
      success: true,
      sessionId,
      totalItems: items.length,
      expectedValue,
      message: "Verification session created successfully",
    });
  } catch (error) {
    console.error("Error creating verification session:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all verification sessions
router.get("/sessions", protect, async (req, res) => {
  try {
    const sessions = await VerificationSession.find().sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get specific session details (without items)
router.get("/session/:sessionId", protect, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await VerificationSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Get summary counts
    const totalItems = await VerificationItem.countDocuments({ sessionId });
    const verifiedItems = await VerificationItem.countDocuments({
      sessionId,
      verificationStatus: "verified",
    });
    const pendingItems = await VerificationItem.countDocuments({
      sessionId,
      verificationStatus: "pending",
    });
    const discrepancyItems = await VerificationItem.countDocuments({
      sessionId,
      verificationStatus: "discrepancy",
    });
    const overageItems = await VerificationItem.countDocuments({
      sessionId,
      verificationStatus: "overage",
    });

    res.json({
      session,
      summary: {
        totalItems,
        verifiedItems,
        pendingItems,
        discrepancyItems,
        overageItems,
      },
    });
  } catch (error) {
    console.error("Error fetching session details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get paginated items for a session (updated with search)
router.get("/session/:sessionId/items", protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    const session = await VerificationSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Build query with search
    let query = { sessionId };

    if (search) {
      query.$or = [
        { itemCode: { $regex: search, $options: "i" } },
        { "originalDetails.brand": { $regex: search, $options: "i" } },
        { "originalDetails.product": { $regex: search, $options: "i" } },
      ];
    }

    // Get total counts from all items for summary (without search filter for accurate totals)
    const totalItems = await VerificationItem.countDocuments({ sessionId });
    const verifiedItems = await VerificationItem.countDocuments({
      sessionId,
      verificationStatus: "verified",
    });
    const pendingItems = await VerificationItem.countDocuments({
      sessionId,
      verificationStatus: "pending",
    });
    const discrepancyItems = await VerificationItem.countDocuments({
      sessionId,
      verificationStatus: "discrepancy",
    });
    const overageItems = await VerificationItem.countDocuments({
      sessionId,
      verificationStatus: "overage",
    });

    // Get paginated items with search
    const items = await VerificationItem.find(query)
      .sort({ itemCode: 1 })
      .skip(skip)
      .limit(limit);

    // For search results, we need the count of matching items
    const filteredCount = search
      ? await VerificationItem.countDocuments(query)
      : totalItems;

    res.json({
      items,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredCount / limit),
        totalItems: filteredCount,
        hasNextPage: page < Math.ceil(filteredCount / limit),
        hasPrevPage: page > 1,
      },
      summary: {
        totalItems, // Always return the actual total, not filtered total
        verifiedItems,
        pendingItems,
        discrepancyItems,
        overageItems,
      },
    });
  } catch (error) {
    console.error("Error fetching paginated items:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Verify item by QR scan
router.post("/verify/scan", protect, async (req, res) => {
  try {
    const { sessionId, itemCode, verifiedQuantity, notes } = req.body;
    const userId = req.user?.id || "system";

    // Check if session exists and is active
    const session = await VerificationSession.findOne({
      sessionId,
      status: { $in: ["active", "paused"] },
    });

    if (!session) {
      return res.status(404).json({ message: "Active session not found" });
    }

    // Find the item to verify
    const verificationItem = await VerificationItem.findOne({
      sessionId,
      itemCode,
    });

    if (!verificationItem) {
      return res
        .status(404)
        .json({ message: "Item not found in current verification session" });
    }

    // recalucate verified quantity
    const recalucatedVerifiedQuantity =
      verifiedQuantity + verificationItem.verifiedQuantity;

    // Calculate variance
    const variance =
      recalucatedVerifiedQuantity - verificationItem.expectedQuantity;
    const varianceValue = variance * verificationItem.originalDetails.mrp;

    // Determine status
    let status = "verified";
    if (variance !== 0) {
      status = variance > 0 ? "overage" : "discrepancy";
    }

    // Update verification item
    verificationItem.verifiedQuantity = recalucatedVerifiedQuantity;
    verificationItem.varianceQuantity = variance;
    verificationItem.varianceValue = varianceValue;
    verificationItem.verificationStatus = status;
    verificationItem.verifiedBy = userId;
    verificationItem.verifiedAt = Date.now();
    verificationItem.notes = notes;

    await verificationItem.save();

    // Update session statistics
    await updateSessionStatistics(sessionId);

    // Log the verification
    const log = new VerificationLog({
      sessionId,
      action: "scan",
      itemCode,
      newQuantity: verifiedQuantity,
      performedBy: userId,
      details: `Scanned item: Expected ${verificationItem.expectedQuantity}, Found ${verifiedQuantity} more`,
    });
    await log.save();

    res.json({
      success: true,
      item: verificationItem,
      variance: variance,
      status: status,
      message:
        variance === 0
          ? "Item verified successfully"
          : `Variance detected: ${variance}`,
    });
  } catch (error) {
    console.error("Error verifying item:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Manual entry for items without QR codes
router.post("/verify/manual", protect, async (req, res) => {
  try {
    const { sessionId, itemCode, verifiedQuantity, notes } = req.body;
    const userId = req.user?.id || "system";

    // Check if session exists and is active
    const session = await VerificationSession.findOne({
      sessionId,
      status: { $in: ["active", "paused"] },
    });

    if (!session) {
      return res.status(404).json({ message: "Active session not found" });
    }

    // Find the item to verify
    const verificationItem = await VerificationItem.findOne({
      sessionId,
      itemCode,
    });

    if (!verificationItem) {
      return res
        .status(404)
        .json({ message: "Item not found in current verification session" });
    }

    // recalucate verified quantity
    const recalucatedVerifiedQuantity =
      verifiedQuantity + verificationItem.verifiedQuantity;

    // Calculate variance
    const variance =
      recalucatedVerifiedQuantity - verificationItem.expectedQuantity;
    const varianceValue = variance * verificationItem.originalDetails.mrp;

    // Determine status
    let status = "verified";
    if (variance !== 0) {
      status = variance > 0 ? "overage" : "discrepancy";
    }

    // Update verification item
    verificationItem.verifiedQuantity = recalucatedVerifiedQuantity;
    verificationItem.varianceQuantity = variance;
    verificationItem.varianceValue = varianceValue;
    verificationItem.verificationStatus = status;
    verificationItem.verificationMethod = "manual_entry";
    verificationItem.verifiedBy = userId;
    verificationItem.verifiedAt = Date.now();
    verificationItem.notes = notes;

    await verificationItem.save();

    // Update session statistics
    await updateSessionStatistics(sessionId);

    // Log the verification
    const log = new VerificationLog({
      sessionId,
      action: "manual_entry",
      itemCode,
      newQuantity: verifiedQuantity,
      performedBy: userId,
      details: `Scanned item: Expected ${verificationItem.expectedQuantity}, Found ${verifiedQuantity} more`,
    });
    await log.save();

    res.json({
      success: true,
      item: verificationItem,
      variance: variance,
      status: status,
      message: "Item verified manually",
    });
  } catch (error) {
    console.error("Error with manual verification:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete verification log entry with enhanced session impact
router.delete("/log/:logId", protect, async (req, res) => {
  try {
    const { logId } = req.params;
    const userId = req.user?.id || "system";

    const log = await VerificationLog.findById(logId);
    if (!log) {
      return res.status(404).json({ message: "Log entry not found" });
    }

    // Check if session is still active
    const session = await VerificationSession.findOne({
      sessionId: log.sessionId,
      status: { $in: ["active", "paused"] },
    });

    if (!session) {
      return res.status(400).json({
        message:
          "Cannot delete logs from completed or cancelled sessions. Only active or paused sessions allow log deletion.",
      });
    }

    let impactMessage = "";
    let itemsAffected = [];

    // Handle different types of log deletions
    switch (log.action) {
      case "scan":
      case "manual_entry":
        if (log.itemCode) {
          // Find the current item state
          const currentItem = await VerificationItem.findOne({
            sessionId: log.sessionId,
            itemCode: log.itemCode,
          });

          if (currentItem) {
            // Calculate new quantity by subtracting this log's contribution
            const newQuantity = Math.max(
              0,
              currentItem.verifiedQuantity - (log.newQuantity || 0)
            );

            // Recalculate variance
            const variance = newQuantity - currentItem.expectedQuantity;
            const varianceValue = variance * currentItem.originalDetails.mrp;

            // Determine new status
            let newStatus = "pending";
            if (newQuantity > 0) {
              newStatus =
                variance === 0
                  ? "verified"
                  : variance > 0
                  ? "overage"
                  : "discrepancy";
            }

            // Store impact information
            itemsAffected.push({
              code: log.itemCode,
              previousStatus: currentItem.verificationStatus,
              previousQuantity: currentItem.verifiedQuantity,
              newStatus: newStatus,
              newQuantity: newQuantity,
              quantitySubtracted: log.newQuantity || 0,
            });

            // Update the item with new values
            await VerificationItem.findOneAndUpdate(
              { sessionId: log.sessionId, itemCode: log.itemCode },
              {
                verifiedQuantity: newQuantity,
                varianceQuantity: variance,
                varianceValue: varianceValue,
                verificationStatus: newStatus,
                // Don't clear notes or verification method as other logs might have contributed
                verifiedAt: newQuantity > 0 ? currentItem.verifiedAt : null,
              }
            );

            impactMessage = `Item ${log.itemCode} updated: Removed ${
              log.newQuantity || 0
            } units. New quantity: ${newQuantity}.`;
          }
        }
        break;

      case "correction":
        if (log.itemCode) {
          // For corrections, we need to revert to the state before correction
          const previousLog = await VerificationLog.findOne({
            sessionId: log.sessionId,
            itemCode: log.itemCode,
            timestamp: { $lt: log.timestamp },
            action: { $in: ["scan", "manual_entry", "correction"] },
          }).sort({ timestamp: -1 });

          if (previousLog) {
            // Revert to previous state
            await VerificationItem.findOneAndUpdate(
              { sessionId: log.sessionId, itemCode: log.itemCode },
              {
                verifiedQuantity: Math.max(
                  previousLog?.previousQuantity ?? 0,
                  0
                ),
                varianceQuantity:
                  (previousLog.previousQuantity || 0) -
                    (
                      await VerificationItem.findOne({
                        sessionId: log.sessionId,
                        itemCode: log.itemCode,
                      })
                    )?.expectedQuantity || 0,
                verificationStatus:
                  previousLog.previousQuantity > 0 ? "verified" : "pending",
              }
            );

            impactMessage = `Item ${log.itemCode} has been reverted to previous verification state.`;
          } else {
            // No previous log, reset to pending
            await VerificationItem.findOneAndUpdate(
              { sessionId: log.sessionId, itemCode: log.itemCode },
              {
                verifiedQuantity: 0,
                varianceQuantity: 0,
                varianceValue: 0,
                verificationStatus: "pending",
                notes: "",
                verifiedAt: null,
              }
            );

            impactMessage = `Item ${log.itemCode} has been reset to pending status (no previous verification found).`;
          }
        }
        break;

      case "session_start":
        return res.status(400).json({
          message:
            "Cannot delete session start log. This would invalidate the entire verification session.",
        });

      case "session_complete":
        return res.status(400).json({
          message:
            "Cannot delete session completion log. Session is already completed.",
        });

      default:
        impactMessage = `Log entry of type '${log.action}' deleted. No direct impact on verification items.`;
    }

    // Store original log data for the deletion record
    const originalLogData = {
      action: log.action,
      itemCode: log.itemCode,
      previousQuantity: log.previousQuantity,
      newQuantity: log.newQuantity,
      details: log.details,
      timestamp: log.timestamp,
      performedBy: log.performedBy,
    };

    // Delete the original log
    await VerificationLog.findByIdAndDelete(logId);

    // Create comprehensive deletion log
    const deletionLog = new VerificationLog({
      sessionId: log.sessionId,
      action: "deletion",
      itemCode: log.itemCode,
      performedBy: userId,
      details: `Deleted ${log.action} log - Original: ${JSON.stringify(
        originalLogData
      )}. Impact: ${impactMessage}`,
      previousQuantity: log.newQuantity, // What was removed
      newQuantity:
        itemsAffected.length > 0 ? itemsAffected[0].newQuantity : null,
    });
    await deletionLog.save();

    // Update session statistics after all changes
    await updateSessionStatistics(log.sessionId);

    // Get updated session data for response
    const updatedSession = await VerificationSession.findOne({
      sessionId: log.sessionId,
    });
    const updatedItem = log.itemCode
      ? await VerificationItem.findOne({
          sessionId: log.sessionId,
          itemCode: log.itemCode,
        })
      : null;

    res.json({
      success: true,
      message: "Log entry deleted successfully",
      impact: {
        description: impactMessage,
        itemsAffected: itemsAffected,
        currentItemState: updatedItem,
        sessionStats: {
          totalVerified: updatedSession.totalVerifiedItems,
          totalDiscrepancies: updatedSession.totalDiscrepancies,
          currentProgress: `${updatedSession.totalVerifiedItems}/${updatedSession.totalExpectedItems}`,
        },
      },
    });
  } catch (error) {
    console.error("Error deleting log:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// // New endpoint: Bulk delete logs (for administrative cleanup)
// router.delete("/logs/bulk", protect, async (req, res) => {
//   try {
//     const { sessionId, logIds, reason } = req.body;
//     const userId = req.user?.id || "system";

//     if (!sessionId || !logIds || !Array.isArray(logIds)) {
//       return res.status(400).json({ message: "Session ID and array of log IDs required" });
//     }

//     // Check if session is still active
//     const session = await VerificationSession.findOne({
//       sessionId,
//       status: { $in: ['active', 'paused'] }
//     });

//     if (!session) {
//       return res.status(400).json({
//         message: "Cannot delete logs from completed sessions"
//       });
//     }

//     let deletedCount = 0;
//     let errors = [];
//     let affectedItems = new Map(); // Use Map to track cumulative changes per item

//     // First, get all logs to be deleted
//     const logsToDelete = await VerificationLog.find({
//       _id: { $in: logIds },
//       sessionId: sessionId
//     });

//     // Group logs by item code for efficient processing
//     const logsByItem = {};
//     logsToDelete.forEach(log => {
//       if (log.itemCode && ['scan', 'manual_entry'].includes(log.action)) {
//         if (!logsByItem[log.itemCode]) {
//           logsByItem[log.itemCode] = [];
//         }
//         logsByItem[log.itemCode].push(log);
//       }
//     });

//     // Process each item's logs to calculate total impact
//     for (const [itemCode, itemLogs] of Object.entries(logsByItem)) {
//       const currentItem = await VerificationItem.findOne({ sessionId, itemCode });

//       if (currentItem) {
//         // Calculate total quantity to subtract from this item
//         const totalQuantityToSubtract = itemLogs.reduce((sum, log) => sum + (log.newQuantity || 0), 0);

//         // Calculate new quantity
//         const newQuantity = Math.max(0, currentItem.verifiedQuantity - totalQuantityToSubtract);

//         // Recalculate variance
//         const variance = newQuantity - currentItem.expectedQuantity;
//         const varianceValue = variance * currentItem.originalDetails.mrp;

//         // Determine new status
//         let newStatus = 'pending';
//         if (newQuantity > 0) {
//           newStatus = variance === 0 ? 'verified' : (variance > 0 ? 'overage' : 'discrepancy');
//         }

//         // Update the item
//         await VerificationItem.findOneAndUpdate(
//           { sessionId, itemCode },
//           {
//             verifiedQuantity: newQuantity,
//             varianceQuantity: variance,
//             varianceValue: varianceValue,
//             verificationStatus: newStatus,
//             verifiedAt: newQuantity > 0 ? currentItem.verifiedAt : null
//           }
//         );

//         // Track affected items
//         affectedItems.set(itemCode, {
//           code: itemCode,
//           previousStatus: currentItem.verificationStatus,
//           previousQuantity: currentItem.verifiedQuantity,
//           newStatus: newStatus,
//           newQuantity: newQuantity,
//           quantitySubtracted: totalQuantityToSubtract
//         });
//       }
//     }

//     // Process each log deletion
//     for (const logId of logIds) {
//       try {
//         const log = await VerificationLog.findById(logId);
//         if (!log) {
//           errors.push(`Log ${logId} not found`);
//           continue;
//         }

//         if (log.sessionId !== sessionId) {
//           errors.push(`Log ${logId} does not belong to session ${sessionId}`);
//           continue;
//         }

//         // Don't allow deletion of critical logs
//         if (['session_start', 'session_complete'].includes(log.action)) {
//           errors.push(`Cannot delete ${log.action} log (${logId})`);
//           continue;
//         }

//         // For correction logs, handle individually (not handled in the bulk processing above)
//         if (log.action === 'correction' && log.itemCode) {
//           // For corrections, we need to revert to the state before correction
//           const previousLog = await VerificationLog.findOne({
//             sessionId: log.sessionId,
//             itemCode: log.itemCode,
//             timestamp: { $lt: log.timestamp },
//             action: { $in: ['scan', 'manual_entry', 'correction'] }
//           }).sort({ timestamp: -1 });

//           if (previousLog) {
//             // Revert to previous state
//             await VerificationItem.findOneAndUpdate(
//               { sessionId, itemCode: log.itemCode },
//               {
//                 verifiedQuantity: previousLog.previousQuantity || 0,
//                 varianceQuantity: (previousLog.previousQuantity || 0) -
//                   (await VerificationItem.findOne({ sessionId, itemCode: log.itemCode }))?.expectedQuantity || 0,
//                 verificationStatus: previousLog.previousQuantity > 0 ? 'verified' : 'pending'
//               }
//             );
//           } else {
//             // No previous log, reset to pending
//             await VerificationItem.findOneAndUpdate(
//               { sessionId, itemCode: log.itemCode },
//               {
//                 verifiedQuantity: 0,
//                 varianceQuantity: 0,
//                 varianceValue: 0,
//                 verificationStatus: 'pending',
//                 notes: '',
//                 verifiedAt: null
//               }
//             );
//           }

//           // Track affected item
//           const currentItem = await VerificationItem.findOne({ sessionId, itemCode: log.itemCode });
//           if (currentItem) {
//             affectedItems.set(log.itemCode, {
//               code: log.itemCode,
//               action: 'reverted',
//               newStatus: currentItem.verificationStatus,
//               newQuantity: currentItem.verifiedQuantity
//             });
//           }
//         }

//         // Delete the log (for all log types)
//         await VerificationLog.findByIdAndDelete(logId);
//         deletedCount++;

//       } catch (error) {
//         errors.push(`Error deleting log ${logId}: ${error.message}`);
//       }
//     }

//     // Create bulk deletion log
//     const bulkDeletionLog = new VerificationLog({
//       sessionId,
//       action: 'deletion',
//       performedBy: userId,
//       details: `Bulk deletion: ${deletedCount} logs deleted. Reason: ${reason || 'Not specified'}. Affected items: ${Array.from(affectedItems.keys()).join(', ')}. Errors: ${errors.length > 0 ? errors.join('; ') : 'None'}`
//     });
//     await bulkDeletionLog.save();

//     // Update session statistics
//     await updateSessionStatistics(sessionId);

//     res.json({
//       success: true,
//       message: `Bulk deletion completed`,
//       results: {
//         deletedCount,
//         affectedItems: Array.from(affectedItems.values()),
//         errors: errors.length > 0 ? errors : null
//       }
//     });

//   } catch (error) {
//     console.error("Error in bulk log deletion:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// New endpoint: Get log deletion impact preview (before actual deletion)
router.post("/log/:logId/preview-deletion", protect, async (req, res) => {
  try {
    const { logId } = req.params;

    const log = await VerificationLog.findById(logId);
    if (!log) {
      return res.status(404).json({ message: "Log entry not found" });
    }

    // Check if session allows deletion
    const session = await VerificationSession.findOne({
      sessionId: log.sessionId,
      status: { $in: ["active", "paused"] },
    });

    if (!session) {
      return res.json({
        canDelete: false,
        reason: "Session is completed or cancelled",
        impact: null,
      });
    }

    let impact = {
      canDelete: true,
      logType: log.action,
      affectedItem: log.itemCode,
      impact: "No significant impact",
    };

    // Analyze impact based on log type
    switch (log.action) {
      case "scan":
      case "manual_entry":
        if (log.itemCode) {
          const item = await VerificationItem.findOne({
            sessionId: log.sessionId,
            itemCode: log.itemCode,
          });

          if (item) {
            impact.impact = `Item ${log.itemCode} will be reset from '${item.verificationStatus}' to 'pending'. Verified quantity will change from ${item.verifiedQuantity} to 0.`;
          }
        }
        break;

      case "correction":
        impact.impact = `Item ${log.itemCode} will be reverted to its previous verification state.`;
        break;

      case "session_start":
      case "session_complete":
        impact.canDelete = false;
        impact.reason = `Cannot delete ${log.action} logs as they are critical to session integrity.`;
        break;

      case "deletion":
        impact.impact =
          "Removing a deletion log entry. This won't restore the originally deleted log.";
        break;
    }

    res.json(impact);
  } catch (error) {
    console.error("Error previewing deletion impact:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Complete verification session
router.post("/session/:sessionId/complete", protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { notes } = req.body;
    const userId = req.user?.id || "system";

    const session = await VerificationSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.status === "completed") {
      return res.status(400).json({ message: "Session already completed" });
    }

    // Update session
    session.status = "completed";
    session.completedAt = Date.now();
    if (notes) session.notes = notes;

    await session.save();

    // Final statistics update
    await updateSessionStatistics(sessionId);

    // Log completion
    const log = new VerificationLog({
      sessionId,
      action: "session_complete",
      performedBy: userId,
      details: `Completed verification session`,
    });
    await log.save();

    res.json({
      success: true,
      session,
      message: "Verification session completed successfully",
    });
  } catch (error) {
    console.error("Error completing session:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get verification logs
router.get("/logs/:sessionId", protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const logs = await VerificationLog.find({ sessionId }).sort({
      timestamp: -1,
    });
    res.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Helper function to update session statistics
async function updateSessionStatistics(sessionId) {
  try {
    const items = await VerificationItem.find({ sessionId });
    const verifiedItems = items.filter(
      (item) => item.verificationStatus !== "pending"
    );
    const discrepancies = items.filter((item) =>
      ["discrepancy", "overage", "not_found"].includes(item.verificationStatus)
    );

    const actualValue = items.reduce((total, item) => {
      if (item.verificationStatus !== "pending") {
        return total + item.verifiedQuantity * item.originalDetails.mrp;
      }
      return total + item.expectedQuantity * item.originalDetails.mrp;
    }, 0);

    const varianceValue = items.reduce((total, item) => {
      return total + (item.varianceValue || 0);
    }, 0);

    await VerificationSession.findOneAndUpdate(
      { sessionId },
      {
        totalVerifiedItems: verifiedItems.length,
        totalDiscrepancies: discrepancies.length,
        actualFinancialValue: actualValue,
        varianceValue: varianceValue,
      }
    );
  } catch (error) {
    console.error("Error updating session statistics:", error);
  }
}

// Delete verification session and all associated data
router.delete("/session/:sessionId", protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id || "system";

    // Check if session exists
    const session = await VerificationSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Optional: Check if user has permission to delete (creator or admin)
    if (session.startedBy !== userId) {
      return res.status(403).json({
        message: "You can only delete sessions that you started",
      });
    }

    // Optional: Prevent deletion of completed sessions if needed
    // if (session.status === "completed") {
    //   return res.status(400).json({
    //     message: "Cannot delete completed sessions",
    //   });
    // }

    // Delete all associated data in parallel for better performance
    await Promise.all([
      VerificationSession.deleteOne({ sessionId }),
      VerificationItem.deleteMany({ sessionId }),
      VerificationLog.deleteMany({ sessionId }),
      InventorySnapshot.deleteMany({ sessionId }),
    ]);

    res.json({
      success: true,
      message: "Session and all associated data deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting session:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
