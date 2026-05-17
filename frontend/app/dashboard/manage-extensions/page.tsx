'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';
import { Badge, Button, Card, EmptyState, PageHeader, Table } from '@/components/ui';

const STATUS_META: Record<string, { tone: 'pending' | 'approved' | 'rejected'; label: string }> = {
  PENDING: { tone: 'pending', label: 'Chờ duyệt' },
  APPROVED: { tone: 'approved', label: 'Đã duyệt' },
  REJECTED: { tone: 'rejected', label: 'Từ chối' },
};

export default function ManageExtensionsPage() {
  const router = useRouter();
  const [extensions, setExtensions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const user = requireAuth(router);
    if (!user) return;
    if (!['staff', 'admin'].includes(user.role)) {
      router.replace('/dashboard');
      return;
    }
    void fetchExtensions();
  }, [router, filterStatus]);

  const fetchExtensions = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      const res = await apiFetch(`${API_BASE}/dorm-extensions/all?${params}`, {
        headers: authHeaders(),
      });
      if (res.ok) setExtensions(await res.json());
      else setErrorMsg('Không thể tải danh sách gia hạn.');
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch(`${API_BASE}/dorm-extensions/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setSuccessMsg(`Đã ${status === 'APPROVED' ? 'duyệt' : 'từ chối'} đơn gia hạn.`);
        setTimeout(() => setSuccessMsg(''), 3000);
        await fetchExtensions();
      } else {
        const data = await res.json();
        setErrorMsg(data.message || 'Lỗi xử lý hệ thống.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Duyệt Gia hạn Lưu trú"
        description="Xem xét các yêu cầu ở lại KTX cho học kỳ mới."
        icon={<span className="material-symbols-outlined">history</span>}
        action={
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-11 rounded-full bg-surface-container-lowest border-2 border-outline-variant/20 focus:border-primary/40 px-5 text-sm font-bold text-on-surface outline-none transition-all min-w-[200px]"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Bị từ chối</option>
          </select>
        }
      />

      {errorMsg && (
        <div className="bg-error-container text-on-error-container px-6 py-4 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
            error
          </span>
          <span className="text-sm font-bold">{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 text-green-800 px-6 py-4 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
          <span className="text-sm font-bold">{successMsg}</span>
        </div>
      )}

      <Card padding="sm">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <Table
            rows={extensions}
            getRowKey={(r) => r.id}
            empty={<EmptyState icon="folder_off" title="Không có đơn gia hạn nào" />}
            columns={[
              {
                key: 'date',
                header: 'Ngày nộp',
                render: (r) => (
                  <span className="text-on-surface-variant font-medium">
                    {new Date(r.createdAt).toLocaleString('vi-VN')}
                  </span>
                ),
              },
              {
                key: 'student',
                header: 'MSSV',
                render: (r) => <span className="font-black text-primary font-mono">{r.studentCode}</span>,
              },
              {
                key: 'room',
                header: 'Phòng',
                render: (r) => <span className="font-bold text-on-surface">{r.roomNumber}</span>,
              },
              {
                key: 'semester',
                header: 'Học kỳ',
                align: 'center',
                render: (r) => <span className="font-bold text-primary">{r.semester}</span>,
              },
              {
                key: 'status',
                header: 'Trạng thái',
                align: 'center',
                render: (r) => {
                  const meta = STATUS_META[r.status];
                  return meta ? <Badge tone={meta.tone}>{meta.label}</Badge> : <Badge>{r.status}</Badge>;
                },
              },
              {
                key: 'actions',
                header: 'Thao tác',
                align: 'center',
                render: (r) =>
                  r.status === 'PENDING' ? (
                    <div className="flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={isSubmitting}
                        onClick={() => handleUpdateStatus(r.id, 'APPROVED')}
                        className="!bg-green-600 hover:!bg-green-700 !shadow-green-600/20"
                      >
                        Duyệt
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isSubmitting}
                        onClick={() => handleUpdateStatus(r.id, 'REJECTED')}
                        className="!text-error"
                      >
                        Từ chối
                      </Button>
                    </div>
                  ) : (
                    <span className="text-on-surface-variant/70 text-xs italic">Đã xử lý</span>
                  ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
