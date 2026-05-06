import {
  Box, Flex, Heading, Text, HStack, VStack, Button, Badge,
  Table, Thead, Tbody, Tr, Th, Td, Spinner, Textarea, Select, Input,
  InputGroup, InputRightElement,
} from '@chakra-ui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useState } from 'react';

const fetchPendingVerdicts = async () => {
  const { data } = await apiClient.get('/verdicts?verdict=MANUAL_REVIEW');
  return data;
};

export const ManualReviewPage = () => {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [selectedVerdict, setSelectedVerdict] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);

  const { data: verdicts, isLoading } = useQuery({
    queryKey: ['verdicts', 'manual'],
    queryFn: fetchPendingVerdicts,
  });

  const overrideMutation = useMutation({
    mutationFn: async ({ verdictId, status }: { verdictId: string; status: string }) => {
      const { data } = await apiClient.post(`/verdicts/${verdictId}/override`, {
        verdict: status,
        reason: notes,
        decided_by: 'officer',
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verdicts', 'manual'] });
      setNotes('');
      setSelectedVerdict(null);
    },
  });

  if (isLoading) {
    return (
      <Flex h="50vh" align="center" justify="center">
        <Spinner size="xl" color="brand.primary" thickness="4px" />
      </Flex>
    );
  }

  const current = verdicts?.[currentIdx];

  return (
    <Box h="calc(100vh - 64px)" display="flex" flexDirection="column" overflow="hidden">
      {/* Header strip */}
      <Flex
        bg="brand.surfaceContainerHighest"
        px="6"
        py="3"
        align="center"
        justify="space-between"
        borderBottom="1px"
        borderColor="brand.outlineVariant"
        flexShrink={0}
      >
        <HStack spacing="4">
          <Heading size="md" color="brand.primary" textTransform="uppercase" letterSpacing="tight">
            Manual Review Queue
          </Heading>
          <Box w="px" h="4" bg="brand.outlineVariant" />
          <HStack spacing="2" color="brand.onSurfaceVariant">
            <Box as="span" className="material-symbols-outlined" fontSize="18px">assignment</Box>
            <Text fontSize="sm" fontWeight="bold">
              {current ? `TASK ID: ${current.id?.slice(-8)?.toUpperCase()}` : 'No tasks pending'}
            </Text>
          </HStack>
        </HStack>
        {current && (
          <Flex align="center" gap="2" bg="brand.errorContainer" color="brand.onErrorContainer" px="3" py="1" border="1px" borderColor="brand.error" borderRadius="md" opacity="0.8">
            <Box as="span" className="material-symbols-outlined" fontSize="18px">report_problem</Box>
            <Text fontSize="xs" fontWeight="bold" textTransform="uppercase">
              THRESHOLD AMBIGUITY: Confidence &lt; 80%
            </Text>
          </Flex>
        )}
      </Flex>

      {!current ? (
        <Flex flex="1" align="center" justify="center" direction="column" gap="4">
          <Box as="span" className="material-symbols-outlined" color="brand.primary" fontSize="64px" style={{ fontVariationSettings: "'FILL' 1" }}>
            task_alt
          </Box>
          <Text fontSize="xl" fontWeight="bold" color="brand.onSurface">All Reviews Complete!</Text>
          <Text color="brand.onSurfaceVariant">No items currently require manual intervention.</Text>
        </Flex>
      ) : (
        <Flex flex="1" overflow="hidden">
          {/* Left: Evidence panel */}
          <Box w="50%" borderRight="1px" borderColor="brand.outlineVariant" bg="brand.surfaceContainer" overflowY="auto" p="6">
            <VStack spacing="4" align="stretch">
              {/* AI recommendation */}
              <Box bg="brand.surfaceContainerHigh" borderLeft="4px solid" borderColor="brand.primary" p="4" borderRadius="0 md md 0" shadow="sm">
                <HStack spacing="2" mb="2">
                  <Box as="span" className="material-symbols-outlined" color="brand.primary">psychology</Box>
                  <Text fontSize="xs" fontWeight="bold" color="brand.primary" textTransform="uppercase">AI Recommendation</Text>
                </HStack>
                <Text color="brand.onSurface">{current.reason}</Text>
                <HStack spacing="6" mt="3">
                  <Box>
                    <Text fontSize="xs" color="brand.onSurfaceVariant">Inferred Value:</Text>
                    <Text fontFamily="mono" fontWeight="bold" color="brand.primary">{current.verdict}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="brand.onSurfaceVariant">AI Certainty:</Text>
                    <Text fontFamily="mono" fontWeight="bold" color="brand.error">{Math.round(current.confidence * 100)}%</Text>
                  </Box>
                </HStack>
              </Box>

              {/* Evidence snippets */}
              <Text fontSize="xs" fontWeight="bold" color="brand.onSurfaceVariant" textTransform="uppercase" borderBottom="1px" borderColor="brand.outlineVariant" pb="1">
                Extracted Evidence
              </Text>
              <Box p="4" border="1px" borderColor="brand.primary" bg="whiteAlpha.50" borderRadius="md" position="relative" overflow="hidden">
                <Box position="absolute" top="0" right="0" bg="brand.error" color="brand.onError" fontSize="10px" px="3" py="1" fontWeight="bold" textTransform="uppercase">
                  CRITICAL CONFLICT
                </Box>
                <Flex justify="space-between" mb="2">
                  <Text fontSize="sm" fontWeight="bold" color="brand.primary">Source Evidence</Text>
                  <Text fontSize="11px" color="brand.onSurfaceVariant" fontFamily="mono">Criterion: {current.criterion_id?.slice(-8)}</Text>
                </Flex>
                <Box bg="brand.surfaceContainerLow" p="3" borderLeft="2px solid" borderColor="brand.primary" borderRadius="0 md md 0">
                  <Text fontStyle="italic" color="brand.onSurface" fontSize="sm">
                    "{current.reason || 'AI could not extract a conclusive value. Manual verification required.'}"
                  </Text>
                </Box>
              </Box>

              {/* Navigation between verdicts */}
              {verdicts.length > 1 && (
                <HStack justify="space-between">
                  <Button size="sm" variant="outline" onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} isDisabled={currentIdx === 0}>← Previous</Button>
                  <Text fontSize="sm" color="brand.onSurfaceVariant">{currentIdx + 1} / {verdicts.length}</Text>
                  <Button size="sm" variant="outline" onClick={() => setCurrentIdx(i => Math.min(verdicts.length - 1, i + 1))} isDisabled={currentIdx === verdicts.length - 1}>Next →</Button>
                </HStack>
              )}
            </VStack>
          </Box>

          {/* Right: Document preview placeholder */}
          <Box w="50%" bg="brand.surfaceContainerLowest" position="relative" overflow="hidden">
            <Flex position="absolute" top="4" left="50%" transform="translateX(-50%)" zIndex="10" align="center" gap="4" bg="brand.surfaceContainerHighest" color="brand.onSurface" px="4" py="2" borderRadius="full" shadow="xl" border="1px" borderColor="brand.outlineVariant">
              <Box as="span" className="material-symbols-outlined" cursor="pointer" _hover={{ color: 'brand.primary' }}>zoom_out</Box>
              <Text fontFamily="mono" fontSize="sm">100% | Page 1 of 1</Text>
              <Box as="span" className="material-symbols-outlined" cursor="pointer" _hover={{ color: 'brand.primary' }}>zoom_in</Box>
              <Box w="px" h="4" bg="brand.outlineVariant" />
              <Box as="span" className="material-symbols-outlined" cursor="pointer" _hover={{ color: 'brand.primary' }}>file_download</Box>
            </Flex>
            <Flex flex="1" h="full" justify="center" pt="20" px="6">
              <Box w="85%" bg="gray.50" shadow="2xl" minH="600px" p="12" border="1px" borderColor="brand.outlineVariant" borderRadius="md" position="relative">
                <VStack spacing="4" align="start" opacity="0.3">
                  <Box h="8" w="60%" bg="gray.300" borderRadius="sm" />
                  <Box h="4" w="full" bg="gray.200" borderRadius="sm" />
                  <Box h="4" w="full" bg="gray.200" borderRadius="sm" />
                  <Box h="4" w="75%" bg="gray.200" borderRadius="sm" />
                  <Box h="8" w="40%" bg="gray.300" borderRadius="sm" mt="8" />
                  <Box h="4" w="full" bg="gray.200" borderRadius="sm" />
                  <Box h="4" w="full" bg="gray.200" borderRadius="sm" />
                  <Box h="10" w="full" bg="white" border="1px dashed" borderColor="blue.400" display="flex" alignItems="center" px="4">
                    <Text fontSize="sm" fontWeight="bold" color="blue.500">EVIDENCE SECTION</Text>
                  </Box>
                </VStack>
                <Text position="absolute" bottom="4" right="8" fontSize="xs" color="gray.400">OFFICIAL PROCUREMENT DOCUMENT</Text>
              </Box>
            </Flex>
          </Box>
        </Flex>
      )}

      {/* Footer verdict panel */}
      {current && (
        <Box bg="brand.surfaceContainerHigh" borderTop="1px" borderColor="brand.outlineVariant" shadow="2xl" p="6" flexShrink={0}>
          <Flex direction={{ base: 'column', lg: 'row' }} align="flex-end" gap="6" maxW="7xl" mx="auto">
            <Box flex="1" w="full">
              <Text fontSize="xs" fontWeight="bold" color="brand.onSurfaceVariant" textTransform="uppercase" mb="2">
                Adjudicator Comments &amp; Audit Trail Notes
              </Text>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                h="24"
                placeholder="Enter justification for the final verdict. Include references to federal guidelines if overruling AI recommendation..."
                bg="brand.surfaceContainerLow"
                border="1px"
                borderColor="brand.outlineVariant"
                color="brand.onSurface"
                _focus={{ borderColor: 'brand.primary', ring: '1px', ringColor: 'brand.primary' }}
                resize="none"
              />
            </Box>
            <Box>
              <Text fontSize="xs" fontWeight="bold" color="brand.onSurfaceVariant" textTransform="uppercase" textAlign="right" mb="3">
                Verdict Selection
              </Text>
              <HStack spacing="3" flexWrap="wrap">
                <Button
                  variant="outline"
                  borderColor="brand.outline"
                  color="brand.onSurfaceVariant"
                  leftIcon={<Box as="span" className="material-symbols-outlined">help</Box>}
                >
                  Request Info
                </Button>
                <Button
                  border="2px solid"
                  borderColor="brand.error"
                  color="brand.error"
                  bg="transparent"
                  onClick={() => setSelectedVerdict('OFFICER_REJECTED')}
                  _hover={{ bg: 'brand.error', color: 'brand.onError' }}
                  fontWeight="bold"
                  leftIcon={<Box as="span" className="material-symbols-outlined">close</Box>}
                >
                  Fail
                </Button>
                <Button
                  border="2px solid"
                  borderColor="brand.primary"
                  color="brand.primary"
                  bg="transparent"
                  onClick={() => setSelectedVerdict('OFFICER_APPROVED')}
                  _hover={{ bg: 'brand.primary', color: 'brand.onPrimary' }}
                  fontWeight="bold"
                  leftIcon={<Box as="span" className="material-symbols-outlined">check</Box>}
                >
                  Pass
                </Button>
                <Button
                  variant="solid"
                  px="8"
                  shadow="lg"
                  isDisabled={!selectedVerdict}
                  isLoading={overrideMutation.isPending}
                  onClick={() => selectedVerdict && overrideMutation.mutate({ verdictId: current.id, status: selectedVerdict })}
                >
                  Submit Verdict
                </Button>
              </HStack>
              <Text fontSize="10px" color="brand.onSurfaceVariant" fontStyle="italic" textAlign="right" mt="2">
                Verdict will trigger Workflow 4: Compliance Validation Update.
              </Text>
            </Box>
          </Flex>
        </Box>
      )}
    </Box>
  );
};
