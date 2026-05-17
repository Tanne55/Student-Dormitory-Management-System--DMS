'use client';

import { useEffect, useState } from 'react';
import { getAccessLogs } from '@/lib/api';
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Table } from '@/components/ui';

interface AccessLog {
  id: number;
  studentCode: string;
  fullName: string | null;
  direction: 'IN' | 'OUT';
  confidence: number | null;
  buildingCode: string | null;
  loggedAt: string;
}

interface LogsResponse {
  data: AccessLog[];
  total: number;
  page: number;
  limit: number;
}

export default function AccessLogsPage() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [filterStudent, setFilterStudent] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const limit = 50;

  async function fetchLogs(p = 1) {
    setLoading(true);
    try {
      const res: LogsResponse = await getAccessLogs({
        studentCode: filterStudent.trim() || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
        page: p,
        limit,
      });
      setLogs(res.data);
      setTotal(res.total);
      setPage(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchLogs(1);
  }, []);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Nhật ký ra vào ký túc xá"
        description="Theo dõi lượt ra/vào qua hệ thống nhận diện khuôn mặt."
        icon={<span className="material-symbols-outlined">door_sensor</span>}
        action={
          <a href="/kiosk" target="_blank" rel="noreferrer">
            <Button
              variant="secondary"
              iconRight={<span className="material-symbols-outlined text-[18px]">open_in_new</span>}
            >
              Mở cổng kiosk
            </Button>
          </a>
        }
      />

      <Card padding="md">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <Field label="Mã sinh viên">
              <Input
                value={filterStudent}
                onChange={(e) => setFilterStudent(e.target.value)}
                placeholder="VD: SV001"
                onKeyDown={(e) => e.key === 'Enter' && fetchLogs(1)}
              />
            </Field>
          </div>
          <div className="flex-1 min-w-[160px]">
            <Field label="Từ ngày">
              <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            </Field>
          </div>
          <div className="flex-1 min-w-[160px]">
            <Field label="Đến ngày">
              <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            </Field>
          </div>
          <Button variant="gradient" onClick={() => fetchLogs(1)}>
            Tìm kiếm
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setFilterStudent('');
              setFilterDateFrom('');
              setFilterDateTo('');
              setTimeout(() => fetchLogs(1), 0);
            }}
          >
            Xóa bộ lọc
          </Button>
        </div>
      </Card>

      <Card padding="sm">
        <div className="flex items-center justify-between mb-2 px-2 py-3">
          <span className="text-sm text-on-surface-variant">
            {loading ? 'Đang tải...' : `Tổng: ${total} lượt`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => fetchLogs(page - 1)} disabled={page <= 1}>
                ‹ Trước
              </Button>
              <span className="text-sm text-on-surface-variant font-medium">
                Trang {page}/{totalPages}
              </span>
              <Button size="sm" variant="ghost" onClick={() => fetchLogs(page + 1)} disabled={page >= totalPages}>
                Sau ›
              </Button>
            </div>
          )}
        </div>

        <Table
          rows={logs}
          getRowKey={(r) => r.id}
          empty={<EmptyState icon="search_off" title="Không có dữ liệu" />}
          columns={[
            {
              key: 'time',
              header: 'Thời gian',
              render: (r) => (
                <span className="text-on-surface-variant font-medium whitespace-nowrap">
                  {new Date(r.loggedAt).toLocaleString('vi-VN')}
                </span>
              ),
            },
            {
              key: 'student',
              header: 'Mã SV',
              render: (r) => <span className="font-mono font-bold text-primary">{r.studentCode}</span>,
            },
            {
              key: 'name',
              header: 'Họ tên',
              render: (r) => <span className="font-bold text-on-surface">{r.fullName ?? '—'}</span>,
            },
            {
              key: 'dir',
              header: 'Hướng',
              render: (r) => (
                <Badge tone={r.direction === 'IN' ? 'approved' : 'pending'}>
                  {r.direction === 'IN' ? 'VÀO' : 'RA'}
                </Badge>
              ),
            },
            {
              key: 'confidence',
              header: 'Độ tin cậy',
              render: (r) => (
                <span className="text-on-surface-variant">
                  {r.confidence != null ? `${(r.confidence * 100).toFixed(1)}%` : '—'}
                </span>
              ),
            },
            {
              key: 'building',
              header: 'Tòa nhà',
              render: (r) => <span className="text-on-surface-variant">{r.buildingCode ?? '—'}</span>,
            },
          ]}
        />
      </Card>
    </div>
  );
}
