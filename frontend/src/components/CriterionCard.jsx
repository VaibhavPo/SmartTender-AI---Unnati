/**
 * CriterionCard Component
 * ========================
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

export default function CriterionCard({ criterion, index, onUpdate }) {
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
    <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
      {editing ? (
        /* ── Edit Mode ── */
        <div className="space-y-3">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="input-field font-semibold"
            placeholder="Criterion Name"
          />
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="input-field h-24 resize-none text-sm"
            placeholder="Full description from tender document"
          />
          <div className="grid grid-cols-3 gap-3">
            <select
              value={draft.criterion_type}
              onChange={(e) => setDraft({ ...draft, criterion_type: e.target.value })}
              className="input-field text-sm"
            >
              {CRITERION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={draft.threshold_value || ""}
              onChange={(e) => setDraft({ ...draft, threshold_value: e.target.value })}
              className="input-field text-sm"
              placeholder="Threshold"
            />
            <input
              type="text"
              value={draft.unit || ""}
              onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
              className="input-field text-sm"
              placeholder="Unit (INR, years…)"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={draft.is_mandatory}
                onChange={(e) => setDraft({ ...draft, is_mandatory: e.target.checked })}
                className="rounded border-white/20"
              />
              Mandatory
            </label>
            <input
              type="text"
              value={draft.section_reference || ""}
              onChange={(e) => setDraft({ ...draft, section_reference: e.target.value })}
              className="input-field text-sm flex-1"
              placeholder="Section reference (e.g., Section 4.2.1, Page 12)"
            />
          </div>
          <div className="flex gap-2 justify-end">
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
          <span className="text-lg font-mono text-gray-600 mt-0.5">{index + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-white font-semibold">{criterion.name}</h4>
              {criterion.is_mandatory && <span className="badge-fail">Mandatory</span>}
              <span className="text-xs text-gray-500 px-2 py-0.5 bg-white/5 rounded-full">
                {criterion.criterion_type}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{criterion.description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              {criterion.threshold_value && (
                <span>
                  Threshold: <span className="text-gray-300">{criterion.threshold_value}</span>
                  {criterion.unit && ` ${criterion.unit}`}
                </span>
              )}
              {criterion.section_reference && <span>📍 {criterion.section_reference}</span>}
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-primary-400 hover:text-primary-300 transition-colors shrink-0"
          >
            ✏️ Edit
          </button>
        </div>
      )}
    </div>
  );
}
