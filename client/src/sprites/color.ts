// Utilidades de color para generar sombras y luces a partir de un color base.

/**
 * Multiplica cada canal RGB de un color "#rrggbb" por `factor`.
 * factor < 1 oscurece (sombra), factor > 1 aclara (brillo).
 */
export function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const value = Math.round(((n >> shift) & 0xff) * factor);
    return Math.max(0, Math.min(255, value));
  };
  const r = channel(16);
  const g = channel(8);
  const b = channel(0);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
