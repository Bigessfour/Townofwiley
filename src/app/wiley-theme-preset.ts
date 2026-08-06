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
        roundedBorderRadius: '9999px',
        gap: '0.5rem',
        paddingX: '1.35rem',
        paddingY: '0.95rem',
        label: {
          fontWeight: '700',
        },
        sm: {
          paddingX: '1rem',
          paddingY: '0.65rem',
        },
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
          outlined: {
            contrast: {
              hoverBackground: 'color-mix(in srgb, #ffffff 25%, transparent)',
              activeBackground: 'color-mix(in srgb, #ffffff 35%, transparent)',
              borderColor: 'color-mix(in srgb, #ffffff 40%, transparent)',
              color: '#ffffff',
            },
            secondary: {
              hoverBackground: 'color-mix(in srgb, #0f3d2e 8%, transparent)',
              activeBackground: 'color-mix(in srgb, #0f3d2e 14%, transparent)',
              borderColor: 'color-mix(in srgb, #0f3d2e 22%, transparent)',
              color: '#0f3d2e',
            },
          },
        },
      },
    },
    megamenu: {
      root: {
        background: 'transparent',
        borderColor: 'transparent',
        color: '#ffffff',
        gap: '0.5rem',
      },
      overlay: {
        background: '#ffffff',
        borderColor: '{surface.200}',
        borderRadius: '1.25rem',
        color: '{surface.800}',
        shadow: '0 18px 40px rgba(15, 61, 46, 0.14)',
      },
      // Shared item tokens default to the light overlay panel (dark ink).
      // Root bar overrides --p-megamenu-item-* under .p-megamenu-root-list in app.scss
      // so white labels are never paired with surface.50/100 wash on the forest header.
      item: {
        color: '{surface.800}',
        focusColor: '{surface.900}',
        activeColor: '{surface.900}',
        focusBackground: 'color-mix(in srgb, #0f3d2e 8%, #ffffff)',
        activeBackground: 'color-mix(in srgb, #0f3d2e 12%, #ffffff)',
        borderRadius: '0.5rem',
        icon: {
          color: '{surface.700}',
          focusColor: '{surface.900}',
          activeColor: '{surface.900}',
        },
      },
      submenuLabel: {
        color: '{primary.700}',
        fontWeight: '700',
      },
    },
    drawer: {
      colorScheme: {
        light: {
          root: {
            background: '#ffffff',
            borderColor: '{surface.200}',
            color: '{surface.800}',
            shadow: '0 18px 40px rgba(15, 61, 46, 0.15)',
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