import { extendTheme } from "@chakra-ui/react";
import { mode } from "@chakra-ui/theme-tools";

/**
 * Stitch Design System (via Stitch MCP) mapped onto Chakra tokens.
 * Goal: keep brand colors + typography consistent across light/dark.
 */
const stitchTheme = extendTheme({
  config: {
    initialColorMode: "light",
    useSystemColorMode: false,
  },
  fonts: {
    heading: "'Public Sans', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    body: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
  radii: {
    sm: "0.125rem", // 2px
    md: "0.375rem", // 6px
    lg: "0.5rem", // 8px
    xl: "0.75rem", // 12px
    full: "9999px",
  },
  textStyles: {
    "label-caps": {
      fontFamily: "Inter",
      fontSize: "11px",
      fontWeight: 700,
      lineHeight: 1,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    },
    "data-mono": {
      fontFamily: "mono",
      fontSize: "13px",
      fontWeight: 500,
      lineHeight: 1,
    },
  },
  styles: {
    global: (props: any) => ({
      body: {
        bg: mode("#fbf9f8", "#0d1322")(props),
        color: mode("#1b1c1c", "#dde2f8")(props),
      },
    }),
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: "sm",
        fontWeight: 600,
        textTransform: "none",
      },
      variants: {
        primary: (props: any) => ({
          bg: mode("#00205B", "#2E66FF")(props),
          color: mode("#ffffff", "#ffffff")(props),
          border: "1px solid",
          borderColor: mode("#00205B", "#2E66FF")(props),
          _hover: {
            bg: mode("#001849", "#004fe6")(props),
          },
        }),
        secondary: (props: any) => ({
          bg: mode("#ffffff", "#161E2E")(props),
          color: mode("#00205B", "#dde2f8")(props),
          border: "1px solid",
          borderColor: mode("#00205B", "#334155")(props),
          _hover: {
            bg: mode("#f6f3f2", "#1E293B")(props),
          },
        }),
        ghost: (props: any) => ({
          bg: "transparent",
          color: mode("#00205B", "#94A3B8")(props),
          border: "1px solid",
          borderColor: mode("rgba(0,32,91,0.25)", "rgba(148,163,184,0.4)")(props),
          _hover: {
            bg: mode("rgba(0,32,91,0.06)", "rgba(148,163,184,0.08)")(props),
          },
        }),
        tertiary: (props: any) => ({
          bg: "transparent",
          color: mode("#00205B", "#2E66FF")(props),
          border: "1px solid transparent",
          _hover: {
            textDecoration: "underline",
          },
        }),
      },
    },
    Input: {
      baseStyle: (props: any) => ({
        bg: mode("#ffffff", "#161E2E")(props),
        border: "1px solid",
        borderColor: mode("#757681", "#334155")(props),
        borderRadius: "sm",
        _focus: {
          borderColor: mode("#00205B", "#2E66FF")(props),
          boxShadow: "none",
        },
      }),
    },
    Textarea: {
      baseStyle: (props: any) => ({
        bg: mode("#ffffff", "#161E2E")(props),
        border: "1px solid",
        borderColor: mode("#757681", "#334155")(props),
        borderRadius: "sm",
        _focus: {
          borderColor: mode("#00205B", "#2E66FF")(props),
          boxShadow: "none",
        },
      }),
    },
  },
});

export default stitchTheme;

