import { API_BASE, apiFetch, authHeaders } from '@/lib/api';

export type FloorOption = { id: string; label: string };

/** Flat list of floors with human-readable labels for selects and scope UI. */
export async function loadAllFloorOptions(): Promise<FloorOption[]> {
  const res = await apiFetch(`${API_BASE}/buildings`, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Không tải được danh sách tòa.');
  }
  const raw = await res.json();
  const buildings: { id: string; code: string; name?: string }[] = Array.isArray(raw) ? raw : [];
  const list: FloorOption[] = [];
  for (const b of buildings) {
    const fr = await apiFetch(`${API_BASE}/buildings/${b.id}/floors`, { headers: authHeaders() });
    if (!fr.ok) continue;
    const floors: { id: string; floorNumber: number; label?: string | null }[] = await fr.json();
    for (const f of floors) {
      list.push({
        id: f.id,
        label: `${b.code} — Tầng ${f.floorNumber}${f.label ? ` (${f.label})` : ''}`,
      });
    }
  }
  return list;
}
