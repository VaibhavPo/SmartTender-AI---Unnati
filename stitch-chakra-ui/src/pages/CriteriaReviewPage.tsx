import {
  Button,
  Flex,
  Select,
  Spinner,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { criteriaApi, documentApi, tenderApi } from "../api/client";
import type { CriterionSchema, StructuredDocumentObject } from "../types/backend";
import { CriteriaTable } from "../components/organisms/CriteriaTable";
import { useOfficer } from "../state/OfficerContext";
import { useNavigate } from "react-router-dom";

export function CriteriaReviewPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { activeTenderId } = useOfficer();

  const [criteria, setCriteria] = useState<CriterionSchema[]>([]);
  const [documents, setDocuments] = useState<StructuredDocumentObject[]>([]);
  const [extractFromDocId, setExtractFromDocId] = useState<string>("");

  const [isExtracting, setIsExtracting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!activeTenderId) return;
    criteriaApi
      .list(activeTenderId)
      .then((res) => setCriteria(res.data))
      .catch(() => toast({ status: "error", title: "Failed to load criteria" }));

    documentApi
      .list(activeTenderId)
      .then((res) => setDocuments(res.data))
      .catch(() => toast({ status: "error", title: "Failed to load documents" }));
  }, [activeTenderId, toast]);

  const extractableDocuments = useMemo(() => {
    // Stitch extraction is based on a general tender doc (bidder_id is null).
    return documents.filter((d) => !d.bidder_id);
  }, [documents]);

  useEffect(() => {
    if (!extractableDocuments.length) return;
    if (extractFromDocId && extractableDocuments.some((d) => d.id === extractFromDocId)) return;
    const defaultDoc = extractableDocuments.find((d) => d.status === "completed") ?? extractableDocuments[0];
    setExtractFromDocId(defaultDoc.id);
  }, [extractableDocuments, extractFromDocId]);

  const handleUpdate = async (updated: CriterionSchema) => {
    if (!activeTenderId) return;
    try {
      await criteriaApi.update(updated.id, updated);
      const refreshed = await criteriaApi.list(activeTenderId);
      setCriteria(refreshed.data);
      toast({ status: "success", title: "Criterion updated" });
    } catch {
      toast({ status: "error", title: "Update failed" });
    }
  };

  const handleDelete = async (criterionId: string) => {
    if (!activeTenderId) return;
    try {
      await criteriaApi.delete(criterionId);
      const refreshed = await criteriaApi.list(activeTenderId);
      setCriteria(refreshed.data);
      toast({ status: "success", title: "Criterion deleted" });
    } catch {
      toast({ status: "error", title: "Delete failed" });
    }
  };

  const pollForCriteria = async () => {
    if (!activeTenderId) return;
    for (let i = 0; i < 6; i++) {
      // Poll every ~5s to allow backend extraction to complete.
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 5000));
      // eslint-disable-next-line no-await-in-loop
      const res = await criteriaApi.list(activeTenderId);
      if (res.data.length > 0) {
        setCriteria(res.data);
        return;
      }
    }
  };

  const handleExtract = async () => {
    if (!activeTenderId) return;
    if (!extractFromDocId) {
      toast({ status: "warning", title: "Choose a document first" });
      return;
    }

    setIsExtracting(true);
    try {
      await criteriaApi.extract(activeTenderId, extractFromDocId);
      toast({ status: "success", title: "Extraction triggered" });
      await pollForCriteria();
    } catch {
      toast({ status: "error", title: "Extraction failed" });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleConfirmEvaluation = async () => {
    if (!activeTenderId) return;
    if (!criteria.length) {
      toast({ status: "warning", title: "No criteria to confirm" });
      return;
    }

    setIsConfirming(true);
    try {
      const biddersRes = await tenderApi.listBidders(activeTenderId);
      if (!biddersRes.data.length) {
        toast({ status: "warning", title: "Add at least one bidder first" });
        return;
      }

      await criteriaApi.confirm({
        tender_id: activeTenderId,
        bidder_ids: biddersRes.data.map((b) => b.id),
        criterion_ids: criteria.map((c) => c.id),
      });

      toast({ status: "success", title: "Evaluation started" });
      navigate("/dashboard");
    } catch {
      toast({ status: "error", title: "Failed to start evaluation" });
    } finally {
      setIsConfirming(false);
    }
  };

  if (!activeTenderId) {
    return <Text color="rgba(0,0,0,0.6)">Select a tender first.</Text>;
  }

  return (
    <Stack spacing={6}>
      <Stack direction={{ base: "column", md: "row" }} spacing={4} align="flex-end">
        <Stack flex="1">
          <Text fontWeight={900} mb={2}>
            Extract criteria from document
          </Text>
          <Select value={extractFromDocId} onChange={(e) => setExtractFromDocId(e.target.value)}>
            {extractableDocuments.length === 0 ? <option value="">No extractable docs</option> : null}
            {extractableDocuments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.filename} ({d.status})
              </option>
            ))}
          </Select>
        </Stack>

        <Button variant="primary" isDisabled={!extractFromDocId || isExtracting} onClick={handleExtract}>
          {isExtracting ? <Spinner size="sm" mr={2} /> : null}
          Extract Criteria
        </Button>
      </Stack>

      <CriteriaTable criteria={criteria} onUpdate={handleUpdate} onDelete={handleDelete} />

      <Flex justify="flex-end">
        <Button variant="primary" isDisabled={isConfirming || criteria.length === 0} onClick={handleConfirmEvaluation}>
          {isConfirming ? <Spinner size="sm" mr={2} /> : null}
          Start Evaluation
        </Button>
      </Flex>
    </Stack>
  );
}

