import {
  Button,
  Flex,
  Input,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { auditApi } from "../api/client";
import type { AuditEvent } from "../types/backend";
import { AuditEventsTable } from "../components/organisms/AuditEventsTable";
import { StitchCard } from "../components/atoms/StitchCard";
import { TenderSelector } from "../components/molecules/TenderSelector";
import { useOfficer } from "../state/OfficerContext";

export function AuditLogsPage() {
  const toast = useToast();
  const { tenders, activeTenderId, setActiveTenderId } = useOfficer();

  const [eventType, setEventType] = useState("");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadEvents = async () => {
    if (!activeTenderId) return;
    setIsLoading(true);
    try {
      const res = await auditApi.list(activeTenderId, eventType.trim() || undefined);
      setEvents(res.data);
    } catch {
      toast({ status: "error", title: "Failed to load audit events" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenderId]);

  return (
    <Stack spacing={6}>
      <StitchCard>
        <Stack spacing={3}>
          <Text fontWeight={900} fontSize="16px">
            Select Tender
          </Text>
          {tenders.length ? (
            <TenderSelector
              tenders={tenders}
              activeTenderId={activeTenderId}
              onSelect={(t) => setActiveTenderId(t.id)}
            />
          ) : (
            <Text color="rgba(0,0,0,0.6)">No tenders yet.</Text>
          )}
        </Stack>
      </StitchCard>

      <StitchCard>
        <Flex gap={3} align="flex-end" wrap="wrap">
          <Stack flex="1 1 260px" spacing={2}>
            <Text fontWeight={900} fontSize="14px">
              Filter (optional)
            </Text>
            <Input
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              placeholder="event_type (e.g., DOCUMENT_UPLOADED)"
            />
          </Stack>
          <Button variant="primary" onClick={loadEvents} isDisabled={!activeTenderId || isLoading}>
            {isLoading ? "Loading..." : "Apply"}
          </Button>
        </Flex>
      </StitchCard>

      <AuditEventsTable events={events} />
    </Stack>
  );
}

