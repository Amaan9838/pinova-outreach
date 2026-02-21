function normalizeBaseUrl(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') return null;

  const trimmed = rawValue.trim().replace(/\/+$/, '');
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(trimmed);
  const protocol = isLocal ? 'http' : 'https';
  return `${protocol}://${trimmed}`;
}

export function getTrackingBaseUrl() {
  return (
    normalizeBaseUrl(process.env.TRACKING_DOMAIN) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeBaseUrl(process.env.VERCEL_URL) ||
    'http://localhost:3000'
  );
}

export function buildTrackingUrl(pathWithQuery = '/') {
  const base = getTrackingBaseUrl();
  const normalizedPath = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
  return `${base}${normalizedPath}`;
}
