/**
 * Returns the URL only if it is a normal web address (http or https), otherwise undefined.
 * Links and images can come from data another person wrote, and a value such as "javascript:..." must never be
 * placed in a clickable link.
 */
export const safeHttpUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};
