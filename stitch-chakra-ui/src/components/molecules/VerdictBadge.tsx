import type { VerdictRecord, VerdictStatus } from "../../types/backend";
import { StatusBadge } from "../atoms/StatusBadge";

export interface VerdictBadgeProps {
  verdict: VerdictStatus | VerdictRecord["verdict"];
}

export function VerdictBadge({ verdict }: VerdictBadgeProps) {
  return <StatusBadge status={verdict} />;
}

