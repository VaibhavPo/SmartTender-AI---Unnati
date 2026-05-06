/**
 * Manual Review Page — Stitch Design
 * =====================================
 * Screen 4: Shows all MANUAL_REVIEW verdicts. Officer can view evidence,
 * see the AI's reasoning, and override with their own judgment.
 */

import { useState, useEffect } from "react";
import { tenderApi, criteriaApi, verdictApi, evidenceApi } from "../api/client";
import { useTender } from "../App";
import VerdictBadge from "../components/VerdictBadge";
import StatusBadge from "../components/StatusBadge";

export default function ManualReviewPage() {
  const { activeTender, setActiveTender, tenders, setTenders } = useTender();
  const [reviewItems, setReviewItems] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [bidders, setBidders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Override modal state
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [overrideVerdict, setOverrideVerdict] = useState("OFFICER_APPROVED");
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    tenderApi.list().then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setTenders(list);
      if (list.length > 0 && !activeTender) setActiveTender(list[0]);
    }).catch(() => setTenders([]));
  }, []);

  useEffect(() => {
    if (activeTender) loadReviewItems(activeTender.id);
  }, [activeTender]);

  const loadReviewItems = async (tenderId) => {
    setLoading(true);
    try {
      const [verdictsRes, criteriaRes, biddersRes] = await Promise.all([
        verdictApi.list(tenderId),
        criteriaApi.list(tenderId),
        tenderApi.listBidders(tenderId),
      ]);

      setCriteria(criteriaRes.data);
      setBidders(biddersRes.data);

      const manualReview = verdictsRes.data.filter(
        (v) => v.verdict === "MANUAL_REVIEW"
      );
      setReviewItems(manualReview);
    } catch (err) {
      console.error("Failed to load review items:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideTarget || justification.trim().length < 10) {
      alert("Justification must be at least 10 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await verdictApi.override({
        verdict_id: overrideTarget.id,
        new_verdict: overrideVerdict,
        justification: justification.trim(),
      });
      setReviewItems((prev) => prev.filter((v) => v.id !== overrideTarget.id));
      setOverrideTarget(null);
      setJustification("");
    } catch (err) {
      alert(`Override failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getCriterion = (id) => criteria.find((c) => c.id === id);
  const getBidder = (id) => bidders.find((b) => b.id === id);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-surface-500 dark:text-gray-500">
            Items the AI couldn’t decide on. Your judgment is required.
          </p>
        </div>
        {reviewItems.length > 0 && (
          <span className="badge-review">
            {reviewItems.length} items pending
          </span>
        )}
      </div>

      {/* Tender selector */}
      {tenders.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {tenders.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTender(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                activeTender?.id === t.id
                  ? "bg-brand-400/[0.12] dark:bg-brand-400/[0.15] text-brand-500 dark:text-brand-300 border-brand-400/30 font-extrabold"
                  : "text-surface-600 dark:text-gray-400 bg-surface-200/50 dark:bg-white/[0.06] border-transparent hover:bg-surface-200 dark:hover:bg-white/10"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="stitch-card py-16 text-center">
          <div className="inline-block w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reviewItems.length === 0 ? (
        <div className="stitch-card py-12 text-center">
          <p className="text-surface-500 dark:text-gray-500 text-base">
            {activeTender
              ? "🎉 No items need manual review."
              : "Select a tender."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviewItems.map((verdict) => {
            const criterion = getCriterion(verdict.criterion_id);
            const bidder = getBidder(verdict.bidder_id);

            return (
              <div key={verdict.id} className="stitch-card space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <VerdictBadge verdict={verdict.verdict} />
                      <span className="font-heading font-extrabold text-sm text-surface-800 dark:text-gray-100">
                        Criterion: {criterion?.name || "Unknown"}
                      </span>
                    </div>
                    <p className="text-xs text-surface-500 dark:text-gray-500">
                      Bidder: <span className="font-semibold text-brand-500 dark:text-brand-300">{bidder?.name || "Unknown"}</span>
                    </p>
                    {criterion?.is_mandatory && (
                      <span className="badge-fail mt-1 inline-block">Mandatory</span>
                    )}
                  </div>
                </div>

                {/* AI reasoning */}
                <div className="bg-surface-200/60 dark:bg-white/[0.06] rounded-lg p-4">
                  <p className="label-caps mb-2">AI Reasoning</p>
                  <p className="text-sm text-surface-700 dark:text-gray-300">{verdict.reason}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-surface-500 dark:text-gray-500">
                    <span>Confidence: <b>{(verdict.confidence * 100).toFixed(0)}%</b></span>
                    <span>Decided by: <b>{verdict.decided_by}</b></span>
                  </div>
                </div>

                {/* Override actions */}
                <div className="flex gap-3 justify-end pt-1">
                  <button
                    id={`reject-${verdict.id}`}
                    onClick={() => {
                      setOverrideTarget(verdict);
                      setOverrideVerdict("OFFICER_REJECTED");
                    }}
                    className="btn-secondary text-sm"
                  >
                    Reject
                  </button>
                  <button
                    id={`approve-${verdict.id}`}
                    onClick={() => {
                      setOverrideTarget(verdict);
                      setOverrideVerdict("OFFICER_APPROVED");
                    }}
                    className="btn-primary text-sm"
                  >
                    Approve
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Override Modal */}
      {overrideTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-[#1E293B] rounded-xl p-8 w-full max-w-lg mx-4 space-y-4 shadow-2xl border border-black/[0.08] dark:border-white/[0.1]">
            <h3 className="font-heading font-extrabold text-lg text-surface-800 dark:text-gray-100">
              Officer override
            </h3>
            <p className="text-sm text-surface-500 dark:text-gray-400">
              This will set the verdict to <b>{overrideVerdict === "OFFICER_APPROVED" ? "APPROVED" : "REJECTED"}</b>.
            </p>
            <textarea
              id="override-justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Provide a justification for the override (required)."
              className="input-field h-32 resize-none"
              required
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setOverrideTarget(null);
                  setJustification("");
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                id="submit-override-btn"
                onClick={handleOverride}
                disabled={submitting || justification.trim().length < 10}
                className="btn-primary disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit override"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
