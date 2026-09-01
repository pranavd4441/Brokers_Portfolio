export type ThemeMode = 'LIGHT' | 'DARK';

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

const THEME_SURFACES: Record<ThemeMode, string> = {
  LIGHT: '#FFFDF8',
  DARK: '#15201C',
};

const THEME_FALLBACKS: Record<ThemeMode, string> = {
  LIGHT: '#174D3C',
  DARK: '#63C59B',
};

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.slice(1);
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function luminance(hex: string): number {
  const channels = hexToRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(first: string, second: string): number {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  const light = Math.max(firstLuminance, secondLuminance);
  const dark = Math.min(firstLuminance, secondLuminance);
  return (light + 0.05) / (dark + 0.05);
}

export function normalizeBrandColor(value?: string | null): string {
  return value && HEX_PATTERN.test(value) ? value.toUpperCase() : '#174D3C';
}

export function resolveBrandPalette(value: string | null | undefined, theme: ThemeMode) {
  const brand = normalizeBrandColor(value);
  const strong = contrastRatio(brand, THEME_SURFACES[theme]) >= 4.5
    ? brand
    : THEME_FALLBACKS[theme];
  const whiteContrast = contrastRatio(strong, '#FFFFFF');
  const darkContrast = contrastRatio(strong, '#10211A');

  return {
    brand,
    strong,
    ink: whiteContrast >= darkContrast ? '#FFFFFF' : '#10211A',
  };
}
