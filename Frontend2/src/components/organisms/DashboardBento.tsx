import { Box, SimpleGrid, GridItem, Text } from '@chakra-ui/react';
import { ScoreRing } from '../molecules/ScoreRing';
import { StatusCard } from '../molecules/StatusCard';

export const DashboardBento = () => {
  return (
    <SimpleGrid columns={12} spacing="6" mb="8">
      {/* Hero: Compliance Summary Ring */}
      <GridItem colSpan={{ base: 12, lg: 5 }} bg="brand.surfaceContainerLow" border="1px" borderColor="brand.outlineVariant" p="6" display="flex" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" shadow="sm" borderRadius="xl">
        <Text fontSize="xs" fontWeight="bold" color="brand.onSurfaceVariant" mb="10" alignSelf="flex-start" textTransform="uppercase" letterSpacing="widest">
          Overall Compliance Score
        </Text>
        
        <ScoreRing score={75} total={100} label="Aggregate Pass Rate" />

        <SimpleGrid columns={3} spacing="12" w="full" borderTop="1px" borderColor="brand.outlineVariant" pt="8" mt="12">
          <Box>
            <Text fontSize="2xl" fontWeight="semibold" color="brand.primary">08</Text>
            <Text fontSize="sm" color="brand.secondary">Total Bidders</Text>
          </Box>
          <Box>
            <Text fontSize="2xl" fontWeight="semibold" color="brand.error">02</Text>
            <Text fontSize="sm" color="brand.secondary">Critical Fails</Text>
          </Box>
          <Box>
            <Text fontSize="2xl" fontWeight="semibold" color="brand.onSurface">03</Text>
            <Text fontSize="sm" color="brand.secondary">Pending Review</Text>
          </Box>
        </SimpleGrid>
      </GridItem>

      {/* Hero: Bidder Status Cards Grid */}
      <GridItem colSpan={{ base: 12, lg: 7 }}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
          <StatusCard
            status="FAILED"
            companyName="Infraserve Corp"
            bidId="BID-449-01"
            issueTitle="Critical Failure"
            issueClause="Clause 4.2.1"
            description="ISO 27001 Certification document found to be expired (Oct 2023)."
            actionLabel="Review Evidence"
          />
          <StatusCard
            status="PENDING"
            companyName="Global Tech Sol"
            bidId="BID-449-02"
            issueTitle="Ambiguous Evidence"
            issueClause="Clause 7.1.0"
            description="AI could not verify notary seal. Manual verification required."
            actionLabel="Assist AI Agent"
          />
          <StatusCard
            status="PASSED"
            companyName="Apex Systems"
            bidId="BID-449-03"
            description="All 14 compliance checks successfully verified."
            actionLabel="View Log"
          />
          <StatusCard
            status="PASSED"
            companyName="Lumina Ltd"
            bidId="BID-449-04"
            description="Validated against Federal Annex-B requirements."
            actionLabel="View Log"
          />
        </SimpleGrid>
      </GridItem>
    </SimpleGrid>
  );
};
