/**
 * Pure number formatting, with no React or Expo imports, so the Shorts
 * (shorts/) print sizes exactly as the app does.
 */

/**
 * Sizes are decimal, matching how iOS and Android show file sizes and how the
 * size targets are defined (presets.ts). Units stay Latin in every locale.
 */
export function formatBytes(locale: string, bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = bytes <= 0 ? 0 : Math.min(Math.floor(Math.log10(bytes) / 3), 3);
  const value = bytes / 1000 ** i;
  const n = new Intl.NumberFormat(locale, {
    maximumFractionDigits: i === 0 ? 0 : value < 10 ? 1 : 0,
  }).format(value);
  // A no-break space keeps "111 KB" from splitting across lines in a big headline.
  return `${n}\u00A0${units[i]}`;
}

export function formatPercent(locale: string, fraction: number): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(fraction);
}
