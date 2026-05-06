import { Table, type TableProps } from "@chakra-ui/react";

export interface DataTableProps extends Omit<TableProps, "variant" | "size"> {}

/**
 * Table wrapper with Stitch-like header + zebra striping.
 */
export function DataTable(props: DataTableProps) {
  return (
    <Table
      size="sm"
      variant="unstyled"
      sx={{
        th: {
          background: "transparent",
          borderBottom: "1px solid",
          borderColor: { base: "#757681", _dark: "#434655" },
          textTransform: "uppercase",
          fontWeight: 700,
          fontSize: "11px",
          letterSpacing: "0.05em",
          whiteSpace: "nowrap",
        },
        "tbody tr:nth-of-type(odd) td": {
          background: {
            base: "rgba(0, 32, 91, 0.03)",
            _dark: "rgba(255, 255, 255, 0.03)",
          } as any,
        },
        td: {
          borderBottom: "1px solid",
          borderColor: { base: "rgba(0,0,0,0.06)", _dark: "rgba(255,255,255,0.06)" },
        },
      }}
      {...props}
    />
  );
}

