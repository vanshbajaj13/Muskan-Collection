import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const PhoneContext = createContext();

export const usePhone = () => useContext(PhoneContext);

// ── Core fetch wrapper ───────────────────────────────────────────────────
// - Adds a timeout so iOS PWA "suspended fetch" never hangs forever
// - Retries once on network-level failure (TypeError: Failed to fetch / AbortError)
//   This covers the classic iOS case: tab backgrounds mid-request, the underlying
//   socket gets killed, fetch throws a generic network error with no server response.
//   A single retry after a short delay resolves the vast majority of these.
// - Distinguishes network failure vs HTTP error vs JSON parse error so callers
//   get an accurate message instead of a generic "Failed to X"
const TIMEOUT_MS = 15000;

const request = async (url, options = {}, { retries = 1 } = {}) => {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        // Try to read a useful error message, but don't blow up if body isn't JSON
        let message = `Request failed (${res.status})`;
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
          else if (data?.message) message = data.message;
        } catch {
          /* non-JSON error body, keep default message */
        }
        const err = new Error(message);
        err.status = res.status;
        throw err;
      }

      // Success — try to parse JSON, but tolerate empty bodies (e.g. 204)
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;

      const isNetworkError =
        err.name === "AbortError" || // our own timeout
        err.name === "TypeError" ||  // "Failed to fetch" / connection dropped
        err.message?.includes("Failed to fetch") ||
        err.message?.includes("Load failed"); // Safari/WebKit wording

      // Only retry on network-level issues, not on HTTP error responses (4xx/5xx)
      if (isNetworkError && attempt < retries) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }

      // Give network errors a clearer message
      if (isNetworkError) {
        const netErr = new Error(
          "Network error — connection was interrupted. Please try again."
        );
        netErr.isNetworkError = true;
        throw netErr;
      }
      throw err;
    }
  }
  throw lastErr;
};

export const PhoneProvider = ({ children }) => {
  const [dropdowns, setDropdowns] = useState({});
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  const token = () => {
    const info = window.localStorage.getItem("userInfo");
    return info ? JSON.parse(info).token : "";
  };

  const authHeaders = (json = false) => ({
    ...(json ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${token()}`,
  });

  const fetchDropdowns = useCallback(async () => {
    setLoadingDropdowns(true);
    try {
      const data = await request("/api/phones/dropdowns", {
        headers: authHeaders(),
      });
      setDropdowns(data || {});
    } catch (e) {
      console.error("fetchDropdowns failed:", e);
      // Don't clobber existing dropdown state on a transient refresh failure
    } finally {
      setLoadingDropdowns(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  // ── Deal API helpers ──────────────────────────────────────────────────────

  const getDeals = (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/phones/deals?${qs}`, { headers: authHeaders() });
  };

  const createDeal = (data) =>
    request("/api/phones/deals", {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(data),
    });

  const updateDeal = (id, data) =>
    request(`/api/phones/deals/${id}`, {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify(data),
    });

  const deleteDeal = (id) =>
    request(`/api/phones/deals/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

  const addPayment = (dealId, payment) =>
    request(`/api/phones/deals/${dealId}/payment`, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(payment),
    });

  const removePayment = (dealId, paymentId) =>
    request(`/api/phones/deals/${dealId}/payment/${paymentId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

  const getDealStats = (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/phones/deals/meta/stats?${qs}`, {
      headers: authHeaders(),
    });
  };

  // ── Personal Expense helpers ──────────────────────────────────────────────

  const getExpenses = (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/phones/expenses?${qs}`, { headers: authHeaders() });
  };

  const createExpense = (data) =>
    request("/api/phones/expenses", {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(data),
    });

  const updateExpense = (id, data) =>
    request(`/api/phones/expenses/${id}`, {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify(data),
    });

  const deleteExpense = (id) =>
    request(`/api/phones/expenses/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

  // ── Dropdown management ───────────────────────────────────────────────────
  // IMPORTANT: the mutation and the subsequent list-refresh are now separated.
  // If the mutation (POST/PATCH/DELETE) succeeds but the follow-up
  // fetchDropdowns() refresh fails (e.g. iOS suspends the tab right after),
  // the caller still sees SUCCESS — the toast won't incorrectly say "failed"
  // for an operation that actually went through. The list will just be
  // slightly stale until the next natural refresh.

  const addDropdown = async (type, value) => {
    const result = await request("/api/phones/dropdowns", {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ type, value }),
    });
    fetchDropdowns().catch(() => {}); // best-effort refresh, don't block/throw
    return result;
  };

  const renameDropdown = async (id, value) => {
    const result = await request(`/api/phones/dropdowns/${id}`, {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify({ value }),
    });
    fetchDropdowns().catch(() => {});
    return result;
  };

  const deleteDropdown = async (id) => {
    const result = await request(`/api/phones/dropdowns/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    fetchDropdowns().catch(() => {});
    return result;
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const opts = (type) => (dropdowns[type] || []).map((o) => o.value);

  const formatCurrency = (n) => {
    if (n === null || n === undefined || n === "") return "—";
    return `₹${Number(n).toLocaleString("en-IN")}`;
  };

  const formatDate = (ts) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  const tsFromDate = (dateStr) => dateStr ? new Date(dateStr).getTime() : null;

  const dateFromTs = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toISOString().split("T")[0];
  };

  return (
    <PhoneContext.Provider
      value={{
        dropdowns, loadingDropdowns, fetchDropdowns, opts,
        getDeals, createDeal, updateDeal, deleteDeal,
        addPayment, removePayment, getDealStats,
        getExpenses, createExpense, updateExpense, deleteExpense,
        addDropdown, renameDropdown, deleteDropdown,
        formatCurrency, formatDate, tsFromDate, dateFromTs,
      }}
    >
      {children}
    </PhoneContext.Provider>
  );
};