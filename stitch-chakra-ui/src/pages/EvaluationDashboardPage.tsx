import {
  Button,
  Box,
  Flex,
  Spinner,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { auditApi, evaluationDataApi } from "../api/client";
import type { AuditEvent, CriterionSchema, EvaluationData, VerdictRecord } from "../types/backend";
import { StatusBadge } from "../components/atoms/StatusBadge";
import { StitchCard } from "../components/atoms/StitchCard";
import { AuditEventsTable } from "../components/organisms/AuditEventsTable";
import { useOfficer } from "../state/OfficerContext";
import { useNavigate } from "react-router-dom";

function isPassingVerdict(v: VerdictRecord["verdict"]) {
  return v === "PASS" || v === "OFFICER_APPROVED";
}

function isFailVerdict(v: VerdictRecord["verdict"]) {
  return v === "FAIL" || v === "OFFICER_REJECTED";
}

function isManualVerdict(v: VerdictRecord["verdict"]) {
  return v === "MANUAL_REVIEW";
}

export function EvaluationDashboardPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { activeTenderId } = useOfficer();

  const [data, setData] = useState<EvaluationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  const loadData = async (silent = false) => {
    if (!activeTenderId) return;
    if (!silent) setIsLoading(true);
    try {
      const res = await evaluationDataApi.get(activeTenderId);
      setData(res.data);
    } catch {
      if (!silent) toast({ status: "error", title: "Failed to load evaluation data" });
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTenderId]);

  // Stitch "live log" adaptation: use audit-events as the log source.
  useEffect(() => {
    if (!activeTenderId) return;

    let cancelled = false;
    const load = async () => {
      try {
        const res = await auditApi.list(activeTenderId);
        if (cancelled) return;
        setAuditEvents(res.data);
      } catch {
        // Best-effort only.
      }
    };

    load();
    const t = window.setInterval(() => {
      load();
      loadData(true);
    }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [activeTenderId]);

  const sortedCriteria = useMemo(() => {
    if (!data) return [];
    return [...data.criteria].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [data]);

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

  if (!data) {
    return <Text color="rgba(0,0,0,0.6)">No evaluation data available yet.</Text>;
  }

  return (
    <Stack spacing={6}>
      <Text fontWeight={900} fontSize="16px">
        Evaluation Dashboard
      </Text>

      <Stack spacing={4}>
        {data.bidders.map((bidder) => {
          const verdictsForBidder = data.verdicts.filter((v) => v.bidder_id === bidder.id);
          const total = data.criteria.length;
          const passCount = verdictsForBidder.filter((v) => isPassingVerdict(v.verdict)).length;
          const failCount = verdictsForBidder.filter((v) => isFailVerdict(v.verdict)).length;
          const manualCount = verdictsForBidder.filter((v) => isManualVerdict(v.verdict)).length;
          const pendingCount = Math.max(0, total - verdictsForBidder.length);

          return (
            <StitchCard key={bidder.id}>
              <Stack spacing={3}>
                <Flex align="center" justify="space-between" gap={4}>
                  <Flex direction="column">
                    <Text fontWeight={900} fontSize="15px">
                      {bidder.name}
                    </Text>
                    <Text fontSize="12px" color="rgba(0,0,0,0.55)">
                      {passCount} pass • {failCount} fail • {manualCount} manual • {pendingCount} pending
                    </Text>
                  </Flex>

                  <Flex gap={2} align="center" wrap="wrap">
                    <StatusBadge 
                      status={
                        failCount > 0 ? "FAIL" : 
                        manualCount > 0 ? "MANUAL_REVIEW" : 
                        pendingCount > 0 ? "pending" : 
                        (passCount > 0 && passCount === total) ? "PASS" : 
                        "pending"
                      } 
                    />
                  </Flex>
                </Flex>

                <Stack spacing={2}>
                  {sortedCriteria.map((c: CriterionSchema) => {
                    const verdict = data.verdicts.find(
                      (v) => v.bidder_id === bidder.id && v.criterion_id === c.id,
                    );
                    if (verdict) {
                      return (
                        <Flex key={c.id} justify="space-between" align="center" gap={3}>
                          <Text fontSize="13px" fontWeight={700} noOfLines={1} flex="1">
                            {c.name}
                          </Text>
                          <Flex align="center" gap={2}>
                            <StatusBadge status={verdict.verdict} />
                            <Text fontSize="11px" color="rgba(0,0,0,0.55)" fontWeight={800}>
                              {Math.round(verdict.confidence * 100)}%
                            </Text>
                            {isManualVerdict(verdict.verdict) ? (
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => {
                                  const params = new URLSearchParams();
                                  params.set("bidderId", bidder.id);
                                  params.set("criterionId", c.id);
                                  navigate(`/manual?${params.toString()}`);
                                }}
                              >
                                Review Evidence
                              </Button>
                            ) : null}
                          </Flex>
                        </Flex>
                      );
                    }

                    return (
                      <Flex key={c.id} justify="space-between" align="center" gap={3}>
                        <Text fontSize="13px" fontWeight={700} noOfLines={1} flex="1">
                          {c.name}
                        </Text>
                        <StatusBadge status="pending" />
                      </Flex>
                    );
                  })}
                </Stack>
              </Stack>
            </StitchCard>
          );
        })}
      </Stack>

      <StitchCard>
        <Stack spacing={3}>
          <Text fontWeight={900} fontSize="14px">
            Live Processing Log (from audit events)
          </Text>
          <Box maxH="360px" overflow="auto" borderRadius="md" border="1px solid rgba(0,0,0,0.06)">
            <AuditEventsTable events={auditEvents.slice(0, 20)} />
          </Box>
        </Stack>
      </StitchCard>
    </Stack>
  );
}

