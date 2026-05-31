import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const PhoneContext = createContext();

export const usePhone = () => useContext(PhoneContext);

export const PhoneProvider = ({ children }) => {
  const [dropdowns, setDropdowns] = useState({});
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  const token = () => {
    const info = window.localStorage.getItem("userInfo");
    return info ? JSON.parse(info).token : "";
  };

  const fetchDropdowns = useCallback(async () => {
    setLoadingDropdowns(true);
    try {
      const res = await fetch("/api/phones/dropdowns", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDropdowns(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDropdowns(false);
    }
  }, []);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  // ── Deal API helpers ──────────────────────────────────────────────────────

  const getDeals = async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`/api/phones/deals?${qs}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) throw new Error("Failed to fetch deals");
    return res.json();
  };

  const createDeal = async (data) => {
    const res = await fetch("/api/phones/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create deal");
    return res.json();
  };

  const updateDeal = async (id, data) => {
    const res = await fetch(`/api/phones/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update deal");
    return res.json();
  };

  const deleteDeal = async (id) => {
    const res = await fetch(`/api/phones/deals/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) throw new Error("Failed to delete deal");
    return res.json();
  };

  const addPayment = async (dealId, payment) => {
    const res = await fetch(`/api/phones/deals/${dealId}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(payment),
    });
    if (!res.ok) throw new Error("Failed to add payment");
    return res.json();
  };

  const removePayment = async (dealId, paymentId) => {
    const res = await fetch(`/api/phones/deals/${dealId}/payment/${paymentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) throw new Error("Failed to remove payment");
    return res.json();
  };

  const getDealStats = async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`/api/phones/deals/meta/stats?${qs}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  };

  // ── Personal Expense helpers ──────────────────────────────────────────────

  const getExpenses = async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`/api/phones/expenses?${qs}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) throw new Error("Failed to fetch expenses");
    return res.json();
  };

  const createExpense = async (data) => {
    const res = await fetch("/api/phones/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create expense");
    return res.json();
  };

  const updateExpense = async (id, data) => {
    const res = await fetch(`/api/phones/expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update expense");
    return res.json();
  };

  const deleteExpense = async (id) => {
    const res = await fetch(`/api/phones/expenses/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) throw new Error("Failed to delete expense");
    return res.json();
  };

  // ── Dropdown management ───────────────────────────────────────────────────

  const addDropdown = async (type, value) => {
    const res = await fetch("/api/phones/dropdowns", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ type, value }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to add option");
    }
    await fetchDropdowns();
    return res.json();
  };

  const renameDropdown = async (id, value) => {
    const res = await fetch(`/api/phones/dropdowns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) throw new Error("Failed to rename option");
    await fetchDropdowns();
    return res.json();
  };

  const deleteDropdown = async (id) => {
    const res = await fetch(`/api/phones/dropdowns/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) throw new Error("Failed to delete option");
    await fetchDropdowns();
    return res.json();
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