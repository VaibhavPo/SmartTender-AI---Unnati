/**
 * Evaluation Dashboard Page — Stitch Design
 * ============================================
 * Screen 3: Real-time view of evaluation progress.
 * Shows per-bidder verdict cards with pass/fail/review status.
 */

import { useState, useEffect } from "react";
import { tenderApi, criteriaApi, verdictApi, evidenceApi } from "../api/client";
import { useTender } from "../App";
import VerdictBadge from "../components/VerdictBadge";
import StatusBadge from "../components/StatusBadge";

export default function EvaluationDashboardPage() {
  const { activeTender, setActiveTender, tenders, setTenders } = useTender();
  const [bidders, setBidders] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [verdictsByBidder, setVerdictsByBidder] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    tenderApi.list().then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setTenders(list);
      if (list.length > 0 && !activeTender) setActiveTender(list[0]);
    }).catch(() => setTenders([]));
  }, []);

  useEffect(() => {
    if (activeTender) {
      loadEvaluationData(activeTender.id);
    }
  }, [activeTender]);

  const loadEvaluationData = async (tenderId) => {
    setLoading(true);
    try {
      const [biddersRes, criteriaRes] = await Promise.all([
        tenderApi.listBidders(tenderId),
        criteriaApi.list(tenderId),
      ]);
      setBidders(biddersRes.data);
      setCriteria(criteriaRes.data);

      const verdictMap = {};
      for (const bidder of biddersRes.data) {
        const { data } = await verdictApi.list(tenderId, bidder.id);
        verdictMap[bidder.id] = data;
      }
      setVerdictsByBidder(verdictMap);
    } catch (err) {
      console.error("Failed to load evaluation data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeTender) return;
    const interval = setInterval(() => loadEvaluationData(activeTender.id), 10000);
    return () => clearInterval(interval);
  }, [activeTender]);

  const getScoreSummary = (bidderId) => {
    const verdicts = verdictsByBidder[bidderId] || [];
    const total = criteria.length;
    const pass = verdicts.filter((v) => v.verdict === "PASS" || v.verdict === "OFFICER_APPROVED").length;
    const fail = verdicts.filter((v) => v.verdict === "FAIL" || v.verdict === "OFFICER_REJECTED").length;
    const review = verdicts.filter((v) => v.verdict === "MANUAL_REVIEW").length;
    const pending = total - verdicts.length;
    return { total, pass, fail, review, pending };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tender selector chips */}
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
          <p className="text-surface-500 dark:text-gray-500 mt-4 text-sm">Loading evaluation data...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bidders.map((bidder) => {
            const score = getScoreSummary(bidder.id);
            const verdicts = verdictsByBidder[bidder.id] || [];
            const passRate = score.total > 0 ? ((score.pass / score.total) * 100).toFixed(0) : 0;

            return (
              <div key={bidder.id} className="stitch-card space-y-4">
                {/* Bidder header */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-heading font-extrabold text-[15px] text-surface-800 dark:text-gray-100">{bidder.name}</h3>
                    <p className="text-xs text-surface-500 dark:text-gray-500 mt-0.5">
                      {score.pass} pass • {score.fail} fail • {score.review} manual • {score.pending} pending
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge
                      status={
                        score.fail > 0 ? "FAIL" :
                        score.review > 0 ? "MANUAL_REVIEW" :
                        score.pending > 0 ? "pending" :
                        (score.pass > 0 && score.pass === score.total) ? "PASS" :
                        "pending"
                      }
                    />
                    <span className="text-2xl font-heading font-extrabold text-brand-500 dark:text-brand-300">{passRate}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-300 dark:bg-white/10">
                  <div
                    className="bg-accent-500 transition-all duration-500"
                    style={{ width: `${(score.pass / Math.max(score.total, 1)) * 100}%` }}
                  />
                  <div
                    className="bg-danger-500 transition-all duration-500"
                    style={{ width: `${(score.fail / Math.max(score.total, 1)) * 100}%` }}
                  />
                  <div
                    className="bg-warning-500 transition-all duration-500"
                    style={{ width: `${(score.review / Math.max(score.total, 1)) * 100}%` }}
                  />
                </div>

                {/* Verdict list */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {criteria.map((c) => {
                    const v = verdicts.find((verdict) => verdict.criterion_id === c.id);
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between px-3 py-2 bg-surface-200/50 dark:bg-white/[0.06] rounded-lg text-sm"
                      >
                        <span className="text-surface-700 dark:text-gray-300 font-semibold truncate flex-1">{c.name}</span>
                        <div className="flex items-center gap-2">
                          {v ? (
                            <>
                              <VerdictBadge verdict={v.verdict} />
                              <span className="text-[11px] text-surface-500 dark:text-gray-400 font-bold">
                                {Math.round(v.confidence * 100)}%
                              </span>
                            </>
                          ) : (
                            <span className="badge-pending">Pending</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {bidders.length === 0 && (
            <div className="stitch-card py-12 text-center">
              <p className="text-surface-500 text-base">
                {activeTender
                  ? "No bidders registered. Go to Upload to add bidders."
                  : "Select a tender to view evaluation."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
