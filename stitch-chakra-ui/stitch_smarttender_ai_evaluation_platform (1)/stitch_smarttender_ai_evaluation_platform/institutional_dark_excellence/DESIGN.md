---
name: Institutional Dark Excellence
colors:
  surface: '#0d1322'
  surface-dim: '#0d1322'
  surface-bright: '#33394a'
  surface-container-lowest: '#080e1d'
  surface-container-low: '#151b2b'
  surface-container: '#191f2f'
  surface-container-high: '#242a3a'
  surface-container-highest: '#2f3445'
  on-surface: '#dde2f8'
  on-surface-variant: '#c3c5d8'
  inverse-surface: '#dde2f8'
  inverse-on-surface: '#2a3040'
  outline: '#8d90a1'
  outline-variant: '#434655'
  surface-tint: '#b6c4ff'
  primary: '#b6c4ff'
  on-primary: '#00277e'
  primary-container: '#2e66ff'
  on-primary-container: '#fdfaff'
  inverse-primary: '#004fe6'
  secondary: '#b2c5ff'
  on-secondary: '#122d67'
  secondary-container: '#2f4682'
  on-secondary-container: '#a0b7fa'
  tertiary: '#b7c8e1'
  on-tertiary: '#213145'
  tertiary-container: '#65758c'
  on-tertiary-container: '#fcfbff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164f'
  on-primary-fixed-variant: '#003ab1'
  secondary-fixed: '#dae2ff'
  secondary-fixed-dim: '#b2c5ff'
  on-secondary-fixed: '#001849'
  on-secondary-fixed-variant: '#2d447f'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#0d1322'
  on-background: '#dde2f8'
  surface-variant: '#2f3445'
typography:
  headline-xl:
    fontFamily: Public Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Public Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Public Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  container-max: 1440px
  gutter: 24px
  margin: 32px
---

## Brand & Style

The design system is engineered for high-stakes government procurement environments, where clarity and reliability are paramount. It adopts a **Corporate / Modern** style with a focus on institutional authority and digital security. 

The aesthetic prioritizes a "command center" feel—highly functional and sophisticated, yet approachable for long-duration usage. By utilizing deep navy surfaces and high-contrast typography, the design system minimizes ocular fatigue for night-shift officers while maintaining a prestigious, official tone. The visual narrative emphasizes data integrity, systematic organization, and modern efficiency.

## Colors

The palette is anchored by a deep navy background (`#0B1120`) to eliminate light bleed and eye strain. The primary brand blue has been shifted to a more luminous, accessible blue (`#2E66FF`) for interactive elements to ensure WCAG AA compliance against dark surfaces.

The secondary brand blue (`#00205B`) is reserved for subtle structural grounding and low-priority containers. Typography uses a hierarchy of pure white for headlines and Slate-400 (`#94A3B8`) for supporting text to prevent harsh glare while maintaining high legibility.

## Typography

This design system utilizes **Public Sans** as its primary typeface to evoke an institutional, official, and trustworthy character. Its neutral, clean letterforms ensure maximum readability in complex data tables and procurement documents. 

**Inter** is employed for utility labels and UI controls due to its superior performance at small sizes. Type scales are strictly enforced to maintain a clear information hierarchy, using semi-bold weights for navigation and headlines to stand out against the dark canvas without appearing overly aggressive.

## Layout & Spacing

The design system employs a **Fixed Grid** model for administrative dashboards to ensure predictable data visualization and a **Fluid Grid** for secondary content views. A 12-column system is standard, with generous 24px gutters to allow the UI to "breathe" despite high information density.

A 4px baseline grid governs all vertical rhythm. This strict spacing creates a sense of mathematical precision, reinforcing the feeling of a secure and systematic procurement platform. Padding within cards and modals should be consistent at 24px (lg) to ensure touch targets are clear and content is distinct.

## Elevation & Depth

In a high-contrast dark environment, depth is communicated through **Tonal Layers** rather than heavy shadows. Surfaces closer to the user are lighter in value:
- **Level 0 (Background):** `#0B1120` (The base canvas).
- **Level 1 (Cards/Sidebar):** `#161E2E` (Subtle lift).
- **Level 2 (Modals/Popovers):** `#1E293B` (Maximum visibility).

A **Low-contrast outline** (`#334155` at 50% opacity) is applied to all container elements to define edges against the dark background. This replaces traditional shadows, which can appear muddy in dark mode, ensuring the interface remains crisp and structured.

## Shapes

The design system utilizes **Soft** geometry to strike a balance between modern friendliness and professional rigidity. Standard components feature a 0.25rem (4px) corner radius, while larger containers like cards and modals use 0.5rem (8px). This subtle rounding prevents the interface from feeling "sharp" or intimidating, maintaining the professional institutional look required for government-grade software.

## Components

### Buttons
- **Primary:** Solid `#2E66FF` with white text. High-contrast, sharp clarity.
- **Secondary:** Ghost style with `#94A3B8` borders and white text.
- **Tertiary:** Pure text with 1px underline on hover, using the primary blue.

### Input Fields
- **Default State:** Background of `#161E2E` with a 1px border of `#334155`.
- **Focus State:** Border changes to `#2E66FF` with a subtle outer glow (2px blur).
- **Typography:** Placeholder text in Slate-500; active text in White.

### Cards & Containers
- Cards use the Level 1 surface (`#161E2E`) with no shadow. 
- Headers within cards are separated by a subtle 1px horizontal rule (`#1E293B`).

### Status Chips
- **Success:** Deep emerald green background (low opacity) with vibrant green text.
- **Pending/Warning:** Deep amber background (low opacity) with bright gold text.
- **Critical:** Deep crimson background (low opacity) with vivid red text.

### Data Tables
- Row hover states use a subtle highlight of `#1E293B`.
- Header rows are pinned and use the Level 2 surface to distinguish from scrollable data.