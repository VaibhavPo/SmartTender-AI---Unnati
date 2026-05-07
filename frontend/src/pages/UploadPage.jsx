/**
 * Upload Page — Ingestion Portal (Stitch Design)
 * =================================================
 * Matches the reference: Step indicators, Tender Document upload with
 * progress tracking, Bidder Documents with file table, right sidebar
 * with guidelines and activity. All API calls are functional.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { tenderApi, documentApi } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import { useTender } from "../contexts";
import {
  Upload,
  FileText,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Activity,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
} from "lucide-react";

export default function UploadPage() {
  const { activeTender, setActiveTender, tenders, setTenders } = useTender();
  const navigate = useNavigate();
  const [bidders, setBidders] = useState([]);
  const [tenderDocs, setTenderDocs] = useState([]);
  const [bidderDocs, setBidderDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Create tender form
  const [showCreateTender, setShowCreateTender] = useState(false);
  const [tenderName, setTenderName] = useState("");
  const [tenderRef, setTenderRef] = useState("");
  const [description, setDescription] = useState("");

  // Bidder form
  const [bidderName, setBidderName] = useState("");
  const [selectedBidder, setSelectedBidder] = useState("");

  // Upload state
  const [tenderUploading, setTenderUploading] = useState(false);
  const [bidderUploading, setBidderUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingFile, setProcessingFile] = useState(null);
  const tenderFileRef = useRef(null);
  const bidderFileRef = useRef(null);

  // Right sidebar
  const [guidelinesOpen, setGuidelinesOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(true);

  const loadTenders = useCallback(async () => {
    try {
      const { data } = await tenderApi.list();
      const list = Array.isArray(data) ? data : [];
      setTenders(list);
      setActiveTender((current) => current || list[0]);
    } catch (err) {
      console.error("Failed to load tenders:", err);
    }
  }, [setActiveTender, setTenders]);

  const loadBidders = useCallback(async (tenderId) => {
    try {
      const { data } = await tenderApi.listBidders(tenderId);
      setBidders(data);
    } catch (err) {
      console.error("Failed to load bidders:", err);
    }
  }, []);

  const loadDocuments = useCallback(async (tenderId) => {
    try {
      const { data } = await documentApi.list(tenderId);
      const docs = Array.isArray(data) ? data : [];
      setTenderDocs(docs.filter((d) => !d.bidder_id));
      setBidderDocs(docs.filter((d) => d.bidder_id));
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  }, []);

  // ── Load tenders on mount ──
   
   
  useEffect(() => {
    loadTenders();
  }, [loadTenders]);

  // ── Load data when tender changes ──
   
  useEffect(() => {
    if (activeTender) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadBidders(activeTender.id);
      loadDocuments(activeTender.id);
    }
  }, [activeTender, loadBidders, loadDocuments]);

  // ── Simulate parsing progress ──
  useEffect(() => {
    if (!processingFile) return;
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 15;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [processingFile]);

  const handleCreateTender = async (e) => {
    e.preventDefault();
    if (!tenderName.trim()) return;
    setLoading(true);
    try {
      const { data } = await tenderApi.create({
        name: tenderName,
        reference_number: tenderRef || null,
        description: description || null,
      });
      setTenders((prev) => [data, ...prev]);
      setActiveTender(data);
      setTenderName("");
      setTenderRef("");
      setDescription("");
      setShowCreateTender(false);
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
      const { data } = await tenderApi.addBidder(activeTender.id, { name: bidderName });
      setBidders((prev) => [...prev, data]);
      setBidderName("");
    } catch (err) {
      alert(`Failed to add bidder: ${err.message}`);
    }
  };

  const handleTenderDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeTender) return;
    setTenderUploading(true);
    setUploadProgress(0);
    setProcessingFile(file.name);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tender_id", activeTender.id);
      const { data } = await documentApi.upload(formData);
      setTenderDocs((prev) => [...prev, data]);
      setUploadProgress(100);
      setTimeout(() => {
        setProcessingFile(null);
        setUploadProgress(0);
      }, 2000);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
      setProcessingFile(null);
    } finally {
      setTenderUploading(false);
    }
  };

  const handleBidderDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeTender || !selectedBidder) return;
    setBidderUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tender_id", activeTender.id);
      formData.append("bidder_id", selectedBidder);
      const { data } = await documentApi.upload(formData);
      setBidderDocs((prev) => [...prev, data]);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setBidderUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await documentApi.delete(docId);
      setTenderDocs(prev => prev.filter(d => d.id !== docId));
      setBidderDocs(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed": return <CheckCircle2 size={13} className="text-accent-500" />;
      case "processing": return <Clock size={13} className="text-brand-400 animate-spin" />;
      case "failed": return <AlertCircle size={13} className="text-danger-500" />;
      default: return <Clock size={13} className="text-surface-400" />;
    }
  };

  // ── No tender selected state ──
  if (!activeTender && tenders.length === 0) {
    return (
      <div className="max-w-xl mx-auto mt-12">
        <div className="stitch-card text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-400/10 flex items-center justify-center mx-auto">
            <FileText size={28} className="text-brand-500 dark:text-brand-300" />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-xl text-surface-800 dark:text-gray-100">
              Create Your First Tender
            </h2>
            <p className="text-sm text-surface-500 dark:text-gray-400 mt-2">
              Start by creating a tender to begin the AI-powered evaluation process.
            </p>
          </div>
          <form onSubmit={handleCreateTender} className="space-y-3 text-left">
            <div>
              <label className="label-caps block mb-1.5">Tender Name *</label>
              <input value={tenderName} onChange={(e) => setTenderName(e.target.value)} className="input-field" placeholder="e.g., Federal RFP for IT Services" required />
            </div>
            <div>
              <label className="label-caps block mb-1.5">Reference Number</label>
              <input value={tenderRef} onChange={(e) => setTenderRef(e.target.value)} className="input-field" placeholder="Optional" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Creating..." : "Create Tender"}</button>
          </form>
        </div>
      </div>
    );
  }

  // ── Tender selector (if multiple) ──
  if (!activeTender && tenders.length > 0) {
    setActiveTender(tenders[0]);
  }

  return (
    <div className="flex gap-6 animate-fade-in">
      {/* ══════ MAIN CONTENT ══════ */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Ingestion Portal Header + Steps */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading font-extrabold text-xl text-surface-800 dark:text-gray-100 tracking-tight">
              Ingestion Portal
            </h2>
            <p className="text-[13px] text-surface-500 dark:text-gray-500 mt-0.5">
              Phase: Current Tender Document Processing
            </p>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center gap-0 shrink-0">
            {[
              { num: 1, label: "Upload", active: true },
              { num: 2, label: "Extract", active: false },
              { num: 3, label: "Evaluate", active: false },
            ].map((step, i) => (
              <div key={step.num} className="flex items-center">
                {i > 0 && <div className="w-10 h-px bg-surface-300 dark:bg-white/10" />}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step.active
                        ? "bg-brand-500 dark:bg-brand-400 text-white"
                        : "bg-surface-200 dark:bg-white/10 text-surface-500 dark:text-gray-500"
                    }`}
                  >
                    {step.num}
                  </div>
                  <span className={`text-[10px] font-semibold ${step.active ? "text-brand-500 dark:text-brand-300" : "text-surface-400 dark:text-gray-600"}`}>
                    {step.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tender Selector + Create */}
        <div className="flex items-center gap-2 flex-wrap">
          {tenders.length > 1 && tenders.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTender(t)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all border ${
                activeTender?.id === t.id
                  ? "bg-brand-400/[0.12] dark:bg-brand-400/[0.15] text-brand-500 dark:text-brand-300 border-brand-400/30"
                  : "text-surface-500 dark:text-gray-500 bg-surface-200/50 dark:bg-white/[0.05] border-transparent hover:bg-surface-200 dark:hover:bg-white/10"
              }`}
            >
              {t.name}
            </button>
          ))}
          <button onClick={() => setShowCreateTender(!showCreateTender)} className="px-3 py-1.5 rounded-md text-[12px] font-semibold text-brand-500 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-400/10 transition-all flex items-center gap-1">
            <Plus size={13} /> New Tender
          </button>
        </div>

        {/* Create tender mini-form (collapsible) */}
        {showCreateTender && (
          <div className="stitch-card animate-slide-up">
            <form onSubmit={handleCreateTender} className="space-y-3">
              <h3 className="section-heading text-sm">Create New Tender</h3>
              <div className="flex gap-3">
                <input value={tenderName} onChange={(e) => setTenderName(e.target.value)} className="input-field flex-1" placeholder="Tender Name *" required />
                <input value={tenderRef} onChange={(e) => setTenderRef(e.target.value)} className="input-field flex-1" placeholder="Reference Number" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCreateTender(false)} className="btn-ghost text-xs">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary text-xs">{loading ? "Creating..." : "Create Tender"}</button>
              </div>
            </form>
          </div>
        )}

        {/* ══ TENDER DOCUMENT ══ */}
        <div className="stitch-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="section-heading">Tender Document</h3>
            <span className="badge-fail text-[10px] px-2 py-0.5">REQUIRED</span>
          </div>
          <p className="text-[12px] text-surface-500 dark:text-gray-500 mb-4">
            The core procurement document for Docling AI extraction.
          </p>

          {/* Upload zone */}
          <div
            onClick={() => !tenderUploading && tenderFileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              tenderUploading
                ? "border-brand-400/40 bg-brand-50/50 dark:bg-brand-400/5"
                : "border-surface-400/50 dark:border-white/10 hover:border-brand-400/40 hover:bg-surface-200/40 dark:hover:bg-white/[0.03]"
            }`}
          >
            <input ref={tenderFileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff" onChange={handleTenderDocUpload} className="hidden" />

            {processingFile ? (
              <div className="space-y-3">
                {/* Progress bar */}
                <div className="flex items-center gap-3 max-w-xs mx-auto">
                  <div className="flex-1 h-1.5 bg-surface-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 dark:bg-brand-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(uploadProgress, 100)}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-surface-600 dark:text-gray-400">{Math.round(Math.min(uploadProgress, 100))}%</span>
                </div>
                <p className="text-[12px] text-surface-500 dark:text-gray-500 flex items-center justify-center gap-2">
                  <Activity size={13} className="animate-pulse" />
                  docling_engine_v21 parsing…
                </p>
                <p className="text-[11px] text-surface-400 dark:text-gray-600">
                  Click or AI Extraction in Progress for PDF
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-center">
                  <div className="w-10 h-10 rounded-lg bg-surface-200/80 dark:bg-white/[0.06] flex items-center justify-center">
                    <Upload size={20} className="text-surface-400 dark:text-gray-500" />
                  </div>
                </div>
                <p className="text-[13px] text-surface-700 dark:text-gray-300 font-semibold">
                  Click or drag tender PDF here
                </p>
                <p className="text-[11px] text-surface-400 dark:text-gray-600">
                  AI Extraction in Progress for PDF
                </p>
              </div>
            )}
          </div>

          {/* Uploaded tender docs */}
          {tenderDocs.length > 0 && (
            <div className="mt-4 space-y-2">
              {tenderDocs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 px-3 py-2.5 bg-surface-200/50 dark:bg-white/[0.04] rounded-lg border border-black/[0.04] dark:border-white/[0.04]">
                  <FileText size={16} className="text-brand-500 dark:text-brand-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-surface-800 dark:text-gray-200 truncate">{doc.filename}</p>
                    <p className="text-[11px] text-surface-500 dark:text-gray-500">
                      {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(1)} MB` : ""} {doc.status ? `• ${doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={doc.status} />
                  {doc.status === "completed" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/criteria");
                      }}
                      className="ml-2 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm whitespace-nowrap"
                    >
                      Extract Criteria
                    </button>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDocument(doc.id);
                    }}
                    className="ml-2 p-1.5 text-surface-400 hover:text-danger-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ══ BIDDER DOCUMENTS ══ */}
        <div className="stitch-card">
          <h3 className="section-heading mb-1">Bidder Documents</h3>
          <p className="text-[12px] text-surface-500 dark:text-gray-500 mb-4">
            Upload support files and technical appendices.
          </p>

          {/* Add bidder form */}
          {activeTender && (
            <div className="flex gap-2 mb-4">
              <input
                value={bidderName}
                onChange={(e) => setBidderName(e.target.value)}
                className="input-field flex-1 text-xs"
                placeholder="Add new bidder name..."
              />
              <button onClick={handleAddBidder} disabled={!bidderName.trim()} className="btn-primary text-xs px-3 disabled:opacity-50">
                <Plus size={14} />
              </button>
            </div>
          )}

          {/* Upload area */}
          <div className="flex items-center gap-3 mb-4">
            {bidders.length > 0 && (
              <select value={selectedBidder} onChange={(e) => setSelectedBidder(e.target.value)} className="select-field flex-1 text-xs">
                <option value="">Select bidder for upload...</option>
                {bidders.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
            <div
              onClick={() => !bidderUploading && selectedBidder && bidderFileRef.current?.click()}
              className={`border-2 border-dashed rounded-lg px-6 py-4 text-center transition-all flex-1 ${
                selectedBidder 
                  ? "border-surface-400/40 dark:border-white/10 hover:border-brand-400/40 hover:bg-surface-200/40 dark:hover:bg-white/[0.03] cursor-pointer" 
                  : "border-surface-200 dark:border-white/5 opacity-50 cursor-not-allowed"
              }`}
            >
              <input ref={bidderFileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff,.docx" onChange={handleBidderDocUpload} className="hidden" />
              <div className="flex flex-col items-center gap-1.5">
                <Copy size={18} className="text-surface-400 dark:text-gray-500" />
                <span className="text-[12px] font-semibold text-surface-600 dark:text-gray-400">
                  {bidderUploading ? "Uploading..." : "Upload Batch"}
                </span>
              </div>
            </div>
          </div>

          {/* Documents table */}
          {bidderDocs.length > 0 && (
            <div className="border border-black/[0.06] dark:border-white/[0.06] rounded-lg overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th className="text-center">Status</th>
                    <th className="text-center w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {bidderDocs.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-surface-400 dark:text-gray-500 shrink-0" />
                          <span className="text-[13px] font-semibold text-surface-800 dark:text-gray-200 truncate">{doc.filename}</span>
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {getStatusIcon(doc.status)}
                          <span className="text-[11px] font-bold text-surface-600 dark:text-gray-400 uppercase">{doc.status || "READY"}</span>
                        </div>
                      </td>
                      <td className="text-center">
                        <button 
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-surface-400 dark:text-gray-600 hover:text-danger-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {bidderDocs.length === 0 && (
            <p className="text-[12px] text-surface-400 dark:text-gray-600 text-center py-3">No bidder documents uploaded yet.</p>
          )}
        </div>
      </div>

      {/* ══════ RIGHT SIDEBAR ══════ */}
      <div className="w-64 shrink-0 space-y-4 hidden lg:block">
        {/* Ingestion Guidelines */}
        <div className="stitch-card !p-0 overflow-hidden">
          <button
            onClick={() => setGuidelinesOpen(!guidelinesOpen)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-200/40 dark:hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-brand-500 dark:text-brand-400" />
              <span className="text-[13px] font-bold text-surface-800 dark:text-gray-200">Ingestion Guidelines</span>
            </div>
            {guidelinesOpen ? <ChevronUp size={14} className="text-surface-400" /> : <ChevronDown size={14} className="text-surface-400" />}
          </button>
          {guidelinesOpen && (
            <div className="px-4 pb-4 space-y-2.5 text-[11px] text-surface-600 dark:text-gray-400 border-t border-black/[0.04] dark:border-white/[0.04] pt-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={12} className="text-accent-500 shrink-0 mt-0.5" />
                <span>Upload tender PDF (max 100 MB)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={12} className="text-accent-500 shrink-0 mt-0.5" />
                <span>AI extracts criteria automatically</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={12} className="text-accent-500 shrink-0 mt-0.5" />
                <span>Upload bidder response documents</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={12} className="text-accent-500 shrink-0 mt-0.5" />
                <span>Supported: PDF, PNG, JPG, TIFF</span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="stitch-card !p-0 overflow-hidden">
          <button
            onClick={() => setActivityOpen(!activityOpen)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-200/40 dark:hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-brand-500 dark:text-brand-400" />
              <span className="text-[13px] font-bold text-surface-800 dark:text-gray-200">Recent Activity</span>
            </div>
            {activityOpen ? <ChevronUp size={14} className="text-surface-400" /> : <ChevronDown size={14} className="text-surface-400" />}
          </button>
          {activityOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-black/[0.04] dark:border-white/[0.04] pt-3">
              {tenderDocs.length > 0 ? (
                tenderDocs.slice(0, 3).map((doc) => (
                  <div key={doc.id} className="flex items-start gap-2">
                    {getStatusIcon(doc.status)}
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-surface-700 dark:text-gray-300 truncate">{doc.filename}</p>
                      <p className="text-[10px] text-surface-400 dark:text-gray-600">{doc.status}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-surface-400 dark:text-gray-600">No activity yet</p>
              )}
            </div>
          )}
        </div>

        {/* Docling Engine Status */}
        <div className="stitch-card !py-3 !px-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
            <div>
              <p className="text-[11px] font-bold text-surface-700 dark:text-gray-300">Docling Engine</p>
              <p className="text-[10px] font-bold text-accent-600 dark:text-accent-400">OPERATIONAL • 240MS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
