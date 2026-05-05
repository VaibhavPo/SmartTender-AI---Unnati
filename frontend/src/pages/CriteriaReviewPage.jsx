/**
 * Criteria Review Page
 * =====================
 * Screen 2: Officer reviews AI-extracted criteria, edits them,
 * and confirms to start evaluation.
 *
 * Key components: CriterionCard (editable)
 * API calls:
 *   - GET /tenders (select tender)
 *   - POST /criteria/extract (trigger extraction)
 *   - GET /criteria?tender_id=X (list criteria)
 *   - PUT /criteria/{id} (edit criterion)
 *   - POST /criteria/confirm (start evaluation)
 */

import { useState, useEffect } from "react";
import { tenderApi, criteriaApi, documentApi } from "../api/client";
import CriterionCard from "../components/CriterionCard";

export default function CriteriaReviewPage() {
  const [tenders, setTenders] = useState([]);
  const [activeTender, setActiveTender] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [bidders, setBidders] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    tenderApi.list().then(({ data }) => setTenders(Array.isArray(data) ? data : [])).catch(() => setTenders([]));
  }, []);

  useEffect(() => {
    if (activeTender) {
      criteriaApi.list(activeTender.id).then(({ data }) => setCriteria(data));
      documentApi.list(activeTender.id).then(({ data }) => setDocuments(data));
      tenderApi.listBidders(activeTender.id).then(({ data }) => setBidders(data));
    }
  }, [activeTender]);

  const handleExtract = async () => {
    if (!activeTender) return;
    // Find the tender document (no bidder_id)
    const tenderDoc = documents.find((d) => !d.bidder_id && d.status === "completed");
    if (!tenderDoc) {
      alert("No processed tender document found. Upload and wait for ingestion first.");
      return;
    }
    setExtracting(true);
    try {
      await criteriaApi.extract(activeTender.id, tenderDoc.id);
      // Poll for results
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
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Criteria Review</h2>
          <p className="text-gray-400 mt-1">
            Review AI-extracted evaluation criteria. Edit before confirming.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            id="extract-criteria-btn"
            onClick={handleExtract}
            disabled={extracting || !activeTender}
            className="btn-ghost"
          >
            {extracting ? "Extracting..." : "🔍 Extract Criteria"}
          </button>
          <button
            id="start-evaluation-btn"
            onClick={handleConfirm}
            disabled={confirming || criteria.length === 0}
            className="btn-primary"
          >
            {confirming ? "Starting..." : "✅ Start Evaluation"}
          </button>
        </div>
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

      {/* Criteria list */}
      {criteria.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-gray-500 text-lg">
            {activeTender
              ? "No criteria yet. Click 'Extract Criteria' to begin."
              : "Select a tender to view criteria."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
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
