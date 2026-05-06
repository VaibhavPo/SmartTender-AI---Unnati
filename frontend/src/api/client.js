/**
 * API Client
 * ===========
 * Centralized Axios instance. Every page imports from here.
 *
 * In dev: Vite proxy forwards /api to backend:8000.
 * In prod: VITE_API_BASE_URL points to your deployed backend.
 */

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor: add auth token when we add it later ──
api.interceptors.request.use((config) => {
  // Future: const token = localStorage.getItem("token");
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: standardize error handling ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "Something went wrong";

    console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}: ${message}`);

    return Promise.reject({
      message,
      status: error.response?.status,
      detail: error.response?.data?.detail,
      original: error,
    });
  }
);

export default api;

// ── Convenience functions ──

export const tenderApi = {
  list: () => api.get("/tenders"),
  get: (id) => api.get(`/tenders/${id}`),
  create: (data) => api.post("/tenders", data),
  addBidder: (tenderId, data) => api.post(`/tenders/${tenderId}/bidders`, data),
  listBidders: (tenderId) => api.get(`/tenders/${tenderId}/bidders`),
};

export const documentApi = {
  upload: (formData) =>
    api.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000, // 2 min — large PDFs take time
    }),
  get: (id) => api.get(`/documents/${id}`),
  list: (tenderId, bidderId) => {
    const params = { tender_id: tenderId };
    if (bidderId) params.bidder_id = bidderId;
    return api.get("/documents", { params });
  },
  delete: (id) => api.delete(`/documents/${id}`),
};

export const criteriaApi = {
  list: (tenderId) => api.get("/criteria", { params: { tender_id: tenderId } }),
  extract: (tenderId, documentId) =>
    api.post(`/criteria/extract?tender_id=${tenderId}&document_id=${documentId}`),
  update: (id, data) => api.put(`/criteria/${id}`, data),
  confirm: (data) => api.post("/criteria/confirm", data),
  delete: (id) => api.delete(`/criteria/${id}`),
};

export const evidenceApi = {
  list: (tenderId, bidderId, criterionId) => {
    const params = { tender_id: tenderId };
    if (bidderId) params.bidder_id = bidderId;
    if (criterionId) params.criterion_id = criterionId;
    return api.get("/evidence", { params });
  },
  get: (id) => api.get(`/evidence/${id}`),
};

export const verdictApi = {
  list: (tenderId, bidderId) => {
    const params = { tender_id: tenderId };
    if (bidderId) params.bidder_id = bidderId;
    return api.get("/verdicts", { params });
  },
  override: (data) => api.post("/verdicts/override", data),
};

export const reportApi = {
  generate: (data) => api.post("/reports/generate", data),
  download: (tenderId) =>
    api.get(`/reports/${tenderId}/download`, { responseType: "blob" }),
};

export const healthApi = {
  check: () => api.get("/health"),
};
