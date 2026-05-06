/**
 * CriterionCard Component — Stitch Design
 * ==========================================
 * Editable card for a single evaluation criterion.
 * Officer can modify name, description, type, threshold, etc.
 */

import { useState } from "react";

const CRITERION_TYPES = [
  { value: "numeric", label: "Numeric (≥ threshold)" },
  { value: "date", label: "Date (expiry check)" },
  { value: "boolean", label: "Boolean (yes/no)" },
  { value: "text", label: "Text (free-form)" },
];

export default function CriterionCard({ criterion, index, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...criterion });

  const handleSave = () => {
    onUpdate(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft({ ...criterion });
    setEditing(false);
  };

  return (
    <div className="stitch-card animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
      {editing ? (
        /* ── Edit Mode ── */
        <div className="space-y-3">
          <div>
            <label className="label-caps block mb-1.5">Criterion Name</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="input-field font-semibold"
              placeholder="Criterion Name"
            />
          </div>
          <div>
            <label className="label-caps block mb-1.5">Description</label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="input-field h-24 resize-none text-sm"
              placeholder="Full description from tender document"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-caps block mb-1.5">Type</label>
              <select
                value={draft.criterion_type}
                onChange={(e) => setDraft({ ...draft, criterion_type: e.target.value })}
                className="select-field"
              >
                {CRITERION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-caps block mb-1.5">Threshold</label>
              <input
                type="text"
                value={draft.threshold_value || ""}
                onChange={(e) => setDraft({ ...draft, threshold_value: e.target.value })}
                className="input-field"
                placeholder="Threshold"
              />
            </div>
            <div>
              <label className="label-caps block mb-1.5">Unit</label>
              <input
                type="text"
                value={draft.unit || ""}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                className="input-field"
                placeholder="INR, years…"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-surface-700 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.is_mandatory}
                onChange={(e) => setDraft({ ...draft, is_mandatory: e.target.checked })}
                className="w-4 h-4 text-brand-500 border-surface-400 rounded focus:ring-brand-400"
              />
              Mandatory
            </label>
            <div className="flex-1">
              <input
                type="text"
                value={draft.section_reference || ""}
                onChange={(e) => setDraft({ ...draft, section_reference: e.target.value })}
                className="input-field"
                placeholder="Section reference (e.g., Section 4.2.1, Page 12)"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={handleCancel} className="btn-ghost text-sm">
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary text-sm">
              Save
            </button>
          </div>
        </div>
      ) : (
        /* ── View Mode ── */
        <div className="flex items-start gap-4">
          <span className="text-sm font-mono text-surface-400 mt-0.5 font-bold">{index + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-heading font-black text-sm text-surface-800">{criterion.name}</h4>
              {criterion.is_mandatory && <span className="badge-fail">Mandatory</span>}
              <span className="badge-pending">
                {criterion.criterion_type}
              </span>
            </div>
            <p className="text-sm text-surface-500 mt-1 line-clamp-2">{criterion.description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-surface-500">
              {criterion.threshold_value && (
                <span>
                  Threshold: <span className="font-bold text-surface-700">{criterion.threshold_value}</span>
                  {criterion.unit && ` ${criterion.unit}`}
                </span>
              )}
              {criterion.section_reference && <span>📍 {criterion.section_reference}</span>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="btn-tertiary text-xs"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(criterion.id)}
              className="btn-tertiary text-xs text-danger-500 hover:text-danger-600"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
