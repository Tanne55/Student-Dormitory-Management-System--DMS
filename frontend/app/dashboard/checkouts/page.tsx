'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';
import { downloadAuthenticatedPdf } from '@/lib/pdfDownload';
import { Button, Card, Field, Input, Modal, PageHeader } from '@/components/ui';

function SectionCard({
  icon,
  title,
  children,
  className = '',
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card padding="md" className={`overflow-hidden ${className}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <h2 className="text-base font-bold text-on-surface">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  const [electricFinal, setElectricFinal] = useState(0);
  const [waterFinal, setWaterFinal] = useState(0);
  const [assetCondition, setAssetCondition] = useState<'NORMAL' | 'DAMAGED'>('NORMAL');
  const [damageFee, setDamageFee] = useState(0);
  const [depositAmount, setDepositAmount] = useState(500000);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [isForceCheckout, setIsForceCheckout] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<any>(null);
  const [checkoutPdfLoading, setCheckoutPdfLoading] = useState(false);
  const [checkoutPdfErr, setCheckoutPdfErr] = useState('');
  const [paymentError, setPaymentError] = useState(false);
  const [electricPricePerKwh, setElectricPricePerKwh] = useState(3500);
  const [waterPricePerM3, setWaterPricePerM3] = useState(25000);

  useEffect(() => {
    const user = requireAuth(router);
    if (!user) return;
    if (!['staff', 'admin'].includes(user.role)) router.replace('/dashboard');
  }, [router]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSelected(null);
    try {
      const res = await apiFetch(`${API_BASE}/checkouts/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results ?? [];
        if (typeof data.electricPricePerKwh === 'number') setElectricPricePerKwh(data.electricPricePerKwh);
        if (typeof data.waterPricePerM3 === 'number') setWaterPricePerM3(data.waterPricePerM3);
        setResults(list);
        if (list.length === 0 && searchQuery) {
          setErrorMsg('Không tìm thấy sinh viên đang lưu trú khớp.');
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.message || `Lỗi ${res.status}`);
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (item: any) => {
    setSelected(item);
    setElectricFinal(item.lastReading.electricReading);
    setWaterFinal(item.lastReading.waterReading);
    setAssetCondition('NORMAL');
    setDamageFee(0);
    setIsPaymentConfirmed(false);
    setIsForceCheckout(false);
    setPaymentError(false);
    setErrorMsg('');
  };

  const prevElectric = selected?.lastReading?.electricReading ?? 0;
  const prevWater = selected?.lastReading?.waterReading ?? 0;
  const electricUsed = Math.max(0, electricFinal - prevElectric);
  const waterUsed = Math.max(0, waterFinal - prevWater);
  const electricFee = electricUsed * electricPricePerKwh;
  const waterFee = waterUsed * waterPricePerM3;
  const actualDamageFee = assetCondition === 'DAMAGED' ? damageFee : 0;
  const finalSettlement = electricFee + waterFee + actualDamageFee - depositAmount;

  const handleProcess = async () => {
    setPaymentError(false);
    if (!isForceCheckout && !isPaymentConfirmed) {
      setPaymentError(true);
      setErrorMsg('Vui lòng xác nhận thanh toán công nợ trước khi chốt trả phòng.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await apiFetch(`${API_BASE}/checkouts/process`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          contractId: selected.contract.id,
          electricReadingFinal: electricFinal,
          waterReadingFinal: waterFinal,
          assetCondition,
          damageFee: actualDamageFee,
          depositAmount,
          isPaymentConfirmed,
          isForceCheckout,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi hệ thống');
      setCheckoutPdfErr('');
      setSuccessData(data);
      if (data?.data?.electricPricePerKwh != null) setElectricPricePerKwh(Number(data.data.electricPricePerKwh));
      if (data?.data?.waterPricePerM3 != null) setWaterPricePerM3(Number(data.data.waterPricePerM3));
      setSelected(null);
      setResults([]);
      setSearchQuery('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Thủ tục Trả Phòng"
        description="Chốt công nợ, kiểm kê tài sản và thanh lý hợp đồng."
        icon={<span className="material-symbols-outlined">logout</span>}
      />

      {errorMsg && !successData && (
        <div className="bg-error-container text-on-error-container px-6 py-4 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
            error
          </span>
          <span className="text-sm font-bold">{errorMsg}</span>
        </div>
      )}

      <SectionCard icon="search" title="Bước 1: Tra cứu sinh viên đang lưu trú">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-grow">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập MSSV..."
              icon={<span className="material-symbols-outlined text-[20px]">badge</span>}
            />
          </div>
          <Button
            type="submit"
            variant="gradient"
            loading={isLoading}
            icon={!isLoading ? <span className="material-symbols-outlined text-[18px]">search</span> : undefined}
          >
            {isLoading ? 'Đang quét...' : 'Tìm kiếm'}
          </Button>
        </form>

        {results.length > 0 && !selected && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Sinh viên
                  </th>
                  <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Phòng / HĐ
                  </th>
                  <th className="py-3 px-4 text-right text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, i) => (
                  <tr key={i} className={i % 2 === 1 ? 'bg-surface-container-low' : ''}>
                    <td className="px-4 py-4">
                      <div className="font-bold text-on-surface">{item.student.studentCode}</div>
                      <div className="text-xs text-on-surface-variant">{item.student.fullName}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-primary">Phòng {item.room?.roomNumber || 'N/A'}</div>
                      <div className="text-xs text-on-surface-variant">HĐ: {item.contract.contractCode}</div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button size="sm" variant="secondary" onClick={() => handleSelect(item)} className="!text-error">
                        Làm thủ tục trả phòng
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {selected && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card padding="sm" className="!p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Sinh viên</p>
              <p className="text-lg font-black text-primary">{selected.student.studentCode}</p>
              <p className="text-sm text-on-surface-variant">{selected.student.fullName}</p>
            </Card>
            <Card padding="sm" className="!p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Phòng</p>
              <p className="text-lg font-black text-primary">{selected.room?.roomNumber}</p>
              <p className="text-sm text-on-surface-variant">
                {selected.room?.currentOccupancy}/{selected.room?.capacity} người
              </p>
            </Card>
            <Card padding="sm" className="!p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Hợp đồng</p>
              <p className="text-lg font-black text-primary">{selected.contract.contractCode}</p>
              <p className="text-sm text-on-surface-variant">
                {selected.contract.startDate} → {selected.contract.endDate}
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard icon="bolt" title="Chỉ số Điện Nước">
              <div className="space-y-5">
                <div className="bg-tertiary-fixed/40 px-4 py-3 rounded-2xl text-sm text-on-tertiary-fixed-variant">
                  Tháng trước ({selected.lastReading.month}): <strong>Điện {prevElectric} kWh</strong>,{' '}
                  <strong>Nước {prevWater} m³</strong>
                </div>
                <Field
                  label="Chỉ số điện cuối (kWh)"
                  helper={
                    electricFinal > prevElectric
                      ? `→ ${electricUsed} kWh × ${electricPricePerKwh.toLocaleString()} = ${electricFee.toLocaleString()} VND`
                      : undefined
                  }
                >
                  <Input
                    type="number"
                    value={electricFinal}
                    onChange={(e) => setElectricFinal(Number(e.target.value))}
                    min={prevElectric}
                  />
                </Field>
                <Field
                  label="Chỉ số nước cuối (m³)"
                  helper={
                    waterFinal > prevWater
                      ? `→ ${waterUsed} m³ × ${waterPricePerM3.toLocaleString()} = ${waterFee.toLocaleString()} VND`
                      : undefined
                  }
                >
                  <Input
                    type="number"
                    value={waterFinal}
                    onChange={(e) => setWaterFinal(Number(e.target.value))}
                    min={prevWater}
                  />
                </Field>

                <div className="pt-5 border-t border-surface-container-high space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant">inventory_2</span>
                    <h3 className="text-base font-bold text-on-surface">Tình trạng tài sản</h3>
                  </div>
                  <Field label="Trạng thái">
                    <select
                      value={assetCondition}
                      onChange={(e) => setAssetCondition(e.target.value as any)}
                      className="w-full h-12 rounded-2xl bg-surface-container-lowest border-2 border-outline-variant/20 focus:border-primary/40 px-4 text-sm font-medium text-on-surface outline-none transition-all"
                    >
                      <option value="NORMAL">Bình thường - Không hư hỏng</option>
                      <option value="DAMAGED">Hư hỏng - Cần đền bù</option>
                    </select>
                  </Field>
                  {assetCondition === 'DAMAGED' && (
                    <Field label="Phí đền bù (VND)" required>
                      <Input
                        type="number"
                        value={damageFee}
                        onChange={(e) => setDamageFee(Number(e.target.value))}
                        min={1}
                        invalid
                      />
                    </Field>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard icon="calculate" title="Bảng Quyết Toán">
              <div className="space-y-5">
                <div className="bg-surface-container-low rounded-2xl p-5 space-y-3">
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Tiền điện</span>
                    <span className="font-mono font-bold text-on-surface">{electricFee.toLocaleString()} VND</span>
                  </div>
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>Tiền nước</span>
                    <span className="font-mono font-bold text-on-surface">{waterFee.toLocaleString()} VND</span>
                  </div>
                  {actualDamageFee > 0 && (
                    <div className="flex justify-between text-sm text-error font-bold">
                      <span>Phí đền bù</span>
                      <span className="font-mono">+ {actualDamageFee.toLocaleString()} VND</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Cọc khấu trừ</span>
                    <span className="font-mono font-bold">- {depositAmount.toLocaleString()} VND</span>
                  </div>
                  <div
                    className={`flex justify-between font-bold text-xl border-t border-outline-variant/20 pt-3 ${
                      finalSettlement >= 0 ? 'text-error' : 'text-green-700'
                    }`}
                  >
                    <span>TỔNG</span>
                    <span className="font-mono">{finalSettlement.toLocaleString()} VND</span>
                  </div>
                  {finalSettlement < 0 && (
                    <p className="text-xs text-green-600 italic">* Số âm = hoàn tiền cọc dư cho SV.</p>
                  )}
                </div>

                <Field label="Tiền cọc khấu trừ (VND)">
                  <Input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                  />
                </Field>

                <div className="space-y-3">
                  <label
                    className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-colors ${
                      paymentError && !isPaymentConfirmed
                        ? 'bg-error-container/30 ring-2 ring-error/30'
                        : 'bg-surface-container-low'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isPaymentConfirmed}
                      onChange={(e) => {
                        setIsPaymentConfirmed(e.target.checked);
                        setPaymentError(false);
                        setErrorMsg('');
                      }}
                      className="w-5 h-5 text-primary rounded-md cursor-pointer"
                      disabled={isForceCheckout}
                    />
                    <span
                      className={`font-bold text-sm select-none ${
                        paymentError && !isPaymentConfirmed ? 'text-error' : 'text-on-surface-variant'
                      }`}
                    >
                      Xác nhận sinh viên đã thanh toán đủ công nợ
                    </span>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-tertiary-fixed/30 rounded-2xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isForceCheckout}
                      onChange={(e) => {
                        setIsForceCheckout(e.target.checked);
                        if (e.target.checked) {
                          setIsPaymentConfirmed(false);
                          setPaymentError(false);
                          setErrorMsg('');
                        }
                      }}
                      className="w-5 h-5 rounded-md cursor-pointer"
                    />
                    <span className="font-bold text-sm text-on-tertiary-container select-none">
                      Thanh lý cưỡng chế (vắng mặt) — chuyển nợ xấu
                    </span>
                  </label>
                </div>

                <Button
                  variant="danger"
                  size="lg"
                  fullWidth
                  loading={isLoading}
                  onClick={handleProcess}
                  icon={!isLoading ? <span className="material-symbols-outlined text-[18px]">warning</span> : undefined}
                >
                  {isLoading ? 'Đang xử lý...' : 'Xác nhận trả phòng'}
                </Button>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <Modal
        open={!!successData}
        onClose={() => setSuccessData(null)}
        title={successData?.data?.status === 'BAD_DEBT' ? 'Thanh lý cưỡng chế' : 'Trả phòng thành công!'}
        description={successData?.message}
        icon={
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            {successData?.data?.status === 'BAD_DEBT' ? 'warning' : 'check_circle'}
          </span>
        }
        footer={
          <Button variant="primary" onClick={() => setSuccessData(null)}>
            Đóng
          </Button>
        }
      >
        {successData && (
          <div className="space-y-4">
            <div className="bg-surface-container-low rounded-2xl p-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Mã HĐ</span>
                <span className="font-bold">{successData.data.contractCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Điện</span>
                <span className="font-mono text-xs">
                  {successData.data.electricUsed} kWh ×{' '}
                  {(successData.data.electricPricePerKwh ?? electricPricePerKwh).toLocaleString()} ={' '}
                  {(
                    successData.data.electricUsed * (successData.data.electricPricePerKwh ?? electricPricePerKwh)
                  ).toLocaleString()}{' '}
                  VND
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Nước</span>
                <span className="font-mono text-xs">
                  {successData.data.waterUsed} m³ ×{' '}
                  {(successData.data.waterPricePerM3 ?? waterPricePerM3).toLocaleString()} ={' '}
                  {(
                    successData.data.waterUsed * (successData.data.waterPricePerM3 ?? waterPricePerM3)
                  ).toLocaleString()}{' '}
                  VND
                </span>
              </div>
              {successData.data.damageFee > 0 && (
                <div className="flex justify-between text-error font-bold">
                  <span>Đền bù</span>
                  <span className="font-mono">+{Number(successData.data.damageFee).toLocaleString()} VND</span>
                </div>
              )}
              <div className="flex justify-between text-green-700">
                <span>Cọc khấu trừ</span>
                <span className="font-mono">-{Number(successData.data.depositRefund).toLocaleString()} VND</span>
              </div>
              <div
                className={`flex justify-between font-bold text-lg border-t border-outline-variant/20 pt-3 ${
                  Number(successData.data.finalSettlement) >= 0 ? 'text-error' : 'text-green-700'
                }`}
              >
                <span>Quyết toán</span>
                <span className="font-mono">{Number(successData.data.finalSettlement).toLocaleString()} VND</span>
              </div>
            </div>

            {successData?.data?.contractId && (
              <>
                {checkoutPdfErr && <p className="text-sm text-error">{checkoutPdfErr}</p>}
                <Button
                  variant="secondary"
                  fullWidth
                  loading={checkoutPdfLoading}
                  onClick={async () => {
                    setCheckoutPdfErr('');
                    setCheckoutPdfLoading(true);
                    try {
                      const cid = successData.data.contractId as string;
                      const code = successData.data.contractCode as string | undefined;
                      await downloadAuthenticatedPdf(
                        `/documents/contracts/${cid}/checkout-receipt.pdf`,
                        `checkout-${code || cid}.pdf`,
                      );
                    } catch (e: any) {
                      setCheckoutPdfErr(e.message || 'Không tải được PDF.');
                    } finally {
                      setCheckoutPdfLoading(false);
                    }
                  }}
                  icon={
                    !checkoutPdfLoading ? (
                      <span className="material-symbols-outlined text-[18px]">download</span>
                    ) : undefined
                  }
                >
                  {checkoutPdfLoading ? 'Đang tải PDF...' : 'Tải biên bản check-out (PDF)'}
                </Button>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
