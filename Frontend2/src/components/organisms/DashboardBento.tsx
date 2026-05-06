import { Box, SimpleGrid, GridItem, Text, VStack } from '@chakra-ui/react';
import { ScoreRing } from '../molecules/ScoreRing';
import { StatusCard } from '../molecules/StatusCard';
import { useMemo } from 'react';

interface DashboardBentoProps {
  data: any;
}

export const DashboardBento = ({ data }: DashboardBentoProps) => {
  const stats = useMemo(() => {
    if (!data) return { score: 0, total: 0, failed: 0, pending: 0, passed: 0 };
    
    const totalBidders = data.bidders.length;
    const totalCriteria = data.criteria.length;
    const totalPossibleChecks = totalBidders * totalCriteria;
    
    if (totalPossibleChecks === 0) return { score: 0, total: 0, failed: 0, pending: 0, passed: 0 };
    
    const passCount = data.verdicts.filter((v: any) => v.verdict === 'PASS' || v.verdict === 'OFFICER_APPROVED').length;
    const failCount = data.verdicts.filter((v: any) => v.verdict === 'FAIL' || v.verdict === 'OFFICER_REJECTED').length;
    const manualCount = data.verdicts.filter((v: any) => v.verdict === 'MANUAL_REVIEW').length;
    
    const score = Math.round((passCount / totalPossibleChecks) * 100);
    
    return {
      score,
      total: totalBidders,
      failed: failCount,
      pending: manualCount,
      passed: passCount
    };
  }, [data]);

  const bidderStatuses = useMemo(() => {
    if (!data) return [];
    
    return data.bidders.map((bidder: any) => {
      const verdicts = data.verdicts.filter((v: any) => v.bidder_id === bidder.id);
      const fails = verdicts.filter((v: any) => v.verdict === 'FAIL' || v.verdict === 'OFFICER_REJECTED');
      const manual = verdicts.filter((v: any) => v.verdict === 'MANUAL_REVIEW');
      const passed = verdicts.filter((v: any) => v.verdict === 'PASS' || v.verdict === 'OFFICER_APPROVED');
      
      let status: 'FAILED' | 'PENDING' | 'PASSED' = 'PASSED';
      let description = `All checks verified for ${bidder.name}.`;
      let issueTitle = '';
      let issueClause = '';

      if (fails.length > 0) {
        status = 'FAILED';
        const fail = fails[0];
        const criterion = data.criteria.find((c: any) => c.id === fail.criterion_id);
        issueTitle = 'Compliance Failure';
        issueClause = criterion?.section_reference || 'Clause 1.0';
        description = fail.reason || 'Document verification failed.';
      } else if (manual.length > 0 || verdicts.length < data.criteria.length) {
        status = 'PENDING';
        issueTitle = 'Manual Verification';
        issueClause = 'Review Req.';
        description = manual.length > 0 ? manual[0].reason : 'Processing documents...';
      }

      return {
        id: bidder.id,
        companyName: bidder.name,
        bidId: `BID-${bidder.id.slice(0, 4).toUpperCase()}`,
        status,
        description,
        issueTitle,
        issueClause
      };
    });
  }, [data]);

  return (
    <SimpleGrid columns={12} spacing="6" mb="8">
      {/* Hero: Compliance Summary Ring */}
      <GridItem colSpan={{ base: 12, lg: 5 }} bg="brand.surfaceContainerLow" border="1px" borderColor="brand.outlineVariant" p="6" display="flex" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" shadow="sm" borderRadius="xl">
        <Text fontSize="xs" fontWeight="bold" color="brand.onSurfaceVariant" mb="10" alignSelf="flex-start" textTransform="uppercase" letterSpacing="widest">
          Overall Compliance Score
        </Text>
        
        <ScoreRing score={stats.score} total={100} label="Aggregate Pass Rate" />

        <SimpleGrid columns={3} spacing="12" w="full" borderTop="1px" borderColor="brand.outlineVariant" pt="8" mt="12">
          <Box>
            <Text fontSize="2xl" fontWeight="semibold" color="brand.primary">{String(stats.total).padStart(2, '0')}</Text>
            <Text fontSize="sm" color="brand.secondary">Total Bidders</Text>
          </Box>
          <Box>
            <Text fontSize="2xl" fontWeight="semibold" color="brand.error">{String(stats.failed).padStart(2, '0')}</Text>
            <Text fontSize="sm" color="brand.secondary">Critical Fails</Text>
          </Box>
          <Box>
            <Text fontSize="2xl" fontWeight="semibold" color="brand.onSurface">{String(stats.pending).padStart(2, '0')}</Text>
            <Text fontSize="sm" color="brand.secondary">Pending Review</Text>
          </Box>
        </SimpleGrid>
      </GridItem>

      {/* Hero: Bidder Status Cards Grid */}
      <GridItem colSpan={{ base: 12, lg: 7 }}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
          {bidderStatuses.map((bidder: any) => (
            <StatusCard
              key={bidder.id}
              status={bidder.status}
              companyName={bidder.companyName}
              bidId={bidder.bidId}
              issueTitle={bidder.issueTitle}
              issueClause={bidder.issueClause}
              description={bidder.description}
              actionLabel={bidder.status === 'PASSED' ? 'View Log' : bidder.status === 'FAILED' ? 'Review Evidence' : 'Assist AI Agent'}
            />
          ))}
          {bidderStatuses.length === 0 && (
            <GridItem colSpan={2}>
              <Box p="10" textAlign="center" border="1px dashed" borderColor="brand.outlineVariant" borderRadius="xl">
                <Text color="brand.onSurfaceVariant">No bidder data available yet.</Text>
              </Box>
            </GridItem>
          )}
        </SimpleGrid>
      </GridItem>
    </SimpleGrid>
  );
};
