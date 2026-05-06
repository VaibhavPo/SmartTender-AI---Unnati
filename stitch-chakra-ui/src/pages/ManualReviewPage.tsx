import {
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Stack,
  Text,
  Textarea,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { evaluationDataApi, verdictApi } from "../api/client";
import type { EvaluationData, EvidenceObject, OverrideRequest, VerdictRecord } from "../types/backend";
import { EvidencePreview } from "../components/molecules/EvidencePreview";
import { StatusBadge } from "../components/atoms/StatusBadge";
import { StitchCard } from "../components/atoms/StitchCard";
import { useOfficer } from "../state/OfficerContext";
import { useSearchParams } from "react-router-dom";

type OverrideAction = "OFFICER_APPROVED" | "OFFICER_REJECTED";

export function ManualReviewPage() {
  const toast = useToast();
  const { activeTenderId } = useOfficer();
  const [searchParams] = useSearchParams();

  const bidderIdFilter = searchParams.get("bidderId");
  const criterionIdFilter = searchParams.get("criterionId");

  const [data, setData] = useState<EvaluationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [activeVerdict, setActiveVerdict] = useState<VerdictRecord | null>(null);
  const [overrideAction, setOverrideAction] = useState<OverrideAction>("OFFICER_APPROVED");
  const [justification, setJustification] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const evidenceById = useMemo(() => {
    if (!data) return {} as Record<string, EvidenceObject>;
    return Object.fromEntries(data.evidence.map((e) => [e.id, e]));
  }, [data]);

  const bidderById = useMemo(() => {
    if (!data) return {} as Record<string, string>;
    return Object.fromEntries(data.bidders.map((b) => [b.id, b.name]));
  }, [data]);

  const criterionById = useMemo(() => {
    if (!data) return {} as Record<string, string>;
    return Object.fromEntries(data.criteria.map((c) => [c.id, c.name]));
  }, [data]);

  useEffect(() => {
    if (!activeTenderId) return;
    setIsLoading(true);
    evaluationDataApi
      .get(activeTenderId)
      .then((res) => setData(res.data))
      .catch(() => toast({ status: "error", title: "Failed to load evaluation data" }))
      .finally(() => setIsLoading(false));

    // Poll for queue updates
    const t = setInterval(async () => {
      try {
        const res = await evaluationDataApi.get(activeTenderId);
        setData(res.data);
      } catch {
        // Silent
      }
    }, 5000);

    return () => clearInterval(t);
  }, [activeTenderId, toast]);

  const manualVerdicts = useMemo(() => {
    if (!data) return [];
    return data.verdicts.filter((v) => {
      if (v.verdict !== "MANUAL_REVIEW") return false;
      if (bidderIdFilter && v.bidder_id !== bidderIdFilter) return false;
      if (criterionIdFilter && v.criterion_id !== criterionIdFilter) return false;
      return true;
    });
  }, [data, bidderIdFilter, criterionIdFilter]);

  const openOverrideModal = (verdict: VerdictRecord, action: OverrideAction) => {
    setActiveVerdict(verdict);
    setOverrideAction(action);
    setJustification("");
    onOpen();
  };

  const handleSubmitOverride = async () => {
    if (!activeTenderId || !activeVerdict) return;
    if (justification.trim().length < 10) {
      toast({ status: "warning", title: "Please provide a longer justification." });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: OverrideRequest = {
        verdict_id: activeVerdict.id,
        new_verdict: overrideAction,
        justification: justification.trim(),
      };
      await verdictApi.override(payload);
      toast({ status: "success", title: "Override submitted" });
      onClose();
      // Refresh the evaluation view so the queue updates.
      const refreshed = await evaluationDataApi.get(activeTenderId);
      setData(refreshed.data);
    } catch {
      toast({ status: "error", title: "Override failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeTenderId) {
    return <Text color="rgba(0,0,0,0.6)">Select a tender first.</Text>;
  }

  if (isLoading) {
    return (
      <Flex justify="center" align="center" minH="40vh">
        <Spinner size="lg" />
      </Flex>
    );
  }

  return (
    <Stack spacing={5}>
      <Stack direction="row" justify="space-between" align="center">
        <Text fontWeight={900} fontSize="16px">
          Manual Review Queue
        </Text>
        <Text fontSize="12px" color="rgba(0,0,0,0.55)">
          Showing {manualVerdicts.length} items
        </Text>
      </Stack>

      {manualVerdicts.length === 0 ? (
        <Text color="rgba(0,0,0,0.6)">No manual review items right now.</Text>
      ) : (
        <Stack spacing={3}>
          {manualVerdicts.map((v) => {
            const evidence = evidenceById[v.evidence_id];
            return (
              <StitchCard key={v.id}>
                <Stack spacing={3}>
                  <Flex justify="space-between" align="flex-start" gap={4}>
                    <Stack spacing={1}>
                      <Flex gap={2} align="center">
                        <StatusBadge status={v.verdict} />
                        <Text fontWeight={900} fontSize="13px">
                          Criterion: {criterionById[v.criterion_id] || "Unknown"}
                        </Text>
                      </Flex>
                      <Text fontSize="12px" color="rgba(0,0,0,0.55)">
                        Bidder: {bidderById[v.bidder_id] || "Unknown"} • Evidence Value: {evidence?.extracted_value || "Not found"}
                      </Text>
                    </Stack>
                  </Flex>

                  <Text fontSize="14px" color="rgba(0,0,0,0.75)" whiteSpace="pre-wrap">
                    {v.reason}
                  </Text>

                  <EvidencePreview evidence={evidence ?? null} />

                  <Flex gap={2} justify="flex-end" pt={2}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openOverrideModal(v, "OFFICER_REJECTED")}
                    >
                      Reject
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => openOverrideModal(v, "OFFICER_APPROVED")}>
                      Approve
                    </Button>
                  </Flex>
                </Stack>
              </StitchCard>
            );
          })}
        </Stack>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Officer override</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={3}>
              <Text fontSize="13px" color="rgba(0,0,0,0.65)">
                This will set the verdict to <b>{overrideAction}</b>.
              </Text>
              <Textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                minH="120px"
                placeholder="Provide a justification for the override (required)."
              />
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmitOverride} isLoading={isSubmitting}>
              Submit override
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}

