import { Box, type BoxProps, useColorModeValue } from "@chakra-ui/react";

export interface StitchCardProps extends BoxProps {}

/**
 * Consistent bordered card container (used across pages).
 */
export function StitchCard(props: StitchCardProps) {
  const { children, ...rest } = props;
  const borderColor = useColorModeValue("rgba(0, 32, 91, 0.15)", "rgba(255, 255, 255, 0.08)");

  return (
    <Box
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      bg={useColorModeValue("white", "rgba(255,255,255,0.03)")}
      p={4}
      {...rest}
    >
      {children}
    </Box>
  );
}

