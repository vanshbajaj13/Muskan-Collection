const express = require("express");
const router = express.Router();
const { Item } = require("../Models/item");
const { RecentlyDeletedItem } = require("../Models/recentlyDeletedItem");
const protect = require("../middlewares/authMiddleWare");
const { ItemHistory } = require("../Models/itemHistory");
const { SaleLog } = require("../Models/salesLog");

router.get("/", protect, async (req, res) => {
  const items = await Item.find().sort({ brand: 1 });
  // console.log(items);
  res.json(items);
});

// Route to fetch items with pagination
router.get("/paginate", protect, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const items = await Item.find()
      .sort({ createdAt: -1 }) // Assuming you have a createdAt field in your items
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({ items });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to fetch items by code
router.get("/code/:code", protect, async (req, res) => {
  var { code } = req.params;
  code = code.toUpperCase();
  try {
    const item = await Item.findOne({ code });
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ message: "Item not found" });
    }
  } catch (error) {
    console.error("Error fetching item by code:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to delete item by code
router.delete("/:code", protect, async (req, res) => {
  const { code } = req.params;
  const upperCaseCode = code.toUpperCase();
  try {
    // Find the item by its code
    const item = await Item.findOne({ code: upperCaseCode });
    if (item) {
      // Instead of directly deleting, move the item to the recycle bin
      const recycleBinItem = new RecentlyDeletedItem({
        code: item.code,
        brand: item.brand,
        product: item.product,
        category: item.category,
        size: item.size, // Use the current size from the array
        quantityBuy: item.quantityBuy,
        quantitySold: item.quantitySold,
        mrp: item.mrp,
        secretCode: item.secretCode,
      });
      await recycleBinItem.save();

      // Now delete the item from the original collection
      await Item.deleteOne({ code: upperCaseCode });

      res.json({ message: "Item moved to recycle bin successfully" });
    } else {
      res.status(404).json({ message: "Item not found" });
    }
  } catch (error) {
    console.error("Error deleting item by code:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to get all the items which contain part of code based on search option
router.get("/search/:option/:query", protect, async (req, res) => {
  const { option, query } = req.params;
  const searchField = option.toLowerCase(); // Convert search option to lowercase

  try {
    let items;
    // Use a switch statement to handle different search options
    switch (searchField) {
      case "code":
        // Search by code
        items = await Item.find({ code: { $regex: query, $options: "i" } });
        break;
      case "brand":
        // Search by brand
        items = await Item.find({ brand: { $regex: query, $options: "i" } });
        break;
      case "product":
        // Search by product
        items = await Item.find({ product: { $regex: query, $options: "i" } });
        break;
      case "category":
        // Search by category
        items = await Item.find({ category: { $regex: query, $options: "i" } });
        break;
      case "size":
        // Search by size
        items = await Item.find({ size: { $regex: query, $options: "i" } });
        break;
      case "mrp<=":
        // Search by MRP less than or equal to the specified value
        items = await Item.find({ mrp: { $lte: parseFloat(query) } }).sort({
          mrp: 1,
        });
        break;
      case "mrp>=":
        // Search by MRP greater than or equal to the specified value
        items = await Item.find({ mrp: { $gte: parseFloat(query) } }).sort({
          mrp: 1,
        });
        break;
      default:
        return res.status(400).json({ message: "Invalid search option" });
    }

    if (items.length > 0) {
      res.json(items);
    } else {
      res.status(404).json({ message: "Items not found" });
    }
  } catch (error) {
    console.error("Error searching items:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to get all the items which match the search query exactly (case-insensitive)
router.get("/exact-search/:option/:query", protect, async (req, res) => {
  const { option, query } = req.params;
  const searchField = option.toLowerCase(); // Convert search option to lowercase

  try {
    let items;
    // Use a switch statement to handle different search options
    switch (searchField) {
      case "code":
        // Search by code (case-insensitive)
        items = await Item.find({
          code: { $regex: new RegExp(`^${query}$`, "i") },
        });
        break;
      case "brand":
        // Search by brand (case-insensitive)
        items = await Item.find({
          brand: { $regex: new RegExp(`^${query}$`, "i") },
        });
        break;
      case "product":
        // Search by product (case-insensitive)
        items = await Item.find({
          product: { $regex: new RegExp(`^${query}$`, "i") },
        });
        break;
      case "category":
        // Search by category (case-insensitive)
        items = await Item.find({
          category: { $regex: new RegExp(`^${query}$`, "i") },
        });
        break;
      case "size":
        // Search by size (case-insensitive)
        items = await Item.find({
          size: { $regex: new RegExp(`^${query}$`, "i") },
        });
        break;
      default:
        return res.status(400).json({ message: "Invalid search option" });
    }

    if (items.length > 0) {
      res.json(items);
    } else {
      res.status(404).json({ message: "Items not found" });
    }
  } catch (error) {
    console.error("Error searching items:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/list", protect, async (req, res) => {
  const { brand, product, category, size } = req.query;
  try {
    // Find the item based on brand, product, category, and size
    await Item.find({
      brand: brand,
      product: product,
      category: category,
      size: size,
    })
      .then((doc) => {
        if (doc) {
          return res.status(200).json(doc);
        } else {
          res.status(404).json({ message: "Product not found" });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  } catch (error) {
    console.error("Error retrieving :", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/updateAll", protect, async (req, res) => {
  const updates = req.body; // Expecting an array of { code, updateFields }
  try {
    const updatePromises = updates.map(async ({ code, updateFields }) => {
      // Find the item by code
      const existingItem = await Item.findOne({ code });

      if (!existingItem) {
        return { code, success: false, message: "Item not found" };
      }

      // Store the previous values of the fields that are being updated
      const previousValues = {};
      for (const key in updateFields) {
        if (existingItem[key] !== undefined) {
          previousValues[key] = existingItem[key];
        }
      }

      // Find the item by code and update the specified fields
      const updatedItem = await Item.findOneAndUpdate(
        { code },
        { $set: updateFields },
        { new: true }
      );

      if (updatedItem) {
        // Create a new item history entry with just the updated fields
        const itemHistoryEntry = new ItemHistory({
          code: code,
          ...previousValues,
        });

        // Save the item history entry
        await itemHistoryEntry.save();

        return { code, success: true, updatedItem };
      } else {
        return { code, success: false, message: "Failed to update item" };
      }
    });

    const results = await Promise.all(updatePromises);
    res.json(results);
  } catch (error) {
    console.error("Error updating items:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/:code", protect, async (req, res) => {
  const { code } = req.params;
  const updateFields = req.body;
  try {
    // Find the item by code
    const existingItem = await Item.findOne({ code });

    if (!existingItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Store the previous values of the fields that are being updated
    const previousValues = {};
    for (const key in updateFields) {
      if (existingItem[key] !== undefined) {
        previousValues[key] = existingItem[key];
      }
    }

    // Find the item by code and update the specified fields
    const updatedItem = await Item.findOneAndUpdate(
      { code },
      { $set: updateFields },
      { new: false }
    );

    if (updatedItem) {
      // Create a new item history entry with just the updated fields
      const itemHistoryEntry = new ItemHistory({
        code: code,
        ...previousValues,
      });

      // Save the item history entry
      await itemHistoryEntry.save();

      res.json(updatedItem);
    } else {
      res.status(404).json({ message: "Item not found" });
    }
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------------------------------------------------------------------
// Helpers for reconstructing "stock added" events from ItemHistory
// ---------------------------------------------------------------------------

// Build the full chronological "stock added" event list for one item.
// Returns an array of { date, delta, isOriginal } where delta is the
// quantity added (can be negative if a correction reduced quantityBuy).
// isOriginal marks the very first (creation) event.
const buildRestockEvents = (item, historyList) => {
  const events = [];

  if (!historyList || historyList.length === 0) {
    // Item was never edited, so the only stock-add event is its creation.
    events.push({ date: item.createdAt, delta: item.quantityBuy, isOriginal: true });
    return events;
  }

  // historyList is already sorted ascending by createdAt.
  // history[i].quantityBuy = value BEFORE edit i (edit i happened at history[i].createdAt)
  events.push({ date: item.createdAt, delta: historyList[0].quantityBuy, isOriginal: true });

  for (let i = 0; i < historyList.length; i++) {
    const before = historyList[i].quantityBuy;
    const after =
      i + 1 < historyList.length
        ? historyList[i + 1].quantityBuy
        : item.quantityBuy; // last edit -> current live value
    events.push({ date: historyList[i].createdAt, delta: after - before, isOriginal: false });
  }

  return events;
};

// Reconciles a chronological delta list so that corrections (negative deltas)
// retroactively shrink the most recent prior addition(s), instead of showing
// up as their own (previously discarded) negative rows.
//
// Example: [+1095 (create), -1080 (correction)] -> [+15 (create, corrected)]
// Example: [+10 (create), +5 (restock), -3 (correction)]
//       -> [+10 (create), +2 (restock, corrected)]
//
// This fixes the bug where a mistaken quantityBuy (e.g. typing the MRP value
// into quantityBuy) kept showing up as a huge "stock added" entry in the
// original period even after being corrected, because the correction (a
// negative delta) was silently filtered out by `ev.delta > 0`.
const reconcileEvents = (rawEvents) => {
  const stack = [];

  for (const ev of rawEvents) {
    if (ev.delta >= 0) {
      stack.push({
        date: ev.date,
        qty: ev.delta,
        isOriginal: ev.isOriginal,
        corrected: false,
      });
    } else {
      let remaining = -ev.delta;
      while (remaining > 0 && stack.length > 0) {
        const top = stack[stack.length - 1];
        if (top.qty > remaining) {
          top.qty -= remaining;
          top.corrected = true;
          remaining = 0;
        } else {
          remaining -= top.qty;
          top.qty = 0;
          top.corrected = true;
          stack.pop();
        }
      }
      // If remaining > 0 here, the correction exceeds everything ever
      // recorded for this item (a data inconsistency). We drop the excess
      // rather than letting any entry go negative.
    }
  }

  // Drop entries that were fully corrected away (qty reduced to 0).
  return stack.filter((e) => e.qty > 0);
};

// GET /api/item/stock-added?from=<ISO date>&to=<ISO date>
// Returns the new stock (additions/restocks) added within a date range,
// with corrections already reconciled into the entries they corrected.
//
// IMPORTANT: quantityBuy on an Item is a running total, not a per-purchase
// number. If an item had quantityBuy=10 in June and it's increased to 15 in
// July (a repurchase of 5), we must attribute only the +5 delta to July, not
// the full 15. We reconstruct this using ItemHistory, which stores the
// PREVIOUS value of quantityBuy every time it's edited (timestamped at the
// moment of the edit). By walking history in chronological order we can work
// out exactly how much stock was added and when for every item, including
// the very first purchase (item.createdAt).
//
// Corrections (a later edit that LOWERS quantityBuy, e.g. fixing a typo)
// retroactively reduce the most recent prior addition, so the corrected
// figure is what shows up in whatever period the original addition/restock
// happened in — not the raw (wrong) number, and not as a separate negative
// row either.
router.get("/stock-added", protect, async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "from and to dates are required" });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate) || isNaN(toDate)) {
      return res.status(400).json({ error: "Invalid from/to date" });
    }

    // Fetch all current items and all quantityBuy history entries.
    const [items, historyEntries] = await Promise.all([
      Item.find(),
      ItemHistory.find({ quantityBuy: { $exists: true } }).sort({ createdAt: 1 }),
    ]);

    // Group history entries by item code
    const historyByCode = {};
    historyEntries.forEach((h) => {
      if (!historyByCode[h.code]) historyByCode[h.code] = [];
      historyByCode[h.code].push(h);
    });

    const rows = [];
    let totalQuantity = 0;
    let totalAmount = 0;

    items.forEach((item) => {
      const rawEvents = buildRestockEvents(item, historyByCode[item.code]);
      const reconciled = reconcileEvents(rawEvents);

      reconciled.forEach((ev) => {
        const evDate = new Date(ev.date);
        if (evDate >= fromDate && evDate <= toDate) {
          rows.push({
            code: item.code,
            brand: item.brand,
            product: item.product,
            category: item.category,
            size: item.size,
            mrp: item.mrp,
            quantityAdded: ev.qty,
            amount: ev.qty * item.mrp,
            date: ev.date,
            type: ev.isOriginal ? "added" : "restocked",
            corrected: ev.corrected,
          });
          totalQuantity += ev.qty;
          totalAmount += ev.qty * item.mrp;
        }
      });
    });

    rows.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      summary: {
        totalQuantity,
        totalAmount,
        totalEntries: rows.length,
      },
      rows,
    });
  } catch (error) {
    console.error("Error fetching stock added report:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Fields we never want to show up as a "change" in the history feed.
const IGNORED_HISTORY_KEYS = new Set([
  "_id",
  "code",
  "createdAt",
  "updatedAt",
  "__v",
]);

// For a given item + its (chronologically sorted) ItemHistory entries, work out
// what actually changed at each edit, and what the value became after that
// edit (looking forward to the next history entry that touched the same
// field, or falling back to the item's current live value).
function buildItemChangeEvents(item, historyList) {
  if (!historyList || historyList.length === 0) return [];

  const events = [];

  for (let i = 0; i < historyList.length; i++) {
    const entry = historyList[i];
    const changes = [];

    Object.keys(entry).forEach((key) => {
      if (IGNORED_HISTORY_KEYS.has(key)) return;
      const beforeVal = entry[key];
      if (beforeVal === undefined || beforeVal === null) return;

      let afterVal = item[key];
      for (let j = i + 1; j < historyList.length; j++) {
        if (historyList[j][key] !== undefined) {
          afterVal = historyList[j][key];
          break;
        }
      }

      if (String(beforeVal) !== String(afterVal)) {
        changes.push({ field: key, from: beforeVal, to: afterVal });
      }
    });

    if (changes.length > 0) {
      events.push({ date: entry.createdAt, changes });
    }
  }

  return events;
}

// GET /api/item/history-feed?from=<ISO>&to=<ISO>&code=<search>&page=<n>&limit=<n>
// Paginated, code-searchable, chronological feed of everything that happened
// to inventory in a date range: added, updated, sold, deleted.
//
// `code` does a substring match (case-insensitive) against the item code,
// so e.g. code=ABC matches ABC101, ABC205, XABC9, etc. — useful since your
// codes encode product (prefix) + size/pattern (suffix).
//
// Pagination happens AFTER building+sorting the full event list for the
// range, because "page 1 of updates" only makes sense once everything is in
// chronological order. To keep this cheap at 10k+ rows, the code filter is
// pushed down into the DB queries so we never load rows outside the search
// in the first place.
router.get("/history-feed", protect, async (req, res) => {
  try {
    const { from, to, code, page = 1, limit = 100 } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "from and to dates are required" });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate) || isNaN(toDate)) {
      return res.status(400).json({ error: "Invalid from/to date" });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 100));
    const codeSearch = (code || "").trim();

    const fromMs = fromDate.getTime();
    const toMs = toDate.getTime();

    // Push the code filter into every collection's query so we're not
    // pulling thousands of irrelevant items/history rows just to discard them.
    const codeRegex = codeSearch ? { $regex: codeSearch, $options: "i" } : undefined;
    const itemQuery = codeRegex ? { code: codeRegex } : {};
    const historyQuery = codeRegex ? { code: codeRegex } : {};
    const deletedQuery = {
      createdAt: { $gte: fromDate, $lte: toDate },
      ...(codeRegex ? { code: codeRegex } : {}),
    };
    const salesQuery = {
      soldAt: { $gte: fromMs, $lte: toMs },
      ...(codeRegex ? { code: codeRegex } : {}),
    };

    const [items, historyEntries, deletedItems, sales] = await Promise.all([
      Item.find(itemQuery).lean(),
      ItemHistory.find(historyQuery).sort({ createdAt: 1 }).lean(),
      RecentlyDeletedItem.find(deletedQuery).lean(),
      SaleLog.find(salesQuery).lean(),
    ]);

    const historyByCode = {};
    historyEntries.forEach((h) => {
      if (!historyByCode[h.code]) historyByCode[h.code] = [];
      historyByCode[h.code].push(h);
    });

    const events = [];

    // 1. Items added (created)
    items.forEach((item) => {
      const createdAt = new Date(item.createdAt);
      if (createdAt >= fromDate && createdAt <= toDate) {
        events.push({
          type: "added",
          date: item.createdAt,
          code: item.code,
          brand: item.brand,
          product: item.product,
          category: item.category,
          size: item.size,
          mrp: item.mrp,
          quantityBuy: item.quantityBuy,
        });
      }
    });

    // 2. Items updated (any field change, including restocks)
    items.forEach((item) => {
      const changeEvents = buildItemChangeEvents(item, historyByCode[item.code]);
      changeEvents.forEach((ev) => {
        const evDate = new Date(ev.date);
        if (evDate >= fromDate && evDate <= toDate) {
          events.push({
            type: "updated",
            date: ev.date,
            code: item.code,
            brand: item.brand,
            product: item.product,
            category: item.category,
            size: item.size,
            changes: ev.changes,
          });
        }
      });
    });

    // 3. Items sold
    sales.forEach((sale) => {
      events.push({
        type: "sold",
        date: new Date(sale.soldAt),
        code: sale.code,
        brand: sale.brand,
        product: sale.product,
        category: sale.category,
        size: sale.size,
        mrp: sale.mrp,
        sellingPrice: sale.sellingPrice,
        customerPhoneNo: sale.customerPhoneNo,
        soldBy: sale.soldBy,
      });
    });

    // 4. Items deleted
    deletedItems.forEach((di) => {
      events.push({
        type: "deleted",
        date: di.createdAt,
        code: di.code,
        brand: di.brand,
        product: di.product,
        category: di.category,
        size: di.size,
        mrp: di.mrp,
        quantityBuy: di.quantityBuy,
        quantitySold: di.quantitySold,
      });
    });

    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    const summary = {
      totalAdded: events.filter((e) => e.type === "added").length,
      totalUpdated: events.filter((e) => e.type === "updated").length,
      totalSold: events.filter((e) => e.type === "sold").length,
      totalDeleted: events.filter((e) => e.type === "deleted").length,
    };

    const totalEvents = events.length;
    const totalPages = Math.max(1, Math.ceil(totalEvents / limitNum));
    const safePage = Math.min(pageNum, totalPages);
    const startIdx = (safePage - 1) * limitNum;
    const paginatedEvents = events.slice(startIdx, startIdx + limitNum);

    res.json({
      summary,
      events: paginatedEvents,
      pagination: {
        page: safePage,
        limit: limitNum,
        totalEvents,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error building item history feed:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/verify/:brand", async (req, res) => {
  try {
    var { brand } = req.params;
    brand = brand.toUpperCase();
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const items = await Item.find({
      brand: brand,
      createdAt: { $gte: oneDayAgo },
    });

    if (!items || items.length === 0) {
      return res.status(404).json({ message: "No items found" });
    }

    const results = items.reduce(
      (acc, item) => {
        acc.sumMrpQuantity += item.mrp * item.quantityBuy;
        acc.sumQuantity += item.quantityBuy;
        return acc;
      },
      { sumMrpQuantity: 0, sumQuantity: 0 }
    );

    res.json(results);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


module.exports = router;
