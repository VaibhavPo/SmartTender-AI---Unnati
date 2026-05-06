import { Box, Flex } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import { TopNavBar } from '../organisms/TopNavBar';
import { SideNavBar } from '../organisms/SideNavBar';

export const DashboardLayout = () => {
  return (
    <Box minH="100vh">
      <TopNavBar />
      <Flex pt="16">
        <SideNavBar />
        <Box flex="1" ml={{ md: '64' }} p="6" transition="margin-left 0.2s">
          <Outlet />
        </Box>
      </Flex>
    </Box>
  );
};
