import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const CarContext = createContext();
export const useCar = () => useContext(CarContext);

export const CarProvider = ({ children }) => {
  const [dropdowns, setDropdowns] = useState({});
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  const token = () => {
    const info = window.localStorage.getItem("userInfo");
    return info ? JSON.parse(info).token : "";
  };

  const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token()}`,
  });

  // ── Hardened fetch wrapper ───────────────────────────────────────────────
  // Fixes the "silent failure" bug: iOS Safari/PWA can suspend an in-flight
  // fetch (screen lock, app switch, wifi↔cellular handoff) so it never
  // resolves or rejects. Without a timeout, the calling try/catch/finally
  // never runs — no error, no toast, spinner just hangs or clears on resume.
  // This wrapper aborts after TIMEOUT_MS and retries once on network-level
  // failures only (not on HTTP error responses, which are real server answers).
  const TIMEOUT_MS = 15000;

  const requestRaw = async (url, options = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  const request = async (url, options = {}, { retry = true } = {}) => {
    try {
      return await requestRaw(url, options);
    } catch (err) {
      // Network-level failure (timeout, offline, connection dropped) —
      // NOT an HTTP error response, since those don't throw. Safe to retry once.
      if (retry) {
        return await requestRaw(url, options);
      }
      if (err?.name === "AbortError") {
        throw new Error("Request timed out. Please check your connection and try again.");
      }
      throw new Error("Network error. Please check your connection and try again.");
    }
  };

  // Parses a JSON body safely; throws a useful error on non-OK / non-JSON responses
  // instead of letting `await res.json()` throw a confusing parse error.
  const parseJson = async (res, fallbackMsg) => {
    if (!res.ok) {
      let msg = fallbackMsg;
      try {
        const e = await res.json();
        msg = e.error || e.message || fallbackMsg;
      } catch {
        // Response wasn't JSON (e.g. HTML error page from a proxy/cold start) — ignore
      }
      throw new Error(msg);
    }
    try {
      return await res.json();
    } catch {
      throw new Error("Server returned an unexpected response. Please try again.");
    }
  };

  const fetchDropdowns = useCallback(async () => {
    setLoadingDropdowns(true);
    try {
      const res = await request("/api/cars/dropdowns", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setDropdowns(await res.json());
      // If this background refresh fails, deliberately leave existing
      // dropdowns state untouched rather than wiping it to {}.
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDropdowns(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchDropdowns(); }, [fetchDropdowns]);

  // ── Deals ─────────────────────────────────────────────────────────────────
  const getDeals = async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await request(`/api/cars/deals?${qs}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    return parseJson(res, "Failed to fetch deals");
  };

  const createDeal = async (data) => {
    const res = await request("/api/cars/deals", {
      method: "POST", headers: headers(), body: JSON.stringify(data),
    });
    return parseJson(res, "Failed to create deal");
  };

  const updateDeal = async (id, data) => {
    const res = await request(`/api/cars/deals/${id}`, {
      method: "PATCH", headers: headers(), body: JSON.stringify(data),
    });
    return parseJson(res, "Failed to update deal");
  };

  const deleteDeal = async (id) => {
    const res = await request(`/api/cars/deals/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token()}` },
    });
    return parseJson(res, "Failed to delete deal");
  };

  const getStats = async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await request(`/api/cars/deals/meta/stats?${qs}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    return parseJson(res, "Failed to fetch stats");
  };

  // ── Dropdowns ─────────────────────────────────────────────────────────────
  // Mutation result is fully decoupled from the refresh that follows it:
  // if the mutation succeeds but the trailing fetchDropdowns() fails (e.g.
  // a network blip right after save), we no longer let that failure
  // surface as "Failed to add/rename/delete" — the save already worked.
  const addDropdown = async (type, value) => {
    const res = await request("/api/cars/dropdowns", {
      method: "POST", headers: headers(), body: JSON.stringify({ type, value }),
    });
    const opt = await parseJson(res, "Failed to add option");
    try {
      await fetchDropdowns();
    } catch (e) {
      console.error("Dropdown refresh failed after successful add", e);
    }
    return opt;
  };

  const renameDropdown = async (id, value) => {
    const res = await request(`/api/cars/dropdowns/${id}`, {
      method: "PATCH", headers: headers(), body: JSON.stringify({ value }),
    });
    const opt = await parseJson(res, "Failed to rename");
    try {
      await fetchDropdowns();
    } catch (e) {
      console.error("Dropdown refresh failed after successful rename", e);
    }
    return opt;
  };

  const deleteDropdown = async (id) => {
    const res = await request(`/api/cars/dropdowns/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token()}` },
    });
    const result = await parseJson(res, "Failed to delete");
    try {
      await fetchDropdowns();
    } catch (e) {
      console.error("Dropdown refresh failed after successful delete", e);
    }
    return result;
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const opts = useCallback(
    (type) => (dropdowns[type] || []).map((o) => o.value),
    [dropdowns],
  );

  const formatCurrency = useCallback((n) => {
    if (n === null || n === undefined || n === "") return "—";
    const abs = Math.abs(Number(n));
    if (abs >= 100000) return `₹${(Number(n) / 100000).toFixed(2)}L`;
    return `₹${Number(n).toLocaleString("en-IN")}`;
  }, []);

  const formatDate = useCallback((ts) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  }, []);

  const tsFromDate = useCallback(
    (dateStr) => (dateStr ? new Date(dateStr).getTime() : null),
    [],
  );

  const dateFromTs = useCallback((ts) => {
    if (!ts) return "";
    return new Date(ts).toISOString().split("T")[0];
  }, []);

  return (
    <CarContext.Provider value={{
      dropdowns, loadingDropdowns, fetchDropdowns, opts,
      getDeals, createDeal, updateDeal, deleteDeal, getStats,
      addDropdown, renameDropdown, deleteDropdown,
      formatCurrency, formatDate, tsFromDate, dateFromTs,
    }}>
      {children}
    </CarContext.Provider>
  );
};