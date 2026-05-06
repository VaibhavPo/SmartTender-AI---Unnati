import {
  Box, Flex, Heading, Text, HStack, VStack, Button, Badge, Table,
  Thead, Tbody, Tr, Th, Td, Spinner, Progress, Collapse, useDisclosure, IconButton,
} from '@chakra-ui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useState } from 'react';

interface Criterion {
  id: string;
  name: string;
  description: string;
  criterion_type: string;
  threshold_value?: string;
  is_mandatory: boolean;
  section_reference?: string;
}

const fetchCriteria = async (tenderId: string) => {
  const { data } = await apiClient.get(`/tenders/${tenderId}/criteria`);
  return data;
};

const fetchTenders = async () => {
  const { data } = await apiClient.get('/tenders');
  return data;
};

const typeColors: Record<string, { bg: string; color: string }> = {
  numeric: { bg: 'brand.primaryContainer', color: 'brand.onPrimaryContainer' },
  boolean: { bg: 'brand.tertiaryContainer', color: 'brand.onTertiaryContainer' },
  date: { bg: 'brand.secondaryContainer', color: 'brand.onSecondaryContainer' },
  text: { bg: 'brand.surfaceContainerHighest', color: 'brand.onSurfaceVariant' },
};

const CriterionRow = ({ criterion }: { criterion: Criterion }) => {
  const { isOpen, onToggle } = useDisclosure();

  return (
    <>
      <Tr
        cursor="pointer"
        onClick={onToggle}
        bg={isOpen ? 'brand.surfaceContainerLow' : undefined}
        borderLeft={isOpen ? '4px solid' : '4px solid transparent'}
        sx={{ borderLeftColor: isOpen ? 'var(--chakra-colors-brand-primary)' : 'transparent' }}
        _hover={{ bg: 'brand.surfaceContainerHighest' }}
        transition="all 0.15s"
      >
        <Td borderColor="brand.outlineVariant" w="12" textAlign="center">
          <Box
            as="span"
            className="material-symbols-outlined"
            color={isOpen ? 'brand.primary' : 'brand.outline'}
            fontSize="20px"
            transform={isOpen ? 'rotate(180deg)' : 'rotate(0)'}
            display="inline-block"
            transition="transform 0.2s"
          >
            expand_more
          </Box>
        </Td>
        <Td borderColor="brand.outlineVariant" fontFamily="mono" fontSize="xs" color="brand.outline">
          {criterion.section_reference || `CRT-${criterion.id.slice(-4)}`}
        </Td>
        <Td borderColor="brand.outlineVariant">
          <Text fontWeight="bold" color="brand.onSurface">{criterion.name}</Text>
        </Td>
        <Td borderColor="brand.outlineVariant">
          <Badge
            bg={typeColors[criterion.criterion_type]?.bg || 'brand.surfaceContainerHighest'}
            color={typeColors[criterion.criterion_type]?.color || 'brand.onSurfaceVariant'}
            px="2"
            py="0.5"
            borderRadius="sm"
            fontSize="10px"
            textTransform="uppercase"
          >
            {criterion.criterion_type}
          </Badge>
        </Td>
        <Td borderColor="brand.outlineVariant" color="brand.onSurface">
          {criterion.threshold_value || (criterion.is_mandatory ? 'Mandatory' : '—')}
        </Td>
        <Td borderColor="brand.outlineVariant" textAlign="right">
          {criterion.is_mandatory ? (
            <Badge bg="brand.error" color="brand.onError" fontSize="xs" px="2" py="0.5" borderRadius="sm">
              MANDATORY
            </Badge>
          ) : (
            <Button variant="ghost" size="xs" color="brand.primary" fontWeight="bold">
              Edit
            </Button>
          )}
        </Td>
      </Tr>
      {isOpen && (
        <Tr bg="brand.surfaceContainerLow">
          <Td borderColor="brand.outlineVariant" />
          <Td colSpan={5} borderColor="brand.outlineVariant" pb="4">
            <Text fontSize="sm" color="brand.onSurfaceVariant">{criterion.description}</Text>
          </Td>
        </Tr>
      )}
    </>
  );
};

export const CriteriaReviewPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const { data: tenders, isLoading: tendersLoading } = useQuery({
    queryKey: ['tenders'],
    queryFn: fetchTenders,
  });

  const activeTender = tenders?.[0];

  const { data: criteria, isLoading: criteriaLoading } = useQuery<Criterion[]>({
    queryKey: ['criteria', activeTender?.id],
    queryFn: () => fetchCriteria(activeTender.id),
    enabled: !!activeTender?.id,
  });

  const startEvalMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(`/tenders/${activeTender.id}/trigger-evaluation`);
      return data;
    },
  });

  if (tendersLoading || criteriaLoading) {
    return (
      <Flex h="50vh" align="center" justify="center">
        <Spinner size="xl" color="brand.primary" thickness="4px" />
      </Flex>
    );
  }

  const allCriteria = criteria || [];
  const paged = allCriteria.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(allCriteria.length / PAGE_SIZE);

  return (
    <Box maxW="1200px" mx="auto">
      {/* Header */}
      <Box mb="6" borderBottom="1px" borderColor="brand.outlineVariant" pb="4">
        <Flex justify="space-between" align="start" mb="3">
          <Box>
            <Text fontSize="xs" color="brand.primary" textTransform="uppercase" fontWeight="bold" letterSpacing="wider" mb="1">
              Criteria Review
            </Text>
            <Heading size="lg" color="brand.primary" fontFamily="heading">
              Extracted Evaluation Criteria
            </Heading>
          </Box>
          <Button
            variant="solid"
            size="md"
            rightIcon={<Box as="span" className="material-symbols-outlined">arrow_forward</Box>}
            isLoading={startEvalMutation.isPending}
            onClick={() => startEvalMutation.mutate()}
            shadow="md"
            _hover={{ transform: 'scale(1.02)' }}
            transition="all 0.2s"
          >
            Confirm &amp; Start Evaluation
          </Button>
        </Flex>

        {/* Metadata bar */}
        <Flex
          align="center"
          gap="6"
          bg="brand.surfaceContainer"
          px="3"
          py="2"
          borderRadius="md"
          border="1px"
          borderColor="brand.outlineVariant"
          flexWrap="wrap"
          fontSize="sm"
        >
          <HStack spacing="2">
            <Text fontSize="xs" color="brand.outline" textTransform="uppercase" fontWeight="bold">Tender:</Text>
            <Text fontWeight="bold" color="brand.onSurface">{activeTender?.name || '—'}</Text>
            <Box bg="brand.surfaceContainerHighest" px="1" py="0.5" borderRadius="sm" border="1px" borderColor="brand.outlineVariant">
              <Text fontSize="11px" color="brand.onSurfaceVariant" fontFamily="mono">{activeTender?.reference_number || activeTender?.id?.slice(-8)}</Text>
            </Box>
          </HStack>

          <Box w="px" h="4" bg="brand.outlineVariant" />

          <HStack spacing="2">
            <Text fontSize="xs" color="brand.outline" textTransform="uppercase" fontWeight="bold">AI Health:</Text>
            <Text fontWeight="bold" color="brand.primary">94%</Text>
            <Progress w="16" h="1.5" value={94} colorScheme="blue" borderRadius="full" bg="brand.surfaceContainerHighest" size="xs" />
          </HStack>

          <Text fontSize="xs" color="brand.outline" fontStyle="italic">
            {allCriteria.length} criteria mapped
          </Text>
        </Flex>
      </Box>

      {/* Criteria Table */}
      <Box bg="brand.surfaceContainer" border="1px" borderColor="brand.outlineVariant" borderRadius="md" overflow="hidden" mb="6">
        <Table size="sm">
          <Thead>
            <Tr bg="brand.surfaceContainerHigh">
              <Th borderColor="brand.outlineVariant" w="12" />
              <Th color="brand.onSurfaceVariant" fontSize="xs" letterSpacing="wider" borderColor="brand.outlineVariant" w="24">ID</Th>
              <Th color="brand.onSurfaceVariant" fontSize="xs" letterSpacing="wider" borderColor="brand.outlineVariant">Criterion</Th>
              <Th color="brand.onSurfaceVariant" fontSize="xs" letterSpacing="wider" borderColor="brand.outlineVariant">Type</Th>
              <Th color="brand.onSurfaceVariant" fontSize="xs" letterSpacing="wider" borderColor="brand.outlineVariant">Threshold</Th>
              <Th color="brand.onSurfaceVariant" fontSize="xs" letterSpacing="wider" borderColor="brand.outlineVariant" textAlign="right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {paged.length > 0 ? paged.map((c) => (
              <CriterionRow key={c.id} criterion={c} />
            )) : (
              <Tr>
                <Td colSpan={6} textAlign="center" py="10" color="brand.onSurfaceVariant" borderColor="brand.outlineVariant">
                  No criteria extracted yet. Upload and ingest a tender document first.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>

        {/* Pagination */}
        <Flex justify="space-between" align="center" p="4" bg="brand.surfaceContainer" borderTop="1px" borderColor="brand.outlineVariant">
          <Text fontSize="sm" color="brand.onSurfaceVariant">
            Showing {paged.length} of {allCriteria.length} identified criteria
          </Text>
          <HStack spacing="2">
            <IconButton
              aria-label="Previous"
              icon={<Box as="span" className="material-symbols-outlined" fontSize="20px">chevron_left</Box>}
              size="sm"
              variant="outline"
              borderColor="brand.outlineVariant"
              isDisabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            />
            {Array.from({ length: totalPages || 1 }, (_, i) => (
              <Button
                key={i}
                size="sm"
                variant={page === i ? 'solid' : 'ghost'}
                onClick={() => setPage(i)}
              >
                {i + 1}
              </Button>
            ))}
            <IconButton
              aria-label="Next"
              icon={<Box as="span" className="material-symbols-outlined" fontSize="20px">chevron_right</Box>}
              size="sm"
              variant="outline"
              borderColor="brand.outlineVariant"
              isDisabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            />
          </HStack>
        </Flex>
      </Box>

      {/* Info tip */}
      <Flex
        align="start"
        gap="4"
        p="4"
        border="1px"
        borderColor="brand.primaryContainer"
        bg="whiteAlpha.50"
        borderRadius="md"
      >
        <Box as="span" className="material-symbols-outlined" color="brand.primary" fontSize="24px">info</Box>
        <Box>
          <Text fontWeight="bold" color="brand.primary" mb="1">Automated Validation Guide</Text>
          <Text fontSize="sm" color="brand.onSurfaceVariant">
            Fields marked <Text as="span" color="brand.primary" fontWeight="bold">NUMERIC</Text> or{' '}
            <Text as="span" color="brand.primary" fontWeight="bold">BOOLEAN</Text> will be compared automatically with bidder data.
          </Text>
        </Box>
      </Flex>

      {/* FAB */}
      <Flex
        position="fixed" bottom="6" right="6"
        w="14" h="14" bg="brand.primary" color="brand.onPrimary"
        rounded="full" align="center" justify="center"
        shadow="2xl" cursor="pointer"
        _hover={{ transform: 'scale(1.1)' }}
        transition="transform 0.2s"
        zIndex="50"
      >
        <Box as="span" className="material-symbols-outlined">chat</Box>
      </Flex>
    </Box>
  );
};
