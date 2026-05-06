import axios, { AxiosError } from "axios";
import type {
  AuditEvent,
  BidderCreate,
  BidderResponse,
  CriterionSchema,
  EvaluationData,
  EvaluationTrigger,
  EvidenceObject,
  OverrideRequest,
  ReportRequest,
  ReportTriggerResponse,
  StructuredDocumentObject,
  TenderCreate,
  TenderResponse,
  VerdictRecord,
} from "../types/backend";

// NOTE: backend is mounted at `/api/v1` (FastAPI main.py).
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "/api/v1";

export type ApiErrorPayload = {
  message: string;
  status?: number;
  detail?: string;
  original?: unknown;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    const payload: ApiErrorPayload = {
      message:
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Something went wrong",
      status: error.response?.status,
      detail: error.response?.data?.detail,
      original: error,
    };
    return Promise.reject(payload);
  },
);

export const evaluationDataApi = {
  get: (tenderId: string) =>
    api.get<EvaluationData>(`/tenders/${tenderId}/evaluation-data`),
};

export const tenderApi = {
  list: () => api.get<TenderResponse[]>(`/tenders`),
  get: (id: string) => api.get<TenderResponse>(`/tenders/${id}`),
  create: (data: TenderCreate) => api.post<TenderResponse>(`/tenders`, data),
  addBidder: (tenderId: string, data: BidderCreate) =>
    api.post<BidderResponse>(`/tenders/${tenderId}/bidders`, data),
  listBidders: (tenderId: string) =>
    api.get<BidderResponse[]>(`/tenders/${tenderId}/bidders`),
};

export const documentApi = {
  upload: (formData: FormData) =>
    api.post<StructuredDocumentObject>(`/documents/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
    }),
  get: (id: string) => api.get<StructuredDocumentObject>(`/documents/${id}`),
  list: (tenderId: string, bidderId?: string | null) => {
    const params: Record<string, string> = { tender_id: tenderId };
    if (bidderId) params.bidder_id = bidderId;
    return api.get<StructuredDocumentObject[]>(`/documents`, { params });
  },
};

export const criteriaApi = {
  list: (tenderId: string, status?: string) =>
    api.get<CriterionSchema[]>(`/criteria`, {
      params: {
        tender_id: tenderId,
        ...(status ? { status } : {}),
      },
    }),
  extract: (tenderId: string, documentId: string) =>
    api.post(
      `/criteria/extract?tender_id=${encodeURIComponent(tenderId)}&document_id=${encodeURIComponent(documentId)}`,
    ),
  update: (criterionId: string, data: CriterionSchema) =>
    api.put<CriterionSchema>(`/criteria/${criterionId}`, data),
  confirm: (data: EvaluationTrigger) =>
    api.post<{ message: string; tender_id: string; bidder_count: number; criterion_count: number }>(
      `/criteria/confirm`,
      data,
    ),
  delete: (criterionId: string) => api.delete(`/criteria/${criterionId}`),
};

export const evidenceApi = {
  list: (
    tenderId: string,
    bidderId?: string | null,
    criterionId?: string | null,
  ) => {
    const params: Record<string, string> = { tender_id: tenderId };
    if (bidderId) params.bidder_id = bidderId;
    if (criterionId) params.criterion_id = criterionId;
    return api.get<EvidenceObject[]>(`/evidence`, { params });
  },
  get: (evidenceId: string) => api.get<EvidenceObject>(`/evidence/${evidenceId}`),
};

export const verdictApi = {
  list: (tenderId: string, bidderId?: string | null) => {
    const params: Record<string, string> = { tender_id: tenderId };
    if (bidderId) params.bidder_id = bidderId;
    return api.get<VerdictRecord[]>(`/verdicts`, { params });
  },
  override: (data: OverrideRequest) => api.post<VerdictRecord>(`/verdicts/override`, data),
};

export const auditApi = {
  list: (tenderId: string, eventType?: string) =>
    api.get<AuditEvent[]>(`/audit-events`, {
      params: {
        tender_id: tenderId,
        ...(eventType ? { event_type: eventType } : {}),
      },
    }),
};

export const reportApi = {
  generate: (data: ReportRequest) =>
    api.post<ReportTriggerResponse>(`/reports/generate`, data),
  download: (tenderId: string) =>
    api.get<Blob>(`/reports/${tenderId}/download`, { responseType: "blob" }),
};

export const healthApi = {
  check: () => api.get(`/health`),
};

export default api;

