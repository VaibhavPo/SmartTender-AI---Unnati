import type { AuditEvent } from "../../types/backend";
import { Box, Stack, Text } from "@chakra-ui/react";
import { DataTable } from "../atoms/DataTable";

export interface AuditEventsTableProps {
  events: AuditEvent[];
}

export function AuditEventsTable({ events }: AuditEventsTableProps) {
  return (
    <Box>
      {events.length === 0 ? (
        <Text color="rgba(0,0,0,0.6)">No audit events.</Text>
      ) : null}
      <Stack spacing={0}>
        <DataTable>
          <thead>
            <tr>
              <th style={{ width: 180 }}>Timestamp</th>
              <th style={{ width: 160 }}>Event</th>
              <th style={{ width: 160 }}>Actor</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>{e.timestamp ? new Date(e.timestamp).toLocaleString() : "-"}</td>
                <td style={{ textTransform: "uppercase", fontWeight: 700 }}>{e.event_type}</td>
                <td>{e.actor}</td>
                <td>{e.detail ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Stack>
    </Box>
  );
}

