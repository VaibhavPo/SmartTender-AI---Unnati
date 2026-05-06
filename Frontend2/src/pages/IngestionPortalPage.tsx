import {
  Box, Flex, Heading, Text, VStack, HStack, Button, Badge,
  Table, Thead, Tbody, Tr, Th, Td, Spinner, Alert, AlertIcon,
  Progress, Select, IconButton,
} from '@chakra-ui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useState, useRef } from 'react';

const fetchTenders = async () => {
  const { data } = await apiClient.get('/tenders');
  return data;
};

const fetchDocuments = async (tenderId: string) => {
  const { data } = await apiClient.get(`/documents?tender_id=${tenderId}`);
  return data;
};

const fetchBidders = async (tenderId: string) => {
  const { data } = await apiClient.get(`/tenders/${tenderId}/bidders`);
  return data;
};

export const IngestionPortalPage = () => {
  const queryClient = useQueryClient();
  const [selectedBidderId, setSelectedBidderId] = useState<string>('');
  const tenderInputRef = useRef<HTMLInputElement>(null);
  const bidderInputRef = useRef<HTMLInputElement>(null);

  const { data: tenders, isLoading: tendersLoading } = useQuery({
    queryKey: ['tenders'],
    queryFn: fetchTenders,
  });

  const activeTender = tenders?.[0];

  const { data: bidders } = useQuery({
    queryKey: ['bidders', activeTender?.id],
    queryFn: () => fetchBidders(activeTender!.id),
    enabled: !!activeTender?.id,
  });

  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ['documents', activeTender?.id],
    queryFn: () => fetchDocuments(activeTender!.id),
    enabled: !!activeTender?.id,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, bidderId }: { file: File; bidderId?: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tender_id', activeTender!.id);
      if (bidderId) formData.append('bidder_id', bidderId);
      
      const { data } = await apiClient.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      await apiClient.delete(`/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  if (tendersLoading) {
    return (
      <Flex h="50vh" align="center" justify="center">
        <Spinner size="xl" color="brand.primary" thickness="4px" />
      </Flex>
    );
  }

  return (
    <Box maxW="5xl" mx="auto">
      {/* Header */}
      <Flex
        justify="space-between"
        align="center"
        bg="brand.surfaceContainerHigh"
        p="6"
        border="1px"
        borderColor="brand.outlineVariant"
        borderRadius="md"
        mb="6"
      >
        <Box>
          <Heading size="lg" color="brand.primary" fontFamily="heading">
            Ingestion Portal
          </Heading>
          <Text fontSize="sm" color="brand.onSurfaceVariant" mt="1">
            Phase: Current Tender Document Processing
          </Text>
        </Box>
        {/* Stepper */}
        <HStack spacing="2" align="center">
          {[{ label: 'Upload', active: true }, { label: 'Extract', active: false }, { label: 'Evaluate', active: false }].map((step, i) => (
            <HStack key={step.label} spacing="2">
              {i > 0 && <Box w="12" h="px" bg="brand.outlineVariant" />}
              <Flex direction="column" align="center" gap="1" opacity={step.active ? 1 : 0.4}>
                <Flex
                  w="8" h="8" rounded="full" align="center" justify="center" fontWeight="bold"
                  bg={step.active ? 'brand.primary' : 'brand.surfaceVariant'}
                  color={step.active ? 'brand.onPrimary' : 'brand.onSurface'}
                >
                  {i + 1}
                </Flex>
                <Text fontSize="10px" textTransform="uppercase" fontWeight="bold" color="brand.onSurfaceVariant">
                  {step.label}
                </Text>
              </Flex>
            </HStack>
          ))}
        </HStack>
      </Flex>

      <Flex gap="6">
        {/* Main upload column */}
        <Box flex="2">
          <VStack spacing="6" align="stretch">
            {/* Tender Document Upload */}
            <Box
              bg="brand.surfaceContainerLowest"
              border="1px"
              borderColor="brand.outlineVariant"
              p="8"
              borderRadius="md"
              shadow="sm"
            >
              <Flex justify="space-between" align="start" mb="4">
                <Box>
                  <Heading size="md" color="brand.primary" mb="1">Tender Document</Heading>
                  <Text fontSize="sm" color="brand.onSurfaceVariant">The core procurement document for Docling AI extraction.</Text>
                </Box>
                <Badge bg="brand.primaryContainer" color="brand.onPrimaryContainer" px="3" py="1" borderRadius="sm" fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">
                  Required
                </Badge>
              </Flex>

              <Box
                border="2px dashed"
                borderColor="brand.primary"
                bg="whiteAlpha.50"
                p="12"
                borderRadius="md"
                textAlign="center"
                cursor="pointer"
                _hover={{ bg: 'whiteAlpha.100' }}
                transition="all 0.2s"
                onClick={() => tenderInputRef.current?.click()}
                position="relative"
                overflow="hidden"
              >
                {uploadMutation.isPending && (
                  <Flex position="absolute" inset="0" bg="blackAlpha.800" zIndex="10" direction="column" align="center" justify="center" p="6" gap="4">
                    <Progress w="full" maxW="md" size="xs" colorScheme="blue" isIndeterminate borderRadius="full" />
                    <HStack>
                      <Box as="span" className="material-symbols-outlined" color="brand.primary" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</Box>
                      <Text fontSize="xs" fontWeight="bold" color="brand.primary" textTransform="uppercase" letterSpacing="wider">AI Extraction in Progress…</Text>
                    </HStack>
                  </Flex>
                )}
                <Box as="span" className="material-symbols-outlined" color="brand.primary" fontSize="4xl">upload_file</Box>
                <Text fontWeight="bold" fontSize="lg" color="brand.onSurface" mt="2">Click or drag and drop tender PDF</Text>
                <input
                  ref={tenderInputRef}
                  type="file"
                  accept=".pdf"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && activeTender) {
                      uploadMutation.mutate({ file });
                    }
                  }}
                />
              </Box>

              {uploadMutation.isSuccess && (
                <Alert status="success" mt="4" borderRadius="md" bg="brand.secondaryContainer" color="brand.onSecondaryContainer">
                  <AlertIcon />
                  Document uploaded and ingestion triggered successfully.
                </Alert>
              )}
            </Box>

            {/* Bidder Documents */}
            <Box
              bg="brand.surfaceContainerLowest"
              border="1px"
              borderColor="brand.outlineVariant"
              p="8"
              borderRadius="md"
              shadow="sm"
            >
              <Heading size="md" color="brand.primary" mb="1">Bidder Documents</Heading>
              <Text fontSize="sm" color="brand.onSurfaceVariant" mb="4">Upload support files and technical appendices.</Text>

              <VStack spacing="3" align="stretch" mb="4">
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="brand.onSurfaceVariant" textTransform="uppercase" mb="1" letterSpacing="wider">
                    Select Bidder (Required for Upload)
                  </Text>
                  <HStack>
                    <Select
                      placeholder="Select bidder company..."
                      size="sm"
                      bg="brand.surfaceContainerLow"
                      borderColor="brand.outlineVariant"
                      value={selectedBidderId}
                      onChange={(e) => setSelectedBidderId(e.target.value)}
                    >
                      {bidders?.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </Select>
                  </HStack>
                </Box>

                <Box
                  border="2px dashed"
                  borderColor={selectedBidderId ? "brand.outlineVariant" : "gray.200"}
                  p="8"
                  borderRadius="md"
                  textAlign="center"
                  cursor={selectedBidderId ? "pointer" : "not-allowed"}
                  opacity={selectedBidderId ? 1 : 0.5}
                  _hover={selectedBidderId ? { bg: 'brand.surfaceVariant' } : {}}
                  transition="all 0.2s"
                  onClick={() => selectedBidderId && bidderInputRef.current?.click()}
                >
                  <Box as="span" className="material-symbols-outlined" color="brand.onSurfaceVariant" fontSize="2xl">folder_zip</Box>
                  <Text fontWeight="bold" color="brand.onSurface" mt="1">Upload Batch</Text>
                  <input 
                    ref={bidderInputRef} 
                    type="file" 
                    accept=".pdf,.docx" 
                    multiple 
                    hidden 
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        Array.from(files).forEach(file => {
                          uploadMutation.mutate({ file, bidderId: selectedBidderId });
                        });
                      }
                    }}
                  />
                </Box>
              </VStack>

              {/* Documents table */}
              {docsLoading ? (
                <Spinner size="sm" color="brand.primary" />
              ) : documents?.length > 0 ? (
                <Box border="1px" borderColor="brand.outlineVariant" borderRadius="md" overflow="hidden">
                  <Table size="sm">
                    <Thead bg="brand.surfaceContainerHigh">
                      <Tr>
                        <Th color="brand.onSurfaceVariant" fontSize="10px" textTransform="uppercase" borderColor="brand.outlineVariant">Filename</Th>
                        <Th color="brand.onSurfaceVariant" fontSize="10px" textTransform="uppercase" borderColor="brand.outlineVariant">Status</Th>
                        <Th borderColor="brand.outlineVariant" />
                      </Tr>
                    </Thead>
                    <Tbody>
                      {documents.map((doc: any) => (
                        <Tr key={doc.id} _hover={{ bg: 'brand.surfaceContainer' }} transition="all 0.15s">
                          <Td fontWeight="bold" color="brand.onSurface" borderColor="brand.outlineVariant">{doc.filename}</Td>
                          <Td borderColor="brand.outlineVariant">
                            <HStack spacing="1">
                              <Box as="span" className="material-symbols-outlined" color="brand.primary" fontSize="sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                                {doc.status === 'completed' ? 'check_circle' : 'hourglass_empty'}
                              </Box>
                              <Text fontSize="10px" fontWeight="bold" color="brand.primary" textTransform="uppercase">
                                {doc.status}
                              </Text>
                            </HStack>
                          </Td>
                          <Td textAlign="right" borderColor="brand.outlineVariant">
                            <IconButton
                              aria-label="Delete document"
                              variant="ghost"
                              size="sm"
                              color="brand.onSurfaceVariant"
                              _hover={{ color: 'brand.error' }}
                              icon={<Box as="span" className="material-symbols-outlined">delete</Box>}
                              isLoading={deleteMutation.isPending && deleteMutation.variables === doc.id}
                              onClick={() => deleteMutation.mutate(doc.id)}
                            />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              ) : (
                <Text fontSize="sm" color="brand.onSurfaceVariant" textAlign="center" py="4">No documents uploaded yet.</Text>
              )}
            </Box>
          </VStack>
        </Box>

        {/* Sidebar */}
        <Box flex="1">
          <VStack spacing="4" align="stretch">
            {/* Guidelines */}
            <Box bg="brand.surfaceContainer" border="1px" borderColor="brand.outlineVariant" borderRadius="md">
              <Flex justify="space-between" align="center" p="4" cursor="pointer">
                <HStack spacing="3">
                  <Box as="span" className="material-symbols-outlined" color="brand.primary">info</Box>
                  <Text fontWeight="bold" color="brand.onSurface">Ingestion Guidelines</Text>
                </HStack>
                <Box as="span" className="material-symbols-outlined" color="brand.onSurfaceVariant">expand_more</Box>
              </Flex>
              <VStack align="start" spacing="3" px="4" pb="4" borderTop="1px" borderColor="brand.outlineVariant">
                {[
                  'Ensure PDF documents have an accessible text layer for 99% accuracy.',
                  'System auto-identifies table structures and nested appendices.',
                  'Extraction typically takes 2-5 minutes per large document.',
                ].map((tip, i) => (
                  <HStack key={i} align="start" spacing="2">
                    <Text color="brand.primary" mt="0.5">•</Text>
                    <Text fontSize="sm" color="brand.onSurfaceVariant">{tip}</Text>
                  </HStack>
                ))}
              </VStack>
            </Box>

            {/* AI Status */}
            <Flex bg="brand.surfaceContainer" border="1px" borderColor="brand.outlineVariant" borderRadius="md" p="4" align="center" gap="4">
              <Box w="2" h="2" rounded="full" bg="brand.primary" className="animate-pulse" shadow="0 0 8px rgba(182,196,255,0.6)" />
              <Box>
                <Text fontSize="10px" color="brand.onSurfaceVariant" textTransform="uppercase" fontWeight="bold" letterSpacing="wider">Docling Engine</Text>
                <Text fontSize="10px" fontWeight="bold" color="brand.primary" textTransform="uppercase">Operational • 240ms</Text>
              </Box>
            </Flex>
          </VStack>
        </Box>
      </Flex>
    </Box>
  );
};
