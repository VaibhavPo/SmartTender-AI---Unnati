/**
 * Report Page — Stitch Design
 * =============================
 * Screen 5: Generate final evaluation report and download PDF.
 */

import { useState, useEffect } from "react";
import { tenderApi, verdictApi, criteriaApi, reportApi } from "../api/client";
import { useTender } from "../App";
import VerdictBadge from "../components/VerdictBadge";

export default function ReportPage() {
  const { activeTender, setActiveTender, tenders, setTenders } = useTender();
  const [bidders, setBidders] = useState([]);
  const [verdicts, setVerdicts] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [includeAuditTrail, setIncludeAuditTrail] = useState(true);

  useEffect(() => {
    tenderApi.list().then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setTenders(list);
      if (list.length > 0 && !activeTender) setActiveTender(list[0]);
    }).catch(() => setTenders([]));
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
      await reportApi.generate({
        tender_id: activeTender.id,
        include_audit_trail: includeAuditTrail,
      });
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
    <div className="space-y-6 animate-fade-in">
      {/* Report controls */}
      <div className="stitch-card">
        <h3 className="section-heading mb-4">Final Report</h3>

        <label className="flex items-center gap-2 text-sm text-surface-700 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={includeAuditTrail}
            onChange={(e) => setIncludeAuditTrail(e.target.checked)}
            className="w-4 h-4 text-brand-500 border-surface-400 rounded focus:ring-brand-400"
          />
          Include audit trail
        </label>

        <div className="flex gap-3 justify-end items-center flex-wrap">
          <button
            id="generate-report-btn"
            onClick={handleGenerate}
            disabled={generating || !activeTender}
            className="btn-primary disabled:opacity-50"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </span>
            ) : (
              "Generate"
            )}
          </button>
          {downloadReady && (
            <button
              id="download-report-btn"
              onClick={handleDownload}
              className="btn-secondary"
            >
              Download PDF
            </button>
          )}
        </div>
      </div>

      {/* Tender selector */}
      {tenders.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {tenders.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTender(t);
                setDownloadReady(false);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                activeTender?.id === t.id
                  ? "bg-brand-400/[0.12] text-brand-500 border-brand-400/30 font-extrabold"
                  : "text-surface-600 bg-surface-200/50 border-transparent hover:bg-surface-200"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* Report preview */}
      {activeTender && bidders.length > 0 ? (
        <div className="stitch-card space-y-6">
          <div className="border-b border-black/[0.08] pb-4">
            <h3 className="font-heading font-black text-lg text-surface-800">{activeTender.name}</h3>
            {activeTender.reference_number && (
              <p className="text-sm text-surface-500">Ref: {activeTender.reference_number}</p>
            )}
            <p className="text-sm text-surface-500 mt-1">
              {bidders.length} bidders · {criteria.length} criteria · {verdicts.length} verdicts
            </p>
          </div>

          {/* Ranking table */}
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Bidder</th>
                  <th className="text-center">Pass</th>
                  <th className="text-center">Fail</th>
                  <th className="text-center">Review</th>
                  <th className="text-center">Score</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {bidders
                  .map((b) => ({ ...b, summary: getBidderSummary(b.id) }))
                  .sort((a, b) => b.summary.pass - a.summary.pass)
                  .map((bidder, idx) => {
                    const { pass, fail, review, total } = bidder.summary;
                    const pending = total - (pass + fail + review);
                    const score = total > 0 ? ((pass / total) * 100).toFixed(0) : 0;
                    const qualified = fail === 0 && review === 0 && pending === 0;

                    return (
                      <tr key={bidder.id}>
                        <td className="font-mono text-surface-500">#{idx + 1}</td>
                        <td className="text-surface-800 font-bold">{bidder.name}</td>
                        <td className="text-center text-accent-600 font-bold">{pass}</td>
                        <td className="text-center text-danger-600 font-bold">{fail}</td>
                        <td className="text-center text-warning-600 font-bold">{review}</td>
                        <td className="text-center">
                          <span className="font-heading font-black text-brand-500">{score}%</span>
                        </td>
                        <td className="text-center">
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
        <div className="stitch-card py-12 text-center">
          <p className="text-surface-500 text-base">
            {activeTender
              ? "No evaluation data yet. Run the evaluation first."
              : "Select a tender to preview the report."}
          </p>
        </div>
      )}
    </div>
  );
}
