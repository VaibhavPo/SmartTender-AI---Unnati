/**
 * Manual Review Page — Stitch Design
 * =====================================
 * Screen 4: Shows all MANUAL_REVIEW verdicts. Officer can view evidence,
 * see the AI's reasoning, and override with their own judgment.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { tenderApi, criteriaApi, verdictApi, evidenceApi } from "../api/client";
import { useTender } from "../contexts";
import { Search, Edit3, X, Check, Filter } from "lucide-react";

export default function ManualReviewPage() {
  const { activeTender, setActiveTender, tenders, setTenders } = useTender();
  const [reviewItems, setReviewItems] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [bidders, setBidders] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [bidderFilter, setBidderFilter] = useState("");

  // Override modal state
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [overrideVerdict, setOverrideVerdict] = useState("OFFICER_APPROVED");
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async (tenderId) => {
    setLoading(true);
    try {
      const [verdictsRes, criteriaRes, biddersRes, evidenceRes] = await Promise.all([
        verdictApi.list(tenderId),
        criteriaApi.list(tenderId),
        tenderApi.listBidders(tenderId),
        evidenceApi.list(tenderId),
      ]);

      setCriteria(criteriaRes.data || []);
      setBidders(biddersRes.data || []);
      setEvidence(evidenceRes.data || []);

      const manualReview = (verdictsRes.data || []).filter(
        (v) => v.verdict === "MANUAL_REVIEW"
      );
      setReviewItems(manualReview);
    } catch (err) {
      console.error("Failed to load review items:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    tenderApi.list().then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setTenders(list);
      if (list.length > 0 && !activeTender) setActiveTender(list[0]);
    }).catch(() => setTenders([]));
  }, [activeTender, setActiveTender, setTenders]);

   
  useEffect(() => {
    if (activeTender) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData(activeTender.id);
    }
  }, [activeTender, loadData]);

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

  const filteredItems = useMemo(() => {
    return reviewItems
      .map((v) => {
        const bidder = bidders.find((b) => b.id === v.bidder_id);
        const criterion = criteria.find((c) => c.id === v.criterion_id);
        const ev = evidence.find((e) => e.bidder_id === v.bidder_id && e.criterion_id === v.criterion_id);
        
        return {
          ...v,
          bidder_name: bidder?.name || "Unknown",
          criterion_name: criterion?.name || "Unknown",
          criterion_description: criterion?.description || "",
          source_text: ev?.source_text || "No evidence extracted",
        };
      })
      .filter((item) => 
        bidderFilter === "" || item.bidder_name.toLowerCase().includes(bidderFilter.toLowerCase())
      );
  }, [reviewItems, bidders, criteria, evidence, bidderFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-surface-800 dark:text-gray-100 tracking-tight">Manual Review Queue</h2>
          <p className="text-[13px] text-surface-500 dark:text-gray-500 mt-0.5">
            Resolve ambiguities identified by AI for the current tender.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-200 dark:bg-white/10 rounded-md border border-black/[0.05] dark:border-white/10">
          <Filter size={14} className="text-brand-500 dark:text-brand-400" />
          <span className="text-xs font-bold text-surface-700 dark:text-gray-300">{filteredItems.length} items pending</span>
        </div>
      </div>

      {/* Tender selector */}
      {tenders.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {tenders.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTender(t)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border ${
                activeTender?.id === t.id
                  ? "bg-brand-400/[0.12] dark:bg-brand-400/[0.15] text-brand-500 dark:text-brand-300 border-brand-400/30 font-extrabold"
                  : "text-surface-500 dark:text-gray-500 bg-surface-200/50 dark:bg-white/[0.06] border-transparent hover:bg-surface-200 dark:hover:bg-white/10"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="stitch-card !p-4 flex gap-4 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input 
            value={bidderFilter}
            onChange={(e) => setBidderFilter(e.target.value)}
            className="input-field pl-9 text-xs py-2" 
            placeholder="Search by bidder name..." 
          />
        </div>
        <div className="h-6 w-px bg-surface-300 dark:bg-white/10" />
        <p className="text-[11px] text-surface-500 dark:text-gray-500">
          Showing {filteredItems.length} review items
        </p>
      </div>

      {loading ? (
        <div className="stitch-card py-20 text-center">
          <div className="inline-block w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="stitch-card py-16 text-center space-y-3">
          <div className="w-12 h-12 bg-surface-200 dark:bg-white/[0.05] rounded-full flex items-center justify-center mx-auto">
            <Check size={24} className="text-brand-500 dark:text-brand-400" />
          </div>
          <p className="text-surface-500 dark:text-gray-500 text-sm font-medium">
            {activeTender ? "All items have been reviewed!" : "Select a tender to begin review."}
          </p>
        </div>
      ) : (
        <div className="stitch-card !p-0 overflow-hidden border border-black/[0.08] dark:border-white/[0.1]">
          <table className="data-table w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-200/50 dark:bg-white/[0.03]">
                <th className="px-4 py-3 text-[11px] font-bold text-surface-500 dark:text-gray-400 uppercase tracking-wider">Bidder</th>
                <th className="px-4 py-3 text-[11px] font-bold text-surface-500 dark:text-gray-400 uppercase tracking-wider">Criteria</th>
                <th className="px-4 py-3 text-[11px] font-bold text-surface-500 dark:text-gray-400 uppercase tracking-wider w-1/4">Description</th>
                <th className="px-4 py-3 text-[11px] font-bold text-surface-500 dark:text-gray-400 uppercase tracking-wider w-1/4">LLM Reason</th>
                <th className="px-4 py-3 text-[11px] font-bold text-surface-500 dark:text-gray-400 uppercase tracking-wider w-1/4">Evidence</th>
                <th className="px-4 py-3 text-[11px] font-bold text-surface-500 dark:text-gray-400 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-surface-200/40 dark:hover:bg-white/[0.02] transition-colors group">
                  <td className="px-4 py-4 text-[13px] font-bold text-surface-800 dark:text-gray-200">{item.bidder_name}</td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-0.5 bg-brand-500/10 text-brand-600 dark:text-brand-300 rounded text-[10px] font-bold border border-brand-500/20">
                      {item.criterion_name}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[12px] text-surface-500 dark:text-gray-400 leading-relaxed line-clamp-3">
                    {item.criterion_description}
                  </td>
                  <td className="px-4 py-4 text-[12px] text-brand-600 dark:text-brand-400 font-medium leading-relaxed italic">
                    {item.reason}
                  </td>
                  <td className="px-4 py-4">
                    <div className="bg-surface-200 dark:bg-white/[0.04] p-2 rounded border border-black/[0.05] dark:border-white/[0.05]">
                      <p className="text-[11px] text-surface-600 dark:text-gray-400 italic line-clamp-3 leading-relaxed">
                        "{item.source_text}"
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button 
                      onClick={() => {
                        setOverrideTarget(item);
                        setOverrideVerdict("OFFICER_APPROVED");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white rounded-lg text-[11px] font-bold hover:bg-brand-600 transition-all shadow-sm"
                    >
                      <Edit3 size={12} />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Override Modal */}
      {overrideTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl w-full max-w-xl shadow-2xl border border-black/[0.1] dark:border-white/[0.1] overflow-hidden">
            <div className="px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
              <h3 className="font-heading font-extrabold text-lg text-surface-800 dark:text-gray-100 flex items-center gap-2">
                <Edit3 size={18} className="text-brand-500" />
                Officer Adjudication
              </h3>
              <button onClick={() => setOverrideTarget(null)} className="text-surface-400 hover:text-surface-600 dark:text-gray-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-100 dark:bg-white/[0.03] p-3 rounded-xl border border-black/[0.05] dark:border-white/[0.05]">
                  <p className="text-[10px] font-bold text-surface-400 dark:text-gray-500 uppercase tracking-wider mb-1">Bidder</p>
                  <p className="text-sm font-bold text-surface-800 dark:text-gray-200">{overrideTarget.bidder_name}</p>
                </div>
                <div className="bg-surface-100 dark:bg-white/[0.03] p-3 rounded-xl border border-black/[0.05] dark:border-white/[0.05]">
                  <p className="text-[10px] font-bold text-surface-400 dark:text-gray-500 uppercase tracking-wider mb-1">Criteria</p>
                  <p className="text-sm font-bold text-surface-800 dark:text-gray-200">{overrideTarget.criterion_name}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-surface-400 dark:text-gray-500 uppercase tracking-wider mb-2">Source Evidence</p>
                <div className="bg-brand-500/[0.03] p-4 rounded-xl border-l-4 border-brand-500 text-sm italic text-surface-700 dark:text-gray-300 leading-relaxed">
                  "{overrideTarget.source_text}"
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-surface-400 dark:text-gray-500 uppercase tracking-wider mb-3">Verdict Selection</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setOverrideVerdict("OFFICER_APPROVED")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                      overrideVerdict === "OFFICER_APPROVED"
                        ? "bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/20"
                        : "bg-transparent text-surface-500 dark:text-gray-400 border-surface-300 dark:border-white/10 hover:border-brand-500/40 hover:text-brand-500"
                    }`}
                  >
                    <Check size={16} /> Pass
                  </button>
                  <button 
                    onClick={() => setOverrideVerdict("OFFICER_REJECTED")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                      overrideVerdict === "OFFICER_REJECTED"
                        ? "bg-danger-500 text-white border-danger-500 shadow-lg shadow-danger-500/20"
                        : "bg-transparent text-surface-500 dark:text-gray-400 border-surface-300 dark:border-white/10 hover:border-danger-500/40 hover:text-danger-500"
                    }`}
                  >
                    <X size={16} /> Fail
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-surface-400 dark:text-gray-500 uppercase tracking-wider mb-2">Justification (Required)</p>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Enter detailed reasoning for this override (min 10 characters)..."
                  className="input-field h-28 resize-none text-sm p-4 bg-surface-100 dark:bg-white/[0.03]"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-surface-100 dark:bg-white/[0.03] border-t border-black/[0.08] dark:border-white/[0.08] flex justify-end gap-3">
              <button
                onClick={() => {
                  setOverrideTarget(null);
                  setJustification("");
                }}
                className="px-4 py-2 text-sm font-bold text-surface-500 hover:text-surface-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleOverride}
                disabled={submitting || justification.trim().length < 10}
                className="px-6 py-2 bg-brand-500 text-white text-sm font-bold rounded-xl hover:bg-brand-600 disabled:opacity-50 shadow-lg shadow-brand-500/20 transition-all"
              >
                {submitting ? "Submitting..." : "Submit Verdict"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
