import { AppPreset } from './theme-preset';

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

interface Palette {
  [shade: string]: string;
}

interface PresetShape {
  semantic: {
    primary: Palette;
    colorScheme: { light: { surface: Palette }; dark: { surface: Palette } };
  };
}

/** One palette for PrimeNG and Tailwind alike: indigo primary, slate surfaces (ADR-054). */
describe('AppPreset', () => {
  const semantic = (AppPreset as unknown as PresetShape).semantic;

  it('uses indigo for primary', () => {
    for (const shade of SHADES) {
      expect(semantic.primary[shade]).toBe(`{indigo.${shade}}`);
    }
  });

  it('uses slate for surfaces in both modes', () => {
    for (const scheme of [semantic.colorScheme.light, semantic.colorScheme.dark]) {
      for (const shade of SHADES) {
        expect(scheme.surface[shade]).toBe(`{slate.${shade}}`);
      }
    }
  });
});
