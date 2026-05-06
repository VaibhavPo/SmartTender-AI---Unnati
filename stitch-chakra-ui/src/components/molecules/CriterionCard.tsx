import {
  Badge,
  Button,
  Checkbox,
  Flex,
  Input,
  Select,
  Stack,
  Textarea,
  useColorModeValue,
} from "@chakra-ui/react";
import { useState } from "react";
import type { CriterionSchema } from "../../types/backend";
import { StitchButton } from "../atoms/StitchButton";

const CRITERION_TYPES: Array<{ value: CriterionSchema["criterion_type"]; label: string }> = [
  { value: "numeric", label: "Numeric (>= threshold)" },
  { value: "date", label: "Date (expiry check)" },
  { value: "boolean", label: "Boolean (yes/no)" },
  { value: "text", label: "Text (free-form)" },
];

export interface CriterionCardProps {
  criterion: CriterionSchema;
  index: number;
  onUpdate: (updated: CriterionSchema) => void;
  onDelete: (criterionId: string) => void;
}

export function CriterionCard({ criterion, index, onUpdate, onDelete }: CriterionCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CriterionSchema>(() => ({ ...criterion }));

  const borderColor = useColorModeValue("rgba(0, 32, 91, 0.15)", "rgba(255, 255, 255, 0.08)");
  const typePillBg = useColorModeValue("rgba(0,32,91,0.06)", "rgba(255,255,255,0.06)");
  const mandatoryBg = useColorModeValue("rgba(224,32,32,0.10)", "rgba(224,32,32,0.20)");

  const handleSave = () => {
    onUpdate(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft({ ...criterion });
    setEditing(false);
  };

  return (
    <Flex
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      p={4}
      bg={useColorModeValue("white", "rgba(255,255,255,0.03)")}
      gap={4}
    >
      <Flex flex="1" minW={0}>
        {editing ? (
          <Stack spacing={3} w="100%">
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Criterion Name"
            />
            <Textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Full description from tender document"
              resize="vertical"
              minH="80px"
            />
            <Stack direction={{ base: "column", md: "row" }} spacing={3}>
              <Select
                value={draft.criterion_type}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    criterion_type: e.target.value as CriterionSchema["criterion_type"],
                  })
                }
              >
                {CRITERION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <Input
                value={draft.threshold_value ?? ""}
                onChange={(e) => setDraft({ ...draft, threshold_value: e.target.value || null })}
                placeholder="Threshold"
              />
              <Input
                value={draft.unit ?? ""}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value || null })}
                placeholder="Unit (INR, years...)"
              />
            </Stack>
            <Flex align="center" justify="space-between" gap={3}>
              <Checkbox
                isChecked={draft.is_mandatory}
                onChange={(e) => setDraft({ ...draft, is_mandatory: e.target.checked })}
              >
                Mandatory
              </Checkbox>
              <Input
                value={draft.section_reference ?? ""}
                onChange={(e) => setDraft({ ...draft, section_reference: e.target.value || null })}
                placeholder="Section reference (e.g., Section 4.2.1 / Page 12)"
              />
            </Flex>
            <Flex justify="flex-end" gap={2} pt={1}>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <StitchButton variant="primary" size="sm" onClick={handleSave}>
                Save
              </StitchButton>
            </Flex>
          </Stack>
        ) : (
          <Flex w="100%" justify="space-between" align="flex-start" gap={4}>
            <Stack spacing={2} minW={0} flex="1">
              <Flex align="center" gap={2} minW={0}>
                <Badge bg={typePillBg} color="inherit" borderRadius="sm" px={2} py={1}>
                  {index + 1}
                </Badge>
                <Badge
                  bg={typePillBg}
                  borderRadius="sm"
                  px={2}
                  py={1}
                  fontWeight={700}
                  textTransform="uppercase"
                  fontSize="11px"
                >
                  {criterion.criterion_type}
                </Badge>
                {criterion.is_mandatory ? (
                  <Badge bg={mandatoryBg} color="#E02020" borderRadius="sm" px={2} py={1} fontSize="11px">
                    Mandatory
                  </Badge>
                ) : null}
              </Flex>
              <Flex direction="column" gap={1} minW={0}>
                <Flex fontWeight={700} noOfLines={2} color={useColorModeValue("#00205B", "#dde2f8")}>
                  {criterion.name}
                </Flex>
                <Flex color={useColorModeValue("rgba(0,0,0,0.60)", "rgba(255,255,255,0.65)")} fontSize="14px" noOfLines={2}>
                  {criterion.description}
                </Flex>
                <Flex gap={3} fontSize="12px" color={useColorModeValue("rgba(0,0,0,0.55)", "rgba(255,255,255,0.6)")}>
                  {criterion.threshold_value ? (
                    <span>
                      Threshold:{" "}
                      <b style={{ fontWeight: 700, color: "inherit" }}>
                        {criterion.threshold_value}
                      </b>
                      {criterion.unit ? ` ${criterion.unit}` : ""}
                    </span>
                  ) : null}
                  {criterion.section_reference ? (
                    <span>Section: {criterion.section_reference}</span>
                  ) : null}
                </Flex>
              </Flex>
            </Stack>
            <Stack spacing={2} flexShrink={0}>
              <Button
                variant="link"
                colorScheme="blue"
                size="sm"
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              <Button
                variant="link"
                color="red.500"
                size="sm"
                onClick={() => onDelete(criterion.id)}
              >
                Delete
              </Button>
            </Stack>
          </Flex>
        )}
      </Flex>
    </Flex>
  );
}

