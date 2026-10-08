// Utility functions for Mind Palace

export const norm = (s: string): string =>
  String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

export const normLoose = (s: string): string =>
  norm(s).replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

export const resolveTarget = (
  target: string,
  aliases: Record<string, string>
): string | null => {
  const strict = norm(target);
  if (strict && aliases[strict]) return aliases[strict];
  const loose = normLoose(target);
  if (loose && aliases[loose]) return aliases[loose];
  return null;
};

export const resolveImage = (
  target: string,
  images: Record<string, string>
): string | null => {
  if (!target) return null;
  const key1 = normLoose(target);
  const key2 = normLoose(target.split('/').pop() || '');
  const path = images[key1] || images[key2];
  return path ? `/notes/${path}` : null;
};

export const nodeRadius = (degree: number, orphan: boolean): number => {
  if (orphan) return 5;
  return 6 + Math.sqrt(degree || 0) * 2.6;
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const escapeHtml = (s: string): string =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const escapeAttr = (s: string): string =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');