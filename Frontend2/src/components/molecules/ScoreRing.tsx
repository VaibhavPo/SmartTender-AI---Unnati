import { Box, Flex, Text } from '@chakra-ui/react';

interface ScoreRingProps {
  score: number;
  total: number;
  label: string;
}

export const ScoreRing = ({ score, total, label }: ScoreRingProps) => {
  const radius = 116;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / total) * circumference;

  return (
    <Box position="relative" w="64" h="64" display="flex" alignItems="center" justifyContent="center">
      <Box as="svg" w="full" h="full" transform="rotate(-90deg)">
        <circle
          cx="128"
          cy="128"
          fill="transparent"
          r={radius}
          stroke="var(--chakra-colors-brand-surfaceVariant)"
          strokeWidth="16"
        />
        <circle
          cx="128"
          cy="128"
          fill="transparent"
          r={radius}
          stroke="var(--chakra-colors-brand-primary)"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeWidth="16"
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </Box>
      <Flex position="absolute" direction="column" align="center">
        <Text fontSize="5xl" fontWeight="bold" color="brand.primary" lineHeight="tight">
          {score}/{total}
        </Text>
        <Text fontSize="xs" fontWeight="semibold" color="brand.secondary" textTransform="uppercase" letterSpacing="widest">
          {label}
        </Text>
      </Flex>
    </Box>
  );
};
