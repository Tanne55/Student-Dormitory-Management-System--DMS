'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';
import { Badge, Button, Card, Field, Input } from '@/components/ui';

type ProfileData = any;

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="font-bold text-on-surface break-words">{value || '---'}</p>
    </div>
  );
}

function InlineKV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-surface-container-high last:border-0">
      <span className="text-sm font-medium text-on-surface-variant">{label}</span>
      <span className="text-sm font-bold text-on-surface text-right max-w-[180px] truncate">{value}</span>
    </div>
  );
}

export default function StudentProfilePage() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!requireAuth(router)) return;
    void fetchProfile();
  }, [router]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await apiFetch(`${API_BASE}/students/profile`, { headers: authHeaders() });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Không thể tải hồ sơ.');
      setProfileData(result.data);
      setToastMessage('Hồ sơ đã được đồng bộ với hệ thống!');
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Lỗi truy xuất dữ liệu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Vui lòng điền đầy đủ.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Mật khẩu mới không khớp.');
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await apiFetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: currentPassword, newPassword }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Không thể đổi mật khẩu.');
      }
      setToastMessage('Đổi mật khẩu thành công!');
      setTimeout(() => setToastMessage(''), 4000);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card padding="lg" className="text-center max-w-md mx-auto">
        <span className="material-symbols-outlined text-error text-4xl mb-4">error</span>
        <h2 className="text-xl font-bold text-on-surface mb-2">Truy xuất dữ liệu thất bại</h2>
        <p className="text-on-surface-variant mb-6">{error}</p>
        <Button variant="danger" onClick={fetchProfile}>
          Thử lại
        </Button>
      </Card>
    );
  }

  const pd = profileData || {};
  const detail = pd.profile || {};
  const addressStr = [detail.addressDetail, detail.ward, detail.district, detail.province]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Hero */}
      <Card padding="lg" className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            <div className="w-32 h-32 md:w-36 md:h-36 rounded-3xl bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center shadow-xl">
              <span className="material-symbols-outlined text-6xl">school</span>
            </div>
          </div>
          <div className="text-center md:text-left space-y-2">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <h1 className="text-3xl font-bold text-on-surface tracking-tight">
                {pd.fullName || 'Chưa cập nhật'}
              </h1>
              <Badge tone="info">Sinh viên</Badge>
            </div>
            <p className="text-on-surface-variant font-medium">
              MSSV: <span className="text-on-surface font-bold">{pd.studentCode || 'N/A'}</span>
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full">
                <span className="material-symbols-outlined text-primary text-lg">school</span>
                <span className="text-sm font-semibold text-on-surface line-clamp-1">
                  {pd.faculty || 'Trường/Khoa'}
                </span>
              </div>
              {pd.room ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full">
                  <span className="material-symbols-outlined text-green-600 text-lg">meeting_room</span>
                  <span className="text-sm font-bold text-green-700">Phòng {pd.room.name || pd.room.id}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full">
                  <span className="material-symbols-outlined text-on-surface-variant/60 text-lg">meeting_room</span>
                  <span className="text-sm font-medium text-on-surface-variant">Chưa xếp phòng</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal info */}
        <Card padding="lg" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">person_outline</span>
              </div>
              <h2 className="text-xl font-bold text-on-surface tracking-tight">Thông tin cá nhân</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-10">
            <InfoRow label="Họ và tên" value={pd.fullName} />
            <InfoRow label="Ngày sinh" value={pd.dob} />
            <InfoRow label="Giới tính" value={pd.gender} />
            <InfoRow label="CCCD / Mã định danh" value={detail.idCardNumber} />
            <InfoRow label="Số điện thoại" value={pd.phone} />
            <InfoRow label="Email liên lạc" value={pd.emailPersonal} />
            <div className="md:col-span-2">
              <InfoRow label="Địa chỉ thường trú" value={addressStr} />
            </div>
          </div>
        </Card>

        {/* Academic */}
        <Card padding="lg" className="flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-tertiary-fixed text-on-tertiary-container flex items-center justify-center">
                <span className="material-symbols-outlined">school</span>
              </div>
              <h2 className="text-xl font-bold text-on-surface tracking-tight">Học tập</h2>
            </div>
            <span
              className="material-symbols-outlined text-green-500"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified
            </span>
          </div>
          <div className="flex-1 space-y-2">
            <InlineKV label="Khoa / Viện" value={pd.faculty || '---'} />
            <InlineKV label="Ngành học" value={pd.major || '---'} />
            <InlineKV label="Lớp định danh" value={pd.className || '---'} />
            <InlineKV
              label="Khóa (Cohort)"
              value={
                <span className="px-3 py-1 bg-primary text-on-primary text-[10px] font-bold rounded-full uppercase tracking-widest">
                  {pd.cohort || 'K--'}
                </span>
              }
            />
          </div>
        </Card>

        {/* Room contract (gradient hero) */}
        <div className="lg:col-span-3 relative overflow-hidden rounded-[28px] bg-gradient-to-br from-primary to-primary-container text-on-primary p-8 md:p-10 shadow-xl">
          <div className="absolute right-[-10%] bottom-[-20%] opacity-5 pointer-events-none">
            <span
              className="material-symbols-outlined text-[20rem]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              apartment
            </span>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
            <div className="md:border-r border-white/10 md:pr-8 pb-8 md:pb-0 border-b md:border-b-0">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-5 opacity-80">
                <span className="material-symbols-outlined">meeting_room</span>
                <h3 className="text-xl font-bold tracking-tight">Hợp đồng Nội trú</h3>
              </div>
              <h4 className="text-5xl font-black tracking-tighter drop-shadow-md">
                {pd.room?.name ?? 'N/A'}
              </h4>
              <p className="text-on-primary-container font-semibold flex items-center justify-center md:justify-start gap-1 mt-2">
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                {pd.room ? 'Tòa nhà KTX' : 'Vui lòng đăng ký xếp phòng'}
              </p>
            </div>

            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-8 items-center">
              {pd.room ? (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-primary-container">
                    Dịch vụ (Sức chứa)
                  </p>
                  <div className="flex items-baseline justify-center md:justify-start gap-1">
                    <span className="text-3xl font-black">{pd.room.capacity || 0}</span>
                    <span className="text-sm font-medium opacity-80">Người/phòng</span>
                  </div>
                  <div className="flex gap-1.5 justify-center md:justify-start pt-1 opacity-80">
                    {Array.from({ length: Math.min(pd.room.capacity || 0, 8) }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < (pd.room.occupied || 0) ? 'bg-white' : 'bg-white/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-primary-container">
                    Trạng thái
                  </p>
                  <p className="text-lg font-bold opacity-80">Không có hợp đồng lưu trú hiệu lực.</p>
                </div>
              )}

              {pd.room && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-primary-container">
                    Thời hạn
                  </p>
                  <p className="text-lg font-bold tracking-tight">Tháng 9/2024</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-tertiary-fixed w-1/2" />
                    </div>
                    <span className="text-[10px] font-bold text-tertiary-fixed">Active</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col justify-end pt-4 sm:pt-0">
                <button
                  onClick={() => router.push('/dashboard/dorm-extensions')}
                  className="w-full py-4 px-6 bg-on-primary text-primary font-bold rounded-2xl shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group"
                >
                  <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">
                    history_edu
                  </span>
                  Yêu cầu gia hạn
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Password change accordion */}
        <div className="lg:col-span-3">
          <details className="group bg-surface-container-lowest rounded-3xl shadow-sm overflow-hidden transition-all">
            <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-surface-container-low transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-error-container/40 text-error flex items-center justify-center group-open:bg-error group-open:text-on-error transition-colors">
                  <span className="material-symbols-outlined">lock_reset</span>
                </div>
                <div>
                  <h2 className="font-bold text-on-surface text-lg">Bảo mật & Tài khoản</h2>
                  <p className="text-xs text-on-surface-variant font-medium">
                    Thay đổi mật khẩu đăng nhập hệ thống
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant/70 group-open:rotate-180 transition-transform bg-surface-container-low rounded-full p-1">
                expand_more
              </span>
            </summary>

            <div className="p-6 md:p-8 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-surface-container-high">
                <Field label="Mật khẩu hiện tại">
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </Field>
                <Field label="Mật khẩu mới" helper="≥ 10 ký tự, có upper + lower + digit">
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </Field>
                <Field label="Xác nhận mật khẩu mới">
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </Field>
                <div className="md:col-span-3 flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    Làm lại
                  </Button>
                  <Button variant="gradient" loading={isChangingPassword} onClick={handleChangePassword}>
                    {isChangingPassword ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
                  </Button>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-surface-container-lowest/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl z-50">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-white text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check
            </span>
          </div>
          <p className="text-sm font-bold text-on-surface">{toastMessage}</p>
        </div>
      )}
    </div>
  );
}
