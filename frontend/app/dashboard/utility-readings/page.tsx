'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';
import { Badge, Button, Card, Field, PageHeader } from '@/components/ui';

export default function UtilityReadingsPage() {
  const router = useRouter();
  const [month, setMonth] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const user = requireAuth(router);
    if (!user) return;
    if (user.role === 'student') {
      router.replace('/dashboard');
      return;
    }
    const now = new Date();
    setMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }, [router]);

  const handleSearch = async () => {
    if (!month) return;
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await apiFetch(
        `${API_BASE}/utility-readings/unrecorded?month=${encodeURIComponent(month)}`,
        { headers: authHeaders() },
      );
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
        if (data.length === 0) {
          setErrorMsg('Không có phòng nào cần ghi số điện nước trong kỳ này.');
        }
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Lỗi truy xuất dữ liệu.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (roomId: string, field: 'currentElectric' | 'currentWater', value: string) => {
    const numVal = parseInt(value, 10);
    if (isNaN(numVal) && value !== '') return;
    setRooms((prev) =>
      prev.map((r) => (r.roomId === roomId ? { ...r, [field]: value === '' ? '' : numVal } : r)),
    );
  };

  const handleSubmit = async () => {
    const unrecordedRooms = rooms.filter((r) => !r.isRecorded);
    const invalidRoom = unrecordedRooms.find(
      (r) =>
        r.currentElectric === '' ||
        r.currentWater === '' ||
        r.currentElectric < r.prevElectric ||
        r.currentWater < r.prevWater,
    );

    if (invalidRoom) {
      setErrorMsg(
        `Chỉ số mới ở phòng ${invalidRoom.roomNumber} không hợp lệ. Phải LỚN HƠN hoặc BẰNG chỉ số cũ.`,
      );
      return;
    }
    if (unrecordedRooms.length === 0) {
      setErrorMsg('Toàn bộ phòng đã hoàn tất chốt số tháng này.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const payload = unrecordedRooms.map((r) => ({
        roomId: r.roomId,
        electricReading: Number(r.currentElectric),
        waterReading: Number(r.currentWater),
        prevElectric: r.prevElectric,
        prevWater: r.prevWater,
      }));

      const res = await apiFetch(`${API_BASE}/utility-readings/mass-record`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ month, data: payload }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Chốt số đồng hồ và sinh hóa đơn thành công!');
        await handleSearch();
      } else {
        setErrorMsg(data.message || 'Hệ thống gián đoạn khi lưu.');
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
        title="Kê khai chỉ số điện nước"
        description="Đối soát đồng hồ và tạo hóa đơn định kỳ phòng KTX."
        icon={<span className="material-symbols-outlined">speed</span>}
        action={
          <Link href="/dashboard/invoices">
            <Button
              variant="secondary"
              iconRight={<span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
            >
              Bảng hóa đơn
            </Button>
          </Link>
        }
      />

      {errorMsg && (
        <div className="bg-error-container text-on-error-container px-6 py-4 rounded-2xl flex items-start gap-3">
          <span className="material-symbols-outlined text-error mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
            error
          </span>
          <span className="text-sm font-bold leading-relaxed">{errorMsg}</span>
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

      <Card padding="lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="w-full md:w-[350px]">
            <Field label="Chọn kỳ (Tháng/Năm)">
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full h-12 rounded-2xl bg-surface-container-lowest border-2 border-outline-variant/20 focus:border-primary/40 px-4 text-lg font-bold text-primary outline-none transition-all"
              />
            </Field>
          </div>
          <Button
            variant="gradient"
            size="lg"
            loading={isLoading}
            disabled={!month}
            onClick={handleSearch}
            icon={!isLoading ? <span className="material-symbols-outlined">wifi_tethering</span> : undefined}
          >
            {isLoading ? 'Đang quét...' : 'Quét lưới phòng'}
          </Button>
        </div>
      </Card>

      {rooms.length > 0 && (
        <Card padding="lg">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-surface-container-high/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">dataset</span>
              </div>
              <h2 className="text-lg font-bold text-on-surface">Form cập nhật chỉ số đồng hồ</h2>
            </div>
            <div className="flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-full">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                {rooms.length} phòng
              </span>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <table className="w-full text-left text-sm border-separate border-spacing-y-2">
              <thead className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                <tr>
                  <th className="px-4 py-2">Phòng</th>
                  <th className="px-4 py-2 text-right">Điện cũ</th>
                  <th className="px-4 py-2 text-on-tertiary-container w-48">
                    <span className="material-symbols-outlined align-middle text-[14px] mr-1">bolt</span>
                    Điện mới
                  </th>
                  <th className="px-4 py-2 text-right">Nước cũ</th>
                  <th className="px-4 py-2 text-secondary w-48">
                    <span className="material-symbols-outlined align-middle text-[14px] mr-1">water_drop</span>
                    Nước mới
                  </th>
                  <th className="px-4 py-2 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.roomId} className={r.isRecorded ? 'opacity-50' : ''}>
                    <td className="px-4 py-4 rounded-l-2xl bg-surface-container-lowest">
                      <span className="font-black text-on-surface text-lg">{r.roomNumber}</span>
                    </td>
                    <td className="px-4 py-4 bg-surface-container-lowest text-right">
                      <span className="font-mono font-bold text-on-surface-variant/60 text-base">
                        {r.prevElectric}
                      </span>
                    </td>
                    <td className="px-4 py-4 bg-surface-container-lowest">
                      <input
                        type="number"
                        disabled={r.isRecorded || isSubmitting}
                        value={r.currentElectric ?? ''}
                        onChange={(e) => handleInputChange(r.roomId, 'currentElectric', e.target.value)}
                        className="w-full rounded-xl border-2 border-outline-variant/20 focus:border-primary/40 px-3 py-2 font-mono font-bold text-lg outline-none transition-all bg-surface-container-lowest text-on-tertiary-container disabled:border-transparent disabled:bg-transparent disabled:text-center"
                        placeholder="..."
                        min={r.prevElectric}
                      />
                    </td>
                    <td className="px-4 py-4 bg-surface-container-lowest text-right">
                      <span className="font-mono font-bold text-on-surface-variant/60 text-base">
                        {r.prevWater}
                      </span>
                    </td>
                    <td className="px-4 py-4 bg-surface-container-lowest">
                      <input
                        type="number"
                        disabled={r.isRecorded || isSubmitting}
                        value={r.currentWater ?? ''}
                        onChange={(e) => handleInputChange(r.roomId, 'currentWater', e.target.value)}
                        className="w-full rounded-xl border-2 border-outline-variant/20 focus:border-primary/40 px-3 py-2 font-mono font-bold text-lg outline-none transition-all bg-surface-container-lowest text-secondary disabled:border-transparent disabled:bg-transparent disabled:text-center"
                        placeholder="..."
                        min={r.prevWater}
                      />
                    </td>
                    <td className="px-4 py-4 rounded-r-2xl bg-surface-container-lowest text-center">
                      {r.isRecorded ? (
                        <Badge tone="approved" icon={<span className="material-symbols-outlined text-[14px]">lock</span>}>
                          Đã khóa
                        </Badge>
                      ) : (
                        <Badge tone="pending" icon={<span className="material-symbols-outlined text-[14px]">edit_note</span>}>
                          Nhập số
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-6 mt-4 border-t border-surface-container-high/40 flex justify-end">
            <Button
              variant="gradient"
              size="lg"
              loading={isSubmitting}
              disabled={isSubmitting || rooms.every((r) => r.isRecorded)}
              onClick={handleSubmit}
              icon={
                !isSubmitting ? (
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                ) : undefined
              }
            >
              {isSubmitting ? 'Đang lưu...' : 'Niêm phong & sinh bill tự động'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
