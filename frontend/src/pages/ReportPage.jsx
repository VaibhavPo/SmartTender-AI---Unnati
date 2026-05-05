/**
 * Report Page
 * ============
 * Screen 5: Generate final evaluation report and download PDF.
 *
 * Key components: ReportPreview, DownloadButton
 * API calls:
 *   - GET /tenders (select tender)
 *   - POST /reports/generate (trigger report)
 *   - GET /reports/{id}/download (download PDF)
 *   - GET /verdicts?tender_id=X (summary data for preview)
 */

import { useState, useEffect } from "react";
import { tenderApi, verdictApi, criteriaApi, reportApi } from "../api/client";
import VerdictBadge from "../components/VerdictBadge";

export default function ReportPage() {
  const [tenders, setTenders] = useState([]);
  const [activeTender, setActiveTender] = useState(null);
  const [bidders, setBidders] = useState([]);
  const [verdicts, setVerdicts] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);

  useEffect(() => {
    tenderApi.list().then(({ data }) => setTenders(Array.isArray(data) ? data : [])).catch(() => setTenders([]));
  }, []);

  useEffect(() => {
    if (activeTender) {
      Promise.all([
        tenderApi.listBidders(activeTender.id),
        verdictApi.list(activeTender.id),
        criteriaApi.list(activeTender.id),
      ]).then(([bidRes, verRes, criRes]) => {
        setBidders(bidRes.data);
        setVerdicts(verRes.data);
        setCriteria(criRes.data);
      });
    }
  }, [activeTender]);

  const handleGenerate = async () => {
    if (!activeTender) return;
    setGenerating(true);
    try {
      await reportApi.generate({ tender_id: activeTender.id });
      // Poll for completion (report generation takes time)
      setTimeout(() => {
        setDownloadReady(true);
        setGenerating(false);
      }, 15000);
    } catch (err) {
      alert(`Failed: ${err.message}`);
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!activeTender) return;
    try {
      const { data } = await reportApi.download(activeTender.id);
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `tender_report_${activeTender.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Report not ready yet. Try again in a few seconds.");
    }
  };

  // Summary calculations
  const getBidderSummary = (bidderId) => {
    const bv = verdicts.filter((v) => v.bidder_id === bidderId);
    return {
      total: criteria.length,
      pass: bv.filter((v) => ["PASS", "OFFICER_APPROVED"].includes(v.verdict)).length,
      fail: bv.filter((v) => ["FAIL", "OFFICER_REJECTED"].includes(v.verdict)).length,
      review: bv.filter((v) => v.verdict === "MANUAL_REVIEW").length,
    };
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Evaluation Report</h2>
          <p className="text-gray-400 mt-1">
            Generate and download the final evaluation report.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            id="generate-report-btn"
            onClick={handleGenerate}
            disabled={generating || !activeTender}
            className="btn-primary"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </span>
            ) : (
              "📊 Generate Report"
            )}
          </button>
          {downloadReady && (
            <button
              id="download-report-btn"
              onClick={handleDownload}
              className="px-6 py-2.5 bg-accent-500 text-white font-semibold rounded-xl
                         hover:bg-accent-400 transition-all shadow-lg shadow-accent-500/25"
            >
              ⬇️ Download PDF
            </button>
          )}
        </div>
      </div>

      {/* Tender selector */}
      <div className="flex gap-2 flex-wrap">
        {tenders.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTender(t);
              setDownloadReady(false);
            }}
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

      {/* Report preview */}
      {activeTender && bidders.length > 0 ? (
        <div className="glass-card p-8 space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-xl font-bold text-white">{activeTender.name}</h3>
            {activeTender.reference_number && (
              <p className="text-sm text-gray-400">Ref: {activeTender.reference_number}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {bidders.length} bidders · {criteria.length} criteria · {verdicts.length} verdicts
            </p>
          </div>

          {/* Ranking table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-white/10">
                  <th className="pb-3 font-medium">Rank</th>
                  <th className="pb-3 font-medium">Bidder</th>
                  <th className="pb-3 font-medium text-center">Pass</th>
                  <th className="pb-3 font-medium text-center">Fail</th>
                  <th className="pb-3 font-medium text-center">Review</th>
                  <th className="pb-3 font-medium text-center">Score</th>
                  <th className="pb-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bidders
                  .map((b) => ({ ...b, summary: getBidderSummary(b.id) }))
                  .sort((a, b) => b.summary.pass - a.summary.pass)
                  .map((bidder, idx) => {
                    const { pass, fail, review, total } = bidder.summary;
                    const pending = total - (pass + fail + review);
                    const score = total > 0 ? ((pass / total) * 100).toFixed(0) : 0;
                    const qualified = fail === 0 && review === 0 && pending === 0;

                    return (
                      <tr key={bidder.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 font-mono text-gray-500">#{idx + 1}</td>
                        <td className="py-3 text-white font-medium">{bidder.name}</td>
                        <td className="py-3 text-center text-accent-400 font-semibold">{pass}</td>
                        <td className="py-3 text-center text-danger-400 font-semibold">{fail}</td>
                        <td className="py-3 text-center text-warning-400 font-semibold">{review}</td>
                        <td className="py-3 text-center">
                          <span className="gradient-text font-bold">{score}%</span>
                        </td>
                        <td className="py-3 text-center">
                          {pending > 0 ? (
                            <span className="badge-review">Pending</span>
                          ) : qualified ? (
                            <span className="badge-pass">Qualified</span>
                          ) : (
                            <span className="badge-fail">Disqualified</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <p className="text-gray-500 text-lg">
            {activeTender
              ? "No evaluation data yet. Run the evaluation first."
              : "Select a tender to preview the report."}
          </p>
        </div>
      )}
    </div>
  );
}
