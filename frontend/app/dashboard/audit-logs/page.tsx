'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE, apiFetch, authHeaders } from '@/lib/api';
import { requireAuth } from '@/lib/auth';

type AuditRow = {
  id: string;
  actorAccountId: number | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export default function AuditLogsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [entityType, setEntityType] = useState('');
  const [actorId, setActorId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    const user = requireAuth(router);
    if (!user) return;
    if (user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    void load();
  }, [router]);

  async function load() {
    setLoading(true);
    setErrorMsg('');
    try {
      const q = new URLSearchParams();
      if (entityType.trim()) q.set('entityType', entityType.trim());
      if (actorId.trim()) q.set('actorAccountId', actorId.trim());
      if (from) q.set('from', new Date(from).toISOString());
      if (to) q.set('to', new Date(to).toISOString());
      q.set('limit', '200');
      const res = await apiFetch(`${API_BASE}/audit-logs?${q}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không tải được nhật ký.');
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErrorMsg(e.message || 'Lỗi');
    } finally {
      setLoading(false);
    }
  }

  function onFilter(e: FormEvent) {
    e.preventDefault();
    void load();
  }

  const InputClass = "bg-surface outline-none border border-outline-variant/50 focus:border-primary px-3 py-2.5 rounded-xl transition-colors font-medium text-sm text-on-surface";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-2xl">manage_search</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface tracking-tight">Nhật ký thao tác</h1>
            <p className="text-sm text-on-surface-variant font-medium">Chỉ quản trị viên. Truy vết hành vi hệ thống.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={onFilter} className="bg-surface-container-lowest p-5 rounded-[20px] border border-outline-variant/10 shadow-sm flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">entity_type</label>
          <input className={`${InputClass} w-40`} value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="contract" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">actor_id</label>
          <input className={`${InputClass} w-28`} type="number" value={actorId} onChange={(e) => setActorId(e.target.value)} placeholder="1" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Từ</label>
          <input className={InputClass} type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Đến</label>
          <input className={InputClass} type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button type="submit" className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-[16px]">filter_alt</span>
          Áp dụng
        </button>
      </form>

      {errorMsg && (
        <div className="bg-error-container text-on-error-container px-6 py-4 rounded-xl flex items-center gap-3 border border-error/20">
          <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
          <span className="text-sm font-bold">{errorMsg}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-[24px] border border-surface-container-highest overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container-low text-on-surface-variant text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Thời gian</th>
                  <th className="px-6 py-4">Hành động</th>
                  <th className="px-6 py-4">Thực thể</th>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-low/50 transition-colors align-top">
                    <td className="px-6 py-4 text-on-surface-variant font-medium">{new Date(r.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="px-6 py-4 font-mono text-xs text-primary font-bold">{r.action}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-on-surface">{r.entityType}</div>
                      <div className="text-[10px] text-outline font-mono break-all">{r.entityId}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-on-surface-variant">{r.actorAccountId ?? '—'}</td>
                    <td className="px-6 py-4 max-w-md">
                      <pre className="text-[11px] bg-surface-container-low p-2 rounded-lg overflow-x-auto whitespace-pre-wrap break-words text-on-surface-variant">
                        {r.metadata ? JSON.stringify(r.metadata, null, 2) : '—'}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-on-surface-variant">
                <span className="material-symbols-outlined text-5xl opacity-20 mb-3">search_off</span>
                <p className="font-bold">Không có bản ghi.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
