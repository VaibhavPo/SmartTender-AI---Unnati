/**
 * FileUploader Component — Stitch Design
 * =========================================
 * Drag-and-drop + click-to-browse file uploader.
 * Supports assigning uploads to a specific bidder.
 */

import { useState, useRef } from "react";

export default function FileUploader({ bidders = [], onUpload }) {
  const [selectedBidder, setSelectedBidder] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) await uploadFile(files[0]);
  };

  const handleChange = async (e) => {
    if (e.target.files.length > 0) await uploadFile(e.target.files[0]);
  };

  const uploadFile = async (file) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/tiff"];
    if (!allowed.includes(file.type)) {
      setUploadStatus({ type: "error", message: "Only PDF or image files allowed." });
      return;
    }

    setUploading(true);
    setUploadStatus(null);
    try {
      await onUpload(file, selectedBidder || null);
      setUploadStatus({ type: "success", message: `Uploaded ${file.name}` });
    } catch (err) {
      setUploadStatus({ type: "error", message: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bidder selector + file input row */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="label-caps block mb-1.5">Select bidder (optional)</label>
          <select
            id="bidder-select"
            value={selectedBidder}
            onChange={(e) => setSelectedBidder(e.target.value)}
            className="select-field"
          >
            <option value="">General tender document</option>
            {bidders.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="label-caps block mb-1.5">PDF / Image</label>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.tiff"
            onChange={handleChange}
            className="block w-full text-sm text-surface-600 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border file:border-brand-500 file:text-sm file:font-semibold file:bg-brand-500 file:text-white hover:file:bg-brand-600 file:cursor-pointer file:transition-all"
          />
        </div>
      </div>

      {/* Drop zone */}
      <div
        id="file-drop-zone"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                    transition-all duration-200 ${
                      dragActive
                        ? "border-brand-400 bg-brand-50"
                        : "border-surface-400/60 hover:border-brand-400/40 hover:bg-surface-200/40"
                    } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleChange}
          accept=".pdf,.png,.jpg,.jpeg,.tiff"
          className="hidden"
        />
        {/* Upload icon */}
        <div className="flex justify-center mb-3">
          <svg className="w-10 h-10 text-surface-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
          </svg>
        </div>
        <p className="text-sm text-surface-700 font-semibold">
          {uploading ? "Uploading..." : "Click or drag PDF here"}
        </p>
        <p className="text-xs text-surface-500 mt-1">
          AI Extraction in Progress
        </p>
      </div>

      {/* Status message */}
      {uploadStatus && (
        <div
          className={`px-4 py-2.5 rounded-lg text-sm animate-fade-in border ${
            uploadStatus.type === "success"
              ? "bg-accent-50 text-accent-600 border-accent-500/20"
              : "bg-danger-50 text-danger-600 border-danger-500/20"
          }`}
        >
          {uploadStatus.message}
        </div>
      )}
    </div>
  );
}
