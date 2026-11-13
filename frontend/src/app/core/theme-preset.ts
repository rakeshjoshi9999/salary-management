import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

function palette(name: string): Record<number, string> {
  return Object.fromEntries(SHADES.map((shade) => [shade, `{${name}.${shade}}`]));
}

const slate = { 0: '#ffffff', ...palette('slate') };

/**
 * Aura with indigo for primary and slate for surfaces in both modes (ADR-054). PrimeNG components and
 * the tailwindcss-primeui classes read these tokens; the app's own colour tokens are in styles.css.
 * Light mode uses shade 600 for primary and red 600 for danger, because Aura's 500s miss 4.5:1
 * against white text; dark mode's outlined and text danger use red 300 on the slate-900 drawer.
 */
export const AppPreset = definePreset(Aura, {
  semantic: {
    primary: palette('indigo'),
    colorScheme: {
      light: {
        surface: slate,
        primary: {
          color: '{primary.600}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.700}',
          activeColor: '{primary.800}',
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.100}',
          color: '{primary.700}',
          focusColor: '{primary.800}',
        },
      },
      dark: {
        surface: slate,
        primary: {
          color: '{primary.400}',
          contrastColor: '{surface.950}',
          hoverColor: '{primary.300}',
          activeColor: '{primary.200}',
        },
      },
    },
  },
  components: {
    button: {
      colorScheme: {
        light: {
          root: {
            danger: {
              background: '{red.600}',
              hoverBackground: '{red.700}',
              activeBackground: '{red.800}',
              borderColor: '{red.600}',
              hoverBorderColor: '{red.700}',
              activeBorderColor: '{red.800}',
            },
          },
          outlined: {
            danger: { borderColor: '{red.300}', color: '{red.700}' },
            primary: { borderColor: '{primary.300}', color: '{primary.700}' },
          },
          text: {
            danger: { color: '{red.700}' },
            primary: { color: '{primary.700}' },
          },
        },
        dark: {
          outlined: {
            danger: { borderColor: '{red.800}', color: '{red.300}' },
          },
          text: {
            danger: { color: '{red.300}' },
          },
        },
      },
    },
  },
});
