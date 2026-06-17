import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const FamilyPlannerContext = createContext();
export const useFP = () => useContext(FamilyPlannerContext);

// ── Frequency to monthly multiplier ──────────────────────────────────────────
export const freqToMonthly = (frequency, amount) => {
  switch (frequency) {
    case "weekly":
      return amount * 4.33;
    case "fortnightly":
      return amount * 2.17;
    case "monthly":
      return amount;
    case "yearly":
      return amount / 12;
    case "one_time":
      return 0;
    default:
      return amount;
  }
};

export const FREQ_LABELS = {
  monthly: "Monthly",
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  yearly: "Yearly",
  one_time: "One Time",
};

// ── Check if a recurring item is active in a given month ─────────────────────
export const isActiveInMonth = (item, year, month) => {
  const monthStart = new Date(year, month, 1).getTime();
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  if (item.startDate > monthEnd) return false;
  if (item.endDate && item.endDate < monthStart) return false;
  return true;
};

// ── Check if a one-time item falls in a given month ──────────────────────────
export const isOneTimeInMonth = (item, year, month) => {
  // For expenses: use occurredDate; for income: use receivedDate or startDate
  const d = item.occurredDate || item.receivedDate || item.startDate;
  if (!d) return false;
  const date = new Date(d);
  return date.getFullYear() === year && date.getMonth() === month;
};

export const FamilyPlannerProvider = ({ children }) => {
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [businessEntries, setBusinessEntries] = useState([]);
  const [debts, setDebts] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [dropdowns, setDropdowns] = useState({});
  const [loading, setLoading] = useState(true);

  // ── Dashboard setting: include business net profit in income ──────────────
  const [includeBizProfit, setIncludeBizProfit] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("fp_includeBizProfit") ?? "true");
    } catch {
      return true;
    }
  });

  const [includeBizNetProfit, setIncludeBizNetProfit] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("fp_includeBizNetProfit") ?? "false",
      );
    } catch {
      return false;
    }
  });

  const toggleIncludeBizNetProfit = () => {
    setIncludeBizNetProfit((v) => {
      const next = !v;
      localStorage.setItem("fp_includeBizNetProfit", JSON.stringify(next));
      return next;
    });
  };

  const toggleIncludeBizProfit = () => {
    setIncludeBizProfit((v) => {
      const next = !v;
      localStorage.setItem("fp_includeBizProfit", JSON.stringify(next));
      return next;
    });
  };

  const token = () => {
    const info = window.localStorage.getItem("userInfo");
    return info ? JSON.parse(info).token : "";
  };

  const authHeaders = () => ({
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
  // instead of letting `await res.json()` throw a confusing parse error, and
  // instead of silently proceeding past a failed DELETE with no body check.
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

  // fetchAll uses Promise.allSettled instead of Promise.all so that one slow
  // or failed endpoint (e.g. suspended by iOS mid-request) doesn't prevent
  // the other five from loading and updating their own state.
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const endpoints = [
        { url: "/api/family/income", apply: (d) => setIncomes(d.incomes || []) },
        { url: "/api/family/expenses", apply: (d) => setExpenses(d.expenses || []) },
        { url: "/api/family/business", apply: (d) => setBusinessEntries(d.entries || []) },
        { url: "/api/family/debts", apply: (d) => setDebts(d.debts || []) },
        { url: "/api/family/savings", apply: (d) => setSavingsGoals(d.goals || []) },
        { url: "/api/family/dropdowns", apply: (d) => setDropdowns(d || {}) },
      ];

      const results = await Promise.allSettled(
        endpoints.map((ep) => request(ep.url, { headers: authHeaders() })),
      );

      results.forEach((result, i) => {
        const { apply, url } = endpoints[i];
        if (result.status === "fulfilled" && result.value.ok) {
          result.value
            .json()
            .then(apply)
            .catch((e) => console.error(`Failed to parse response from ${url}`, e));
        } else if (result.status === "rejected") {
          console.error(`Failed to load ${url}`, result.reason);
        }
      });
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Income CRUD ───────────────────────────────────────────────────────────
  const createIncome = async (data) => {
    const res = await request("/api/family/income", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const created = await parseJson(res, "Failed to add income");
    setIncomes((prev) => [created, ...prev]);
    return created;
  };
  const updateIncome = async (id, data) => {
    const res = await request(`/api/family/income/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const updated = await parseJson(res, "Failed to update income");
    setIncomes((prev) => prev.map((i) => (i._id === id ? updated : i)));
    return updated;
  };
  const deleteIncome = async (id) => {
    const res = await request(`/api/family/income/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    // Previously this never checked res.ok, so a failed delete on the
    // server still vanished the item from local state — it would then
    // reappear on the next fetchAll(), looking like a random glitch.
    await parseJson(res, "Failed to delete income");
    setIncomes((prev) => prev.filter((i) => i._id !== id));
  };

  // ── Expense CRUD ──────────────────────────────────────────────────────────
  const createExpense = async (data) => {
    const res = await request("/api/family/expenses", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const created = await parseJson(res, "Failed to add expense");
    setExpenses((prev) => [created, ...prev]);
    return created;
  };
  const updateExpense = async (id, data) => {
    const res = await request(`/api/family/expenses/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const updated = await parseJson(res, "Failed to update expense");
    setExpenses((prev) => prev.map((e) => (e._id === id ? updated : e)));
    return updated;
  };
  const deleteExpense = async (id) => {
    const res = await request(`/api/family/expenses/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    await parseJson(res, "Failed to delete expense");
    setExpenses((prev) => prev.filter((e) => e._id !== id));
  };

  // ── Business CRUD ─────────────────────────────────────────────────────────
  const upsertBusiness = async (data) => {
    const res = await request("/api/family/business", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const entry = await parseJson(res, "Failed to save business entry");
    setBusinessEntries((prev) => {
      const exists = prev.find((b) => b._id === entry._id);
      return exists
        ? prev.map((b) => (b._id === entry._id ? entry : b))
        : [entry, ...prev];
    });
    return entry;
  };
  const deleteBusiness = async (id) => {
    const res = await request(`/api/family/business/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    await parseJson(res, "Failed to delete business entry");
    setBusinessEntries((prev) => prev.filter((b) => b._id !== id));
  };

  // ── Debt CRUD ─────────────────────────────────────────────────────────────
  const createDebt = async (data) => {
    const res = await request("/api/family/debts", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const created = await parseJson(res, "Failed to add debt");
    setDebts((prev) => [created, ...prev]);
    return created;
  };
  const updateDebt = async (id, data) => {
    const res = await request(`/api/family/debts/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const updated = await parseJson(res, "Failed to update debt");
    setDebts((prev) => prev.map((d) => (d._id === id ? updated : d)));
    return updated;
  };
  const deleteDebt = async (id) => {
    const res = await request(`/api/family/debts/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    await parseJson(res, "Failed to delete debt");
    setDebts((prev) => prev.filter((d) => d._id !== id));
  };
  const addRepayment = async (debtId, data) => {
    const res = await request(`/api/family/debts/${debtId}/repayment`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const updated = await parseJson(res, "Failed to add repayment");
    setDebts((prev) => prev.map((d) => (d._id === debtId ? updated : d)));
    return updated;
  };
  const removeRepayment = async (debtId, repId) => {
    const res = await request(`/api/family/debts/${debtId}/repayment/${repId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const updated = await parseJson(res, "Failed to remove repayment");
    setDebts((prev) => prev.map((d) => (d._id === debtId ? updated : d)));
    return updated;
  };

  // ── Savings CRUD ──────────────────────────────────────────────────────────
  const createGoal = async (data) => {
    const res = await request("/api/family/savings", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const created = await parseJson(res, "Failed to add goal");
    setSavingsGoals((prev) => [created, ...prev]);
    return created;
  };
  const updateGoal = async (id, data) => {
    const res = await request(`/api/family/savings/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const updated = await parseJson(res, "Failed to update goal");
    setSavingsGoals((prev) => prev.map((g) => (g._id === id ? updated : g)));
    return updated;
  };
  const deleteGoal = async (id) => {
    const res = await request(`/api/family/savings/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    await parseJson(res, "Failed to delete goal");
    setSavingsGoals((prev) => prev.filter((g) => g._id !== id));
  };
  const addContribution = async (goalId, data) => {
    const res = await request(`/api/family/savings/${goalId}/contribution`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const updated = await parseJson(res, "Failed to add contribution");
    setSavingsGoals((prev) =>
      prev.map((g) => (g._id === goalId ? updated : g)),
    );
    return updated;
  };
  const removeContribution = async (goalId, contribId) => {
    const res = await request(
      `/api/family/savings/${goalId}/contribution/${contribId}`,
      {
        method: "DELETE",
        headers: authHeaders(),
      },
    );
    const updated = await parseJson(res, "Failed to remove contribution");
    setSavingsGoals((prev) =>
      prev.map((g) => (g._id === goalId ? updated : g)),
    );
    return updated;
  };

  // ── Dropdown management ───────────────────────────────────────────────────
  const addDropdown = async (type, value) => {
    const res = await request("/api/family/dropdowns", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ type, value }),
    });
    const opt = await parseJson(res, "Failed to add option");
    setDropdowns((prev) => ({
      ...prev,
      [type]: [...(prev[type] || []), { _id: opt._id, value: opt.value }],
    }));
    return opt;
  };

  const renameDropdown = async (type, id, newValue) => {
    const res = await request(`/api/family/dropdowns/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ value: newValue }),
    });
    const opt = await parseJson(res, "Failed to rename option");

    // Update local dropdown list
    setDropdowns((prev) => ({
      ...prev,
      [type]: (prev[type] || []).map((o) =>
        o._id === id ? { ...o, value: opt.value } : o,
      ),
    }));

    // Propagate rename into expenses / incomes in local state
    const oldValue = (dropdowns[type] || []).find((o) => o._id === id)?.value;
    if (oldValue && type === "expenseCategory") {
      setExpenses((prev) =>
        prev.map((e) =>
          e.category === oldValue ? { ...e, category: opt.value } : e,
        ),
      );
    }
    if (oldValue && type === "incomeType") {
      setIncomes((prev) =>
        prev.map((i) =>
          i.incomeType === oldValue ? { ...i, incomeType: opt.value } : i,
        ),
      );
    }
    return opt;
  };

  const deleteDropdown = async (type, id) => {
    const res = await request(`/api/family/dropdowns/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    // Previously this never checked res.ok before removing the option
    // from local state — a failed delete would still vanish it from the
    // UI, only for it to reappear on the next fetchAll().
    await parseJson(res, "Failed to delete option");
    setDropdowns((prev) => ({
      ...prev,
      [type]: (prev[type] || []).filter((o) => o._id !== id),
    }));
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const opts = (type) => (dropdowns[type] || []).map((o) => o.value);
  const INR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
  const fmtDate = (ts) =>
    ts
      ? new Date(ts).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";
  const tsFromDate = (s) => (s ? new Date(s).getTime() : null);
  const dateFromTs = (ts) =>
    ts ? new Date(ts).toISOString().split("T")[0] : "";

  // ── Helpers for business entry sums ──────────────────────────────────────
  const getBizStockTotal = (entry) => {
    if (!entry) return 0;
    if (entry.stockPurchases && entry.stockPurchases.length > 0)
      return entry.stockPurchases.reduce((s, p) => s + (p.amount || 0), 0);
    return entry.stockPurchase || 0;
  };
  const getBizExpenseTotal = (entry) => {
    if (!entry) return 0;
    if (entry.businessExpenses && entry.businessExpenses.length > 0)
      return entry.businessExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    return entry.otherBusinessExpense || 0;
  };

  // ── Compute month summary ─────────────────────────────────────────────────
  const getMonthSummary = useCallback(
    (year, month) => {
      let totalIncome = 0;
      const incomeBreakdown = [];

      incomes
        .filter((i) => i.isActive)
        .forEach((inc) => {
          if (inc.frequency === "one_time") {
            if (isOneTimeInMonth(inc, year, month)) {
              totalIncome += inc.amount;
              incomeBreakdown.push({
                label: inc.label,
                amount: inc.amount,
                type: inc.incomeType,
                freq: "one_time",
              });
            }
          } else {
            if (isActiveInMonth(inc, year, month)) {
              const monthly = freqToMonthly(inc.frequency, inc.amount);
              totalIncome += monthly;
              incomeBreakdown.push({
                label: inc.label,
                amount: monthly,
                type: inc.incomeType,
                freq: inc.frequency,
              });
            }
          }
        });

      const bizEntry = businessEntries.find(
        (b) => b.year === year && b.month === month,
      );
      const bizRevenue = bizEntry?.salesRevenue || 0;
      const bizStockExp = getBizStockTotal(bizEntry);
      const bizOtherExp = getBizExpenseTotal(bizEntry);
      const bizExpense = bizStockExp + bizOtherExp;
      const bizNetProfit = bizRevenue - bizExpense;

      if (bizRevenue > 0) {
        totalIncome += bizRevenue;
        incomeBreakdown.push({
          label: "Business Sales",
          amount: bizRevenue,
          type: "business",
          freq: "one_time",
        });
      }

      let totalExpenses = 0;
      const expenseBreakdown = [];

      expenses
        .filter((e) => e.isActive)
        .forEach((exp) => {
          if (!exp.isRecurring || exp.frequency === "one_time") {
            if (isOneTimeInMonth(exp, year, month)) {
              totalExpenses += exp.amount;
              expenseBreakdown.push({
                label: exp.label,
                amount: exp.amount,
                category: exp.category,
                freq: "one_time",
              });
            }
          } else {
            if (isActiveInMonth(exp, year, month)) {
              const monthly = freqToMonthly(exp.frequency, exp.amount);
              totalExpenses += monthly;
              expenseBreakdown.push({
                label: exp.label,
                amount: monthly,
                category: exp.category,
                freq: exp.frequency,
              });
            }
          }
        });

      if (bizExpense > 0) {
        totalExpenses += bizExpense;
        expenseBreakdown.push({
          label: "Business Purchases",
          amount: bizExpense,
          category: "Business",
          freq: "one_time",
        });
      }

      // ── Adjustment logic ──────────────────────────────────────────────────
      let adjustedIncome = totalIncome;
      let adjustedExpenses = totalExpenses;
      let adjustedIncomeBreakdown = [...incomeBreakdown];
      let adjustedExpenseBreakdown = [...expenseBreakdown];

      if (!includeBizProfit && bizRevenue > 0) {
        // Strip out biz revenue + expenses entirely
        adjustedIncome -= bizRevenue;
        adjustedExpenses -= bizExpense;
        adjustedIncomeBreakdown = adjustedIncomeBreakdown.filter(
          (i) => i.type !== "business",
        );
        adjustedExpenseBreakdown = adjustedExpenseBreakdown.filter(
          (e) => e.category !== "Business",
        );

        // If net profit toggle is on, inject only the net profit as a single income line
        if (includeBizNetProfit && bizNetProfit !== 0) {
          adjustedIncome += bizNetProfit;
          adjustedIncomeBreakdown.push({
            label:
              bizNetProfit >= 0 ? "Business Net Profit" : "Business Net Loss",
            amount: bizNetProfit,
            type: "business",
            freq: "one_time",
          });
        }
      }

      const netCashFlow = adjustedIncome - adjustedExpenses;
      const savingsRate =
        adjustedIncome > 0 ? (netCashFlow / adjustedIncome) * 100 : 0;

      return {
        totalIncome: adjustedIncome,
        totalExpenses: adjustedExpenses,
        netCashFlow,
        savingsRate,
        incomeBreakdown: adjustedIncomeBreakdown,
        expenseBreakdown: adjustedExpenseBreakdown,
        bizEntry,
        bizRevenue,
        bizNetProfit,
      };
    },
    [incomes, expenses, businessEntries, includeBizProfit, includeBizNetProfit],
  );

  // ── Forecast ─────────────────────────────────────────────────────────────
  const getForecast = useCallback(
    (fromYear, fromMonth, nMonths = 6) => {
      const months = [];
      let yr = fromYear,
        mo = fromMonth;
      for (let i = 0; i < nMonths; i++) {
        const summary = getMonthSummary(yr, mo);
        const d = new Date(yr, mo, 1);
        months.push({
          label: d.toLocaleString("default", {
            month: "short",
            year: "2-digit",
          }),
          year: yr,
          month: mo,
          ...summary,
        });
        mo++;
        if (mo > 11) {
          mo = 0;
          yr++;
        }
      }
      return months;
    },
    [getMonthSummary],
  );

  return (
    <FamilyPlannerContext.Provider
      value={{
        incomes,
        expenses,
        businessEntries,
        debts,
        savingsGoals,
        dropdowns,
        loading,
        includeBizProfit,
        toggleIncludeBizProfit,
        includeBizNetProfit,
        toggleIncludeBizNetProfit,
        createIncome,
        updateIncome,
        deleteIncome,
        createExpense,
        updateExpense,
        deleteExpense,
        upsertBusiness,
        deleteBusiness,
        createDebt,
        updateDebt,
        deleteDebt,
        addRepayment,
        removeRepayment,
        createGoal,
        updateGoal,
        deleteGoal,
        addContribution,
        removeContribution,
        addDropdown,
        renameDropdown,
        deleteDropdown,
        opts,
        INR,
        fmtDate,
        tsFromDate,
        dateFromTs,
        getMonthSummary,
        getForecast,
        fetchAll,
        getBizStockTotal,
        getBizExpenseTotal,
      }}
    >
      {children}
    </FamilyPlannerContext.Provider>
  );
};