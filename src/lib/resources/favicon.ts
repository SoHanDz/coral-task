/** Adds https:// if the user typed a bare domain or left off the protocol. */
export function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Throws if the URL (after normalizing) still can't be parsed. */
export function extractDomain(rawUrl: string): string {
  const url = new URL(normalizeUrl(rawUrl));
  return url.hostname;
}

/** Domain for display, with a leading "www." stripped. */
export function cleanDomainLabel(rawUrl: string): string {
  return extractDomain(rawUrl).replace(/^www\./i, "");
}

export function buildFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}
