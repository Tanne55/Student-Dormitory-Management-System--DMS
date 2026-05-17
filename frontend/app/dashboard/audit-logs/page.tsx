'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE, apiFetch, authHeaders } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { Button, Card, EmptyState, Field, Input, PageHeader, Table } from '@/components/ui';

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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Nhật ký thao tác"
        description="Truy vết hành vi hệ thống — chỉ quản trị viên."
        icon={<span className="material-symbols-outlined">manage_search</span>}
      />

      <Card padding="md">
        <form onSubmit={onFilter} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[160px]">
            <Field label="entity_type">
              <Input value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="contract" />
            </Field>
          </div>
          <div className="w-32">
            <Field label="actor_id">
              <Input type="number" value={actorId} onChange={(e) => setActorId(e.target.value)} placeholder="1" />
            </Field>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Field label="Từ">
              <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Field label="Đến">
              <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
          <Button
            type="submit"
            variant="gradient"
            icon={<span className="material-symbols-outlined text-[16px]">filter_alt</span>}
          >
            Áp dụng
          </Button>
        </form>
      </Card>

      {errorMsg && (
        <div className="bg-error-container text-on-error-container px-6 py-4 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
            error
          </span>
          <span className="text-sm font-bold">{errorMsg}</span>
        </div>
      )}

      <Card padding="sm">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <Table
            rows={rows}
            getRowKey={(r) => r.id}
            empty={<EmptyState icon="search_off" title="Không có bản ghi" />}
            columns={[
              {
                key: 'time',
                header: 'Thời gian',
                render: (r) => (
                  <span className="text-on-surface-variant font-medium">
                    {new Date(r.createdAt).toLocaleString('vi-VN')}
                  </span>
                ),
              },
              {
                key: 'action',
                header: 'Hành động',
                render: (r) => <span className="font-mono text-xs text-primary font-bold">{r.action}</span>,
              },
              {
                key: 'entity',
                header: 'Thực thể',
                render: (r) => (
                  <div>
                    <div className="font-bold text-on-surface">{r.entityType}</div>
                    <div className="text-[10px] text-on-surface-variant/70 font-mono break-all">{r.entityId}</div>
                  </div>
                ),
              },
              {
                key: 'actor',
                header: 'Actor',
                render: (r) => (
                  <span className="font-bold text-on-surface-variant">{r.actorAccountId ?? '—'}</span>
                ),
              },
              {
                key: 'meta',
                header: 'Chi tiết',
                render: (r) => (
                  <pre className="text-[11px] bg-surface-container-low p-2 rounded-lg overflow-x-auto whitespace-pre-wrap break-words text-on-surface-variant max-w-md">
                    {r.metadata ? JSON.stringify(r.metadata, null, 2) : '—'}
                  </pre>
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
