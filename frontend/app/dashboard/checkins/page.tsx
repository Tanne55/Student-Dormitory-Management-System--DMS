'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';
import { downloadAuthenticatedPdf } from '@/lib/pdfDownload';
import { Button, Card, Field, Input, Modal, PageHeader } from '@/components/ui';

function StepCard({
  step,
  title,
  children,
  disabled = false,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Card padding="lg" className={`flex flex-col min-h-[500px] ${disabled ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center font-bold text-sm shadow-md">
          {step}
        </div>
        <h2 className="text-lg font-bold text-on-surface tracking-tight">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

export default function CheckinPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);

  const [selectedReg, setSelectedReg] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const defaultEnd = new Date();
  defaultEnd.setMonth(defaultEnd.getMonth() + 6);
  const [endDate, setEndDate] = useState(defaultEnd.toISOString().split('T')[0]);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<any>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfErr, setPdfErr] = useState('');

  useEffect(() => {
    const user = requireAuth(router);
    if (!user) return;
    if (!['staff', 'admin'].includes(user.role)) router.replace('/dashboard');
  }, [router]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await apiFetch(
        `${API_BASE}/checkins/registrations?q=${encodeURIComponent(searchQuery)}`,
        { headers: authHeaders() },
      );
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data);
        if (data.length === 0 && searchQuery) {
          setErrorMsg('Không tìm thấy hồ sơ đã duyệt khớp với từ khoá.');
        }
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectReg = async (reg: any) => {
    setSelectedReg(reg);
    setSelectedRoom(null);
    setErrorMsg('');

    const parsedApp =
      typeof reg.applicationData === 'string' ? JSON.parse(reg.applicationData) : reg.applicationData;
    const reqGender = parsedApp.basic?.gender || 'Male';
    const reqRoomType = reg.roomType;

    try {
      const r = await apiFetch(
        `${API_BASE}/checkins/available-rooms?gender=${encodeURIComponent(reqGender)}&type=${reqRoomType}`,
        { headers: authHeaders() },
      );
      if (r.ok) {
        const rooms = await r.json();
        if (rooms.length === 0) {
          setErrorMsg(`Quỹ phòng ${reqRoomType} người cho ${reqGender} đã hết. Sắp xếp nguyện vọng khác.`);
        }
        setAvailableRooms(rooms);
      }
    } catch {
      setErrorMsg('Lỗi tải phòng trống.');
    }
  };

  const handleProcessCheckin = async () => {
    if (!isPaymentConfirmed) {
      setErrorMsg('Vui lòng xác nhận thanh toán trước khi khởi tạo hợp đồng.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await apiFetch(`${API_BASE}/checkins/process`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          registrationId: selectedReg.id,
          roomId: selectedRoom.id,
          startDate,
          endDate,
          isPaymentConfirmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi hệ thống.');
      setPdfErr('');
      setSuccessData(data.data);
      setSelectedReg(null);
      setSelectedRoom(null);
      setSearchQuery('');
      setIsPaymentConfirmed(false);
      setRegistrations([]);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const totalMonths = Math.max(
    1,
    Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)),
  );
  const totalPrice = totalMonths * (selectedRoom?.monthlyPrice || 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Thủ tục Xếp phòng (Check-in)"
        description="Bố trí phòng, lập hợp đồng và kích hoạt tài khoản nội trú."
        icon={<span className="material-symbols-outlined">how_to_reg</span>}
      />

      {errorMsg && !successData && (
        <div className="bg-error-container text-on-error-container px-6 py-4 rounded-2xl flex items-start gap-3">
          <span className="material-symbols-outlined text-error mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
            error
          </span>
          <span className="text-sm font-bold leading-relaxed">{errorMsg}</span>
        </div>
      )}

      <StepCard step={1} title="Truy vấn hồ sơ phê duyệt">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-grow">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập MSSV, CCCD hoặc quét mã vạch..."
              icon={<span className="material-symbols-outlined text-[20px]">search</span>}
            />
          </div>
          <Button
            type="submit"
            variant="gradient"
            loading={isLoading}
            icon={
              !isLoading ? (
                <span className="material-symbols-outlined text-[20px]">manage_search</span>
              ) : undefined
            }
          >
            {isLoading ? 'Đang quét...' : 'Quét hồ sơ'}
          </Button>
        </form>

        {registrations.length > 0 && !selectedReg && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Mã số / Nhu cầu
                  </th>
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Nhân sự
                  </th>
                  <th className="py-3 px-4 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r, i) => {
                  const appData =
                    typeof r.applicationData === 'string' ? JSON.parse(r.applicationData) : r.applicationData;
                  const basic = appData?.basic ?? {};
                  const profile = appData?.profile ?? {};
                  const fullName = basic.fullName ?? appData?.fullName ?? r.studentCode;
                  const gender = basic.gender ?? appData?.gender ?? '—';
                  const idCard = profile.idCardNumber ?? appData?.idCardNumber ?? '—';
                  return (
                    <tr key={r.id} className={i % 2 === 1 ? 'bg-surface-container-low' : ''}>
                      <td className="px-4 py-4">
                        <div className="font-black text-primary text-base">{r.studentCode}</div>
                        <div className="text-xs font-bold text-on-surface-variant mt-1 uppercase tracking-widest">
                          Phòng {r.roomType} giường
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-on-surface text-sm uppercase">{fullName}</div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs font-medium text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-md">
                            {gender}
                          </span>
                          <span className="text-xs font-medium text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-md">
                            CCCD: {idCard}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button
                          size="sm"
                          variant="gradient"
                          onClick={() => handleSelectReg(r)}
                          icon={<span className="material-symbols-outlined text-[16px]">verified</span>}
                        >
                          Thực thi
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </StepCard>

      {selectedReg && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StepCard step={2} title={`Gán phòng (${selectedReg.roomType} giường)`}>
            {selectedRoom ? (
              <div className="flex-1 bg-tertiary-fixed/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-5xl text-on-tertiary-container mb-4">
                  meeting_room
                </span>
                <h3 className="font-black text-on-tertiary-container text-3xl mb-2">{selectedRoom.roomNumber}</h3>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container-lowest rounded-full text-sm font-bold text-on-tertiary-container mb-6">
                  <span className="w-2 h-2 rounded-full bg-on-tertiary-container" />
                  Sức chứa: {selectedRoom.currentOccupancy}/{selectedRoom.capacity}
                </div>
                <Button variant="secondary" onClick={() => setSelectedRoom(null)}>
                  Đổi phòng khác
                </Button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 max-h-[400px]">
                {availableRooms.map((room) => (
                  <div
                    key={room.id}
                    className="p-5 rounded-2xl flex justify-between items-center bg-surface-container-low hover:bg-surface-container-high transition-all group cursor-pointer"
                    onClick={() => setSelectedRoom(room)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest flex items-center justify-center text-on-surface-variant group-hover:bg-primary group-hover:text-on-primary transition-colors">
                        <span className="material-symbols-outlined">bed</span>
                      </div>
                      <div>
                        <p className="font-black text-on-surface text-lg">{room.roomNumber}</p>
                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">
                          Đang ở: {room.currentOccupancy}/{room.capacity} • {room.gender}
                        </p>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </div>
                  </div>
                ))}
                {availableRooms.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant/60">
                    <span className="material-symbols-outlined text-5xl mb-2">hotel_class</span>
                    <p className="font-bold">Hết phòng trống thuộc loại này</p>
                  </div>
                )}
              </div>
            )}
          </StepCard>

          <StepCard step={3} title="Quyết toán & Hợp đồng" disabled={!selectedRoom}>
            <div className="space-y-6 flex-1 flex flex-col">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Ngày bắt đầu">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    icon={<span className="material-symbols-outlined text-[20px]">calendar_today</span>}
                  />
                </Field>
                <Field label="Ngày kết thúc">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    icon={<span className="material-symbols-outlined text-[20px]">event</span>}
                  />
                </Field>
              </div>

              <div className="bg-primary-fixed/40 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">
                  Hoạch toán tạm tính
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-on-surface-variant">Loại phòng</span>
                    <span className="font-bold text-on-surface">
                      {selectedRoom?.roomTypeName || `${selectedReg.roomType} giường`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-on-surface-variant">Đơn giá</span>
                    <span className="font-black font-mono text-on-surface">
                      {(selectedRoom?.monthlyPrice || 0).toLocaleString('vi-VN')} ₫/th
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-on-surface-variant">Chu kỳ</span>
                    <span className="font-bold text-on-surface">{totalMonths} tháng</span>
                  </div>
                  <div className="flex justify-between items-center font-black text-primary text-xl border-t border-primary/20 pt-4 mt-2">
                    <span>Tổng thu lần 1</span>
                    <span className="font-mono">{totalPrice.toLocaleString('vi-VN')} ₫</span>
                  </div>
                </div>
              </div>

              <div className="flex-1" />

              <label
                className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all ${
                  isPaymentConfirmed
                    ? 'bg-primary-fixed/40 ring-2 ring-primary/20'
                    : 'bg-surface-container-low'
                }`}
              >
                <input
                  type="checkbox"
                  className="w-6 h-6 rounded-md text-primary cursor-pointer"
                  checked={isPaymentConfirmed}
                  onChange={(e) => setIsPaymentConfirmed(e.target.checked)}
                />
                <div>
                  <p className="font-bold text-sm text-on-surface">Đã hoàn tất thu tiền</p>
                  <p className="text-xs font-medium text-on-surface-variant mt-0.5">
                    Tiền đã vào két / chuyển khoản đối soát
                  </p>
                </div>
              </label>

              <Button
                variant="gradient"
                size="lg"
                fullWidth
                disabled={!isPaymentConfirmed || isLoading}
                loading={isLoading}
                onClick={handleProcessCheckin}
                icon={!isLoading ? <span className="material-symbols-outlined text-[20px]">task</span> : undefined}
              >
                {isLoading ? 'Đang xử lý...' : 'Ký duyệt & lưu trữ'}
              </Button>
            </div>
          </StepCard>
        </div>
      )}

      <Modal
        open={!!successData}
        onClose={() => setSuccessData(null)}
        title="Check-in hoàn tất!"
        icon={
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
        }
        size="lg"
        footer={
          <Button variant="gradient" onClick={() => setSuccessData(null)}>
            Đóng & hoàn thành
          </Button>
        }
      >
        {successData && (
          <div className="space-y-4">
            {successData.warning && (
              <div className="bg-tertiary-fixed/40 text-on-tertiary-container p-4 rounded-2xl flex items-start gap-3">
                <span className="material-symbols-outlined mt-0.5">mail</span>
                <span className="text-sm font-medium">{successData.warning}</span>
              </div>
            )}

            <div className="bg-surface-container-low rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-surface-container-high">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  Mã hợp đồng
                </span>
                <strong className="text-primary font-black text-lg font-mono">{successData.contractCode}</strong>
              </div>

              {successData.password ? (
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-bold text-primary uppercase tracking-widest">
                    Tài khoản cổng SV (Cấp mới)
                  </p>
                  <div className="flex justify-between items-center bg-surface-container-lowest px-4 py-3 rounded-xl">
                    <span className="text-sm font-medium text-on-surface-variant">MSSV (User)</span>
                    <span className="font-mono font-bold text-on-surface">{successData.username}</span>
                  </div>
                  <div className="flex justify-between items-center bg-surface-container-lowest px-4 py-3 rounded-xl">
                    <span className="text-sm font-medium text-on-surface-variant">Mật khẩu</span>
                    <span className="font-mono font-bold text-error">{successData.password}</span>
                  </div>
                </div>
              ) : (
                <div className="pt-2 text-center">
                  <span className="inline-block bg-primary-fixed/40 text-on-primary-fixed text-xs font-bold px-3 py-1 rounded-full mb-2">
                    Đã có tài khoản
                  </span>
                  <p className="text-sm font-medium text-on-surface-variant">
                    Hệ thống phát hiện sinh viên đã có tài khoản. Vui lòng dùng tài khoản cũ để đăng nhập.
                  </p>
                </div>
              )}
            </div>

            {successData.contractId && (
              <>
                {pdfErr && <p className="text-sm text-error font-bold">{pdfErr}</p>}
                <Button
                  variant="secondary"
                  fullWidth
                  loading={pdfLoading}
                  onClick={async () => {
                    setPdfErr('');
                    setPdfLoading(true);
                    try {
                      await downloadAuthenticatedPdf(
                        `/documents/contracts/${successData.contractId}/checkin-receipt.pdf`,
                        `checkin-${successData.contractCode || successData.contractId}.pdf`,
                      );
                    } catch (e: any) {
                      setPdfErr(e.message || 'Lỗi kết xuất PDF.');
                    } finally {
                      setPdfLoading(false);
                    }
                  }}
                  icon={!pdfLoading ? <span className="material-symbols-outlined">print</span> : undefined}
                >
                  {pdfLoading ? 'Đang trích xuất PDF...' : 'In file biên bản & hợp đồng'}
                </Button>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
