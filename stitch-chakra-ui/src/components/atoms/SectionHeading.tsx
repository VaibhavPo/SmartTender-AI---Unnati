import { Heading, type HeadingProps } from "@chakra-ui/react";

export interface SectionHeadingProps extends Omit<HeadingProps, "size"> {}

/**
 * Shared header styling for card/section titles.
 */
export function SectionHeading(props: SectionHeadingProps) {
  return (
    <Heading
      as="h3"
      size="md"
      fontWeight={700}
      letterSpacing="-0.01em"
      mb={2}
      {...props}
    />
  );
}

