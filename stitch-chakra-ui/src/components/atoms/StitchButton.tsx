import type { ButtonProps } from "@chakra-ui/react";
import { Button } from "@chakra-ui/react";

export type StitchButtonVariant = "primary" | "secondary" | "ghost" | "tertiary";

export interface StitchButtonProps extends Omit<ButtonProps, "variant"> {
  variant?: StitchButtonVariant;
}

/**
 * Brand-aligned button wrapper.
 * Uses Chakra theme variants defined in `src/theme/stitchTheme.ts`.
 */
export function StitchButton({
  variant = "primary",
  children,
  ...rest
}: StitchButtonProps) {
  return (
    <Button variant={variant as any} borderRadius="sm" {...rest}>
      {children}
    </Button>
  );
}

