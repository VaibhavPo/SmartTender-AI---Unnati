import { Box, Flex, VStack, Text, HStack, Button, Link, Skeleton } from '@chakra-ui/react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

const navItems = [
  { icon: 'upload_file', label: 'Ingestion Portal', to: '/upload' },
  { icon: 'fact_check', label: 'Criteria Review', to: '/review' },
  { icon: 'dashboard', label: 'Evaluation Dashboard', to: '/dashboard' },
  { icon: 'rate_review', label: 'Manual Review', to: '/manual-review' },
  { icon: 'assessment', label: 'Reports', to: '/reports' },
  { icon: 'history', label: 'Audit Logs', to: '/audit' },
];

const fetchTenders = async () => {
  const { data } = await apiClient.get('/tenders');
  return data;
};

export const SideNavBar = () => {
  const { pathname } = useLocation();

  const { data: tenders, isLoading } = useQuery({
    queryKey: ['tenders'],
    queryFn: fetchTenders,
  });

  const activeTender = tenders?.[0];

  return (
    <Box
      as="aside"
      position="fixed"
      left="0"
      top="16"
      h="calc(100vh - 64px)"
      w="64"
      py="4"
      bg="brand.surfaceContainerLow"
      borderRight="1px"
      borderColor="brand.outlineVariant"
      display={{ base: 'none', md: 'flex' }}
      flexDirection="column"
      zIndex="40"
    >
      {/* Tender context */}
      <Box px="6" mb="6">
        <HStack spacing="3" mb="2">
          <Flex
            w="10" h="10"
            bg="brand.primaryContainer"
            align="center"
            justify="center"
            rounded="md"
            flexShrink={0}
          >
            <Box
              as="span"
              className="material-symbols-outlined"
              color="brand.onPrimaryContainer"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_balance
            </Box>
          </Flex>
          <Box minW="0">
            {isLoading ? (
              <VStack align="start" spacing="1">
                <Skeleton h="3" w="24" />
                <Skeleton h="3" w="16" />
              </VStack>
            ) : (
              <>
                <Text
                  fontSize="xs"
                  color="brand.onSurfaceVariant"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  fontWeight="bold"
                  noOfLines={1}
                >
                  {activeTender?.reference_number || (activeTender ? `TENDER-${activeTender.id.slice(0, 8).toUpperCase()}` : 'No Active Tender')}
                </Text>
                <Text fontSize="sm" color="brand.secondary" noOfLines={1} fontWeight="medium">
                  {activeTender?.name || 'SmartTender AI'}
                </Text>
              </>
            )}
          </Box>
        </HStack>
      </Box>

      {/* Nav items */}
      <VStack align="stretch" spacing="0.5" flex="1">
        {navItems.map(({ icon, label, to }) => {
          const isActive = pathname === to || pathname.startsWith(to + '/');
          return (
            <Link
              key={to}
              as={RouterNavLink}
              to={to}
              display="flex"
              alignItems="center"
              gap="3"
              px="6"
              py="3"
              bg={isActive ? 'brand.secondaryContainer' : 'transparent'}
              color={isActive ? 'brand.onSecondaryContainer' : 'brand.onSurfaceVariant'}
              fontWeight={isActive ? 'bold' : 'normal'}
              borderLeft={isActive ? '4px solid' : '4px solid transparent'}
              sx={{ borderLeftColor: isActive ? 'var(--chakra-colors-brand-primary)' : 'transparent' }}
              _hover={{ bg: isActive ? undefined : 'brand.surfaceContainerHigh', textDecoration: 'none' }}
              transition="all 0.15s"
            >
              <Box
                as="span"
                className="material-symbols-outlined"
                fontSize="20px"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : undefined }}
              >
                {icon}
              </Box>
              <Text fontSize="md">{label}</Text>
            </Link>
          );
        })}
      </VStack>

      {/* Footer */}
      <Box px="6" pt="4" borderTop="1px" borderColor="brand.outlineVariant" mt="auto">
        <HStack
          color="brand.onSurfaceVariant"
          _hover={{ color: 'brand.primary' }}
          py="2"
          cursor="pointer"
          transition="colors 0.15s"
          spacing="3"
        >
          <Box as="span" className="material-symbols-outlined">help_outline</Box>
          <Text>Support</Text>
        </HStack>
        <Button
          as={RouterNavLink}
          to="/reports"
          w="full"
          mt="4"
          variant="solid"
          shadow="sm"
          leftIcon={<Box as="span" className="material-symbols-outlined" fontSize="16px">picture_as_pdf</Box>}
        >
          Generate Report
        </Button>
      </Box>
    </Box>
  );
};
