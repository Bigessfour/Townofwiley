import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** Town of Wiley — Aura preset: gray-beige light theme, cyan and gold on zinc in the dark. */
export const WILEY_THEME_PRESET = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f7f6f3',
      100: '#eceae6',
      200: '#d4d2cd',
      300: '#b5b3ae',
      400: '#9c9a96',
      500: '#8a8884',
      600: '#5c5a57',
      700: '#3f3d3b',
      800: '#353330',
      900: '#2a2927',
      950: '#161514',
    },
    focusRing: {
      width: '3px',
      style: 'solid',
      color: '#c4923a',
      offset: '2px',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.900}',
          inverseColor: '#ffffff',
          hoverColor: '{primary.800}',
          activeColor: '{primary.950}',
        },
        highlight: {
          background: '#f2f1ed',
          focusBackground: '#e6e4df',
          color: '{primary.900}',
          focusColor: '{primary.950}',
        },
        surface: {
          0: '#ffffff',
          50: '#f2f1ed',
          100: '#e6e4df',
          200: '#d4d2cd',
          300: '#b5b3ae',
          400: '#9c9a96',
          500: '#5c5a57',
          600: '#454340',
          700: '#3f3d3b',
          800: '#2a2927',
          900: '#2a2927',
          950: '#161514',
        },
        formField: {
          background: '{surface.0}',
          /* surface.500 on white is ~6.9:1, above the 3:1 boundary and 4.5:1 text bars */
          borderColor: '{surface.500}',
          hoverBorderColor: '{primary.600}',
          focusBorderColor: '{primary.600}',
          color: '{surface.900}',
          placeholderColor: '{surface.500}',
        },
      },
      dark: {
        primary: {
          color: '#2ab5d7',
          inverseColor: '#09090b',
          hoverColor: '#8adcf0',
          activeColor: '#1e96b3',
        },
        highlight: {
          background: '#27272a',
          focusBackground: '#3f3f46',
          color: '#fafafa',
          focusColor: '#ffffff',
        },
        surface: {
          0: '#18181b',
          50: '#121214',
          100: '#27272a',
          200: '#3f3f46',
          300: '#52525b',
          400: '#71717a',
          500: '#a1a1aa',
          600: '#d4d4d8',
          700: '#e4e4e7',
          800: '#f4f4f5',
          900: '#fafafa',
          950: '#ffffff',
        },
        formField: {
          background: '{surface.0}',
          borderColor: '#a1a1aa',
          hoverBorderColor: '#edb657',
          focusBorderColor: '#2ab5d7',
          color: '{surface.900}',
          placeholderColor: '#a1a1aa',
        },
        /*
         * Aura's dark scheme maps text.color to surface.0 and content.background
         * to surface.900. The inverted ramp would then paint panels light and
         * ink dark. Point both back at the zinc card and #fafafa ink.
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
              /* #161514 on #c4923a is ~6.5:1. #2a2927 on the hover gold is under 4.5. */
              background: '#c4923a',
              hoverBackground: '#b8860b',
              activeBackground: '#b8860b',
              borderColor: '#c4923a',
              hoverBorderColor: '#b8860b',
              activeBorderColor: '#b8860b',
              color: '#161514',
            },
            secondary: {
              background: '#ffffff',
              hoverBackground: '#f2f1ed',
              activeBackground: '#e6e4df',
              borderColor: '#d4d2cd',
              hoverBorderColor: '{primary.600}',
              activeBorderColor: '{primary.700}',
              color: '#2a2927',
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
              hoverBackground: 'color-mix(in srgb, #2a2927 8%, transparent)',
              activeBackground: 'color-mix(in srgb, #2a2927 14%, transparent)',
              borderColor: 'color-mix(in srgb, #2a2927 22%, transparent)',
              color: '#2a2927',
            },
          },
        },
        dark: {
          root: {
            primary: {
              background: '#edb657',
              hoverBackground: '#d9a24a',
              activeBackground: '#d9a24a',
              borderColor: '#edb657',
              hoverBorderColor: '#d9a24a',
              activeBorderColor: '#d9a24a',
              color: '#09090b',
            },
            secondary: {
              background: '#27272a',
              hoverBackground: '#3f3f46',
              activeBackground: '#3f3f46',
              borderColor: '#a1a1aa',
              hoverBorderColor: '#d4d4d8',
              activeBorderColor: '#fafafa',
              color: '#fafafa',
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
              hoverBackground: 'color-mix(in srgb, #2ab5d7 12%, transparent)',
              activeBackground: 'color-mix(in srgb, #2ab5d7 18%, transparent)',
              borderColor: 'color-mix(in srgb, #2ab5d7 45%, transparent)',
              color: '#fafafa',
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
        shadow: '0 18px 40px rgba(42, 41, 39, 0.14)',
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
            focusBackground: 'color-mix(in srgb, #2a2927 8%, #ffffff)',
            activeBackground: 'color-mix(in srgb, #2a2927 12%, #ffffff)',
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
            background: '#18181b',
            borderColor: '#3f3f46',
            color: '#fafafa',
            shadow: '0 18px 40px rgba(0, 0, 0, 0.35)',
          },
          item: {
            color: '#fafafa',
            focusColor: '#ffffff',
            activeColor: '#ffffff',
            focusBackground: 'color-mix(in srgb, #2ab5d7 16%, #18181b)',
            activeBackground: 'color-mix(in srgb, #2ab5d7 22%, #18181b)',
            icon: {
              color: '#2ab5d7',
              focusColor: '#ffffff',
              activeColor: '#ffffff',
            },
          },
          submenuLabel: {
            color: '#2ab5d7',
          },
        },
      },
      // Scheme colors live under colorScheme so the overlay is not a light panel in dark mode.
      // Root bar overrides --p-megamenu-item-* under .p-megamenu-root-list in app.scss
      // so white labels are never paired with a surface wash on the dark header.
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
            shadow: '0 18px 40px rgba(42, 41, 39, 0.15)',
          },
        },
        dark: {
          root: {
            background: '#18181b',
            borderColor: '#3f3f46',
            color: '#fafafa',
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
            borderColor: '#3f3f46',
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
            borderColor: '#3f3f46',
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
