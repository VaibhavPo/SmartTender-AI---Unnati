import { Box, Flex, HStack, Text, Image, Link } from '@chakra-ui/react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';

const navLinks = [
  { to: '/upload', label: 'Upload' },
  { to: '/review', label: 'Review' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/reports', label: 'Reports' },
];

export const TopNavBar = () => {
  const { pathname } = useLocation();

  return (
    <Box
      as="header"
      position="fixed"
      top="0"
      w="100%"
      zIndex="50"
      h="16"
      bg="brand.surface"
      borderBottom="1px"
      borderColor="brand.outlineVariant"
      px="6"
    >
      <Flex h="full" justify="space-between" align="center">
        <HStack spacing="4">
          <Text
            fontSize="24px"
            fontWeight="bold"
            color="brand.primary"
            fontFamily="heading"
          >
            Unnati SmartTender AI
          </Text>
          <HStack
            spacing="6"
            ml="10"
            display={{ base: 'none', md: 'flex' }}
            h="full"
            align="center"
          >
            {navLinks.map(link => {
              const isActive = pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  as={RouterNavLink}
                  to={link.to}
                  fontSize="lg"
                  color={isActive ? 'brand.primary' : 'brand.onSurfaceVariant'}
                  borderBottom={isActive ? '2px solid' : '2px solid transparent'}
                  borderColor={isActive ? 'brand.primary' : 'transparent'}
                  pb="1"
                  fontWeight="semibold"
                  _hover={{ color: 'brand.primary', textDecoration: 'none' }}
                  transition="all 0.15s"
                >
                  {link.label}
                </Link>
              );
            })}
          </HStack>
        </HStack>

        <HStack spacing="4">
          <Box
            as="button"
            className="material-symbols-outlined"
            color="brand.onSurfaceVariant"
            p="2"
            borderRadius="md"
            _hover={{ bg: 'brand.surfaceContainerHigh' }}
            transition="all 0.2s"
          >
            notifications
          </Box>
          <Box
            as="button"
            className="material-symbols-outlined"
            color="brand.onSurfaceVariant"
            p="2"
            borderRadius="md"
            _hover={{ bg: 'brand.surfaceContainerHigh' }}
            transition="all 0.2s"
          >
            settings
          </Box>
          <Flex
            w="8" h="8"
            bg="brand.primaryContainer"
            rounded="full"
            border="1px"
            borderColor="brand.outlineVariant"
            align="center"
            justify="center"
          >
            <Box as="span" className="material-symbols-outlined" color="brand.onPrimaryContainer" fontSize="18px" style={{ fontVariationSettings: "'FILL' 1" }}>
              person
            </Box>
          </Flex>
        </HStack>
      </Flex>
    </Box>
  );
};
