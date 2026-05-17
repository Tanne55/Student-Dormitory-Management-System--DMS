'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';
import { Badge, Button, Card, EmptyState, PageHeader, Table } from '@/components/ui';

export default function DormApprovalsPage() {
  const router = useRouter();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = getUserFromToken();
    if (!token || !user || !['staff', 'admin'].includes(user.role)) {
      router.push('/login');
      return;
    }

    setErrorMsg('');
    apiFetch(`${API_BASE}/dorm-registrations/pending`, { headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || `Lỗi ${res.status}`);
        }
        return res.json();
      })
      .then((data) => setRegistrations(Array.isArray(data) ? data : []))
      .catch((err) => {
        setErrorMsg(err.message || 'Không tải được danh sách đơn chờ duyệt.');
        setRegistrations([]);
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Duyệt đơn đăng ký nội trú"
        description="Xem xét và phê duyệt các đơn xin vào ở KTX của sinh viên."
        icon={<span className="material-symbols-outlined">rule_folder</span>}
      />

      {errorMsg && (
        <div className="bg-error-container text-on-error-container px-6 py-4 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
            error
          </span>
          <span className="text-sm font-bold">{errorMsg}</span>
        </div>
      )}

      <Card padding="sm">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <Table
            rows={registrations}
            getRowKey={(r) => r.id}
            empty={
              <EmptyState
                icon="task_alt"
                title="Không có đơn chờ duyệt"
                description="Tất cả các đơn đăng ký đã được xử lý."
              />
            }
            columns={[
              {
                key: 'student',
                header: 'MSSV',
                render: (r) => (
                  <span className="font-black text-primary font-mono">{r.studentCode}</span>
                ),
              },
              {
                key: 'name',
                header: 'Họ tên',
                render: (r) => {
                  let appData: any = r.applicationData;
                  if (typeof appData === 'string') {
                    try {
                      appData = JSON.parse(appData);
                    } catch {}
                  }
                  return (
                    <span className="font-bold text-on-surface">
                      {appData?.basic?.fullName || 'N/A'}
                    </span>
                  );
                },
              },
              {
                key: 'semester',
                header: 'Học kỳ',
                render: (r) => <span className="text-on-surface-variant">{r.semester}</span>,
              },
              {
                key: 'roomType',
                header: 'Loại phòng',
                render: (r) => (
                  <span className="text-on-surface-variant">Phòng {r.roomType} người</span>
                ),
              },
              {
                key: 'status',
                header: 'Trạng thái',
                render: () => <Badge tone="pending">Chờ duyệt</Badge>,
              },
              {
                key: 'actions',
                header: 'Thao tác',
                align: 'right',
                render: (r) => (
                  <Link href={`/staff/dorm-approvals/${r.id}`}>
                    <Button size="sm" variant="gradient">
                      Xem & Duyệt
                    </Button>
                  </Link>
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
