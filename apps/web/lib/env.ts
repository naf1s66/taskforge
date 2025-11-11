export function getApiBaseUrl() {
  const fromPublic = process.env.NEXT_PUBLIC_API_BASE_URL;
  const fromServer = process.env.API_BASE_URL;
  const base = (typeof window === 'undefined' ? fromServer ?? fromPublic : fromPublic) ?? '';

  if (!base) {
    throw new Error('API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL or API_BASE_URL.');
  }

  return base.replace(/\/$/, '');
}

export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${getApiBaseUrl()}/${normalizedPath}`;
}

export const SESSION_COOKIE_NAME = 'tf_session';
