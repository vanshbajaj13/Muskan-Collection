// Pure helpers for the Print Sets page (no React, no network) so the
// grouping / printing rules are easy to reason about and test.

// ---------------------------------------------------------------------------
// Code parsing
//
// Codes are generated in backend/routes/purchase.js:
//   normal purchase : 3 letters + number          e.g. ABC1001, ABC1002, ABC1003
//   multi-set       : 3 letters + SET LETTER + n  e.g. XYZA1001, XYZA1002, XYZB1001
// so 4 leading letters means "multi-set", the 4th letter being the set (A, B...).
// ---------------------------------------------------------------------------
export const parseCode = (code) => {
  const raw = String(code || "").trim();
  const m = /^([A-Za-z]+)(\d+)$/.exec(raw);
  if (!m) {
    // Unknown format: treat the whole code as its own single "prefix".
    return {
      letters: raw.toUpperCase(),
      number: NaN,
      base: raw.toUpperCase(),
      setLetter: null,
      isMultiSet: false,
    };
  }
  const letters = m[1].toUpperCase();
  const number = parseInt(m[2], 10);
  if (letters.length === 4) {
    return {
      letters,
      number,
      base: letters.slice(0, 3),
      setLetter: letters[3],
      isMultiSet: true,
    };
  }
  return { letters, number, base: letters, setLetter: null, isMultiSet: false };
};

const byCodeNumber = (a, b) => {
  const pa = parseCode(a.code);
  const pb = parseCode(b.code);
  if (!isNaN(pa.number) && !isNaN(pb.number) && pa.number !== pb.number) {
    return pa.number - pb.number;
  }
  return String(a.code).localeCompare(String(b.code));
};

const timeOf = (d) => {
  const t = new Date(d).getTime();
  return isNaN(t) ? 0 : t;
};

// ---------------------------------------------------------------------------
// Grouping
//
// Returns "parents" (newest first). A parent is either
//   - one normal purchase  (one set:  ABC1001, ABC1002, ABC1004 ...)
//   - one multi-set purchase (several sets: XYZA..., XYZB..., XYZC...)
// Every parent has `sets`; each set is one printable unit with its `items`
// sorted by code number (i.e. size order they were created in).
// ---------------------------------------------------------------------------
export const groupItemsIntoSets = (items) => {
  const parents = new Map();

  (items || []).forEach((item) => {
    const p = parseCode(item.code);
    const type = p.isMultiSet ? "multiset" : "single";
    const parentKey = `${type}|${p.base}|${item.brand}`;

    let parent = parents.get(parentKey);
    if (!parent) {
      parent = {
        key: parentKey,
        type,
        prefix: p.base,
        brand: item.brand,
        newestAt: 0,
        setsMap: new Map(),
      };
      parents.set(parentKey, parent);
    }

    const setKey = `${parentKey}|${p.setLetter || ""}`;
    let set = parent.setsMap.get(setKey);
    if (!set) {
      set = {
        key: setKey,
        parentKey,
        type,
        prefix: p.letters, // ABC  or  XYZA
        base: p.base, // ABC  or  XYZ
        setLetter: p.setLetter,
        brand: item.brand,
        product: item.product,
        category: item.category,
        newestAt: 0,
        items: [],
      };
      parent.setsMap.set(setKey, set);
    }

    set.items.push(item);
    const t = timeOf(item.createdAt);
    if (t > set.newestAt) set.newestAt = t;
    if (t > parent.newestAt) parent.newestAt = t;
  });

  const result = Array.from(parents.values()).map((parent) => {
    const sets = Array.from(parent.setsMap.values()).sort((a, b) =>
      String(a.setLetter || "").localeCompare(String(b.setLetter || "")),
    );
    sets.forEach((set, idx) => {
      set.items.sort(byCodeNumber);
      set.setIndex = idx + 1;
      set.setCount = sets.length;
    });
    const { setsMap, ...rest } = parent; // eslint-disable-line no-unused-vars
    return { ...rest, sets };
  });

  // Newest purchase first
  result.sort((a, b) => b.newestAt - a.newestAt);
  return result;
};

export const flattenSets = (parents) => parents.flatMap((p) => p.sets);

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------
export const summarize = (items) =>
  (items || []).reduce(
    (acc, it) => {
      const qty = Number(it.quantityBuy) || 0;
      acc.codes += 1;
      acc.quantity += qty;
      acc.value += (Number(it.mrp) || 0) * qty;
      return acc;
    },
    { codes: 0, quantity: 0, value: 0 },
  );

export const formatINR = (n) =>
  `₹${new Intl.NumberFormat("en-IN").format(Math.round(Number(n) || 0))}`;

export const mrpLabel = (items) => {
  const list = (items || []).map((i) => Number(i.mrp) || 0);
  if (list.length === 0) return "-";
  const min = Math.min(...list);
  const max = Math.max(...list);
  return min === max ? `${min}` : `${min}–${max}`;
};

// Exactly the same formula used by Purchase.jsx / PrintTag.jsx so the tag
// price printed from this page matches the tags printed from those pages.
export const calcTagPrice = (mrp, margin, customCharges) => {
  let rounded = mrp * margin + 10 + Number(customCharges);
  rounded = Math.round(rounded / 100) * 100;
  return rounded - 4;
};

// ---------------------------------------------------------------------------
// Print order
//
// Same order as the existing "Print Multiple Tags" button: one tag of each
// code, then the next round, so quantity 3 of S/M/L prints
//   S M L  S M L  S M L
// i.e. complete sets come out together and are easy to paste.
// entries: [{ item, copies }]
// ---------------------------------------------------------------------------
export const buildPrintList = (entries) => {
  const list = [];
  const rounds = entries.reduce((m, e) => Math.max(m, e.copies), 0);
  for (let round = 0; round < rounds; round++) {
    entries.forEach((e) => {
      if (round < e.copies) list.push(e.item);
    });
  }
  return list;
};

// ---------------------------------------------------------------------------
// Dates (all local time, so "Today" means today in the user's timezone)
// ---------------------------------------------------------------------------
const pad = (n) => String(n).padStart(2, "0");

export const toInputDate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const rangeToIso = (fromStr, toStr) => {
  const [fy, fm, fd] = fromStr.split("-").map(Number);
  const [ty, tm, td] = toStr.split("-").map(Number);
  return {
    from: new Date(fy, fm - 1, fd, 0, 0, 0, 0).toISOString(),
    to: new Date(ty, tm - 1, td, 23, 59, 59, 999).toISOString(),
  };
};

export const getPresetRange = (id, now = new Date()) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const shift = (days) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
  switch (id) {
    case "today":
      return [toInputDate(today), toInputDate(today)];
    case "yesterday":
      return [toInputDate(shift(-1)), toInputDate(shift(-1))];
    case "last7":
      return [toInputDate(shift(-6)), toInputDate(today)];
    case "month":
      return [
        toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)),
        toInputDate(today),
      ];
    default:
      return [toInputDate(today), toInputDate(today)];
  }
};

export const PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "month", label: "This month" },
];

export const formatAddedAt = (value, now = new Date()) => {
  const d = new Date(value);
  if (isNaN(d)) return "";
  const time = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );
  if (d.toDateString() === now.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === yesterday.toDateString())
    return `Yesterday, ${time}`;
  const date = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
  return `${date}, ${time}`;
};