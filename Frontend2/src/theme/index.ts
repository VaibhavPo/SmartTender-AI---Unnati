import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const colors = {
  brand: {
    primary: '#b6c4ff',
    primaryContainer: '#2e66ff',
    onPrimary: '#00277e',
    onPrimaryContainer: '#fdfaff',
    secondary: '#b2c5ff',
    secondaryContainer: '#2f4682',
    onSecondary: '#122d67',
    onSecondaryContainer: '#a0b7fa',
    tertiary: '#b7c8e1',
    tertiaryContainer: '#65758c',
    onTertiary: '#213145',
    onTertiaryContainer: '#fcfbff',
    error: '#ffb4ab',
    errorContainer: '#93000a',
    onError: '#690005',
    onErrorContainer: '#ffdad6',
    background: '#0d1322',
    onBackground: '#dde2f8',
    surface: '#0d1322',
    onSurface: '#dde2f8',
    surfaceVariant: '#2f3445',
    onSurfaceVariant: '#c3c5d8',
    outline: '#8d90a1',
    outlineVariant: '#434655',
    surfaceContainerLowest: '#080e1d',
    surfaceContainerLow: '#151b2b',
    surfaceContainer: '#191f2f',
    surfaceContainerHigh: '#242a3a',
    surfaceContainerHighest: '#2f3445',
  },
};

const fonts = {
  heading: '"Public Sans", sans-serif',
  body: '"Public Sans", sans-serif',
  mono: 'monospace',
};

const styles = {
  global: {
    body: {
      bg: 'brand.background',
      color: 'brand.onSurface',
      fontFamily: 'body',
    },
    '::-webkit-scrollbar': {
      width: '6px',
    },
    '::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '::-webkit-scrollbar-thumb': {
      background: 'brand.outlineVariant',
      borderRadius: '4px',
    },
    '.material-symbols-outlined': {
      fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
      verticalAlign: 'middle',
    },
  },
};

export const theme = extendTheme({
  config,
  colors,
  fonts,
  styles,
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'bold',
        borderRadius: '0.25rem',
      },
      variants: {
        solid: {
          bg: 'brand.primary',
          color: 'brand.onPrimary',
          _hover: {
            bg: 'brand.primaryContainer',
          },
        },
        outline: {
          borderColor: 'brand.outline',
          color: 'brand.primary',
          _hover: {
            bg: 'brand.surfaceContainerHigh',
          },
        },
        ghost: {
          color: 'brand.onSurfaceVariant',
          _hover: {
            bg: 'brand.surfaceContainerHigh',
          },
        },
      },
      defaultProps: {
        colorScheme: 'brand',
      },
    },
  },
});
