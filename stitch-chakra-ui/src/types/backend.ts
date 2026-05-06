/**
 * Backend types for stitching UI -> FastAPI.
 * These shapes mirror `backend/app/models/schemas.py` and the aggregated
 * `/tenders/{tender_id}/evaluation-data` endpoint.
 */

export type UUIDString = string;

export type DocumentStatus = "pending" | "processing" | "completed" | "failed" | (string & {});

export type CriterionType = "numeric" | "date" | "boolean" | "text" | (string & {});

export interface PageBlock {
  page_num: number; // 1-indexed
  block_index: number; // 0-indexed reading order
  block_type: string;
  text: string;
  confidence: number; // 0..1
  bbox: number[] | null; // [x0,y0,x1,y1] in PDF coords
  source: "docling" | "llava_vision" | (string & {});
}

export interface StructuredDocumentObject {
  id: UUIDString;
  tender_id: UUIDString;
  bidder_id: UUIDString | null;
  filename: string;
  file_type: string;
  num_pages: number;
  page_blocks: PageBlock[];
  avg_confidence: number;
  ingested_at: string | null; // ISO-8601
  status: DocumentStatus;
}

export interface CriterionSchema {
  id: UUIDString;
  tender_id: UUIDString;
  name: string;
  description: string;
  criterion_type: CriterionType;
  threshold_value: string | null;
  unit: string | null;
  is_mandatory: boolean;
  section_reference: string | null;
  order_index: number;

  // Present in `/tenders/{tender_id}/evaluation-data` but not in `/criteria` list.
  status?: string;
  created_at?: string | null;
}

export interface EvidenceObject {
  id: UUIDString;
  tender_id: UUIDString;
  bidder_id: UUIDString;
  criterion_id: UUIDString;
  extracted_value: string | null;
  source_text: string | null;
  source_pages: number[];
  confidence: number; // 0..1
  extraction_method: string;
  extracted_at: string | null;
  created_at?: string | null;
}

export type VerdictStatus =
  | "PASS"
  | "FAIL"
  | "MANUAL_REVIEW"
  | "OFFICER_APPROVED"
  | "OFFICER_REJECTED"
  | (string & {});

export interface VerdictRecord {
  id: UUIDString;
  tender_id: UUIDString;
  bidder_id: UUIDString;
  criterion_id: UUIDString;
  evidence_id: UUIDString;
  verdict: VerdictStatus;
  reason: string;
  confidence: number; // 0..1
  decided_by: string;
  version: number;
  decided_at: string | null;
}

export interface AuditEvent {
  id: UUIDString;
  tender_id?: UUIDString;
  event_type: string;
  actor: string;
  entity_type: string;
  entity_id: UUIDString;
  detail: string | null;
  timestamp: string | null;
}

export interface TenderResponse {
  id: UUIDString;
  name: string;
  reference_number: string | null;
  description: string | null;
  submission_deadline: string | null;
  status: string;
  created_at: string | null;
  bidder_count: number;
  document_count: number;
}

export interface BidderResponse {
  id: UUIDString;
  tender_id: UUIDString;
  name: string;
  registration_number: string | null;
  created_at: string | null;
}

// Request bodies
export interface TenderCreate {
  name: string;
  reference_number?: string | null;
  description?: string | null;
  submission_deadline?: string | null;
}

export interface BidderCreate {
  name: string;
  registration_number?: string | null;
}

export interface EvaluationTrigger {
  tender_id: UUIDString;
  bidder_ids: UUIDString[];
  criterion_ids: UUIDString[];
}

export interface ReportRequest {
  tender_id: UUIDString;
  include_audit_trail: boolean;
}

export interface ReportTriggerResponse {
  message: string;
  tender_id: UUIDString;
}

export interface OverrideRequest {
  verdict_id: UUIDString;
  new_verdict: "OFFICER_APPROVED" | "OFFICER_REJECTED";
  justification: string;
}

// Aggregated evaluation view for dashboard/manual review.
export interface EvaluationData {
  tender: TenderResponse;
  bidders: BidderResponse[];
  criteria: CriterionSchema[];
  verdicts: VerdictRecord[];
  evidence: EvidenceObject[];
}

