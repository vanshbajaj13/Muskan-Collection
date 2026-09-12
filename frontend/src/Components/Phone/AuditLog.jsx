import React, { useState, useEffect, useCallback } from "react";
import { Btn, Input, Spinner } from "./PhoneUI";

// ── Standalone fetch helpers ─────────────────────────────────────────────
// Kept local to this file (rather than added to PhoneContext.jsx) so no
// existing file needs to change. Mirrors the same token/auth pattern
// PhoneContext.jsx already uses.
const token = () => {
  const info = window.localStorage.getItem("userInfo");
  return info ? JSON.parse(info).token : "";
};

const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

async function fetchAuditLogs(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/phones/audit?${qs}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load audit log");
  return res.json();
}

async function fetchAuditStats(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/phones/audit/meta/stats?${qs}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load audit stats");
  return res.json();
}

// ── Presentation helpers ──────────────────────────────────────────────────
const ACTION_META = {
  create: { label: "Created", color: "emerald", icon: "+" },
  update: { label: "Edited", color: "indigo", icon: "✎" },
  delete: { label: "Deleted", color: "rose", icon: "✕" },
};

const ENTITY_LABEL = {
  PhoneDeal: "Deal",
  PhonePayment: "Payment",
};

const formatDateTime = (ts) =>
  new Date(ts).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatValue = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return v.toLocaleString("en-IN");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const ActionBadge = ({ action }) => {
  const meta = ACTION_META[action] || ACTION_META.update;
  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
  }[meta.color];
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${colorClasses}`}
    >
      <span>{meta.icon}</span>
      {meta.label}
    </span>
  );
};

const StatCard = ({ label, value, accent }) => (
  <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex-1 min-w-[120px]">
    <p className="text-xs text-slate-400 font-medium">{label}</p>
    <p className={`text-2xl font-bold mt-0.5 ${accent || "text-slate-800"}`}>
      {value}
    </p>
  </div>
);

// Renders the changed-field diff table for an "update" entry
const DiffTable = ({ changes }) => (
  <div className="mt-3 border border-slate-100 rounded-lg overflow-hidden">
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-slate-50 text-slate-500">
          <th className="text-left font-medium px-3 py-2 w-1/4">Field</th>
          <th className="text-left font-medium px-3 py-2 w-3/8">Before</th>
          <th className="text-left font-medium px-3 py-2 w-3/8">After</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {changes.map((c, i) => (
          <tr key={i}>
            <td className="px-3 py-2 font-medium text-slate-600 align-top">
              {c.field}
            </td>
            <td className="px-3 py-2 text-rose-500 align-top break-all">
              {formatValue(c.oldValue)}
            </td>
            <td className="px-3 py-2 text-emerald-600 align-top break-all">
              {formatValue(c.newValue)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Renders a compact key/value grid for a "create" or "delete" snapshot
const SnapshotGrid = ({ snapshot }) => {
  const entries = Object.entries(snapshot || {}).filter(
    ([k]) => !["_id", "__v", "createdAt", "updatedAt", "payments", "allocations"].includes(k)
  );
  return (
    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5 text-xs border border-slate-100 rounded-lg p-3 bg-slate-50">
      {entries.map(([k, v]) => (
        <div key={k} className="truncate">
          <span className="text-slate-400">{k}: </span>
          <span className="text-slate-700 font-medium">{formatValue(v)}</span>
        </div>
      ))}
    </div>
  );
};

const LogEntry = ({ log }) => {
  const [expanded, setExpanded] = useState(false);
  const hasDetail =
    (log.changes && log.changes.length > 0) || log.snapshot;

  return (
    <div className="px-5 py-4 hover:bg-slate-50/60 transition-colors">
      <div className="flex items-start gap-3" onClick={() => setExpanded((e) => !e)}>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ActionBadge action={log.action} />
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              {ENTITY_LABEL[log.entityType] || log.entityType}
            </span>
            <span className="text-sm font-semibold text-slate-800 truncate">
              {log.summary}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {formatDateTime(log.performedAt)} · by{" "}
            <span className="text-slate-500 font-medium">{log.performedBy}</span>
            {log.action === "update" && log.changes?.length > 0 && (
              <> · {log.changes.length} field{log.changes.length !== 1 ? "s" : ""} changed</>
            )}
          </p>

          {hasDetail && expanded && (
            <>
              {log.action === "update" && log.changes?.length > 0 && (
                <DiffTable changes={log.changes} />
              )}
              {(log.action === "create" || log.action === "delete") &&
                log.snapshot && <SnapshotGrid snapshot={log.snapshot} />}
            </>
          )}
        </div>

        {hasDetail && (
          <span
            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium shrink-0 px-2 py-1 rounded hover:bg-indigo-50"
          >
            {expanded ? "Hide" : "Details"}
          </span>
        )}
      </div>
    </div>
  );
};

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [entityType, setEntityType] = useState("all");
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (entityType !== "all") params.entityType = entityType;
      if (action !== "all") params.action = action;
      if (search.trim()) params.search = search.trim();

      const [logData, statData] = await Promise.all([
        fetchAuditLogs(params),
        fetchAuditStats({}),
      ]);
      setLogs(logData.logs || []);
      setPages(logData.pages || 1);
      setStats(statData);
    } catch (err) {
      setError(err.message || "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [page, entityType, action, search]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    setPage(1);
  }, [entityType, action, search]);

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-800">Audit Log</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Every create, edit, and delete across deals and payments — with full
          before/after detail.
        </p>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="flex flex-wrap gap-3 mb-5">
          <StatCard label="Total Events" value={stats.total} />
          <StatCard
            label="Created"
            value={stats.byAction?.create || 0}
            accent="text-emerald-600"
          />
          <StatCard
            label="Edited"
            value={stats.byAction?.update || 0}
            accent="text-indigo-600"
          />
          <StatCard
            label="Deleted"
            value={stats.byAction?.delete || 0}
            accent="text-rose-500"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-slate-400 font-medium block mb-1">
            Record type
          </label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700"
          >
            <option value="all">All</option>
            <option value="PhoneDeal">Deals</option>
            <option value="PhonePayment">Payments</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 font-medium block mb-1">
            Action
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700"
          >
            <option value="all">All</option>
            <option value="create">Created</option>
            <option value="update">Edited</option>
            <option value="delete">Deleted</option>
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-slate-400 font-medium block mb-1">
            Search
          </label>
          <Input
            placeholder="Search by product, buyer, amount…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Btn variant="secondary" onClick={load} disabled={loading}>
          {loading ? <Spinner size={16} /> : "Refresh"}
        </Btn>
      </div>

      {/* Log list */}
      <div className="bg-white rounded-xl border border-slate-200">
        {loading ? (
          <div className="flex justify-center items-center py-14">
            <Spinner size={32} />
          </div>
        ) : error ? (
          <div className="text-center py-14 text-rose-400 text-sm">{error}</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-14 text-slate-400">
            <p className="text-sm font-medium text-slate-500">No activity found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <LogEntry key={log._id} log={log} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4">
          <Btn
            variant="secondary"
            className="text-xs py-1.5 px-3"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </Btn>
          <span className="text-xs text-slate-400">
            Page {page} of {pages}
          </span>
          <Btn
            variant="secondary"
            className="text-xs py-1.5 px-3"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Next →
          </Btn>
        </div>
      )}
    </div>
  );
};

export default AuditLog;