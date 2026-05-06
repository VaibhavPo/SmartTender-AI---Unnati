/**
 * Audit Logs Page — Stitch Design
 * ==================================
 * Shows a chronological audit trail of all actions taken on the
 * active tender: uploads, criteria extraction, evaluations, overrides.
 */

import { useState, useEffect, useCallback } from "react";
import { useTender } from "../contexts";
import { documentApi, criteriaApi, verdictApi } from "../api/client";
import {
  ScrollText,
  FileText,
  ClipboardCheck,
  BarChart3,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
} from "lucide-react";

// Icon + color mapping for event types
const EVENT_CONFIG = {
  upload:    { Icon: FileText,       color: "text-brand-400",   bg: "bg-brand-50 dark:bg-brand-400/10" },
  extract:   { Icon: ClipboardCheck, color: "text-accent-500",  bg: "bg-accent-50 dark:bg-accent-500/10" },
  evaluate:  { Icon: BarChart3,      color: "text-warning-500", bg: "bg-warning-50 dark:bg-warning-500/10" },
  override:  { Icon: UserCheck,      color: "text-brand-500",   bg: "bg-brand-50 dark:bg-brand-400/10" },
  pass:      { Icon: CheckCircle2,   color: "text-accent-500",  bg: "bg-accent-50 dark:bg-accent-500/10" },
  fail:      { Icon: XCircle,        color: "text-danger-500",  bg: "bg-danger-50 dark:bg-danger-500/10" },
  review:    { Icon: AlertTriangle,  color: "text-warning-500", bg: "bg-warning-50 dark:bg-warning-500/10" },
  system:    { Icon: Clock,          color: "text-surface-400",  bg: "bg-surface-200 dark:bg-white/[0.06]" },
};

export default function AuditLogsPage() {
  const { activeTender } = useTender();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const buildAuditTrail = useCallback(async (tenderId) => {
    setLoading(true);
    const trail = [];

    try {
      // 1. Tender creation event
      trail.push({
        id: `tender-${tenderId}`,
        type: "system",
        action: "Tender Created",
        detail: `Tender "${activeTender?.name || tenderId}" was created`,
        timestamp: activeTender?.created_at || new Date().toISOString(),
        actor: "Officer",
      });

      // 2. Document uploads
      try {
        const { data: docs } = await documentApi.list(tenderId);
        if (Array.isArray(docs)) {
          docs.forEach((doc) => {
            trail.push({
              id: `doc-${doc.id}`,
              type: "upload",
              action: "Document Uploaded",
              detail: `${doc.filename} — ${doc.num_pages || "?"} pages, Status: ${doc.status}`,
              timestamp: doc.created_at || doc.uploaded_at || new Date().toISOString(),
              actor: "Officer",
            });
            if (doc.status === "completed") {
              trail.push({
                id: `doc-parsed-${doc.id}`,
                type: "extract",
                action: "Document Parsed",
                detail: `${doc.filename} parsing completed by Docling Engine`,
                timestamp: doc.updated_at || doc.created_at || new Date().toISOString(),
                actor: "System (Docling)",
              });
            }
          });
        }
      } catch { /* no docs */ }

      // 3. Criteria extraction
      try {
        const { data: criteria } = await criteriaApi.list(tenderId);
        if (Array.isArray(criteria) && criteria.length > 0) {
          trail.push({
            id: `criteria-extract-${tenderId}`,
            type: "extract",
            action: "Criteria Extracted",
            detail: `${criteria.length} evaluation criteria extracted by AI`,
            timestamp: criteria[0]?.created_at || new Date().toISOString(),
            actor: "System (AI)",
          });
          criteria.forEach((c) => {
            trail.push({
              id: `criterion-${c.id}`,
              type: "extract",
              action: "Criterion Identified",
              detail: `"${c.name}" — Type: ${c.criterion_type}, ${c.is_mandatory ? "Mandatory" : "Optional"}`,
              timestamp: c.created_at || new Date().toISOString(),
              actor: "System (AI)",
            });
          });
        }
      } catch { /* no criteria */ }

      // 4. Verdicts / evaluations
      try {
        const { data: verdicts } = await verdictApi.list(tenderId);
        if (Array.isArray(verdicts)) {
          verdicts.forEach((v) => {
            const vType = v.verdict === "PASS" || v.verdict === "OFFICER_APPROVED" ? "pass"
              : v.verdict === "FAIL" || v.verdict === "OFFICER_REJECTED" ? "fail"
              : v.verdict === "MANUAL_REVIEW" ? "review"
              : "evaluate";

            trail.push({
              id: `verdict-${v.id}`,
              type: vType,
              action: `Verdict: ${v.verdict}`,
              detail: v.reason || "No reason provided",
              timestamp: v.created_at || new Date().toISOString(),
              actor: v.decided_by || "System (AI)",
            });

            // If overridden by officer
            if (v.verdict === "OFFICER_APPROVED" || v.verdict === "OFFICER_REJECTED") {
              trail.push({
                id: `override-${v.id}`,
                type: "override",
                action: "Officer Override",
                detail: `Verdict overridden to ${v.verdict}${v.justification ? `: ${v.justification}` : ""}`,
                timestamp: v.updated_at || v.created_at || new Date().toISOString(),
                actor: "Officer",
              });
            }
          });
        }
      } catch { /* no verdicts */ }

      // Sort by timestamp descending (newest first)
      trail.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setLogs(trail);
    } catch (err) {
      console.error("Failed to build audit trail:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTender]);

  // Build audit trail from existing API data
   
  useEffect(() => {
    if (activeTender) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      buildAuditTrail(activeTender.id);
    }
  }, [activeTender, buildAuditTrail]);

  // Filter and search
  const filteredLogs = logs.filter((log) => {
    if (filterType !== "all" && log.type !== filterType) return false;
    if (searchTerm && !log.action.toLowerCase().includes(searchTerm.toLowerCase()) && !log.detail.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const formatTimestamp = (ts) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return ts;
    }
  };

  const filterOptions = [
    { value: "all", label: "All Events" },
    { value: "upload", label: "Uploads" },
    { value: "extract", label: "Extractions" },
    { value: "pass", label: "Pass" },
    { value: "fail", label: "Fail" },
    { value: "review", label: "Manual Review" },
    { value: "override", label: "Overrides" },
    { value: "system", label: "System" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-surface-800 dark:text-gray-100 tracking-tight flex items-center gap-2">
            <ScrollText size={22} className="text-brand-500 dark:text-brand-400" />
            Audit Trail
          </h2>
          <p className="text-[13px] text-surface-500 dark:text-gray-500 mt-0.5">
            Chronological record of all actions for {activeTender?.name || "this tender"}.
          </p>
        </div>
        <span className="badge-info">{filteredLogs.length} events</span>
      </div>

      {/* Filters row */}
      <div className="flex gap-3 flex-wrap items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search events..."
            className="input-field !pl-9 text-xs"
          />
        </div>
        {/* Filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          {filterOptions.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterType(f.value)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all border ${
                filterType === f.value
                  ? "bg-brand-400/[0.12] dark:bg-brand-400/[0.15] text-brand-500 dark:text-brand-300 border-brand-400/30"
                  : "text-surface-500 dark:text-gray-500 bg-white dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] hover:bg-surface-200 dark:hover:bg-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* No tender selected */}
      {!activeTender ? (
        <div className="stitch-card py-16 text-center">
          <ScrollText size={40} className="text-surface-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-surface-500 dark:text-gray-500 text-base">
            Select a tender from the Upload page to view its audit trail.
          </p>
        </div>
      ) : loading ? (
        <div className="stitch-card py-16 text-center">
          <div className="inline-block w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-surface-500 dark:text-gray-500 mt-4 text-sm">Loading audit trail...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="stitch-card py-16 text-center">
          <ScrollText size={40} className="text-surface-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-surface-500 dark:text-gray-500">
            {searchTerm || filterType !== "all" ? "No matching events found." : "No audit events recorded yet."}
          </p>
        </div>
      ) : (
        /* Timeline */
        <div className="stitch-card !p-0 overflow-hidden">
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {filteredLogs.map((log, idx) => {
              const config = EVENT_CONFIG[log.type] || EVENT_CONFIG.system;
              const { Icon } = config;

              return (
                <div key={log.id + idx} className="flex items-start gap-4 px-5 py-4 hover:bg-surface-200/40 dark:hover:bg-white/[0.02] transition-colors">
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon size={15} className={config.color} strokeWidth={2} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-surface-800 dark:text-gray-200">
                        {log.action}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-200/60 dark:bg-white/[0.06] text-surface-500 dark:text-gray-500 uppercase tracking-wide">
                        {log.actor}
                      </span>
                    </div>
                    <p className="text-[12px] text-surface-600 dark:text-gray-400 mt-0.5 truncate">
                      {log.detail}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <span className="text-[10px] text-surface-400 dark:text-gray-600 whitespace-nowrap font-medium shrink-0 mt-1">
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
