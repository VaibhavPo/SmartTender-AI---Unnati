/**
 * VerdictBadge Component
 * =======================
 * Renders a colored badge for each verdict status.
 */

const VERDICT_STYLES = {
  PASS: "badge-pass",
  FAIL: "badge-fail",
  MANUAL_REVIEW: "badge-review",
  OFFICER_APPROVED: "badge-pass",
  OFFICER_REJECTED: "badge-fail",
};

const VERDICT_LABELS = {
  PASS: "✅ Pass",
  FAIL: "❌ Fail",
  MANUAL_REVIEW: "⚠️ Review",
  OFFICER_APPROVED: "👤 Approved",
  OFFICER_REJECTED: "👤 Rejected",
};

export default function VerdictBadge({ verdict }) {
  const className = VERDICT_STYLES[verdict] || "badge-review";
  const label = VERDICT_LABELS[verdict] || verdict;

  return <span className={className}>{label}</span>;
}
