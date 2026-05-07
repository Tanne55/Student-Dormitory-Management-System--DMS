'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';

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

    setLoadError('');
    setError('');
    apiFetch(`${API_BASE}/dorm-registrations/${id}`, { headers: authHeaders() })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || `Lỗi ${res.status}`);
        }
        return data;
      })
      .then((data) => {
        setRegistration(data);
      })
      .catch((err) => {
        console.error(err);
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

      if (!res.ok) {
        throw new Error(data.message || 'Lỗi khi phê duyệt yêu cầu.');
      }

      setSuccess(data.message);

      setTimeout(() => {
        router.push('/staff/dorm-approvals');
      }, 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  if (loadError || !registration) {
    return (
      <div className="max-w-4xl mx-auto py-10 text-center space-y-4">
        <div className="bg-error-container text-on-error-container px-6 py-4 rounded-xl inline-flex items-center gap-3">
          <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
          <span className="text-sm font-bold">{loadError || 'Không tìm thấy đơn đăng ký!'}</span>
        </div>
        <div>
          <button type="button" onClick={() => router.push('/staff/dorm-approvals')} className="text-primary font-bold text-sm hover:underline">
            ← Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  let appData: any = registration.applicationData;
  if (typeof appData === 'string') {
    try {
      appData = JSON.parse(appData);
    } catch {
      /* ignore */
    }
  }
  const { basic, profile } = appData || {};

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{label}</p>
      <p className="font-bold text-on-surface text-sm">{value || '—'}</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-2xl">rule_folder</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface tracking-tight">Phê duyệt Đơn KTX</h1>
            <p className="text-sm text-on-surface-variant font-medium">Xem xét hồ sơ sinh viên và quyết định phê duyệt.</p>
          </div>
        </div>
        <button type="button" onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2.5 text-on-surface-variant hover:bg-surface-container-high rounded-xl transition font-bold text-sm">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Quay lại
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-error-container text-on-error-container px-6 py-4 rounded-xl flex items-center gap-3 border border-error/20">
          <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-800 px-6 py-4 rounded-xl flex items-center gap-3 border border-green-200">
          <span className="material-symbols-outlined text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <span className="text-sm font-bold">{success}</span>
        </div>
      )}

      {/* Student Info */}
      <div className="bg-surface-container-lowest rounded-[24px] border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="bg-surface-container-low px-6 py-4 border-b border-surface-container-high flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">person</span>
          <h2 className="text-base font-bold text-on-surface">Thông tin Sinh viên</h2>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-6">
          <InfoRow label="Mã sinh viên" value={registration.studentCode} />
          <InfoRow label="Họ và tên" value={basic?.fullName} />
          <InfoRow label="Giới tính" value={basic?.gender} />
          <InfoRow label="Số điện thoại" value={basic?.phone} />
          <InfoRow label="Khoa / Lớp" value={`${basic?.faculty || ''} - ${basic?.className || ''}`} />
          <InfoRow label="Quê quán" value={profile?.province} />
        </div>
      </div>

      {/* Priority Info */}
      <div className="bg-surface-container-lowest rounded-[24px] border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="bg-surface-container-low px-6 py-4 border-b border-surface-container-high flex items-center gap-3">
          <span className="material-symbols-outlined text-on-tertiary-container">star</span>
          <h2 className="text-base font-bold text-on-surface">Thông tin Ưu tiên</h2>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-on-surface-variant">
            Diện ưu tiên: <span className="font-black text-error">{registration.priorityType || 'Không có'}</span>
          </p>
          {registration.priorityProofUrl ? (
            <a href={`${API_BASE}${registration.priorityProofUrl}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:underline">
              <span className="material-symbols-outlined text-[16px]">attach_file</span>
              Xem giấy tờ minh chứng đính kèm
            </a>
          ) : (
            <p className="text-outline text-sm italic">Không có giấy tờ đính kèm</p>
          )}
        </div>
      </div>

      {/* Approval Section */}
      <div className="bg-surface-container-lowest rounded-[24px] border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="bg-surface-container-low px-6 py-4 border-b border-surface-container-high flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">gavel</span>
          <h2 className="text-base font-bold text-on-surface">Tiến hành phê duyệt</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Loại phòng yêu cầu</p>
              <p className="text-lg font-black text-primary">Phòng {registration.roomType} người</p>
            </div>
            <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Học kỳ</p>
              <p className="text-lg font-black text-primary">{registration.semester}</p>
            </div>
          </div>

          <div className="bg-primary-fixed/20 text-primary px-5 py-4 rounded-xl text-sm border border-primary-fixed font-medium">
            <span className="material-symbols-outlined text-[16px] align-text-bottom mr-1.5">info</span>
            Sau khi phê duyệt, sinh viên sẽ nhận được thông báo hồ sơ hợp lệ. Việc xếp phòng cụ thể sẽ được chuyển sang Thủ tục Check-in.
          </div>

          <div className="pt-4 flex justify-end">
            <button type="button" onClick={handleApprove}
              disabled={isSubmitting || registration.status !== 'PENDING'}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm shadow-lg transition-all ${
                isSubmitting || registration.status !== 'PENDING'
                  ? 'bg-outline/30 text-on-surface-variant cursor-not-allowed'
                  : 'bg-primary text-on-primary hover:opacity-90 active:scale-[0.98] shadow-primary/20'
              }`}>
              <span className="material-symbols-outlined text-[18px]">verified</span>
              {isSubmitting ? 'Đang xử lý...' : 'Duyệt hồ sơ (Không gắn phòng)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
