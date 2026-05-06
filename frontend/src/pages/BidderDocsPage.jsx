/**
 * Bidder Documents Page — Stitch Design
 * ========================================
 * Dedicated page for managing bidder documents.
 * Add bidders, upload bidder-specific documents, view status.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useTender } from "../contexts";
import { tenderApi, documentApi } from "../api/client";
import {
  Users,
  Plus,
  FileText,
  Trash2,
  Upload,
  Copy,
  CheckCircle2,
  Clock,
  AlertCircle,
  UserPlus,
} from "lucide-react";

export default function BidderDocsPage() {
  const { activeTender } = useTender();
  const [bidders, setBidders] = useState([]);
  const [bidderDocs, setBidderDocs] = useState([]);
  const [bidderName, setBidderName] = useState("");
  const [selectedBidder, setSelectedBidder] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const loadData = useCallback(async (tenderId) => {
    setLoading(true);
    try {
      const [biddersRes, docsRes] = await Promise.all([
        tenderApi.listBidders(tenderId),
        documentApi.list(tenderId),
      ]);
      setBidders(biddersRes.data || []);
      const docs = Array.isArray(docsRes.data) ? docsRes.data : [];
      setBidderDocs(docs.filter((d) => d.bidder_id));
    } catch (err) {
      console.error("Failed to load bidder data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

   
  useEffect(() => {
    if (activeTender) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData(activeTender.id);
    }
  }, [activeTender, loadData]);

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

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeTender) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tender_id", activeTender.id);
      if (selectedBidder) formData.append("bidder_id", selectedBidder);
      const { data } = await documentApi.upload(formData);
      setBidderDocs((prev) => [...prev, data]);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed": return <CheckCircle2 size={13} className="text-accent-500" />;
      case "processing": return <Clock size={13} className="text-brand-400 animate-spin" />;
      case "failed": return <AlertCircle size={13} className="text-danger-500" />;
      default: return <Clock size={13} className="text-surface-400 dark:text-gray-500" />;
    }
  };

  const getBidderName = (bidderId) => {
    const b = bidders.find((x) => x.id === bidderId);
    return b?.name || "Unknown Bidder";
  };

  if (!activeTender) {
    return (
      <div className="stitch-card py-16 text-center animate-fade-in">
        <Users size={40} className="text-surface-300 dark:text-gray-700 mx-auto mb-3" />
        <p className="text-surface-500 dark:text-gray-500 text-base">
          Select a tender from the Upload page to manage bidder documents.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-surface-800 dark:text-gray-100 tracking-tight flex items-center gap-2">
            <Users size={22} className="text-brand-500 dark:text-brand-400" />
            Bidder Documents
          </h2>
          <p className="text-[13px] text-surface-500 dark:text-gray-500 mt-0.5">
            Upload support files and technical appendices for each bidder.
          </p>
        </div>
        <span className="badge-info">{bidders.length} bidders · {bidderDocs.length} docs</span>
      </div>

      {/* Add Bidder + Upload row */}
      <div className="flex gap-4 flex-wrap">
        {/* Add Bidder */}
        <div className="stitch-card flex-1 min-w-[300px]">
          <h3 className="section-heading text-sm mb-3 flex items-center gap-2">
            <UserPlus size={15} className="text-brand-500 dark:text-brand-400" />
            Register Bidder
          </h3>
          <form onSubmit={handleAddBidder} className="flex gap-2">
            <input
              value={bidderName}
              onChange={(e) => setBidderName(e.target.value)}
              className="input-field flex-1"
              placeholder="Bidder company name..."
            />
            <button type="submit" disabled={!bidderName.trim()} className="btn-primary disabled:opacity-50">
              <Plus size={16} />
            </button>
          </form>

          {/* Bidder list */}
          {bidders.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <p className="label-caps">Registered Bidders ({bidders.length})</p>
              {bidders.map((b) => {
                const docCount = bidderDocs.filter((d) => d.bidder_id === b.id).length;
                return (
                  <div key={b.id} className="flex items-center justify-between px-3 py-2.5 bg-surface-200/50 dark:bg-white/[0.04] rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-50 dark:bg-brand-400/10 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-brand-500 dark:text-brand-300">{b.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-[13px] font-semibold text-surface-800 dark:text-gray-200">{b.name}</span>
                    </div>
                    <span className="text-[11px] text-surface-500 dark:text-gray-500">{docCount} docs</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upload Bidder Doc */}
        <div className="stitch-card flex-1 min-w-[300px]">
          <h3 className="section-heading text-sm mb-3 flex items-center gap-2">
            <Upload size={15} className="text-brand-500 dark:text-brand-400" />
            Upload Bidder Document
          </h3>

          {bidders.length === 0 ? (
            <p className="text-[12px] text-surface-500 dark:text-gray-500">Register a bidder first to upload documents.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="label-caps block mb-1.5">Assign to Bidder</label>
                <select value={selectedBidder} onChange={(e) => setSelectedBidder(e.target.value)} className="select-field">
                  <option value="">Select bidder...</option>
                  {bidders.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div
                onClick={() => !uploading && fileRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all border-surface-400/40 dark:border-white/10 hover:border-brand-400/40 hover:bg-surface-200/40 dark:hover:bg-white/[0.03]"
              >
                <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.tiff,.docx" onChange={handleUpload} className="hidden" />
                <Copy size={22} className="text-surface-400 dark:text-gray-500 mx-auto mb-2" />
                <p className="text-[12px] font-semibold text-surface-600 dark:text-gray-400">
                  {uploading ? "Uploading..." : "Upload Batch"}
                </p>
                <p className="text-[10px] text-surface-400 dark:text-gray-600 mt-0.5">PDF, PNG, JPG, TIFF, DOCX</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Documents Table */}
      <div className="stitch-card">
        <h3 className="section-heading text-sm mb-3">Uploaded Documents</h3>
        {loading ? (
          <div className="py-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bidderDocs.length === 0 ? (
          <p className="text-[12px] text-surface-400 dark:text-gray-600 text-center py-6">No bidder documents uploaded yet.</p>
        ) : (
          <div className="border border-black/[0.06] dark:border-white/[0.06] rounded-lg overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Bidder</th>
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
                    <td>
                      <span className="text-[12px] text-surface-600 dark:text-gray-400">{getBidderName(doc.bidder_id)}</span>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {getStatusIcon(doc.status)}
                        <span className="text-[11px] font-bold text-surface-600 dark:text-gray-400 uppercase">{doc.status || "READY"}</span>
                      </div>
                    </td>
                    <td className="text-center">
                      <button className="text-surface-400 dark:text-gray-600 hover:text-danger-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
