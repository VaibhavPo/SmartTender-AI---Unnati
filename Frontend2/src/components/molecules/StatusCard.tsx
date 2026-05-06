import { Box, Flex, Text, HStack, Button } from '@chakra-ui/react';

interface StatusCardProps {
  status: 'FAILED' | 'PENDING' | 'PASSED';
  companyName: string;
  bidId: string;
  issueTitle?: string;
  issueClause?: string;
  description: string;
  actionLabel: string;
}

export const StatusCard = ({ status, companyName, bidId, issueTitle, issueClause, description, actionLabel }: StatusCardProps) => {
  const isFailed = status === 'FAILED';
  const isPending = status === 'PENDING';
  const isPassed = status === 'PASSED';

  const badgeBg = isFailed ? 'brand.error' : isPending ? 'brand.tertiaryContainer' : 'brand.secondaryContainer';
  const badgeColor = isFailed ? 'brand.onError' : isPending ? 'brand.onTertiaryContainer' : 'brand.onSecondaryContainer';
  
  return (
    <Box
      bg="brand.surfaceContainerLow"
      border={isFailed ? '2px solid' : '1px solid'}
      borderColor={isFailed ? 'brand.error' : 'brand.outlineVariant'}
      p="4"
      position="relative"
      shadow="sm"
      borderRadius="xl"
      opacity={isPassed ? 0.8 : 1}
      _hover={{ opacity: 1 }}
      transition="opacity 0.2s"
    >
      <Box position="absolute" top="2" right="2" bg={badgeBg} color={badgeColor} px="2" py="0.5" fontSize="xs" fontWeight="bold" borderRadius="sm">
        {status}
      </Box>
      
      <Flex align="start" gap="3" mb="4">
        <Flex w="12" h="12" bg="brand.surfaceContainerHigh" align="center" justify="center" border="1px" borderColor="brand.outlineVariant" borderRadius="md">
          <Box as="span" className="material-symbols-outlined" color="brand.primary">business</Box>
        </Flex>
        <Box>
          <Text fontSize="lg" fontWeight="semibold" fontFamily="heading">{companyName}</Text>
          <Text fontSize="sm" color="brand.secondary">ID: {bidId}</Text>
        </Box>
      </Flex>

      <Box mb="6">
        {isFailed && (
          <Flex justify="space-between" align="center" bg="brand.errorContainer" p="2" border="1px" borderColor="brand.error" borderRadius="md" mb="2" opacity="0.8">
            <Text fontSize="sm" fontWeight="bold" color="brand.error">{issueTitle}</Text>
            <Text fontSize="13px" fontWeight="medium" fontFamily="mono" color="brand.error">{issueClause}</Text>
          </Flex>
        )}
        {isPending && (
          <Flex justify="space-between" align="center" bg="brand.surfaceContainerHighest" p="2" border="1px" borderColor="brand.outlineVariant" borderRadius="md" mb="2">
            <Text fontSize="sm" fontWeight="bold" color="brand.onSurface">{issueTitle}</Text>
            <Text fontSize="13px" fontWeight="medium" fontFamily="mono" color="brand.onSurface">{issueClause}</Text>
          </Flex>
        )}
        {isPassed && (
          <HStack gap="2" mb="2">
            <Box as="span" className="material-symbols-outlined" color="brand.primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</Box>
            <Text fontSize="sm" color="brand.secondary">{description}</Text>
          </HStack>
        )}
        
        {!isPassed && (
          <Text fontSize="sm" color="brand.onSurfaceVariant" fontStyle="italic">"{description}"</Text>
        )}
      </Box>

      <Button
        w="full"
        variant={isFailed || isPending ? 'outline' : 'ghost'}
        borderColor={isFailed || isPending ? 'brand.primary' : 'brand.outlineVariant'}
        color={isFailed || isPending ? 'brand.primary' : 'brand.onSurfaceVariant'}
      >
        {actionLabel}
      </Button>
    </Box>
  );
};
