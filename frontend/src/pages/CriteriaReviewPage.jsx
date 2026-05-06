/**
 * Criteria Review Page — Stitch Design
 * ======================================
 * Screen 2: Officer reviews AI-extracted criteria, edits them,
 * and confirms to start evaluation.
 */

import { useState, useEffect } from "react";
import { tenderApi, criteriaApi, documentApi } from "../api/client";
import { useTender } from "../contexts";
import CriterionCard from "../components/CriterionCard";

export default function CriteriaReviewPage() {
  const { activeTender, setActiveTender, tenders, setTenders } = useTender();
  const [criteria, setCriteria] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [bidders, setBidders] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    tenderApi.list().then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setTenders(list);
      setActiveTender((current) => current || list[0]);
    }).catch(() => setTenders([]));
  }, [setActiveTender, setTenders]);

  useEffect(() => {
    if (activeTender) {
      criteriaApi.list(activeTender.id).then(({ data }) => setCriteria(data));
      documentApi.list(activeTender.id).then(({ data }) => setDocuments(data));
      tenderApi.listBidders(activeTender.id).then(({ data }) => setBidders(data));
    }
  }, [activeTender, setActiveTender, setTenders]);

  const handleExtract = async () => {
    if (!activeTender) return;
    const tenderDoc = documents.find((d) => !d.bidder_id && d.status === "completed");
    if (!tenderDoc) {
      alert("No processed tender document found. Upload and wait for ingestion first.");
      return;
    }
    setExtracting(true);
    try {
      await criteriaApi.extract(activeTender.id, tenderDoc.id);
      setTimeout(async () => {
        const { data } = await criteriaApi.list(activeTender.id);
        setCriteria(data);
        setExtracting(false);
      }, 5000);
    } catch (err) {
      alert(`Extraction failed: ${err.message}`);
      setExtracting(false);
    }
  };

  const handleUpdateCriterion = async (updatedCriterion) => {
    try {
      const { data } = await criteriaApi.update(updatedCriterion.id, updatedCriterion);
      setCriteria((prev) => prev.map((c) => (c.id === data.id ? data : c)));
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const getErrorText = (error) => {
    if (!error) return "Unknown error";
    if (typeof error === "string") return error;
    if (error.message) return error.message;
    if (error.detail) return error.detail;
    if (error.response?.data?.detail) return error.response.data.detail;
    if (error.response?.data?.message) return error.response.data.message;
    return JSON.stringify(error);
  };

  const handleDeleteCriterion = async (criterionId) => {
    if (!confirm("Are you sure you want to delete this criterion?")) return;
    try {
      await criteriaApi.delete(criterionId);
      setCriteria((prev) => prev.filter((c) => c.id !== criterionId));
    } catch (err) {
      alert(`Delete failed: ${getErrorText(err)}`);
    }
  };

  const handleConfirm = async () => {
    if (criteria.length === 0 || bidders.length === 0) {
      alert("Need at least one criterion and one bidder.");
      return;
    }
    setConfirming(true);
    try {
      await criteriaApi.confirm({
        tender_id: activeTender.id,
        bidder_ids: bidders.map((b) => b.id),
        criterion_ids: criteria.map((c) => c.id),
      });
      alert("Evaluation started! Check the Evaluation Dashboard.");
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tender selector + actions */}
      <div className="stitch-card">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="section-heading">Extract criteria from document</h3>
            <p className="text-sm text-surface-500 dark:text-gray-500 mt-1">
              Review AI-extracted evaluation criteria. Edit before confirming.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              id="extract-criteria-btn"
              onClick={handleExtract}
              disabled={extracting || !activeTender}
              className="btn-ghost disabled:opacity-50"
            >
              {extracting ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  Extracting...
                </span>
              ) : (
                "Extract Criteria"
              )}
            </button>
            <button
              id="start-evaluation-btn"
              onClick={handleConfirm}
              disabled={confirming || criteria.length === 0}
              className="btn-primary disabled:opacity-50"
            >
              {confirming ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Starting...
                </span>
              ) : (
                "Start Evaluation"
              )}
            </button>
          </div>
        </div>
      </div>

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

      {/* Criteria list */}
      {criteria.length === 0 ? (
        <div className="stitch-card py-12 text-center">
          <p className="text-surface-500 dark:text-gray-500 text-base">
            {activeTender
              ? "No criteria yet. Click 'Extract Criteria' to begin."
              : "Select a tender to view criteria."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {criteria.map((criterion, index) => (
            <CriterionCard
              key={criterion.id}
              criterion={criterion}
              index={index}
              onUpdate={handleUpdateCriterion}
              onDelete={handleDeleteCriterion}
            />
          ))}
        </div>
      )}
    </div>
  );
}
