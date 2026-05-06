import { Box, Flex, Heading, Button, HStack, Spinner, Center } from '@chakra-ui/react';
import { DashboardBento } from '../components/organisms/DashboardBento';
import { useQuery } from '@tanstack/react-query';
import { fetchTenders } from '../api/client';

export const DashboardPage = () => {
  const { data: tenders, isLoading } = useQuery({
    queryKey: ['tenders'],
    queryFn: fetchTenders
  });

  if (isLoading) {
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
            {tenders?.length ? `Monitoring Tender: ${tenders[0].name}` : 'Monitoring Workflow 3.4: Automated Evidence Validation'}
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

      <DashboardBento />
    </Box>
  );
};
