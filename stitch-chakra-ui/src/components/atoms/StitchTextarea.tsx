import type { TextareaProps } from "@chakra-ui/react";
import { FormControl, FormLabel, Textarea } from "@chakra-ui/react";

export interface StitchTextareaProps extends Omit<TextareaProps, "size"> {
  label?: string;
}

export function StitchTextarea({ label, id, ...props }: StitchTextareaProps) {
  const resolvedId = id ?? props.name;
  return (
    <FormControl>
      {label ? <FormLabel htmlFor={resolvedId}>{label}</FormLabel> : null}
      <Textarea id={resolvedId} size="md" {...props} />
    </FormControl>
  );
}

