export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ==================== FACE RECOGNITION ====================

export async function enrollFace(studentCode: string, descriptor: number[]) {
  const res = await apiFetch(`${API_BASE}/face/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ studentCode, descriptor }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteEnrollment(studentCode: string) {
  const res = await apiFetch(`${API_BASE}/face/enroll/${studentCode}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getEnrolledStudents() {
  const res = await apiFetch(`${API_BASE}/face/enrolled`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function recognizeFace(descriptor: number[], buildingCode?: string) {
  const res = await apiFetch(`${API_BASE}/face/recognize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ descriptor, buildingCode }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createAccessLog(data: {
  studentCode: string;
  direction: 'IN' | 'OUT';
  confidence?: number;
  buildingCode?: string;
}) {
  const res = await apiFetch(`${API_BASE}/access-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getAccessLogs(params?: {
  studentCode?: string;
  buildingCode?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.studentCode) qs.set('studentCode', params.studentCode);
  if (params?.buildingCode) qs.set('buildingCode', params.buildingCode);
  if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params?.dateTo) qs.set('dateTo', params.dateTo);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const res = await apiFetch(`${API_BASE}/access-logs?${qs}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

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
