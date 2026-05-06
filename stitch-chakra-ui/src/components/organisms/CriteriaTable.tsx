import { Stack } from "@chakra-ui/react";
import type { CriterionSchema } from "../../types/backend";
import { CriterionCard } from "../molecules/CriterionCard";

export interface CriteriaTableProps {
  criteria: CriterionSchema[];
  onUpdate: (criterion: CriterionSchema) => void;
  onDelete: (criterionId: string) => void;
}

/**
 * Criteria list container (cards with inline edit).
 */
export function CriteriaTable({ criteria, onUpdate, onDelete }: CriteriaTableProps) {
  return (
    <Stack spacing={3}>
      {criteria.map((c, idx) => (
        <CriterionCard
          key={c.id}
          criterion={c}
          index={idx}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </Stack>
  );
}

