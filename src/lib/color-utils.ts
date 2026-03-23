export function hexToRgb(
  hex: string
): { r: number; g: number; b: number } | null {
  const cleanHex = hex.startsWith('#') ? hex : `#${hex}`;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
  if (!result) return null;
  return {
    r: parseInt(result[1] ?? '0', 16),
    g: parseInt(result[2] ?? '0', 16),
    b: parseInt(result[3] ?? '0', 16),
  };
}

export function pastelize(hex: string, opacity = 0.2): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(59, 130, 246, ${opacity})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

export function getReadableTextColor(bgHex: string): string {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return '#1e40af';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#1e3a8a' : '#ffffff';
}

export function getEventStyles(
  color: string | null | undefined,
  fallback = '#3B82F6'
) {
  const baseColor = color ?? fallback;
  return {
    backgroundColor: pastelize(baseColor, 0.2),
    color: getReadableTextColor(pastelize(baseColor, 0.2)),
    borderColor: pastelize(baseColor, 0.4),
  };
}
