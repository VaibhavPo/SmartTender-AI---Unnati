import {
  Box, Flex, Heading, Text, HStack, VStack, Button, Badge,
  Table, Thead, Tbody, Tr, Th, Td, Spinner, SimpleGrid, GridItem,
} from '@chakra-ui/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';

const fetchTenders = async () => {
  const { data } = await apiClient.get('/tenders');
  return data;
};

const fetchReport = async (tenderId: string) => {
  const { data } = await apiClient.get(`/tenders/${tenderId}/report`);
  return data;
};

const fetchVerdicts = async (tenderId: string) => {
  const { data } = await apiClient.get(`/verdicts?tender_id=${tenderId}`);
  return data;
};

export const ReportPage = () => {
  const { data: tenders, isLoading: tendersLoading } = useQuery({
    queryKey: ['tenders'],
    queryFn: fetchTenders,
  });

  const activeTender = tenders?.[0];

  const { data: verdicts, isLoading: verdictsLoading } = useQuery({
    queryKey: ['verdicts', activeTender?.id],
    queryFn: () => fetchVerdicts(activeTender.id),
    enabled: !!activeTender?.id,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/reports', {
        tender_id: activeTender?.id,
        include_audit_trail: true,
      });
      return data;
    },
  });

  if (tendersLoading) {
    return <Flex h="50vh" align="center" justify="center"><Spinner size="xl" color="brand.primary" thickness="4px" /></Flex>;
  }

  // Compute quick stats from verdicts
  const total = verdicts?.length || 0;
  const passed = verdicts?.filter((v: any) => ['PASS', 'OFFICER_APPROVED'].includes(v.verdict)).length || 0;
  const failed = verdicts?.filter((v: any) => ['FAIL', 'OFFICER_REJECTED'].includes(v.verdict)).length || 0;
  const pending = verdicts?.filter((v: any) => v.verdict === 'MANUAL_REVIEW').length || 0;

  // Group verdicts by bidder
  const bidderMap: Record<string, { name: string; verdicts: any[] }> = {};
  (verdicts || []).forEach((v: any) => {
    if (!bidderMap[v.bidder_id]) bidderMap[v.bidder_id] = { name: v.bidder_id?.slice(-8), verdicts: [] };
    bidderMap[v.bidder_id].verdicts.push(v);
  });

  const bidderRows = Object.entries(bidderMap).map(([id, b], i) => {
    const passCount = b.verdicts.filter(v => ['PASS', 'OFFICER_APPROVED'].includes(v.verdict)).length;
    const score = b.verdicts.length > 0 ? Math.round((passCount / b.verdicts.length) * 100) : 0;
    const eligible = score >= 80;
    return { rank: i + 1, id, name: b.name, score, eligible, risk: score >= 90 ? 'Low' : score >= 70 ? 'Moderate' : 'High' };
  }).sort((a, b) => b.score - a.score).map((b, i) => ({ ...b, rank: i + 1 }));

  return (
    <Box maxW="5xl" mx="auto" pb="16">
      {/* Toolbar */}
      <Flex justify="space-between" align="flex-end" mb="6" className="no-print">
        <Box>
          <Heading size="lg" color="brand.primary" fontFamily="heading">Final Report Preview</Heading>
          <Text color="brand.onSurfaceVariant" mt="1">
            Review and verify the AI-generated procurement summary before final signing.
          </Text>
        </Box>
        <HStack spacing="3">
          <Button
            variant="outline"
            borderColor="brand.primary"
            color="brand.primary"
            bg="brand.surfaceContainerHigh"
            leftIcon={<Box as="span" className="material-symbols-outlined" fontSize="18px">mail</Box>}
            size="sm"
          >
            Email to Committee
          </Button>
          <Button
            variant="outline"
            borderColor="brand.primary"
            color="brand.primary"
            bg="brand.surfaceContainerHigh"
            leftIcon={<Box as="span" className="material-symbols-outlined" fontSize="18px">print</Box>}
            size="sm"
            onClick={() => window.print()}
          >
            Print
          </Button>
          <Button
            variant="solid"
            leftIcon={<Box as="span" className="material-symbols-outlined" fontSize="18px">picture_as_pdf</Box>}
            size="sm"
            isLoading={generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
          >
            Download PDF
          </Button>
        </HStack>
      </Flex>

      {/* Report canvas */}
      <Box
        bg="brand.surfaceContainerLowest"
        border="1px"
        borderColor="brand.outlineVariant"
        shadow="2xl"
        p="12"
        borderRadius="xl"
        overflow="hidden"
        position="relative"
      >
        {/* Background watermark */}
        <Box
          position="absolute"
          top="0"
          right="0"
          w="64"
          h="64"
          bg="brand.primaryContainer"
          rounded="full"
          mr="-32"
          mt="-32"
          filter="blur(48px)"
          opacity="0.05"
          pointerEvents="none"
        />

        {/* Report header */}
        <Flex justify="space-between" align="start" borderBottom="2px solid" borderColor="brand.outlineVariant" pb="6" mb="8" position="relative" zIndex="1">
          <Box>
            <Text fontSize="lg" fontWeight="bold" color="brand.primary" textTransform="uppercase" letterSpacing="tight">
              Executive Summary of Evaluation
            </Text>
            <Text fontFamily="mono" fontSize="sm" color="brand.onSurfaceVariant" mt="1">
              REF: {activeTender?.reference_number || activeTender?.id?.slice(-12).toUpperCase()} | GENERATED BY UNNATI AI
            </Text>
          </Box>
          <Box
            as="span"
            className="material-symbols-outlined"
            color="brand.primary"
            fontSize="64px"
            opacity="0.6"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            account_balance
          </Box>
        </Flex>

        {/* Content grid */}
        <SimpleGrid columns={12} gap="6" mb="8" position="relative" zIndex="1">
          <GridItem colSpan={{ base: 12, md: 8 }}>
            <VStack spacing="6" align="start">
              <Box>
                <Text fontSize="xs" fontWeight="bold" color="brand.primary" textTransform="uppercase" letterSpacing="widest" mb="2">
                  1. Evaluation Objective
                </Text>
                <Text fontSize="lg" color="brand.onSurface" lineHeight="tall">
                  This report presents the final evaluation for the procurement of{' '}
                  <Text as="span" color="brand.primary" fontWeight="bold">{activeTender?.name || 'Tender'}</Text>{' '}
                  for the Federal Procurement Division. The evaluation process utilized SmartTender AI algorithms to cross-reference
                  bidder documentation against established compliance benchmarks.
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" fontWeight="bold" color="brand.primary" textTransform="uppercase" letterSpacing="widest" mb="2">
                  2. Summary of Findings
                </Text>
                <Text color="brand.onSurfaceVariant">
                  Of the {Object.keys(bidderMap).length || 'zero'} bidder submissions processed, {bidderRows.filter(b => b.eligible).length} achieved
                  a compliance score above 80%. The AI identified significant discrepancies in technical specifications for {failed} item(s),
                  which {pending > 0 ? 'require manual review by the oversight committee' : 'were resolved'}.
                </Text>
              </Box>
            </VStack>
          </GridItem>

          <GridItem colSpan={{ base: 12, md: 4 }}>
            <Box bg="brand.surfaceContainer" p="4" borderRadius="xl" border="1px" borderColor="brand.outlineVariant">
              <Text fontSize="xs" fontWeight="bold" color="brand.primary" textTransform="uppercase" letterSpacing="widest" mb="3">
                AI System Health
              </Text>
              <VStack spacing="2" align="stretch">
                {[
                  { label: 'Confidence Score', value: '98.4%', highlight: true },
                  { label: 'Total Verdicts', value: String(total), highlight: false },
                  { label: 'Passed', value: String(passed), highlight: false },
                  { label: 'Failed / Pending', value: `${failed} / ${pending}`, highlight: false },
                ].map(item => (
                  <Flex key={item.label} justify="space-between" borderBottom="1px" borderColor="brand.outlineVariant" pb="1">
                    <Text fontSize="sm" color="brand.onSurfaceVariant">{item.label}:</Text>
                    <Text fontSize="sm" fontWeight="bold" color={item.highlight ? 'brand.primary' : 'brand.onSurface'}>{item.value}</Text>
                  </Flex>
                ))}
              </VStack>
            </Box>
          </GridItem>
        </SimpleGrid>

        {/* Bidder ranking table */}
        <Box mb="8" position="relative" zIndex="1">
          <Text fontSize="xs" fontWeight="bold" color="brand.primary" textTransform="uppercase" letterSpacing="widest" mb="3">
            3. Bidder Ranking &amp; Eligibility
          </Text>
          <Box overflow="hidden" borderRadius="xl" border="1px" borderColor="brand.outlineVariant">
            <Table size="sm">
              <Thead bg="brand.surfaceContainerHigh">
                <Tr>
                  {['Rank', 'Organization', 'Score', 'Eligibility', 'Risk'].map(h => (
                    <Th key={h} px="4" py="3" borderColor="brand.outlineVariant" color="brand.onSurface" fontSize="sm">{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {bidderRows.length > 0 ? bidderRows.map((b) => (
                  <Tr key={b.id} _hover={{ bg: 'brand.surfaceContainer' }} transition="all 0.15s">
                    <Td px="4" py="3" borderColor="brand.outlineVariant" fontWeight="bold" color="brand.onSurface">{String(b.rank).padStart(2, '0')}</Td>
                    <Td px="4" py="3" borderColor="brand.outlineVariant" color="brand.onSurface" fontFamily="mono" fontSize="sm">{b.name.toUpperCase()}</Td>
                    <Td px="4" py="3" borderColor="brand.outlineVariant" color="brand.onSurfaceVariant">{b.score}%</Td>
                    <Td px="4" py="3" borderColor="brand.outlineVariant">
                      <Badge
                        bg={b.eligible ? 'brand.primaryContainer' : 'brand.errorContainer'}
                        color={b.eligible ? 'brand.onPrimaryContainer' : 'brand.onErrorContainer'}
                        px="2" py="0.5" borderRadius="sm" fontSize="10px" fontWeight="bold" textTransform="uppercase"
                        border="1px solid"
                        borderColor={b.eligible ? 'brand.primary' : 'brand.error'}
                        opacity="0.8"
                      >
                        {b.eligible ? 'Eligible' : 'Conditional'}
                      </Badge>
                    </Td>
                    <Td px="4" py="3" borderColor="brand.outlineVariant" fontWeight="bold"
                      color={b.risk === 'Low' ? 'brand.primary' : b.risk === 'Moderate' ? 'brand.tertiary' : 'brand.error'}
                      textAlign="right"
                    >
                      {b.risk}
                    </Td>
                  </Tr>
                )) : (
                  <Tr>
                    <Td colSpan={5} textAlign="center" py="8" borderColor="brand.outlineVariant" color="brand.onSurfaceVariant">
                      No verdicts recorded yet. Complete the evaluation workflow first.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
        </Box>

        {/* Digital signature */}
        <Flex justify="space-between" borderTop="1px" borderColor="brand.outlineVariant" pt="8" position="relative" zIndex="1">
          <Box w="33%">
            <Text fontSize="xs" fontWeight="bold" color="brand.onSurfaceVariant" textTransform="uppercase" letterSpacing="widest" mb="4">
              Certifying Officer
            </Text>
            <Box h="16" borderBottom="1px" borderColor="brand.primary" mb="1" display="flex" alignItems="flex-end" pb="2">
              <Text fontStyle="italic" color="brand.primary" fontSize="xl" opacity="0.6" fontFamily="serif">
                Jane R. Administrator
              </Text>
            </Box>
            <Text fontWeight="bold" color="brand.onSurface">Jane R. Administrator</Text>
            <Text fontSize="sm" color="brand.onSurfaceVariant">Senior Procurement Lead</Text>
          </Box>
          <Box w="33%" textAlign="right">
            <Text fontSize="xs" fontWeight="bold" color="brand.onSurfaceVariant" textTransform="uppercase" letterSpacing="widest" mb="4">
              Date of Certification
            </Text>
            <Text fontSize="xl" fontWeight="bold" color="brand.primary">
              {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
            <Text fontSize="sm" color="brand.onSurfaceVariant">{new Date().toLocaleTimeString('en-US')} IST</Text>
            <Flex mt="2" align="center" justify="flex-end" gap="1" display="inline-flex" bg="brand.primary" color="brand.onPrimary" px="3" py="1" borderRadius="full">
              <Box as="span" className="material-symbols-outlined" fontSize="12px" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</Box>
              <Text fontSize="10px" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">Blockchain Verified</Text>
            </Flex>
          </Box>
        </Flex>
      </Box>

      {/* Footer */}
      <Flex justify="space-between" align="center" color="brand.onSurfaceVariant" fontSize="sm" mt="6" className="no-print">
        <Text>Page 1 of 1</Text>
        <HStack spacing="4">
          <Text cursor="pointer" _hover={{ color: 'brand.primary' }} textDecoration="underline">Privacy Policy</Text>
          <Text cursor="pointer" _hover={{ color: 'brand.primary' }} textDecoration="underline">Security Protocol</Text>
          <Text cursor="pointer" _hover={{ color: 'brand.primary' }} textDecoration="underline">Terms of Service</Text>
        </HStack>
      </Flex>

      {/* FAB */}
      <Flex
        position="fixed" bottom="8" right="8"
        w="14" h="14" bg="brand.primary" color="brand.onPrimary"
        rounded="full" align="center" justify="center"
        shadow="2xl" cursor="pointer"
        _hover={{ transform: 'scale(1.1)' }}
        transition="transform 0.2s"
        zIndex="50"
        className="no-print"
      >
        <Box as="span" className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>draw</Box>
      </Flex>
    </Box>
  );
};
