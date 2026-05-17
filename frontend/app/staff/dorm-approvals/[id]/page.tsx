'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';
import { Button, Card, PageHeader } from '@/components/ui';

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{label}</p>
      <p className="font-bold text-on-surface text-sm">{value || '—'}</p>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card padding="md" className="overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <h2 className="text-base font-bold text-on-surface">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

export default function DormApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [registration, setRegistration] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = getUserFromToken();
    if (!token || !user || !['staff', 'admin'].includes(user.role)) {
      router.push('/login');
      return;
    }

    apiFetch(`${API_BASE}/dorm-registrations/${id}`, { headers: authHeaders() })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || `Lỗi ${res.status}`);
        return data;
      })
      .then((data) => setRegistration(data))
      .catch((err: any) => {
        setLoadError(err.message || 'Không tải được chi tiết đơn.');
        setRegistration(null);
      })
      .finally(() => setIsLoading(false));
  }, [id, router]);

  const handleApprove = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const res = await apiFetch(`${API_BASE}/dorm-registrations/${id}/approve`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi khi phê duyệt.');
      setSuccess(data.message);
      setTimeout(() => router.push('/staff/dorm-approvals'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError || !registration) {
    return (
      <div className="max-w-4xl mx-auto py-10 text-center space-y-4">
        <div className="bg-error-container text-on-error-container px-6 py-4 rounded-2xl inline-flex items-center gap-3">
          <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
            error
          </span>
          <span className="text-sm font-bold">{loadError || 'Không tìm thấy đơn đăng ký.'}</span>
        </div>
        <div>
          <Button variant="ghost" onClick={() => router.push('/staff/dorm-approvals')}>
            ← Quay lại danh sách
          </Button>
        </div>
      </div>
    );
  }

  let appData: any = registration.applicationData;
  if (typeof appData === 'string') {
    try {
      appData = JSON.parse(appData);
    } catch {}
  }
  const { basic, profile } = appData || {};

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Phê duyệt đơn KTX"
        description="Xem xét hồ sơ sinh viên và quyết định phê duyệt."
        icon={<span className="material-symbols-outlined">rule_folder</span>}
        action={
          <Button
            variant="ghost"
            onClick={() => router.back()}
            icon={<span className="material-symbols-outlined text-[18px]">arrow_back</span>}
          >
            Quay lại
          </Button>
        }
      />

      {error && (
        <div className="bg-error-container text-on-error-container px-6 py-4 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
            error
          </span>
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-800 px-6 py-4 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
          <span className="text-sm font-bold">{success}</span>
        </div>
      )}

      <SectionCard icon="person" title="Thông tin Sinh viên">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <InfoRow label="Mã sinh viên" value={registration.studentCode} />
          <InfoRow label="Họ và tên" value={basic?.fullName} />
          <InfoRow label="Giới tính" value={basic?.gender} />
          <InfoRow label="Số điện thoại" value={basic?.phone} />
          <InfoRow label="Khoa / Lớp" value={`${basic?.faculty || ''} - ${basic?.className || ''}`} />
          <InfoRow label="Quê quán" value={profile?.province} />
        </div>
      </SectionCard>

      <SectionCard icon="star" title="Thông tin Ưu tiên">
        <div className="space-y-3">
          <p className="text-sm text-on-surface-variant">
            Diện ưu tiên:{' '}
            <span className="font-black text-on-tertiary-container">
              {registration.priorityType || 'Không có'}
            </span>
          </p>
          {registration.priorityProofUrl ? (
            <a
              href={`${API_BASE}${registration.priorityProofUrl}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">attach_file</span>
              Xem giấy tờ minh chứng đính kèm
            </a>
          ) : (
            <p className="text-on-surface-variant/60 text-sm italic">Không có giấy tờ đính kèm</p>
          )}
        </div>
      </SectionCard>

      <SectionCard icon="gavel" title="Tiến hành phê duyệt">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-5 rounded-2xl">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                Loại phòng yêu cầu
              </p>
              <p className="text-lg font-black text-primary">Phòng {registration.roomType} người</p>
            </div>
            <div className="bg-surface-container-low p-5 rounded-2xl">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                Học kỳ
              </p>
              <p className="text-lg font-black text-primary">{registration.semester}</p>
            </div>
          </div>

          <div className="bg-primary-fixed/40 text-on-primary-fixed px-5 py-4 rounded-2xl text-sm font-medium">
            <span className="material-symbols-outlined text-[16px] align-text-bottom mr-1.5">info</span>
            Sau khi phê duyệt, sinh viên sẽ nhận được thông báo hồ sơ hợp lệ. Việc xếp phòng cụ thể sẽ được chuyển sang Thủ tục Check-in.
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="gradient"
              size="lg"
              loading={isSubmitting}
              disabled={isSubmitting || registration.status !== 'PENDING'}
              onClick={handleApprove}
              icon={!isSubmitting ? <span className="material-symbols-outlined text-[18px]">verified</span> : undefined}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Duyệt hồ sơ (chưa gắn phòng)'}
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
