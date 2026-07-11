import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** Town of Wiley — Aura preset: deep forest brand, gold CTAs, white cards on cream. */
export const WILEY_THEME_PRESET = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef5f1',
      100: '#d5e8df',
      200: '#a9cdbd',
      300: '#6fa892',
      400: '#45806c',
      500: '#2f6354',
      600: '#245044',
      700: '#1a3c34',
      800: '#153229',
      900: '#0f3d2e',
      950: '#061f18',
    },
    focusRing: {
      width: '3px',
      style: 'solid',
      color: '#d4a14b',
      offset: '2px',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.700}',
          inverseColor: '#ffffff',
          hoverColor: '{primary.800}',
          activeColor: '{primary.900}',
        },
        highlight: {
          background: '#eef5f1',
          focusBackground: '#d5e8df',
          color: '{primary.900}',
          focusColor: '{primary.950}',
        },
        surface: {
          0: '#ffffff',
          50: '#faf6f0',
          100: '#f1ebe3',
          200: '#e6dfd6',
          300: '#c5d4cc',
          400: '#8fa89c',
          500: '#5c6f66',
          600: '#3d5249',
          700: '#2f6354',
          800: '#1a3c34',
          900: '#0f3d2e',
          950: '#061f18',
        },
        formField: {
          background: '{surface.0}',
          borderColor: '{surface.200}',
          hoverBorderColor: '{primary.600}',
          focusBorderColor: '{primary.600}',
          color: '{surface.900}',
          placeholderColor: '{surface.500}',
        },
      },
    },
  },
  components: {
    button: {
      root: {
        borderRadius: '9999px',
        gap: '0.5rem',
        paddingX: '1.35rem',
        paddingY: '0.95rem',
      },
      colorScheme: {
        light: {
          root: {
            primary: {
              background: '#d4a14b',
              hoverBackground: '#c4923a',
              activeBackground: '#a67a2f',
              borderColor: '#d4a14b',
              hoverBorderColor: '#c4923a',
              activeBorderColor: '#a67a2f',
              color: '#0f3d2e',
            },
            secondary: {
              background: '#ffffff',
              hoverBackground: '#faf6f0',
              activeBackground: '#f1ebe3',
              borderColor: '#e6dfd6',
              hoverBorderColor: '{primary.500}',
              activeBorderColor: '{primary.600}',
              color: '#0f3d2e',
            },
          },
        },
      },
    },
    card: {
      root: {
        borderRadius: '1.25rem',
      },
      body: {
        gap: '1.5rem',
        padding: '1.5rem',
      },
      colorScheme: {
        light: {
          root: {
            background: 'var(--wiley-surface-card)',
            color: '{surface.800}',
          },
          subtitle: {
            color: '{surface.600}',
          },
        },
      },
    },
    divider: {
      colorScheme: {
        light: {
          root: {
            borderColor: '{surface.200}',
          },
        },
      },
    },
    inputtext: {
      root: {
        borderRadius: '0.5rem',
        paddingX: '1rem',
        paddingY: '0.75rem',
      },
    },
    panel: {
      root: {
        borderRadius: '1.25rem',
      },
      colorScheme: {
        light: {
          root: {
            background: 'var(--wiley-surface-card)',
            borderColor: '{surface.200}',
            color: '{surface.800}',
          },
          header: {
            background: '{surface.50}',
            color: '{surface.900}',
          },
        },
      },
    },
    selectbutton: {
      root: {
        borderRadius: '9999px',
      },
    },
    tabs: {
      tab: {
        padding: '0.875rem 1rem',
      },
    },
    timeline: {
      eventMarker: {
        size: '0.875rem',
      },
    },
  },
});