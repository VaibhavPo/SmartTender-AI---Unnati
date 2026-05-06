/**
 * StatusBadge Component — Stitch Design
 * =======================================
 * Shows document processing status or verdict status with appropriate colors.
 */

const STATUS_CONFIG = {
  pending: { label: "Pending", className: "badge-pending" },
  processing: { label: "Processing", className: "badge-info" },
  completed: { label: "Completed", className: "badge-pass" },
  failed: { label: "Failed", className: "badge-fail" },
  PASS: { label: "Pass", className: "badge-pass" },
  FAIL: { label: "Fail", className: "badge-fail" },
  MANUAL_REVIEW: { label: "Review", className: "badge-review" },
  OFFICER_APPROVED: { label: "Approved", className: "badge-pass" },
  OFFICER_REJECTED: { label: "Rejected", className: "badge-fail" },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <span className={config.className}>
      {status === "processing" && (
        <span className="w-1.5 h-1.5 bg-brand-400 rounded-full mr-1.5 animate-pulse" />
      )}
      {config.label}
    </span>
  );
}
