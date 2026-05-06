import type { InputProps } from "@chakra-ui/react";
import { FormControl, FormLabel, Input } from "@chakra-ui/react";

export interface StitchInputProps extends Omit<InputProps, "size"> {
  label?: string;
}

/**
 * Input with persistent label (no floating), matching Stitch guidance.
 */
export function StitchInput({ label, id, ...props }: StitchInputProps) {
  const resolvedId = id ?? props.name;
  return (
    <FormControl>
      {label ? <FormLabel htmlFor={resolvedId}>{label}</FormLabel> : null}
      <Input id={resolvedId} size="md" {...props} />
    </FormControl>
  );
}

