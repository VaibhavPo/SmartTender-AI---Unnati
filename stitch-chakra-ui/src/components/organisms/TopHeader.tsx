import { Flex, IconButton, Text, useColorMode, useColorModeValue } from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import React from "react";

export interface TopHeaderProps {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}

export function TopHeader({ title, subtitle, rightSlot }: TopHeaderProps) {
  const { colorMode, toggleColorMode } = useColorMode();
  const titleColor = useColorModeValue("#08060d", "#dde2f8");

  return (
    <Flex
      align="center"
      justify="space-between"
      px={6}
      py={4}
      borderBottom="1px solid"
      borderColor={useColorModeValue("rgba(0,0,0,0.08)", "rgba(255,255,255,0.08)")}
      gap={4}
    >
      <Flex direction="column" gap={1} minW={0}>
        <Text fontFamily="heading" fontWeight={900} fontSize="18px" color={titleColor} noOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text fontSize="13px" color={useColorModeValue("rgba(0,0,0,0.55)", "rgba(255,255,255,0.65)")} noOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </Flex>

      <Flex align="center" gap={2}>
        {rightSlot}
        <IconButton
          aria-label="Toggle color mode"
          variant="ghost"
          onClick={toggleColorMode}
          icon={colorMode === "dark" ? <SunIcon /> : <MoonIcon />}
        />
      </Flex>
    </Flex>
  );
}

