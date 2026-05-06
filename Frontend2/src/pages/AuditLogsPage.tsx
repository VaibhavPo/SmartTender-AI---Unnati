import {
  Box, Flex, Heading, Text, HStack, VStack, Button, Badge,
  Table, Thead, Tbody, Tr, Th, Td, Spinner, Input, Select,
  InputGroup, InputRightElement, SimpleGrid, GridItem,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useState } from 'react';

interface AuditEvent {
  id: string;
  tender_id: string;
  event_type: string;
  actor: string;
  entity_type: string;
  entity_id: string;
  detail?: string;
  timestamp: string;
}

const fetchAuditLogs = async (tenderId?: string) => {
  const url = tenderId ? `/audit?tender_id=${tenderId}` : '/audit';
  const { data } = await apiClient.get(url);
  return data;
};

const fetchTenders = async () => {
  const { data } = await apiClient.get('/tenders');
  return data;
};

const severityMap: Record<string, { bg: string; color: string; icon: string; label: string }> = {
  VERDICT_OVERRIDDEN: { bg: 'brand.errorContainer', color: 'brand.onErrorContainer', icon: 'warning', label: 'CRITICAL' },
  VERDICT_RENDERED: { bg: 'brand.primaryContainer', color: 'brand.onPrimaryContainer', icon: 'check_circle', label: 'SUCCESS' },
  EVIDENCE_EXTRACTED: { bg: 'brand.tertiaryContainer', color: 'brand.onTertiaryContainer', icon: 'error_outline', label: 'WARNING' },
  DOCUMENT_UPLOADED: { bg: 'brand.secondaryContainer', color: 'brand.onSecondaryContainer', icon: 'info', label: 'INFO' },
  CRITERIA_EXTRACTED: { bg: 'brand.secondaryContainer', color: 'brand.onSecondaryContainer', icon: 'info', label: 'INFO' },
  EVALUATION_COMPLETED: { bg: 'brand.primaryContainer', color: 'brand.onPrimaryContainer', icon: 'check_circle', label: 'SUCCESS' },
  REPORT_GENERATED: { bg: 'brand.primaryContainer', color: 'brand.onPrimaryContainer', icon: 'check_circle', label: 'SUCCESS' },
};

const PAGE_SIZE = 10;

export const AuditLogsPage = () => {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [actor, setActor] = useState('');

  const { data: tenders } = useQuery({ queryKey: ['tenders'], queryFn: fetchTenders });
  const activeTender = tenders?.[0];

  const { data: logs, isLoading } = useQuery<AuditEvent[]>({
    queryKey: ['audit', activeTender?.id],
    queryFn: () => fetchAuditLogs(activeTender?.id),
    enabled: !!activeTender?.id,
  });

  const filtered = (logs || []).filter(l =>
    (!search || l.event_type?.includes(search.toUpperCase()) || l.actor?.toLowerCase().includes(search.toLowerCase()) || l.detail?.toLowerCase().includes(search.toLowerCase())) &&
    (!actor || l.actor === actor)
  );

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <Box maxW="1400px" mx="auto">
      <Box mb="6">
        <Heading size="xl" color="brand.onSurface" fontFamily="heading">Audit Logs</Heading>
        <Text fontSize="lg" color="brand.onSurfaceVariant" mt="2" maxW="4xl">
          A complete chronological record of institutional system events and administrative officer actions within the SmartTender ecosystem.
        </Text>
      </Box>

      {/* Filter bar */}
      <Box bg="brand.surfaceContainer" border="1px" borderColor="brand.outlineVariant" p="6" borderRadius="xl" mb="6" shadow="sm">
        <Flex gap="6" flexWrap="wrap" align="flex-end">
          <Box>
            <Text fontSize="xs" fontWeight="bold" color="brand.onSurfaceVariant" textTransform="uppercase" letterSpacing="wider" mb="2">Actor</Text>
            <Select
              value={actor}
              onChange={(e) => { setActor(e.target.value); setPage(0); }}
              bg="brand.surfaceContainerLow"
              border="1px"
              borderColor="brand.outline"
              color="brand.onSurface"
              w="48"
              size="sm"
              borderRadius="md"
            >
              <option value="">All Actors</option>
              <option value="system">AI System</option>
              <option value="officer">Administrative Officer</option>
              <option value="n8n_workflow_1">n8n Workflow</option>
            </Select>
          </Box>

          <Box flex="1" minW="200px">
            <Text fontSize="xs" fontWeight="bold" color="brand.onSurfaceVariant" textTransform="uppercase" letterSpacing="wider" mb="2">Search</Text>
            <InputGroup size="sm">
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search by event type, actor, or detail..."
                bg="brand.surfaceContainerLow"
                border="1px"
                borderColor="brand.outline"
                color="brand.onSurface"
                borderRadius="md"
                _placeholder={{ color: 'brand.onSurfaceVariant' }}
              />
              <InputRightElement>
                <Box as="span" className="material-symbols-outlined" color="brand.outline" fontSize="20px">search</Box>
              </InputRightElement>
            </InputGroup>
          </Box>

          <Button size="sm" variant="solid" alignSelf="flex-end" h="8">
            Apply Filters
          </Button>
        </Flex>
      </Box>

      {/* Logs table */}
      {isLoading ? (
        <Flex justify="center" py="20">
          <Spinner size="xl" color="brand.primary" thickness="4px" />
        </Flex>
      ) : (
        <Box bg="brand.surfaceContainerLowest" border="1px" borderColor="brand.outlineVariant" borderRadius="xl" overflow="hidden" shadow="lg">
          <Table size="sm">
            <Thead bg="brand.surfaceContainerHigh">
              <Tr>
                {['Timestamp', 'Actor', 'Action', 'Details', 'Severity'].map(h => (
                  <Th key={h} px="6" py="4" borderColor="brand.outlineVariant" color="brand.onSurface" fontWeight="bold" fontSize="sm">
                    {h}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {paged.length > 0 ? paged.map((log, i) => {
                const sev = severityMap[log.event_type] || { bg: 'brand.secondaryContainer', color: 'brand.onSecondaryContainer', icon: 'info', label: 'INFO' };
                return (
                  <Tr key={log.id} bg={i % 2 === 1 ? 'brand.surfaceContainerLow' : undefined} _hover={{ bg: 'brand.surfaceContainerHigh' }} transition="all 0.15s">
                    <Td px="6" py="4" borderColor="brand.outlineVariant" fontFamily="mono" fontSize="sm" color="brand.secondary" whiteSpace="nowrap">
                      {new Date(log.timestamp).toLocaleString('en-GB')}
                    </Td>
                    <Td px="6" py="4" borderColor="brand.outlineVariant" fontWeight="semibold" color="brand.onSurface">
                      {log.actor}
                    </Td>
                    <Td px="6" py="4" borderColor="brand.outlineVariant" color="brand.onSurfaceVariant">
                      {log.event_type.replace(/_/g, ' ')}
                    </Td>
                    <Td px="6" py="4" borderColor="brand.outlineVariant" fontSize="sm" color="brand.onSurfaceVariant" maxW="400px">
                      {log.detail || `${log.entity_type} ${log.entity_id?.slice(-8)}`}
                    </Td>
                    <Td px="6" py="4" borderColor="brand.outlineVariant">
                      <Flex align="center" display="inline-flex" px="3" py="1" borderRadius="full" bg={sev.bg} color={sev.color} gap="1">
                        <Box as="span" className="material-symbols-outlined" fontSize="14px">{sev.icon}</Box>
                        <Text fontSize="11px" fontWeight="bold">{sev.label}</Text>
                      </Flex>
                    </Td>
                  </Tr>
                );
              }) : (
                <Tr>
                  <Td colSpan={5} textAlign="center" py="16" borderColor="brand.outlineVariant" color="brand.onSurfaceVariant">
                    No audit events found. Start an evaluation to generate logs.
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>

          {/* Pagination */}
          <Flex px="6" py="4" justify="space-between" align="center" bg="brand.surfaceContainerHigh" borderTop="1px" borderColor="brand.outlineVariant">
            <Text fontSize="sm" color="brand.onSurfaceVariant">
              Showing {paged.length > 0 ? page * PAGE_SIZE + 1 : 0}–{page * PAGE_SIZE + paged.length} of {filtered.length} results
            </Text>
            <HStack spacing="2">
              <Button size="sm" variant="outline" borderColor="brand.outlineVariant" isDisabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <Box as="span" className="material-symbols-outlined">chevron_left</Box>
              </Button>
              {Array.from({ length: Math.min(totalPages || 1, 5) }, (_, i) => (
                <Button key={i} size="sm" variant={page === i ? 'solid' : 'ghost'} onClick={() => setPage(i)}>{i + 1}</Button>
              ))}
              {totalPages > 5 && <Text color="brand.onSurfaceVariant" px="2">...</Text>}
              <Button size="sm" variant="outline" borderColor="brand.outlineVariant" isDisabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <Box as="span" className="material-symbols-outlined">chevron_right</Box>
              </Button>
            </HStack>
          </Flex>
        </Box>
      )}
    </Box>
  );
};
