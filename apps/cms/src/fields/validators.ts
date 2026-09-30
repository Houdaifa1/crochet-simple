export const httpsUrl =
  (host?: RegExp, hint = 'a full link starting with https://') =>
  (value: unknown): true | string => {
    if (value === undefined || value === null || value === '') return true;
    try {
      const u = new URL(String(value));
      if (u.protocol !== 'https:') return `Use ${hint}.`;
      if (host && !host.test(u.hostname)) return `Use ${hint}.`;
      return true;
    } catch {
      return `Use ${hint}.`;
    }
  };

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
export const onlyImages = { mimeType: { in: IMAGE_TYPES } };
export const onlyIcons = { mimeType: { in: ['image/svg+xml', 'image/png'] } };
export const onlyPdf = { mimeType: { equals: 'application/pdf' } };
