import { Box, Flex, Text } from "@chakra-ui/react";
import type { EvidenceObject } from "../../types/backend";
import { StatusBadge } from "../atoms/StatusBadge";

export interface EvidencePreviewProps {
  evidence: EvidenceObject | null;
}

export function EvidencePreview({ evidence }: EvidencePreviewProps) {
  if (!evidence) {
    return (
      <Box p={4} border="1px dashed" borderColor="rgba(0,0,0,0.15)" borderRadius="md">
        <Text color="rgba(0,0,0,0.6)">No evidence available.</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Flex gap={2} align="center" wrap="wrap" mb={3}>
        <StatusBadge status={`${Math.round(evidence.confidence * 100)}%`} />
        <Text fontSize="12px" color="rgba(0,0,0,0.6)">
          Extraction: {evidence.extraction_method}
        </Text>
      </Flex>
      {evidence.source_text ? (
        <Text fontSize="14px" lineHeight={1.5} whiteSpace="pre-wrap">
          {evidence.source_text}
        </Text>
      ) : (
        <Text fontSize="14px" color="rgba(0,0,0,0.55)">
          Source text unavailable.
        </Text>
      )}
    </Box>
  );
}

