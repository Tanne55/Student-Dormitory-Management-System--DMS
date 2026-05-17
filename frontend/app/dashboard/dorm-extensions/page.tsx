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

export default function DormExtensionsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [eligibility, setEligibility] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [isAgreed, setIsAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!requireAuth(router)) return;
    void fetchInitialData();
  }, [router]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const extRes = await apiFetch(`${API_BASE}/dorm-extensions/eligibility`, {
        headers: authHeaders(),
      });
      if (extRes.ok) setEligibility(await extRes.json());
      await fetchHistory();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    const res = await apiFetch(`${API_BASE}/dorm-extensions/my-requests`, { headers: authHeaders() });
    if (res.ok) setRequests(await res.json());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAgreed) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`${API_BASE}/dorm-extensions`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể tạo đơn gia hạn.');
      setSuccessMsg('Gửi yêu cầu gia hạn thành công!');
      setIsAgreed(false);
      await fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Gia hạn nội trú"
        description="Duy trì chỗ ở trong KTX cho học kỳ tiếp theo."
        icon={<span className="material-symbols-outlined">autorenew</span>}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Eligibility / Form panel */}
        <div className="lg:col-span-1">
          {isLoading ? (
            <Card padding="lg" className="flex justify-center">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </Card>
          ) : eligibility?.isEligible ? (
            <Card padding="md" className="overflow-hidden">
              <div className="bg-green-50 -mx-6 -mt-6 px-6 py-4 mb-6 flex items-center justify-between">
                <h2 className="font-bold text-green-800 text-xs uppercase tracking-widest">
                  Đủ điều kiện gia hạn
                </h2>
                <span
                  className="material-symbols-outlined text-green-600"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Phòng hiện tại
                  </label>
                  <div className="w-full bg-surface-container-low rounded-2xl px-4 py-3 font-black text-primary text-lg">
                    {eligibility.data.roomNumber}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Học kỳ áp dụng
                  </label>
                  <div className="w-full bg-primary-fixed/40 rounded-2xl px-4 py-3 font-bold text-on-primary-fixed text-sm">
                    {eligibility.data.semester}
                  </div>
                </div>

                <label className="flex items-start gap-3 pt-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isAgreed}
                    onChange={(e) => setIsAgreed(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded-md text-primary focus:ring-primary/20 border-outline-variant cursor-pointer"
                    required
                  />
                  <span className="text-sm text-on-surface-variant select-none leading-relaxed group-hover:text-on-surface transition-colors">
                    Tôi cam kết tiếp tục thực hiện đầy đủ nội quy của Ký túc xá.
                  </span>
                </label>

                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  fullWidth
                  disabled={!isAgreed}
                  loading={isSubmitting}
                  icon={!isSubmitting ? <span className="material-symbols-outlined text-[18px]">send</span> : undefined}
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi Yêu cầu Gia hạn'}
                </Button>
              </form>
            </Card>
          ) : (
            <Card padding="md" className="overflow-hidden">
              <div className="bg-error-container/40 -mx-6 -mt-6 px-6 py-4 mb-6 flex items-center justify-between">
                <h2 className="font-bold text-on-error-container text-xs uppercase tracking-widest">
                  Không đủ điều kiện
                </h2>
                <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
                  block
                </span>
              </div>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                {eligibility?.error || 'Lỗi không xác định.'}
              </p>
            </Card>
          )}
        </div>

        {/* History */}
        <div className="lg:col-span-2">
          <Card padding="sm" className="h-full">
            <div className="flex items-center gap-3 px-2 py-3 mb-2">
              <span className="material-symbols-outlined text-on-surface-variant">history</span>
              <h2 className="text-base font-bold text-on-surface">Lịch sử giao dịch</h2>
            </div>
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <Table
                rows={requests}
                getRowKey={(r) => r.id}
                empty={<EmptyState icon="folder_off" title="Chưa có đơn gia hạn nào" />}
                columns={[
                  {
                    key: 'date',
                    header: 'Ngày nộp',
                    render: (r) => (
                      <span className="text-on-surface-variant font-medium">
                        {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    ),
                  },
                  {
                    key: 'room',
                    header: 'Phòng',
                    render: (r) => <span className="font-black text-primary">{r.roomNumber}</span>,
                  },
                  {
                    key: 'semester',
                    header: 'Học kỳ',
                    render: (r) => <span className="font-bold text-on-surface">{r.semester}</span>,
                  },
                  {
                    key: 'status',
                    header: 'Trạng thái',
                    align: 'right',
                    render: (r) => {
                      const meta = STATUS_META[r.status];
                      return meta ? <Badge tone={meta.tone}>{meta.label}</Badge> : <Badge>{r.status}</Badge>;
                    },
                  },
                ]}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
