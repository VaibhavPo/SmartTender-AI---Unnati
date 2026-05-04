/**
 * StatusBadge Component
 * ======================
 * Shows document processing status with appropriate colors.
 */

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "text-gray-400 bg-gray-500/20 border-gray-500/30" },
  processing: { label: "Processing", color: "text-blue-400 bg-blue-500/20 border-blue-500/30" },
  completed: { label: "Completed", color: "text-accent-400 bg-accent-500/20 border-accent-500/30" },
  failed: { label: "Failed", color: "text-danger-400 bg-danger-500/20 border-danger-500/30" },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.color}`}
    >
      {status === "processing" && (
        <span className="w-2 h-2 bg-blue-400 rounded-full mr-1.5 animate-pulse" />
      )}
      {config.label}
    </span>
  );
}
