---
name: SmartTender AI
colors:
  surface: '#fbf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae8e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#444650'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0f0'
  outline: '#757681'
  outline-variant: '#c5c6d1'
  surface-tint: '#455c99'
  primary: '#000d2f'
  on-primary: '#ffffff'
  primary-container: '#00205b'
  on-primary-container: '#738aca'
  inverse-primary: '#b2c5ff'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dcdddd'
  on-secondary-container: '#5f6161'
  tertiary: '#2a0001'
  on-tertiary: '#ffffff'
  tertiary-container: '#520002'
  on-tertiary-container: '#ff463c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001849'
  on-primary-fixed-variant: '#2d447f'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#ffb4aa'
  on-tertiary-fixed: '#410002'
  on-tertiary-fixed-variant: '#930009'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
typography:
  h1:
    fontFamily: Public Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  h2:
    fontFamily: Public Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  h3:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
  data-mono:
    fontFamily: monospace
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is engineered for high-stakes governmental procurement and tender analysis. The brand personality is **authoritative, institutional, and precise**. It evokes the reliability of a federal agency combined with the efficiency of modern artificial intelligence. 

The visual style follows a **Corporate / Modern** movement with a heavy emphasis on structural integrity. It prioritizes information density over white space, ensuring that administrators have immediate access to complex data without unnecessary scrolling. The aesthetic relies on crisp lines, a disciplined color palette, and high-contrast accessibility to ensure the UI remains functional in high-pressure environments.

## Colors

The palette is anchored by **National Security Blue (#00205B)**, providing a sense of stability and legal authority. **Government Grey (#F2F2F2)** serves as the primary background color to reduce eye strain during prolonged use while maintaining a clean, paper-like feel.

The semantic color system is critical for status indicators:
- **Pass:** A deep forest green used for high-confidence AI matches and successful compliance.
- **Fail:** A high-visibility red used for critical omissions or non-compliance.
- **Review:** An authoritative amber for items requiring human intervention.

Neutral tones are strictly controlled to maintain a professional hierarchy, using darker shades for text and medium greys for structural borders.

## Typography

The typography system utilizes **Public Sans** for headings to reinforce the institutional, government-grade feel. **Inter** is used for all body text and interface labels due to its exceptional legibility at small sizes and high data densities.

Key typographic principles:
- **Hierarchical Density:** Use `label-caps` for metadata headers and table columns to maximize space.
- **Clarity:** Maintain a strict 1.5 line-height for body copy to ensure multi-page tender documents remain readable.
- **Data Integrity:** Use a monospaced font for ID numbers, reference codes, and technical values to ensure character alignment in tables.

## Layout & Spacing

This design system uses a **Fixed Grid** layout for administrative dashboards, ensuring that toolbars and navigation remain in consistent locations across different screen sizes. The grid is based on a 4px base unit to allow for tight, precise alignments.

- **Grid:** A 12-column grid with 16px gutters is used for content organization.
- **Density:** Padding is intentionally compact (8px-12px for component internals) to maximize the amount of information visible on a single screen.
- **Layout Model:** A fixed left-hand navigation rail (narrow) and a persistent top header for global search and identity management.

## Elevation & Depth

To maintain an "authoritative" feel, depth is communicated through **Tonal Layers** and **Bold Borders** rather than dramatic shadows. 

- **Surface Levels:** The primary background uses `Government Grey`. Secondary containers (cards, data tables) use a pure white background with a 1px border (#D1D5DB).
- **Shadows:** Use only one level of elevation shadow: a very subtle, tight blur (4px blur, 2px Y-offset, 10% opacity) to lift active modals or dropdown menus.
- **Active States:** Depth is often represented by a "pressed" tonal shift or a 2px National Security Blue border rather than traditional elevation.

## Shapes

The shape language is **sharp and disciplined**. A "Soft" (0.25rem) corner radius is applied to buttons and primary containers to provide a modern feel without appearing overly casual. 

- **Sharp Corners:** Table cells, header bars, and sidebars use 0px radius to emphasize the grid and structural rigidity.
- **Subtle Radius:** Buttons, input fields, and status "pills" use the `rounded-sm` (4px) setting to differentiate interactive elements from static layout blocks.

## Components

### Buttons
- **Primary:** National Security Blue background, white text. Sharp 4px corners. No gradients.
- **Secondary:** White background, 1px border (#00205B), Blue text.
- **Tertiary:** Transparent background, Blue text, underlined on hover.

### Status Indicators (Pills)
- High-contrast background colors with white text.
- Icons (Check, X, or Alert) must accompany text labels for accessibility.
- Rectangular with 4px radius; no pill-shaped ends.

### Input Fields
- Standard 1px grey border. 
- On focus, border changes to National Security Blue with a 1px solid offset.
- Labels are always persistent above the field (never floating).

### Data Tables
- Header row uses a light grey background (#E5E7EB) and `label-caps` typography.
- Alternating row zebra-striping is mandatory for horizontal scanning.
- Compact vertical padding (8px) to increase data density.

### Cards & Containers
- White background with a 1px border. 
- Section headers within cards use a subtle bottom-border to separate title from content.
- No rounded corners on top-level dashboard widgets to maintain a "tiled" professional appearance.