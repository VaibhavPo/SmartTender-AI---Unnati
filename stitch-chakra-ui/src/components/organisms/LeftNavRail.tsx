import { Flex, Text, useColorModeValue } from "@chakra-ui/react";
import { NavLink } from "react-router-dom";

export interface NavItem {
  to: string;
  label: string;
}

export interface LeftNavRailProps {
  items: NavItem[];
}

export function LeftNavRail({ items }: LeftNavRailProps) {
  const brandColor = useColorModeValue("#00205B", "#B6C4FF");

  return (
    <Flex
      direction="column"
      width="240px"
      borderRight="1px solid"
      borderColor="rgba(0,0,0,0.08)"
      px={4}
      py={5}
      gap={4}
    >
      <Text fontFamily="heading" fontWeight={800} fontSize="16px" color={brandColor}>
        SmartTender
      </Text>
      <Flex direction="column" gap={2}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            style={({ isActive }) => ({
              textDecoration: "none",
              color: isActive ? brandColor : "inherit",
              fontWeight: isActive ? 800 : 600,
              padding: "10px 12px",
              borderRadius: 8,
              background: isActive ? "rgba(46,102,255,0.12)" : "transparent",
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </Flex>
    </Flex>
  );
}

