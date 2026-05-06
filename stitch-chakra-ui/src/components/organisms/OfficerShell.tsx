import React from "react";
import { Box, Flex } from "@chakra-ui/react";
import { LeftNavRail } from "./LeftNavRail";
import { TopHeader } from "./TopHeader";
import { useOfficer } from "../../state/OfficerContext";

export interface OfficerShellProps {
  title: string;
  children: React.ReactNode;
}

export function OfficerShell({ title, children }: OfficerShellProps) {
  const { activeTender } = useOfficer();

  const navItems = [
    { to: "/upload", label: "Document Upload" },
    { to: "/criteria", label: "Criteria Review" },
    { to: "/dashboard", label: "Evaluation Dashboard" },
    { to: "/manual", label: "Manual Review Queue" },
    { to: "/audit", label: "Audit Logs" },
    { to: "/report", label: "Final Report" },
  ];

  return (
    <Flex minH="100svh">
      <LeftNavRail items={navItems} />
      <Flex flex="1" direction="column">
        <TopHeader title={title} subtitle={activeTender ? activeTender.name : undefined} />
        <Box p={6}>{children}</Box>
      </Flex>
    </Flex>
  );
}

