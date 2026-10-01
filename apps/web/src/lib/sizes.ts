// screens sharper than 2.5x get photos at about 2x: just as crisp at arm's length, far fewer bytes
export function sharpCapped(sizes: string): string {
  const parts = sizes.split(/,(?![^(]*\))/).map((p) => p.trim());
  const fallback = parts.pop()!;
  const inner = fallback.startsWith('calc(') ? fallback.slice(4) : fallback;
  return [...parts, `(min-resolution: 2.5dppx) calc(${inner} * 0.67)`, fallback].join(', ');
}
