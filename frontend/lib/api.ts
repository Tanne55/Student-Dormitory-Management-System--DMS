export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Headers for authenticated API calls (browser only). */
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  if (typeof window === 'undefined') {
    return { ...(extra || {}) };
  }
  const token = localStorage.getItem('token');
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Browser fetch to the API: avoids stale disk/RSC cache and CDN caching issues
 * (e.g. "Content unavailable. Resource was not cached" after auth/navigation).
 */
export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, {
    cache: 'no-store',
    ...init,
  });
}
