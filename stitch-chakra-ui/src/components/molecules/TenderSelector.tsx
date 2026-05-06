import { Wrap, WrapItem } from "@chakra-ui/react";
import type { TenderResponse } from "../../types/backend";
import { StitchButton } from "../atoms/StitchButton";

export interface TenderSelectorProps {
  tenders: TenderResponse[];
  activeTenderId?: string | null;
  onSelect: (tender: TenderResponse) => void;
}

export function TenderSelector({
  tenders,
  activeTenderId,
  onSelect,
}: TenderSelectorProps) {
  const safeTenders = Array.isArray(tenders) ? tenders : [];

  return (
    <Wrap spacing="8px">
      {safeTenders.map((t) => (
        <WrapItem key={t.id}>
          <StitchButton
            onClick={() => onSelect(t)}
            variant={activeTenderId === t.id ? "primary" : "ghost"}
            size="sm"
          >
            {t.name}
          </StitchButton>
        </WrapItem>
      ))}
    </Wrap>
  );
}

