import { Button, Flex, Stack, Text } from "@chakra-ui/react";
import type { EvidenceObject, VerdictRecord, VerdictStatus } from "../../types/backend";
import { VerdictBadge } from "../molecules/VerdictBadge";

export interface ManualReviewListProps {
  verdicts: VerdictRecord[];
  evidenceById?: Record<string, EvidenceObject | undefined>;
  onOverride: (verdictId: string, newVerdict: Exclude<VerdictStatus, "MANUAL_REVIEW">) => void;
}

export function ManualReviewList({
  verdicts,
  evidenceById,
  onOverride,
}: ManualReviewListProps) {
  return (
    <Stack spacing={3}>
      {verdicts.map((v) => {
        const evidence = evidenceById?.[v.evidence_id];
        return (
          <Flex
            key={v.id}
            direction="column"
            border="1px solid"
            borderColor="rgba(0,0,0,0.08)"
            borderRadius="md"
            p={4}
            gap={3}
          >
            <Flex align="center" justify="space-between" gap={3}>
              <Flex align="center" gap={2}>
                <VerdictBadge verdict={v.verdict} />
                <Text fontWeight={700} fontSize="13px">
                  Criterion: {v.criterion_id}
                </Text>
              </Flex>
              <Text fontSize="12px" color="rgba(0,0,0,0.55)">
                Evidence: {v.evidence_id}
              </Text>
            </Flex>

            <Text fontSize="14px" color="rgba(0,0,0,0.70)" whiteSpace="pre-wrap">
              {v.reason}
            </Text>

            {evidence?.extracted_value ? (
              <Text fontSize="13px" color="rgba(0,0,0,0.65)">
                Extracted: {evidence.extracted_value}
              </Text>
            ) : null}

            <Flex gap={2} justify="flex-end" pt={1}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOverride(v.id, "OFFICER_REJECTED")}
              >
                Reject
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOverride(v.id, "OFFICER_APPROVED")}
              >
                Approve
              </Button>
            </Flex>
          </Flex>
        );
      })}
    </Stack>
  );
}

