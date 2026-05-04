/**
 * Evaluation Dashboard Page
 * ==========================
 * Screen 3: Real-time view of evaluation progress. Shows per-bidder
 * verdict cards with pass/fail/review status.
 *
 * Key components: BidderScoreCard, VerdictBadge, ProgressBar
 * API calls:
 *   - GET /tenders (select tender)
 *   - GET /tenders/{id}/bidders (list bidders)
 *   - GET /criteria?tender_id=X (list criteria)
 *   - GET /verdicts?tender_id=X&bidder_id=Y (verdicts per bidder)
 *   - GET /evidence?tender_id=X&bidder_id=Y (evidence per bidder)
 */

import { useState, useEffect } from "react";
import { tenderApi, criteriaApi, verdictApi, evidenceApi } from "../api/client";
import VerdictBadge from "../components/VerdictBadge";

export default function EvaluationDashboardPage() {
  const [tenders, setTenders] = useState([]);
  const [activeTender, setActiveTender] = useState(null);
  const [bidders, setBidders] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [verdictsByBidder, setVerdictsByBidder] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    tenderApi.list().then(({ data }) => setTenders(Array.isArray(data) ? data : [])).catch(() => setTenders([]));
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

      // Load verdicts per bidder
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

  // Refresh data every 10s to catch n8n updates
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
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Evaluation Dashboard</h2>
        <p className="text-gray-400 mt-1">
          Live evaluation progress. Auto-refreshes every 10 seconds.
        </p>
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
          <div className="inline-block w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 mt-4">Loading evaluation data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {bidders.map((bidder) => {
            const score = getScoreSummary(bidder.id);
            const verdicts = verdictsByBidder[bidder.id] || [];
            const passRate = score.total > 0 ? ((score.pass / score.total) * 100).toFixed(0) : 0;

            return (
              <div key={bidder.id} className="glass-card p-6 space-y-4">
                {/* Bidder header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{bidder.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">{bidder.id.slice(0, 8)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold gradient-text">{passRate}%</span>
                    <p className="text-xs text-gray-500">pass rate</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
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

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <span className="text-accent-400 font-bold text-lg">{score.pass}</span>
                    <p className="text-gray-500">Pass</p>
                  </div>
                  <div>
                    <span className="text-danger-400 font-bold text-lg">{score.fail}</span>
                    <p className="text-gray-500">Fail</p>
                  </div>
                  <div>
                    <span className="text-warning-400 font-bold text-lg">{score.review}</span>
                    <p className="text-gray-500">Review</p>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold text-lg">{score.pending}</span>
                    <p className="text-gray-500">Pending</p>
                  </div>
                </div>

                {/* Verdict list */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {criteria.map((c) => {
                    const v = verdicts.find((verdict) => verdict.criterion_id === c.id);
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg text-sm"
                      >
                        <span className="text-gray-300 truncate flex-1">{c.name}</span>
                        {v ? (
                          <VerdictBadge verdict={v.verdict} />
                        ) : (
                          <span className="text-xs text-gray-600">Pending</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {bidders.length === 0 && (
            <div className="col-span-2 glass-card p-12 text-center">
              <p className="text-gray-500 text-lg">
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
