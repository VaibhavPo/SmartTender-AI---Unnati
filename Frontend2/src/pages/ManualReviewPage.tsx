import {
  Box, Flex, Heading, Text, HStack, VStack, Button, Badge,
  Table, Thead, Tbody, Tr, Th, Td, Spinner, Select, Input,
  InputGroup, InputLeftElement, IconButton, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
  ModalBody, ModalCloseButton, useDisclosure, Textarea
} from '@chakra-ui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useState, useMemo } from 'react';

const fetchTenders = async () => {
  const { data } = await apiClient.get('/tenders');
  return data;
};

const fetchEvaluationData = async (tenderId: string) => {
  const { data } = await apiClient.get(`/tenders/${tenderId}/evaluation-data`);
  return data;
};

export const ManualReviewPage = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedVerdict, setSelectedVerdict] = useState<any>(null);
  const [overrideVerdict, setOverrideVerdict] = useState<'OFFICER_APPROVED' | 'OFFICER_REJECTED' | null>(null);
  const [justification, setJustification] = useState('');
  const [bidderFilter, setBidderFilter] = useState('');

  const { data: tenders, isLoading: tendersLoading } = useQuery({
    queryKey: ['tenders'],
    queryFn: fetchTenders,
  });

  const activeTender = tenders?.[0];

  const { data: evalData, isLoading: evalLoading } = useQuery({
    queryKey: ['evaluation-data', activeTender?.id],
    queryFn: () => fetchEvaluationData(activeTender!.id),
    enabled: !!activeTender?.id,
  });

  const overrideMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/verdicts/override', {
        verdict_id: selectedVerdict.id,
        new_verdict: overrideVerdict,
        justification: justification,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-data'] });
      toast({
        title: 'Verdict Submitted',
        description: `Successfully overrode verdict for ${selectedVerdict.bidder_name}`,
        status: 'success',
        duration: 3000,
      });
      handleCloseModal();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to submit verdict',
        status: 'error',
        duration: 5000,
      });
    }
  });

  const manualVerdicts = useMemo(() => {
    if (!evalData) return [];
    
    return evalData.verdicts
      .filter((v: any) => v.verdict === 'MANUAL_REVIEW')
      .map((v: any) => {
        const bidder = evalData.bidders.find((b: any) => b.id === v.bidder_id);
        const criterion = evalData.criteria.find((c: any) => c.id === v.criterion_id);
        const evidence = evalData.evidence.find((e: any) => e.bidder_id === v.bidder_id && e.criterion_id === v.criterion_id);
        
        return {
          ...v,
          bidder_name: bidder?.name || 'Unknown',
          criterion_name: criterion?.name || 'Unknown',
          criterion_description: criterion?.description || '',
          source_text: evidence?.source_text || 'No evidence extracted',
        };
      })
      .filter((v: any) => 
        bidderFilter === '' || v.bidder_name.toLowerCase().includes(bidderFilter.toLowerCase())
      );
  }, [evalData, bidderFilter]);

  const handleOpenModal = (v: any) => {
    setSelectedVerdict(v);
    onOpen();
  };

  const handleCloseModal = () => {
    onClose();
    setSelectedVerdict(null);
    setOverrideVerdict(null);
    setJustification('');
  };

  if (tendersLoading || evalLoading) {
    return (
      <Flex h="50vh" align="center" justify="center">
        <Spinner size="xl" color="brand.primary" thickness="4px" />
      </Flex>
    );
  }

  return (
    <Box maxW="1400px" mx="auto">
      {/* Header */}
      <Flex justify="space-between" align="center" mb="6">
        <Box>
          <Heading size="lg" color="brand.primary" fontFamily="heading">
            Manual Review Queue
          </Heading>
          <Text fontSize="sm" color="brand.onSurfaceVariant" mt="1">
            Review and resolve compliance ambiguities identified by AI.
          </Text>
        </Box>
        <HStack bg="brand.surfaceContainer" p="2" borderRadius="md" border="1px" borderColor="brand.outlineVariant">
          <Box as="span" className="material-symbols-outlined" color="brand.primary">pending_actions</Box>
          <Text fontWeight="bold" color="brand.onSurface">{manualVerdicts.length} Tasks Pending</Text>
        </HStack>
      </Flex>

      {/* Filters */}
      <Box bg="brand.surfaceContainer" p="4" borderRadius="md" border="1px" borderColor="brand.outlineVariant" mb="6">
        <Flex gap="4">
          <InputGroup maxW="xs">
            <InputLeftElement pointerEvents="none">
              <Box as="span" className="material-symbols-outlined" color="brand.onSurfaceVariant">search</Box>
            </InputLeftElement>
            <Input 
              placeholder="Filter by bidder name..." 
              bg="brand.surfaceContainerLow"
              value={bidderFilter}
              onChange={(e) => setBidderFilter(e.target.value)}
            />
          </InputGroup>
          <Select placeholder="Filter by status" maxW="xs" bg="brand.surfaceContainerLow">
            <option value="all">All Manual Reviews</option>
            <option value="high">High Confidence</option>
            <option value="low">Low Confidence</option>
          </Select>
        </Flex>
      </Box>

      {/* Table */}
      <Box bg="brand.surfaceContainer" border="1px" borderColor="brand.outlineVariant" borderRadius="md" overflow="hidden">
        <Table variant="simple" size="sm">
          <Thead bg="brand.surfaceContainerHigh">
            <Tr>
              <Th color="brand.onSurfaceVariant" borderColor="brand.outlineVariant">Bidder</Th>
              <Th color="brand.onSurfaceVariant" borderColor="brand.outlineVariant">Criteria</Th>
              <Th color="brand.onSurfaceVariant" borderColor="brand.outlineVariant" w="30%">Criteria Description</Th>
              <Th color="brand.onSurfaceVariant" borderColor="brand.outlineVariant" w="20%">LLM Reason</Th>
              <Th color="brand.onSurfaceVariant" borderColor="brand.outlineVariant" w="20%">Source Evidence</Th>
              <Th color="brand.onSurfaceVariant" borderColor="brand.outlineVariant" textAlign="right">Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {manualVerdicts.length > 0 ? (
              manualVerdicts.map((v: any) => (
                <Tr key={v.id} _hover={{ bg: 'brand.surfaceContainerLow' }} transition="all 0.1s">
                  <Td borderColor="brand.outlineVariant" fontWeight="bold" color="brand.onSurface">
                    {v.bidder_name}
                  </Td>
                  <Td borderColor="brand.outlineVariant">
                    <Badge colorScheme="blue" variant="subtle" px="2" py="0.5" borderRadius="sm">
                      {v.criterion_name}
                    </Badge>
                  </Td>
                  <Td borderColor="brand.outlineVariant">
                    <Text fontSize="xs" color="brand.onSurfaceVariant" noOfLines={3}>
                      {v.criterion_description}
                    </Text>
                  </Td>
                  <Td borderColor="brand.outlineVariant">
                    <Text fontSize="xs" color="brand.primary" fontWeight="medium" noOfLines={3}>
                      {v.reason}
                    </Text>
                  </Td>
                  <Td borderColor="brand.outlineVariant">
                    <Box bg="brand.surfaceContainerLow" p="2" borderRadius="sm" border="1px" borderColor="brand.outlineVariant">
                      <Text fontSize="10px" fontStyle="italic" color="brand.onSurface" noOfLines={3}>
                        "{v.source_text}"
                      </Text>
                    </Box>
                  </Td>
                  <Td borderColor="brand.outlineVariant" textAlign="right">
                    <Button 
                      size="xs" 
                      variant="solid" 
                      onClick={() => handleOpenModal(v)}
                      leftIcon={<Box as="span" className="material-symbols-outlined" fontSize="14px">edit_note</Box>}
                    >
                      Review
                    </Button>
                  </Td>
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan={6} textAlign="center" py="10">
                  <VStack spacing="2">
                    <Box as="span" className="material-symbols-outlined" fontSize="48px" color="brand.outlineVariant">check_circle</Box>
                    <Text fontWeight="bold" color="brand.onSurfaceVariant">No Manual Reviews Found</Text>
                    <Text fontSize="sm" color="brand.outline">All AI verdicts are within confidence thresholds.</Text>
                  </VStack>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>

      {/* Review Modal */}
      <Modal isOpen={isOpen} onClose={handleCloseModal} size="xl">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="brand.surfaceContainerLow" border="1px" borderColor="brand.outlineVariant">
          <ModalHeader color="brand.primary">Submit Officer Verdict</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="4" align="stretch">
              <Box p="4" bg="brand.surfaceContainer" borderRadius="md" border="1px" borderColor="brand.outlineVariant">
                <Text fontSize="xs" fontWeight="bold" color="brand.onSurfaceVariant" textTransform="uppercase" mb="2">Context</Text>
                <HStack justify="space-between" mb="1">
                  <Text fontSize="sm" fontWeight="bold">Bidder:</Text>
                  <Text fontSize="sm">{selectedVerdict?.bidder_name}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm" fontWeight="bold">Criteria:</Text>
                  <Text fontSize="sm">{selectedVerdict?.criterion_name}</Text>
                </HStack>
              </Box>

              <Box>
                <Text fontSize="xs" fontWeight="bold" color="brand.onSurfaceVariant" textTransform="uppercase" mb="2">Source Evidence</Text>
                <Box bg="whiteAlpha.50" p="3" borderRadius="md" borderLeft="4px solid" borderColor="brand.primary">
                  <Text fontSize="sm" fontStyle="italic">"{selectedVerdict?.source_text}"</Text>
                </Box>
              </Box>

              <Box>
                <Text fontSize="xs" fontWeight="bold" color="brand.onSurfaceVariant" textTransform="uppercase" mb="2">Verdict Selection</Text>
                <HStack spacing="4">
                  <Button 
                    flex="1" 
                    variant={overrideVerdict === 'OFFICER_APPROVED' ? 'solid' : 'outline'}
                    colorScheme={overrideVerdict === 'OFFICER_APPROVED' ? 'green' : 'gray'}
                    onClick={() => setOverrideVerdict('OFFICER_APPROVED')}
                    leftIcon={<Box as="span" className="material-symbols-outlined">check</Box>}
                  >
                    Pass
                  </Button>
                  <Button 
                    flex="1" 
                    variant={overrideVerdict === 'OFFICER_REJECTED' ? 'solid' : 'outline'}
                    colorScheme={overrideVerdict === 'OFFICER_REJECTED' ? 'red' : 'gray'}
                    onClick={() => setOverrideVerdict('OFFICER_REJECTED')}
                    leftIcon={<Box as="span" className="material-symbols-outlined">close</Box>}
                  >
                    Fail
                  </Button>
                </HStack>
              </Box>

              <Box>
                <Text fontSize="xs" fontWeight="bold" color="brand.onSurfaceVariant" textTransform="uppercase" mb="2">Justification (Audit Requirement)</Text>
                <Textarea 
                  placeholder="Explain why you are passing/failing this bidder..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  bg="brand.surfaceContainer"
                  fontSize="sm"
                  h="24"
                />
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCloseModal}>Cancel</Button>
            <Button 
              isDisabled={!overrideVerdict || justification.length < 10}
              isLoading={overrideMutation.isPending}
              onClick={() => overrideMutation.mutate()}
            >
              Confirm Verdict
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};
