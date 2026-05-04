/**
 * FileUploader Component
 * =======================
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
    // Validate file type
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
      {/* Bidder selector */}
      {bidders.length > 0 && (
        <div>
          <label className="text-xs text-gray-400 block mb-1">Assign to bidder (optional)</label>
          <select
            id="bidder-select"
            value={selectedBidder}
            onChange={(e) => setSelectedBidder(e.target.value)}
            className="input-field text-sm"
          >
            <option value="">Tender Document (no bidder)</option>
            {bidders.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Drop zone */}
      <div
        id="file-drop-zone"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
                    transition-all duration-200 ${
                      dragActive
                        ? "border-primary-500 bg-primary-500/10"
                        : "border-white/10 hover:border-white/20 hover:bg-white/5"
                    } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleChange}
          accept=".pdf,.png,.jpg,.jpeg,.tiff"
          className="hidden"
        />
        <div className="text-4xl mb-3">{uploading ? "⏳" : "📎"}</div>
        <p className="text-sm text-gray-300 font-medium">
          {uploading ? "Uploading..." : "Drop file here or click to browse"}
        </p>
        <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG, TIFF</p>
      </div>

      {/* Status message */}
      {uploadStatus && (
        <div
          className={`px-4 py-2 rounded-xl text-sm animate-fade-in ${
            uploadStatus.type === "success"
              ? "bg-accent-500/20 text-accent-400"
              : "bg-danger-500/20 text-danger-400"
          }`}
        >
          {uploadStatus.message}
        </div>
      )}
    </div>
  );
}
