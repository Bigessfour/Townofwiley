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
          /* surface.500 on white is ~5.4:1; surface.200 cream fails the 3:1 UI-boundary bar */
          borderColor: '{surface.500}',
          hoverBorderColor: '{primary.600}',
          focusBorderColor: '{primary.600}',
          color: '{surface.900}',
          placeholderColor: '{surface.500}',
        },
      },
      dark: {
        primary: {
          color: '#d5e8df',
          inverseColor: '#061f18',
          hoverColor: '#eef5f1',
          activeColor: '#faf6f0',
        },
        highlight: {
          background: '#1a3c34',
          focusBackground: '#245044',
          color: '#f4f7f2',
          focusColor: '#faf6f0',
        },
        surface: {
          0: '#12352c',
          50: '#0f2a22',
          100: '#174036',
          200: '#245044',
          300: '#3d6a5c',
          400: '#5c6f66',
          500: '#8fa89c',
          600: '#c5d4cc',
          700: '#d5e8df',
          800: '#e8f3ee',
          900: '#f4f7f2',
          950: '#faf6f0',
        },
        formField: {
          background: '{surface.0}',
          borderColor: '#6fa892',
          hoverBorderColor: '#d4a14b',
          focusBorderColor: '#e4b86a',
          color: '{surface.900}',
          placeholderColor: '#8fa89c',
        },
        /*
         * Aura's dark scheme maps text.color to surface.0 and content.background
         * to surface.900. The inverted ramp would then paint panels cream and
         * ink dark. Point both back at the forest card and cream ink.
         */
        text: {
          color: '{surface.900}',
          hoverColor: '{surface.950}',
          mutedColor: '{surface.500}',
          hoverMutedColor: '{surface.600}',
        },
        content: {
          background: '{surface.0}',
          hoverBackground: '{surface.100}',
          borderColor: '{surface.200}',
          color: '{text.color}',
          hoverColor: '{text.hover.color}',
        },
        overlay: {
          select: {
            background: '{surface.0}',
            borderColor: '{surface.200}',
            color: '{text.color}',
          },
          popover: {
            background: '{surface.0}',
            borderColor: '{surface.200}',
            color: '{text.color}',
          },
          modal: {
            background: '{surface.0}',
            borderColor: '{surface.200}',
            color: '{text.color}',
          },
        },
        list: {
          option: {
            focusBackground: '{surface.100}',
            color: '{text.color}',
            focusColor: '{text.hover.color}',
          },
        },
        navigation: {
          item: {
            focusBackground: '{surface.100}',
            activeBackground: '{surface.100}',
            color: '{text.color}',
            focusColor: '{text.hover.color}',
            activeColor: '{text.hover.color}',
          },
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
              /* gold-500 + forest-950 is ~6.2:1. gold-600 with forest-900 is only ~3.2:1. */
              background: '#c4923a',
              hoverBackground: '#b8860b',
              activeBackground: '#b8860b',
              borderColor: '#c4923a',
              hoverBorderColor: '#b8860b',
              activeBorderColor: '#b8860b',
              color: '#061f18',
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
        dark: {
          root: {
            primary: {
              background: '#c4923a',
              hoverBackground: '#b8860b',
              activeBackground: '#b8860b',
              borderColor: '#c4923a',
              hoverBorderColor: '#b8860b',
              activeBorderColor: '#b8860b',
              color: '#061f18',
            },
            secondary: {
              background: '#174036',
              hoverBackground: '#1a4a3e',
              activeBackground: '#245044',
              borderColor: '#6fa892',
              hoverBorderColor: '#8fa89c',
              activeBorderColor: '#a9cdbd',
              color: '#f4f7f2',
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
              hoverBackground: 'color-mix(in srgb, #d5e8df 12%, transparent)',
              activeBackground: 'color-mix(in srgb, #d5e8df 18%, transparent)',
              borderColor: 'color-mix(in srgb, #d5e8df 45%, transparent)',
              color: '#f4f7f2',
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
        borderRadius: '1.25rem',
        shadow: '0 18px 40px rgba(15, 61, 46, 0.14)',
      },
      colorScheme: {
        light: {
          overlay: {
            background: '#ffffff',
            borderColor: '{surface.200}',
            color: '{surface.800}',
          },
          item: {
            color: '{surface.800}',
            focusColor: '{surface.900}',
            activeColor: '{surface.900}',
            focusBackground: 'color-mix(in srgb, #0f3d2e 8%, #ffffff)',
            activeBackground: 'color-mix(in srgb, #0f3d2e 12%, #ffffff)',
            icon: {
              color: '{surface.700}',
              focusColor: '{surface.900}',
              activeColor: '{surface.900}',
            },
          },
          submenuLabel: {
            color: '{primary.700}',
          },
        },
        dark: {
          overlay: {
            background: '#12352c',
            borderColor: '#6fa892',
            color: '#f4f7f2',
            shadow: '0 18px 40px rgba(0, 0, 0, 0.35)',
          },
          item: {
            color: '#f4f7f2',
            focusColor: '#faf6f0',
            activeColor: '#faf6f0',
            focusBackground: 'color-mix(in srgb, #d5e8df 16%, #12352c)',
            activeBackground: 'color-mix(in srgb, #d5e8df 22%, #12352c)',
            icon: {
              color: '#d5e8df',
              focusColor: '#faf6f0',
              activeColor: '#faf6f0',
            },
          },
          submenuLabel: {
            color: '#d5e8df',
          },
        },
      },
      // Scheme colors live under colorScheme so the overlay is not a light panel in dark mode.
      // Root bar overrides --p-megamenu-item-* under .p-megamenu-root-list in app.scss
      // so white labels are never paired with a surface wash on the forest header.
      item: {
        borderRadius: '0.5rem',
      },
      submenuLabel: {
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
        dark: {
          root: {
            background: '#12352c',
            borderColor: '#6fa892',
            color: '#f4f7f2',
            shadow: '0 18px 40px rgba(0, 0, 0, 0.35)',
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
        dark: {
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
        dark: {
          root: {
            borderColor: '#6fa892',
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
        dark: {
          root: {
            background: 'var(--wiley-surface-card)',
            borderColor: '#6fa892',
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
