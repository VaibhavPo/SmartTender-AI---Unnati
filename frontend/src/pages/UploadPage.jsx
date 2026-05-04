/**
 * Upload Page
 * ============
 * Screen 1: Officer creates a tender, adds bidders, uploads documents.
 *
 * Key components: TenderForm, BidderList, FileUploader
 * API calls:
 *   - POST /tenders (create tender)
 *   - POST /tenders/{id}/bidders (add bidder)
 *   - POST /documents/upload (upload PDF)
 *   - GET /tenders (list existing tenders)
 *   - GET /documents?tender_id=X (show upload status)
 */

import { useState, useEffect, useCallback } from "react";
import { tenderApi, documentApi } from "../api/client";
import FileUploader from "../components/FileUploader";
import StatusBadge from "../components/StatusBadge";

export default function UploadPage() {
  const [tenders, setTenders] = useState([]);
  const [activeTender, setActiveTender] = useState(null);
  const [bidders, setBidders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── Form state ──
  const [tenderName, setTenderName] = useState("");
  const [tenderRef, setTenderRef] = useState("");
  const [bidderName, setBidderName] = useState("");

  // Load tenders on mount
  useEffect(() => {
    loadTenders();
  }, []);

  // Load bidders and docs when active tender changes
  useEffect(() => {
    if (activeTender) {
      loadBidders(activeTender.id);
      loadDocuments(activeTender.id);
    }
  }, [activeTender]);

  const loadTenders = async () => {
    try {
      const { data } = await tenderApi.list();
      setTenders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load tenders:", err);
      setTenders([]);
    }
  };

  const loadBidders = async (tenderId) => {
    try {
      const { data } = await tenderApi.listBidders(tenderId);
      setBidders(data);
    } catch (err) {
      console.error("Failed to load bidders:", err);
    }
  };

  const loadDocuments = async (tenderId) => {
    try {
      const { data } = await documentApi.list(tenderId);
      setDocuments(data);
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  };

  const handleCreateTender = async (e) => {
    e.preventDefault();
    if (!tenderName.trim()) return;
    setLoading(true);
    try {
      const { data } = await tenderApi.create({
        name: tenderName,
        reference_number: tenderRef || null,
      });
      setTenders((prev) => [data, ...prev]);
      setActiveTender(data);
      setTenderName("");
      setTenderRef("");
    } catch (err) {
      alert(`Failed to create tender: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBidder = async (e) => {
    e.preventDefault();
    if (!bidderName.trim() || !activeTender) return;
    try {
      const { data } = await tenderApi.addBidder(activeTender.id, {
        name: bidderName,
      });
      setBidders((prev) => [...prev, data]);
      setBidderName("");
    } catch (err) {
      alert(`Failed to add bidder: ${err.message}`);
    }
  };

  const handleFileUpload = useCallback(
    async (file, bidderId) => {
      if (!activeTender) return;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tender_id", activeTender.id);
      if (bidderId) formData.append("bidder_id", bidderId);

      try {
        const { data } = await documentApi.upload(formData);
        setDocuments((prev) => [...prev, data]);
        return data;
      } catch (err) {
        throw new Error(err.message || "Upload failed");
      }
    },
    [activeTender]
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Upload Documents</h2>
        <p className="text-gray-400 mt-1">
          Create a tender, register bidders, and upload submission documents.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Create / Select Tender ── */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-lg font-semibold text-white">New Tender</h3>
          <form onSubmit={handleCreateTender} className="space-y-4">
            <input
              id="tender-name-input"
              type="text"
              placeholder="Tender Name *"
              value={tenderName}
              onChange={(e) => setTenderName(e.target.value)}
              className="input-field"
              required
            />
            <input
              id="tender-ref-input"
              type="text"
              placeholder="Reference Number (optional)"
              value={tenderRef}
              onChange={(e) => setTenderRef(e.target.value)}
              className="input-field"
            />
            <button
              id="create-tender-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Creating..." : "Create Tender"}
            </button>
          </form>

          {/* Existing tenders */}
          {tenders.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-400">Existing Tenders</h4>
              {tenders.map((t) => (
                <button
                  key={t.id}
                  id={`tender-select-${t.id}`}
                  onClick={() => setActiveTender(t)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm ${
                    activeTender?.id === t.id
                      ? "bg-primary-600/20 text-primary-400 border border-primary-500/20"
                      : "text-gray-300 hover:bg-white/5"
                  }`}
                >
                  <p className="font-medium truncate">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t.bidder_count} bidders · {t.document_count} docs
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Middle: Bidders ── */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-lg font-semibold text-white">Bidders</h3>

          {!activeTender ? (
            <p className="text-gray-500 text-sm">Select or create a tender first.</p>
          ) : (
            <>
              <form onSubmit={handleAddBidder} className="flex gap-2">
                <input
                  id="bidder-name-input"
                  type="text"
                  placeholder="Company name"
                  value={bidderName}
                  onChange={(e) => setBidderName(e.target.value)}
                  className="input-field flex-1"
                />
                <button id="add-bidder-btn" type="submit" className="btn-primary">
                  Add
                </button>
              </form>

              <div className="space-y-2">
                {bidders.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl"
                  >
                    <span className="text-sm text-gray-200">{b.name}</span>
                    <span className="text-xs text-gray-500 font-mono">{b.id.slice(0, 8)}</span>
                  </div>
                ))}
                {bidders.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No bidders yet.</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Right: File Upload ── */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-lg font-semibold text-white">Documents</h3>

          {!activeTender ? (
            <p className="text-gray-500 text-sm">Select or create a tender first.</p>
          ) : (
            <>
              <FileUploader
                bidders={bidders}
                onUpload={handleFileUpload}
              />

              {/* Uploaded documents list */}
              <div className="space-y-2 mt-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-gray-200 truncate">{doc.filename}</p>
                      <p className="text-xs text-gray-500">{doc.num_pages} pages</p>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
