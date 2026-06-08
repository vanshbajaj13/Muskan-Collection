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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [incRes, expRes, bizRes, debtRes, savRes, ddRes] =
        await Promise.all([
          fetch("/api/family/income", { headers: authHeaders() }),
          fetch("/api/family/expenses", { headers: authHeaders() }),
          fetch("/api/family/business", { headers: authHeaders() }),
          fetch("/api/family/debts", { headers: authHeaders() }),
          fetch("/api/family/savings", { headers: authHeaders() }),
          fetch("/api/family/dropdowns", { headers: authHeaders() }),
        ]);

      if (incRes.ok) {
        const d = await incRes.json();
        setIncomes(d.incomes || []);
      }
      if (expRes.ok) {
        const d = await expRes.json();
        setExpenses(d.expenses || []);
      }
      if (bizRes.ok) {
        const d = await bizRes.json();
        setBusinessEntries(d.entries || []);
      }
      if (debtRes.ok) {
        const d = await debtRes.json();
        setDebts(d.debts || []);
      }
      if (savRes.ok) {
        const d = await savRes.json();
        setSavingsGoals(d.goals || []);
      }
      if (ddRes.ok) {
        const d = await ddRes.json();
        setDropdowns(d || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Income CRUD ───────────────────────────────────────────────────────────
  const createIncome = async (data) => {
    const res = await fetch("/api/family/income", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed");
    const created = await res.json();
    setIncomes((prev) => [created, ...prev]);
    return created;
  };
  const updateIncome = async (id, data) => {
    const res = await fetch(`/api/family/income/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed");
    const updated = await res.json();
    setIncomes((prev) => prev.map((i) => (i._id === id ? updated : i)));
    return updated;
  };
  const deleteIncome = async (id) => {
    await fetch(`/api/family/income/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    setIncomes((prev) => prev.filter((i) => i._id !== id));
  };

  // ── Expense CRUD ──────────────────────────────────────────────────────────
  const createExpense = async (data) => {
    const res = await fetch("/api/family/expenses", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed");
    const created = await res.json();
    setExpenses((prev) => [created, ...prev]);
    return created;
  };
  const updateExpense = async (id, data) => {
    const res = await fetch(`/api/family/expenses/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed");
    const updated = await res.json();
    setExpenses((prev) => prev.map((e) => (e._id === id ? updated : e)));
    return updated;
  };
  const deleteExpense = async (id) => {
    await fetch(`/api/family/expenses/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    setExpenses((prev) => prev.filter((e) => e._id !== id));
  };

  // ── Business CRUD ─────────────────────────────────────────────────────────
  const upsertBusiness = async (data) => {
    const res = await fetch("/api/family/business", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed");
    const entry = await res.json();
    setBusinessEntries((prev) => {
      const exists = prev.find((b) => b._id === entry._id);
      return exists
        ? prev.map((b) => (b._id === entry._id ? entry : b))
        : [entry, ...prev];
    });
    return entry;
  };
  const deleteBusiness = async (id) => {
    await fetch(`/api/family/business/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    setBusinessEntries((prev) => prev.filter((b) => b._id !== id));
  };

  // ── Debt CRUD ─────────────────────────────────────────────────────────────
  const createDebt = async (data) => {
    const res = await fetch("/api/family/debts", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed");
    const created = await res.json();
    setDebts((prev) => [created, ...prev]);
    return created;
  };
  const updateDebt = async (id, data) => {
    const res = await fetch(`/api/family/debts/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed");
    const updated = await res.json();
    setDebts((prev) => prev.map((d) => (d._id === id ? updated : d)));
    return updated;
  };
  const deleteDebt = async (id) => {
    await fetch(`/api/family/debts/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    setDebts((prev) => prev.filter((d) => d._id !== id));
  };
  const addRepayment = async (debtId, data) => {
    const res = await fetch(`/api/family/debts/${debtId}/repayment`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed");
    const updated = await res.json();
    setDebts((prev) => prev.map((d) => (d._id === debtId ? updated : d)));
    return updated;
  };
  const removeRepayment = async (debtId, repId) => {
    const res = await fetch(`/api/family/debts/${debtId}/repayment/${repId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed");
    const updated = await res.json();
    setDebts((prev) => prev.map((d) => (d._id === debtId ? updated : d)));
  };

  // ── Savings CRUD ──────────────────────────────────────────────────────────
  const createGoal = async (data) => {
    const res = await fetch("/api/family/savings", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed");
    const created = await res.json();
    setSavingsGoals((prev) => [created, ...prev]);
    return created;
  };
  const updateGoal = async (id, data) => {
    const res = await fetch(`/api/family/savings/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed");
    const updated = await res.json();
    setSavingsGoals((prev) => prev.map((g) => (g._id === id ? updated : g)));
    return updated;
  };
  const deleteGoal = async (id) => {
    await fetch(`/api/family/savings/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    setSavingsGoals((prev) => prev.filter((g) => g._id !== id));
  };
  const addContribution = async (goalId, data) => {
    const res = await fetch(`/api/family/savings/${goalId}/contribution`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed");
    const updated = await res.json();
    setSavingsGoals((prev) =>
      prev.map((g) => (g._id === goalId ? updated : g)),
    );
    return updated;
  };
  const removeContribution = async (goalId, contribId) => {
    const res = await fetch(
      `/api/family/savings/${goalId}/contribution/${contribId}`,
      {
        method: "DELETE",
        headers: authHeaders(),
      },
    );
    if (!res.ok) throw new Error("Failed");
    const updated = await res.json();
    setSavingsGoals((prev) =>
      prev.map((g) => (g._id === goalId ? updated : g)),
    );
  };

  // ── Dropdown management ───────────────────────────────────────────────────
  const addDropdown = async (type, value) => {
    const res = await fetch("/api/family/dropdowns", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ type, value }),
    });
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error || "Failed");
    }
    const opt = await res.json();
    setDropdowns((prev) => ({
      ...prev,
      [type]: [...(prev[type] || []), { _id: opt._id, value: opt.value }],
    }));
  };

  const renameDropdown = async (type, id, newValue) => {
    const res = await fetch(`/api/family/dropdowns/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ value: newValue }),
    });
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error || "Failed");
    }
    const opt = await res.json();

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
    await fetch(`/api/family/dropdowns/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
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
