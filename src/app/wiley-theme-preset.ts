import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** Town of Wiley — Aura preset: deep navy brand, teal CTAs, cool neutral surfaces. */
export const WILEY_THEME_PRESET = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
    focusRing: {
      width: '3px',
      style: 'solid',
      color: '#14b8a6',
      offset: '2px',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.800}',
          inverseColor: '#ffffff',
          hoverColor: '{primary.900}',
          activeColor: '{primary.950}',
        },
        highlight: {
          background: '#f0fdfa',
          focusBackground: '#ccfbf1',
          color: '{primary.900}',
          focusColor: '{primary.950}',
        },
        surface: {
          0: '#ffffff',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        formField: {
          background: '{surface.0}',
          borderColor: '{surface.200}',
          hoverBorderColor: '#0d9488',
          focusBorderColor: '#0d9488',
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
              background: '#0d9488',
              hoverBackground: '#0f766e',
              activeBackground: '#115e59',
              borderColor: '#0d9488',
              hoverBorderColor: '#0f766e',
              activeBorderColor: '#115e59',
              color: '#ffffff',
            },
          },
        },
      },
    },
    card: {
      root: {
        borderRadius: '1.5rem',
      },
      body: {
        gap: '1.5rem',
        padding: '1.5rem',
      },
      colorScheme: {
        light: {
          root: {
            background: '{surface.0}',
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
        borderRadius: '1.5rem',
      },
      colorScheme: {
        light: {
          root: {
            background: '{surface.0}',
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
