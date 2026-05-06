import { Box, Flex, Heading, Button, HStack, Spinner, Center } from '@chakra-ui/react';
import { DashboardBento } from '../components/organisms/DashboardBento';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

const fetchTenders = async () => {
  const { data } = await apiClient.get('/tenders');
  return data;
};

const fetchEvaluationData = async (tenderId: string) => {
  const { data } = await apiClient.get(`/tenders/${tenderId}/evaluation-data`);
  return data;
};

export const DashboardPage = () => {
  const { data: tenders, isLoading: tendersLoading } = useQuery({
    queryKey: ['tenders'],
    queryFn: fetchTenders
  });

  const activeTender = tenders?.[0];

  const { data: evalData, isLoading: evalLoading } = useQuery({
    queryKey: ['evaluation-data', activeTender?.id],
    queryFn: () => fetchEvaluationData(activeTender!.id),
    enabled: !!activeTender?.id,
  });

  if (tendersLoading || evalLoading) {
    return (
      <Center h="50vh">
        <Spinner size="xl" color="brand.primary" thickness="4px" />
      </Center>
    );
  }

  return (
    <Box maxW="1400px" mx="auto">
      <Flex justify="space-between" align="flex-end" mb="6">
        <Box>
          <Heading size="lg" color="brand.primary" mb="1" fontFamily="heading">
            Evaluation Overview
          </Heading>
          <Box color="brand.onSurfaceVariant" fontSize="lg">
            {activeTender ? `Monitoring Tender: ${activeTender.name}` : 'No Active Tender'}
          </Box>
        </Box>
        <HStack spacing="2">
          <Button variant="outline" borderColor="brand.outline" bg="brand.surfaceContainerHigh" leftIcon={<Box as="span" className="material-symbols-outlined">filter_list</Box>}>
            Filters
          </Button>
          <Button variant="outline" borderColor="brand.outline" bg="brand.surfaceContainerHigh" leftIcon={<Box as="span" className="material-symbols-outlined">terminal</Box>}>
            View AI Logs
          </Button>
        </HStack>
      </Flex>

      <DashboardBento data={evalData} />
    </Box>
  );
};
