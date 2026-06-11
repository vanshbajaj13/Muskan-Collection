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

  const fetchDropdowns = useCallback(async () => {
    setLoadingDropdowns(true);
    try {
      const res = await fetch("/api/cars/dropdowns", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setDropdowns(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDropdowns(false);
    }
  }, []);

  useEffect(() => { fetchDropdowns(); }, [fetchDropdowns]);

  // ── Deals ─────────────────────────────────────────────────────────────────
  const getDeals = async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`/api/cars/deals?${qs}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) throw new Error("Failed to fetch deals");
    return res.json();
  };

  const createDeal = async (data) => {
    const res = await fetch("/api/cars/deals", {
      method: "POST", headers: headers(), body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create deal");
    return res.json();
  };

  const updateDeal = async (id, data) => {
    const res = await fetch(`/api/cars/deals/${id}`, {
      method: "PATCH", headers: headers(), body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update deal");
    return res.json();
  };

  const deleteDeal = async (id) => {
    const res = await fetch(`/api/cars/deals/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) throw new Error("Failed to delete deal");
    return res.json();
  };

  const getStats = async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`/api/cars/deals/meta/stats?${qs}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  };

  // ── Dropdowns ─────────────────────────────────────────────────────────────
  const addDropdown = async (type, value) => {
    const res = await fetch("/api/cars/dropdowns", {
      method: "POST", headers: headers(), body: JSON.stringify({ type, value }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
    await fetchDropdowns();
  };

  const renameDropdown = async (id, value) => {
    const res = await fetch(`/api/cars/dropdowns/${id}`, {
      method: "PATCH", headers: headers(), body: JSON.stringify({ value }),
    });
    if (!res.ok) throw new Error("Failed to rename");
    await fetchDropdowns();
  };

  const deleteDropdown = async (id) => {
    const res = await fetch(`/api/cars/dropdowns/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) throw new Error("Failed to delete");
    await fetchDropdowns();
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