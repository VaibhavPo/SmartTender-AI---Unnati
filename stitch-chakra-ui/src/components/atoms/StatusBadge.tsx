import { Badge } from "@chakra-ui/react";

type Status = string;

export interface StatusBadgeProps {
  status: Status;
}

/**
 * Unified badge for both verdict statuses and document processing statuses.
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const s = status ?? "";
  const normalized = s.toUpperCase();

  // Verdict statuses
  const verdictColor = (() => {
    if (
      normalized === "PASS" ||
      normalized === "OFFICER_APPROVED"
    ) {
      return { bg: "#0B5D34", color: "#E7F6EF", borderColor: "#0B5D34" };
    }
    if (
      normalized === "FAIL" ||
      normalized === "OFFICER_REJECTED"
    ) {
      return { bg: "#E02020", color: "#ffffff", borderColor: "#E02020" };
    }
    if (normalized === "MANUAL_REVIEW") {
      return { bg: "#B7791F", color: "#ffffff", borderColor: "#B7791F" };
    }
    return null;
  })();

  const docColor = (() => {
    const lower = s.toLowerCase();
    if (lower === "completed") {
      return { bg: "#0B5D34", color: "#E7F6EF", borderColor: "#0B5D34" };
    }
    if (lower === "processing") {
      return { bg: "#2E66FF", color: "#ffffff", borderColor: "#2E66FF" };
    }
    if (lower === "failed") {
      return { bg: "#E02020", color: "#ffffff", borderColor: "#E02020" };
    }
    if (lower === "pending") {
      return { bg: "#B7791F", color: "#ffffff", borderColor: "#B7791F" };
    }
    return null;
  })();

  const style = verdictColor ?? docColor ?? { bg: "#5f6161", color: "#ffffff", borderColor: "#5f6161" };

  return (
    <Badge
      bg={style.bg}
      color={style.color}
      border="1px solid"
      borderColor={style.borderColor}
      borderRadius="sm"
      px={3}
      py={1}
      fontWeight={700}
      fontSize="11px"
      textTransform="uppercase"
    >
      {s}
    </Badge>
  );
}

