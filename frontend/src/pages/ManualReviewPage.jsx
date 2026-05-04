/**
 * Manual Review Page
 * ===================
 * Screen 4: Shows all MANUAL_REVIEW verdicts. Officer can view evidence,
 * see the AI's reasoning, and override with their own judgment.
 *
 * Key components: ReviewCard, OverrideModal
 * API calls:
 *   - GET /tenders (select tender)
 *   - GET /verdicts?tender_id=X (filter MANUAL_REVIEW)
 *   - GET /evidence/{id} (fetch evidence detail)
 *   - GET /criteria?tender_id=X (criterion details)
 *   - POST /verdicts/override (submit override)
 */

import { useState, useEffect } from "react";
import { tenderApi, criteriaApi, verdictApi, evidenceApi } from "../api/client";
import VerdictBadge from "../components/VerdictBadge";

export default function ManualReviewPage() {
  const [tenders, setTenders] = useState([]);
  const [activeTender, setActiveTender] = useState(null);
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
    tenderApi.list().then(({ data }) => setTenders(Array.isArray(data) ? data : [])).catch(() => setTenders([]));
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

      // Filter for MANUAL_REVIEW verdicts
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
      // Remove from queue and refresh
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
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Manual Review Queue</h2>
        <p className="text-gray-400 mt-1">
          Items the AI couldn't decide on. Your judgment is required.
        </p>
        {reviewItems.length > 0 && (
          <span className="badge-review mt-2 inline-block">
            {reviewItems.length} items pending review
          </span>
        )}
      </div>

      {/* Tender selector */}
      <div className="flex gap-2 flex-wrap">
        {tenders.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTender(t)}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${
              activeTender?.id === t.id
                ? "bg-primary-600/20 text-primary-400 border border-primary-500/20"
                : "text-gray-400 bg-white/5 hover:bg-white/10"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center">
          <div className="inline-block w-8 h-8 border-2 border-warning-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reviewItems.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-gray-500 text-lg">
            {activeTender
              ? "🎉 No items need manual review."
              : "Select a tender."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviewItems.map((verdict) => {
            const criterion = getCriterion(verdict.criterion_id);
            const bidder = getBidder(verdict.bidder_id);

            return (
              <div key={verdict.id} className="glass-card p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-semibold">
                      {criterion?.name || "Unknown Criterion"}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Bidder: <span className="text-primary-400">{bidder?.name || "Unknown"}</span>
                    </p>
                    {criterion?.is_mandatory && (
                      <span className="badge-fail mt-2 inline-block">Mandatory</span>
                    )}
                  </div>
                  <VerdictBadge verdict={verdict.verdict} />
                </div>

                {/* AI reasoning */}
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">AI Reasoning</p>
                  <p className="text-sm text-gray-300">{verdict.reason}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>Confidence: {(verdict.confidence * 100).toFixed(0)}%</span>
                    <span>Decided by: {verdict.decided_by}</span>
                  </div>
                </div>

                {/* Override actions */}
                <div className="flex gap-3">
                  <button
                    id={`approve-${verdict.id}`}
                    onClick={() => {
                      setOverrideTarget(verdict);
                      setOverrideVerdict("OFFICER_APPROVED");
                    }}
                    className="flex-1 py-2.5 bg-accent-500/20 text-accent-400 font-medium rounded-xl
                               hover:bg-accent-500/30 transition-all text-sm border border-accent-500/20"
                  >
                    ✅ Approve
                  </button>
                  <button
                    id={`reject-${verdict.id}`}
                    onClick={() => {
                      setOverrideTarget(verdict);
                      setOverrideVerdict("OFFICER_REJECTED");
                    }}
                    className="flex-1 py-2.5 bg-danger-500/20 text-danger-400 font-medium rounded-xl
                               hover:bg-danger-500/30 transition-all text-sm border border-danger-500/20"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Override Modal */}
      {overrideTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-card p-8 w-full max-w-lg mx-4 space-y-4">
            <h3 className="text-lg font-bold text-white">
              {overrideVerdict === "OFFICER_APPROVED" ? "Approve" : "Reject"} Verdict
            </h3>
            <p className="text-sm text-gray-400">
              You are overriding the AI. This action is recorded in the audit trail.
            </p>
            <textarea
              id="override-justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Justification (minimum 10 characters) *"
              className="input-field h-32 resize-none"
              required
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setOverrideTarget(null);
                  setJustification("");
                }}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                id="submit-override-btn"
                onClick={handleOverride}
                disabled={submitting || justification.trim().length < 10}
                className={`flex-1 ${
                  overrideVerdict === "OFFICER_APPROVED" ? "btn-primary" : "btn-danger"
                }`}
              >
                {submitting ? "Submitting..." : "Confirm Override"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
