'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';
import { downloadAuthenticatedPdf } from '@/lib/pdfDownload';

export default function CheckoutPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);

    // Checkout form state
    const [electricFinal, setElectricFinal] = useState<number>(0);
    const [waterFinal, setWaterFinal] = useState<number>(0);
    const [assetCondition, setAssetCondition] = useState<'NORMAL' | 'DAMAGED'>('NORMAL');
    const [damageFee, setDamageFee] = useState<number>(0);
    const [depositAmount, setDepositAmount] = useState<number>(500000);
    const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
    const [isForceCheckout, setIsForceCheckout] = useState(false);

    // UI state
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
        if (!['staff', 'admin'].includes(user.role)) {
            router.replace('/dashboard');
        }
    }, [router]);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsLoading(true); setErrorMsg(''); setSelected(null);
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
                    setErrorMsg('Không tìm thấy sinh viên đang lưu trú khớp với từ khóa.');
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                setErrorMsg(errData.message || `Lỗi ${res.status}: ${res.statusText}`);
            }
        } catch { setErrorMsg('Lỗi kết nối máy chủ.'); }
        finally { setIsLoading(false); }
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

    // Realtime calculations
    const prevElectric = selected?.lastReading?.electricReading ?? 0;
    const prevWater = selected?.lastReading?.waterReading ?? 0;
    const electricUsed = Math.max(0, electricFinal - prevElectric);
    const waterUsed = Math.max(0, waterFinal - prevWater);
    const electricFee = electricUsed * electricPricePerKwh;
    const waterFee = waterUsed * waterPricePerM3;
    const utilityFee = electricFee + waterFee;
    const actualDamageFee = assetCondition === 'DAMAGED' ? damageFee : 0;
    const finalSettlement = utilityFee + actualDamageFee - depositAmount;

    const handleProcess = async () => {
        setPaymentError(false);
        if (!isForceCheckout && !isPaymentConfirmed) {
            setPaymentError(true);
            setErrorMsg('Vui lòng hoàn tất thanh toán công nợ và tick xác nhận trước khi chốt trả phòng.');
            return;
        }
        setIsLoading(true); setErrorMsg('');
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
                    isForceCheckout
                })
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
        } catch (err: any) { setErrorMsg(err.message); }
        finally { setIsLoading(false); }
    };

    const InputClass = "w-full bg-surface outline-none border border-outline-variant/50 focus:border-primary px-4 py-3 rounded-xl transition-colors font-medium text-sm text-on-surface";
    const LabelClass = "block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5";

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/10 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-error-container/30 flex items-center justify-center text-error">
                        <span className="material-symbols-outlined text-2xl">logout</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-on-surface tracking-tight">Thủ tục Trả Phòng</h1>
                        <p className="text-sm text-on-surface-variant font-medium">Chốt công nợ, kiểm kê tài sản và thanh lý hợp đồng.</p>
                    </div>
                </div>
            </div>

            {/* Alerts */}
            {errorMsg && (
                <div className="bg-error-container text-on-error-container px-6 py-4 rounded-xl flex items-center gap-3 border border-error/20">
                    <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                    <span className="text-sm font-bold">{errorMsg}</span>
                </div>
            )}

            {/* Success Dialog Modal */}
            {successData && (
                <div className="fixed inset-0 bg-secondary-fixed-variant/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface-container-lowest w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-surface-container-highest">
                        <div className={`px-8 py-6 flex flex-col items-center text-center ${successData.data.status === 'BAD_DEBT' ? 'bg-error-container/30' : 'bg-green-50'}`}>
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${successData.data.status === 'BAD_DEBT' ? 'bg-error-container text-error' : 'bg-green-100 text-green-600'}`}>
                                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    {successData.data.status === 'BAD_DEBT' ? 'warning' : 'check_circle'}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-on-surface mb-1">
                                {successData.data.status === 'BAD_DEBT' ? 'Thanh lý cưỡng chế' : 'Trả phòng thành công!'}
                            </h3>
                            <p className="text-sm text-on-surface-variant">{successData.message}</p>
                        </div>
                        
                        <div className="p-8 space-y-4">
                            <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-on-surface-variant">Mã HĐ</span><span className="font-bold">{successData.data.contractCode}</span></div>
                                <div className="flex justify-between"><span className="text-on-surface-variant">Điện</span><span className="font-mono text-xs">{successData.data.electricUsed} kWh × {(successData.data.electricPricePerKwh ?? electricPricePerKwh).toLocaleString()} = {(successData.data.electricUsed * (successData.data.electricPricePerKwh ?? electricPricePerKwh)).toLocaleString()} VND</span></div>
                                <div className="flex justify-between"><span className="text-on-surface-variant">Nước</span><span className="font-mono text-xs">{successData.data.waterUsed} m³ × {(successData.data.waterPricePerM3 ?? waterPricePerM3).toLocaleString()} = {(successData.data.waterUsed * (successData.data.waterPricePerM3 ?? waterPricePerM3)).toLocaleString()} VND</span></div>
                                {successData.data.damageFee > 0 && (
                                    <div className="flex justify-between text-error font-bold"><span>Đền bù</span><span className="font-mono">+{Number(successData.data.damageFee).toLocaleString()} VND</span></div>
                                )}
                                <div className="flex justify-between text-green-700"><span>Cọc khấu trừ</span><span className="font-mono">-{Number(successData.data.depositRefund).toLocaleString()} VND</span></div>
                                <div className={`flex justify-between font-bold text-lg border-t border-outline-variant/20 pt-3 ${Number(successData.data.finalSettlement) >= 0 ? 'text-error' : 'text-green-700'}`}>
                                    <span>Quyết toán</span>
                                    <span className="font-mono">{Number(successData.data.finalSettlement).toLocaleString()} VND</span>
                                </div>
                            </div>

                            {successData?.data?.contractId && (
                                <>
                                    {checkoutPdfErr && <p className="text-sm text-error">{checkoutPdfErr}</p>}
                                    <button type="button" disabled={checkoutPdfLoading}
                                        onClick={async () => {
                                            setCheckoutPdfErr('');
                                            setCheckoutPdfLoading(true);
                                            try {
                                                const cid = successData.data.contractId as string;
                                                const code = successData.data.contractCode as string | undefined;
                                                await downloadAuthenticatedPdf(`/documents/contracts/${cid}/checkout-receipt.pdf`, `checkout-${code || cid}.pdf`);
                                            } catch (e: any) {
                                                setCheckoutPdfErr(e.message || 'Không tải được PDF.');
                                            } finally {
                                                setCheckoutPdfLoading(false);
                                            }
                                        }}
                                        className="w-full py-3 border-2 border-primary text-primary hover:bg-primary-fixed/30 font-bold rounded-xl transition text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">download</span>
                                        {checkoutPdfLoading ? 'Đang tải PDF...' : 'Tải biên bản check-out (PDF)'}
                                    </button>
                                </>
                            )}
                            <button onClick={() => setSuccessData(null)}
                                className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition text-sm">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 1: Search */}
            <div className="bg-surface-container-lowest rounded-[24px] border border-outline-variant/10 shadow-sm overflow-hidden">
                <div className="bg-surface-container-low px-6 py-4 border-b border-surface-container-high flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant">search</span>
                    <h2 className="text-base font-bold text-on-surface">Bước 1: Tra cứu Sinh viên đang lưu trú</h2>
                </div>
                <div className="p-6">
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="flex-grow relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[20px]">badge</span>
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Nhập MSSV để tìm kiếm..."
                                className="w-full pl-10 bg-surface outline-none border border-outline-variant/50 focus:border-primary px-4 py-3 rounded-xl transition-colors font-medium text-sm text-on-surface" />
                        </div>
                        <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined text-[18px]">search</span>
                            {isLoading ? 'Đang quét...' : 'Tìm kiếm'}
                        </button>
                    </form>

                    {results.length > 0 && !selected && (
                        <div className="mt-6 overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-surface-container-low text-on-surface-variant text-[11px] uppercase tracking-wider font-bold">
                                    <tr>
                                        <th className="px-6 py-3">Sinh viên</th>
                                        <th className="px-6 py-3">Phòng / HĐ</th>
                                        <th className="px-6 py-3 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-container-highest">
                                    {results.map((item, i) => (
                                        <tr key={i} className="hover:bg-error-container/10 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-on-surface">{item.student.studentCode}</div>
                                                <div className="text-xs text-on-surface-variant">{item.student.fullName}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-primary">Phòng {item.room?.roomNumber || 'N/A'}</div>
                                                <div className="text-xs text-on-surface-variant">HĐ: {item.contract.contractCode}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleSelect(item)}
                                                    className="px-4 py-2 bg-error-container text-on-error-container rounded-lg font-bold text-xs hover:bg-error/10 transition">
                                                    Làm thủ tục trả phòng
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Step 2: Settlement Form */}
            {selected && (
                <div className="space-y-6">
                    {/* Info Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-surface-container-lowest p-5 rounded-[20px] border border-outline-variant/10 shadow-sm">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Sinh viên</p>
                            <p className="text-lg font-black text-primary">{selected.student.studentCode}</p>
                            <p className="text-sm text-on-surface-variant">{selected.student.fullName}</p>
                        </div>
                        <div className="bg-surface-container-lowest p-5 rounded-[20px] border border-outline-variant/10 shadow-sm">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Phòng</p>
                            <p className="text-lg font-black text-primary">{selected.room?.roomNumber}</p>
                            <p className="text-sm text-on-surface-variant">{selected.room?.currentOccupancy}/{selected.room?.capacity} người</p>
                        </div>
                        <div className="bg-surface-container-lowest p-5 rounded-[20px] border border-outline-variant/10 shadow-sm">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Hợp đồng</p>
                            <p className="text-lg font-black text-primary">{selected.contract.contractCode}</p>
                            <p className="text-sm text-on-surface-variant">{selected.contract.startDate} → {selected.contract.endDate}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Utility & Asset */}
                        <div className="bg-surface-container-lowest rounded-[24px] border border-outline-variant/10 shadow-sm overflow-hidden">
                            <div className="bg-surface-container-low px-6 py-4 border-b border-surface-container-high flex items-center gap-3">
                                <span className="material-symbols-outlined text-on-tertiary-container">bolt</span>
                                <h2 className="text-base font-bold text-on-surface">Chỉ số Điện Nước</h2>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="bg-amber-50 border border-amber-100 px-4 py-3 rounded-xl text-sm text-amber-800">
                                    Tháng trước ({selected.lastReading.month}): <strong>Điện {prevElectric} kWh</strong>, <strong>Nước {prevWater} m³</strong>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={LabelClass}><span className="material-symbols-outlined text-[14px] align-text-bottom mr-1">bolt</span>Chỉ số Điện cuối (kWh)</label>
                                    <input type="number" value={electricFinal} onChange={e => setElectricFinal(Number(e.target.value))} min={prevElectric} className={InputClass} />
                                    {electricFinal > prevElectric && (
                                        <p className="text-xs text-on-tertiary-container mt-1">→ {electricUsed} kWh × {electricPricePerKwh.toLocaleString()} = <strong>{electricFee.toLocaleString()} VND</strong></p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className={LabelClass}><span className="material-symbols-outlined text-[14px] align-text-bottom mr-1">water_drop</span>Chỉ số Nước cuối (m³)</label>
                                    <input type="number" value={waterFinal} onChange={e => setWaterFinal(Number(e.target.value))} min={prevWater} className={InputClass} />
                                    {waterFinal > prevWater && (
                                        <p className="text-xs text-on-tertiary-container mt-1">→ {waterUsed} m³ × {waterPricePerM3.toLocaleString()} = <strong>{waterFee.toLocaleString()} VND</strong></p>
                                    )}
                                </div>

                                {/* Asset Condition */}
                                <div className="pt-5 border-t border-surface-container-high space-y-3">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="material-symbols-outlined text-on-surface-variant">inventory_2</span>
                                        <h3 className="text-base font-bold text-on-surface">Tình trạng Tài sản</h3>
                                    </div>
                                    <select value={assetCondition} onChange={e => setAssetCondition(e.target.value as any)} className={InputClass}>
                                        <option value="NORMAL">Bình thường - Không hư hỏng</option>
                                        <option value="DAMAGED">Hư hỏng - Cần đền bù</option>
                                    </select>
                                    {assetCondition === 'DAMAGED' && (
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-error uppercase tracking-wider">Phí đền bù (VND) *</label>
                                            <input type="number" value={damageFee} onChange={e => setDamageFee(Number(e.target.value))} min={1}
                                                className="w-full bg-error-container/20 outline-none border border-error/30 focus:border-error px-4 py-3 rounded-xl transition-colors font-medium text-sm text-error" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Settlement Summary */}
                        <div className="bg-surface-container-lowest rounded-[24px] border border-outline-variant/10 shadow-sm overflow-hidden flex flex-col">
                            <div className="bg-surface-container-low px-6 py-4 border-b border-surface-container-high flex items-center gap-3">
                                <span className="material-symbols-outlined text-green-700">calculate</span>
                                <h2 className="text-base font-bold text-on-surface">Bảng Quyết Toán</h2>
                            </div>
                            <div className="p-6 flex flex-col flex-grow space-y-5">
                                <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 space-y-3 flex-grow">
                                    <div className="flex justify-between text-sm text-on-surface-variant"><span>Tiền điện</span><span className="font-mono font-bold text-on-surface">{electricFee.toLocaleString()} VND</span></div>
                                    <div className="flex justify-between text-sm text-on-surface-variant"><span>Tiền nước</span><span className="font-mono font-bold text-on-surface">{waterFee.toLocaleString()} VND</span></div>
                                    {actualDamageFee > 0 && (
                                        <div className="flex justify-between text-sm text-error font-bold"><span>Phí đền bù</span><span className="font-mono">+ {actualDamageFee.toLocaleString()} VND</span></div>
                                    )}
                                    <div className="flex justify-between text-sm text-green-700"><span>Cọc khấu trừ</span><span className="font-mono font-bold">- {depositAmount.toLocaleString()} VND</span></div>
                                    <div className={`flex justify-between font-bold text-xl border-t border-outline-variant/20 pt-3 mt-2 ${finalSettlement >= 0 ? 'text-error' : 'text-green-700'}`}>
                                        <span>TỔNG</span>
                                        <span className="font-mono">{finalSettlement.toLocaleString()} VND</span>
                                    </div>
                                    {finalSettlement < 0 && (
                                        <p className="text-xs text-green-600 italic">* Số âm = hoàn tiền cọc dư cho sinh viên.</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className={LabelClass}>Tiền cọc khấu trừ (VND)</label>
                                    <input type="number" value={depositAmount} onChange={e => setDepositAmount(Number(e.target.value))} className={InputClass} />
                                </div>

                                {/* Confirm checkboxes */}
                                <div className="space-y-3 pt-2">
                                    <div className={`flex items-center gap-3 p-4 border rounded-xl transition-colors ${paymentError && !isPaymentConfirmed ? 'border-error bg-error-container/20 ring-2 ring-error/30' : 'border-outline-variant/30 bg-surface-container-low'}`}>
                                        <input type="checkbox" id="paymentConfirm" checked={isPaymentConfirmed}
                                            onChange={e => { setIsPaymentConfirmed(e.target.checked); setPaymentError(false); setErrorMsg(''); }}
                                            className="w-5 h-5 text-primary rounded-lg focus:ring-primary/20 border-outline-variant cursor-pointer" disabled={isForceCheckout} />
                                        <label htmlFor="paymentConfirm" className={`font-bold cursor-pointer text-sm ${paymentError && !isPaymentConfirmed ? 'text-error' : 'text-on-surface-variant'}`}>
                                            Xác nhận sinh viên đã thanh toán đủ công nợ
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 border border-on-tertiary-container/20 bg-amber-50 rounded-xl">
                                        <input type="checkbox" id="forceCheckout" checked={isForceCheckout}
                                            onChange={e => { setIsForceCheckout(e.target.checked); if (e.target.checked) { setIsPaymentConfirmed(false); setPaymentError(false); setErrorMsg(''); } }}
                                            className="w-5 h-5 text-on-tertiary-container rounded-lg cursor-pointer" />
                                        <label htmlFor="forceCheckout" className="font-bold cursor-pointer text-sm text-on-tertiary-container">
                                            Thanh lý cưỡng chế (vắng mặt) — Chuyển nợ xấu
                                        </label>
                                    </div>
                                </div>

                                <button onClick={handleProcess} disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 py-4 bg-error text-white rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-error/20 disabled:opacity-50">
                                    <span className="material-symbols-outlined text-[18px]">warning</span>
                                    {isLoading ? 'Đang xử lý...' : 'Xác nhận Trả Phòng'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
