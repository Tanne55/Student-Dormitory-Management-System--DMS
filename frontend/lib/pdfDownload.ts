import { API_BASE, apiFetch, authHeaders } from '@/lib/api';

/** GET authenticated PDF and trigger browser download. */
export async function downloadAuthenticatedPdf(path: string, filename: string): Promise<void> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await apiFetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Không tải được PDF.');
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
