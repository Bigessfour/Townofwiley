import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const WILEY_THEME_PRESET = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef4fb',
      100: '#d8e4f1',
      200: '#b7cee3',
      300: '#8fb1d1',
      400: '#688fbd',
      500: '#4b74a4',
      600: '#365d88',
      700: '#133b63',
      800: '#102f4f',
      900: '#0d2440',
      950: '#08182a',
    },
    focusRing: {
      width: '3px',
      style: 'solid',
      color: '{amber.400}',
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
          background: '{primary.50}',
          focusBackground: '{primary.100}',
          color: '{primary.900}',
          focusColor: '{primary.950}',
        },
        surface: {
          0: '#ffffff',
          50: '#fbfaf7',
          100: '#f5efe6',
          200: '#e8ddcf',
          300: '#d8c7b0',
          400: '#c6ab87',
          500: '#a98b66',
          600: '#866b49',
          700: '#655037',
          800: '#463626',
          900: '#2c2219',
          950: '#18120d',
        },
        formField: {
          hoverBorderColor: '{primary.color}',
        },
      },
    },
  },
  components: {
    card: {
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
    panel: {
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

  },
});