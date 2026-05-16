'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';
import { downloadAuthenticatedPdf } from '@/lib/pdfDownload';

export default function InvoicesPage() {
    const router = useRouter();
    const [role, setRole] = useState<string>('');
    const [userCode, setUserCode] = useState<string>('');
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [toastMsg, setToastMsg] = useState('');

    // Filters for Staff
    const [filterStatus, setFilterStatus] = useState('');
    const [filterMonth, setFilterMonth] = useState('');

    // Modal
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [studentCodeInput, setStudentCodeInput] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'VNPAY'>('CASH');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

    useEffect(() => {
        const user = requireAuth(router);
        if (!user) return;
        setRole(user.role);
        setUserCode(user.username); // Assuming username is student code for student role
        fetchInvoices(user.role);
    }, [router, filterStatus, filterMonth]);

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 4000);
    };

    const fetchInvoices = async (currentRole: string) => {
        setIsLoading(true);
        setErrorMsg('');
        try {
            let url = `${API_BASE}/invoices/my-room`;
            
            if (['staff', 'admin'].includes(currentRole)) {
                const params = new URLSearchParams();
                if (filterStatus) params.set('status', filterStatus);
                if (filterMonth) params.set('month', filterMonth);
                url = `${API_BASE}/invoices/all?${params}`;
            }

            const res = await apiFetch(url, { headers: authHeaders() });

            if (res.ok) {
                const data = await res.json();
                setInvoices(Array.isArray(data) ? data : []);
            } else {
                const err = await res.json();
                setErrorMsg(err.message || 'Lỗi tải dữ liệu hóa đơn.');
            }
        } catch {
            setErrorMsg('Lỗi kết nối máy chủ.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenPayModal = (invoice: any) => {
        setSelectedInvoice(invoice);
        setStudentCodeInput(role === 'student' ? userCode : '');
        setPaymentMethod(role === 'student' ? 'VNPAY' : 'CASH');
        setIsPayModalOpen(true);
        setErrorMsg('');
    };

    const handleConfirmPayment = async () => {
        if (!selectedInvoice) return;
        if (!studentCodeInput.trim()) {
            setErrorMsg('Vui lòng cung cấp Mã Sinh Viên người thanh toán.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');
        try {
            if (paymentMethod === 'VNPAY') {
                const res = await apiFetch(`${API_BASE}/vnpay/create-payment-url`, {
                    method: 'POST',
                    headers: authHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({
                        invoiceId: selectedInvoice.id,
                        payerStudentCode: studentCodeInput,
                    }),
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.paymentUrl) {
                        window.location.href = data.paymentUrl;
                        return;
                    }
                    setErrorMsg('Không nhận được URL thanh toán từ VNPay.');
                } else {
                    const err = await res.json();
                    setErrorMsg(err.message || 'Không khởi tạo được thanh toán VNPay.');
                }
            } else {
                const res = await apiFetch(`${API_BASE}/payments`, {
                    method: 'POST',
                    headers: authHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({
                        invoiceId: selectedInvoice.id,
                        payerStudentCode: studentCodeInput,
                        method: paymentMethod,
                    }),
                });

                if (res.ok) {
                    showToast('Đã xác nhận thanh toán Hóa đơn thành công!');
                    setIsPayModalOpen(false);
                    fetchInvoices(role);
                } else {
                    const err = await res.json();
                    setErrorMsg(err.message || 'Lỗi xác thực luồng thanh toán');
                }
            }
        } catch {
            setErrorMsg('Lỗi kết nối máy chủ tài chính.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatVND = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const handleDownloadInvoicePdf = async (invoiceId: string) => {
        setPdfLoadingId(invoiceId);
        setErrorMsg('');
        try {
            await downloadAuthenticatedPdf(`/documents/invoices/${invoiceId}/pdf`, `hoadon-dichvu-${invoiceId}.pdf`);
        } catch (e: any) {
            setErrorMsg(e.message || 'Lỗi kết xuất PDF.');
        } finally {
            setPdfLoadingId(null);
        }
    };

    const isStaff = ['staff', 'admin'].includes(role);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/10 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
                        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-on-surface tracking-tight">
                            {isStaff ? 'Quản lý Hóa đơn Thu ngân' : 'Hóa đơn Điện Nước Phòng'}
                        </h1>
                        <p className="text-sm text-on-surface-variant font-medium">
                            {isStaff ? 'Quản lý công nợ, đối soát và xuất phiếu thu dịch vụ nội trú.' : 'Chỉ cần một người đại diện thanh toán, cả phòng sẽ hoàn tất nghĩa vụ.'}
                        </p>
                    </div>
                </div>
                {isStaff && (
                    <Link href="/dashboard/utility-readings" className="flex items-center gap-2 px-6 py-3 bg-surface border border-outline-variant/30 text-on-surface font-bold rounded-xl hover:bg-surface-container-lowest hover:border-primary hover:text-primary transition-all shadow-sm">
                        <span className="material-symbols-outlined text-lg">electric_meter</span>
                        Chốt số điện nước kỳ mới
                    </Link>
                )}
            </div>

            {errorMsg && !isPayModalOpen && (
                <div className="bg-error-container text-on-error-container px-6 py-4 rounded-xl flex items-start gap-4 border border-error/20">
                    <span className="material-symbols-outlined text-error mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                    <span className="text-sm font-bold leading-relaxed">{errorMsg}</span>
                </div>
            )}

            {/* Filters Dashboard (For Staff Only) */}
            {isStaff && (
                <div className="bg-surface-container-lowest p-6 rounded-[24px] shadow-sm border border-surface-container-highest flex gap-4">
                    <div className="flex-1 space-y-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lọc theo Kỳ (Tháng/Năm)</label>
                        <input 
                            type="month" 
                            value={filterMonth} 
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-3 font-bold text-sm text-on-surface outline-none focus:border-green-500 transition-colors" 
                        />
                    </div>
                    <div className="flex-1 space-y-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái Nợ</label>
                        <select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-3 font-bold text-sm text-on-surface outline-none focus:border-green-500 transition-colors"
                        >
                            <option value="">-- Tất cả biểu ghi --</option>
                            <option value="UNPAID">Chưa Thu Tiền (Nợ Tồn)</option>
                            <option value="PAID">Đã Quyết Toán (Hoàn Tất)</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Invoices Table Body Container */}
            <div className="bg-surface-container-lowest rounded-[24px] shadow-sm border border-surface-container-highest overflow-hidden p-6 lg:p-8">
                <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-outline">list</span>
                    <h2 className="font-bold text-on-surface">Biên lai Khấu trừ:</h2>
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">{invoices.length} mục</span>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <div className="w-10 h-10 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin"></div>
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <span className="material-symbols-outlined text-6xl opacity-30 mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                        <p className="font-bold text-lg text-on-surface">Không có hợp đồng báo nợ.</p>
                        <p className="text-sm mt-1">{isStaff ? 'Đổi bộ lọc để tra cứu dòng tiền quá khứ.' : 'Tài chính phòng bạn tháng này đang trắng tinh, không nợ đồng nào!'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-surface-container-low text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
                                <tr>
                                    <th className="px-5 py-4 rounded-tl-[16px]">Kỳ Báo Cáo</th>
                                    {isStaff && <th className="px-5 py-4">Tọa độ Phòng</th>}
                                    <th className="px-5 py-4 text-right">Chi phí Điện năng</th>
                                    <th className="px-5 py-4 text-right">Sinh hoạt Thủy cục</th>
                                    <th className="px-5 py-4 text-right text-primary-fixed-variant bg-primary/5">Tổng Tiền (VND)</th>
                                    <th className="px-5 py-4 text-center">Tình trạng</th>
                                    <th className="px-5 py-4 text-right rounded-tr-[16px]">Bảng kê & Xử lý</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-container-highest">
                                {invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-surface-container-low/50 transition-colors group">
                                        <td className="px-5 py-4">
                                            <span className="font-bold text-on-surface">{inv.month}</span>
                                        </td>
                                        {isStaff && (
                                            <td className="px-5 py-4">
                                                <span className="font-black text-primary text-base">{inv.room?.roomNumber || 'Unknown'}</span>
                                            </td>
                                        )}
                                        <td className="px-5 py-4 text-right text-slate-600 font-medium">
                                            {formatVND(inv.electricFee)}
                                        </td>
                                        <td className="px-5 py-4 text-right text-slate-600 font-medium">
                                            {formatVND(inv.waterFee)}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="font-black text-error text-lg tracking-tight">{formatVND(inv.totalAmount)}</div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {inv.status === 'PAID' ? (
                                                <div className="flex flex-col items-center">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest bg-green-100 text-green-800 border border-green-200">
                                                        <span className="material-symbols-outlined text-[14px]">verified</span> Đã Thu
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 mt-1">bởi {inv.paidBy}</span>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest bg-error-container text-on-error-container border border-error/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span> Báo Nợ
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                {isStaff && (
                                                    <button
                                                        type="button"
                                                        disabled={pdfLoadingId === inv.id}
                                                        onClick={() => void handleDownloadInvoicePdf(inv.id)}
                                                        className="w-10 h-10 rounded-xl bg-surface border border-outline-variant/30 flex items-center justify-center text-slate-600 hover:text-primary hover:border-primary transition-all shadow-sm"
                                                        title="Tải PDF Biên lai hóa đơn"
                                                    >
                                                        {pdfLoadingId === inv.id ? (
                                                            <span className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></span>
                                                        ) : (
                                                            <span className="material-symbols-outlined text-[18px]">file_download</span>
                                                        )}
                                                    </button>
                                                )}
                                                {inv.status === 'UNPAID' ? (
                                                    <button 
                                                        onClick={() => handleOpenPayModal(inv)} 
                                                        className={`inline-flex items-center gap-1.5 px-4 py-2 font-bold text-xs text-white rounded-xl shadow-md transition-all ${isStaff ? 'bg-primary hover:bg-primary-container shadow-primary/20 hover:text-primary-fixed-variant' : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">{isStaff ? 'request_quote' : 'qr_code_scanner'}</span>
                                                        {isStaff ? 'Thu Lệ Phí' : 'Quét Mã Thanh Toán'}
                                                    </button>
                                                ) : (
                                                    <div className="w-[124px]"></div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payment Modal Workflow */}
            {isPayModalOpen && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-fixed/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-surface-container-lowest rounded-[32px] shadow-2xl max-w-md w-full p-8 border border-surface-container-highest relative overflow-hidden">
                        
                        {/* Decorative Background Icon */}
                        <div className="absolute -top-6 -right-6 opacity-[0.03] pointer-events-none">
                            <span className="material-symbols-outlined text-[12rem]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                receipt_long
                            </span>
                        </div>

                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <h3 className="text-xl font-black text-on-surface flex items-center gap-2">
                                <span className={`material-symbols-outlined text-3xl ${isStaff ? 'text-primary' : 'text-green-600'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                    {isStaff ? 'point_of_sale' : 'contactless'}
                                </span>
                                Phiếu tính tiền {selectedInvoice.month}
                            </h3>
                            <button onClick={() => setIsPayModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-slate-400 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Invoice Receipt Detail */}
                        <div className="bg-surface-container-low rounded-2xl p-5 mb-6 border border-surface-container-high space-y-3 relative z-10">
                            <div className="flex justify-between items-center border-b border-outline-variant/20 pb-3 mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nguồn truy thu</span>
                                <span className="font-black text-primary text-xl px-3 border-2 border-primary/20 bg-white rounded-lg">{isStaff ? selectedInvoice.room?.roomNumber : 'P. Bạn'}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-slate-600 font-medium">Chi số điện năng</span>
                                <span className="font-bold font-mono text-on-surface">{formatVND(selectedInvoice.electricFee)}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center border-b border-dashed border-outline-variant/30 pb-3">
                                <span className="text-slate-600 font-medium">Chi số nước sinh hoạt</span>
                                <span className="font-bold font-mono text-on-surface">{formatVND(selectedInvoice.waterFee)}</span>
                            </div>
                            <div className="flex justify-between items-end pt-1">
                                <span className="text-xs font-bold text-error uppercase tracking-widest">Tổng tiền cần thanh toán</span>
                                <span className="font-black font-mono text-error text-3xl tracking-tight leading-none">{formatVND(selectedInvoice.totalAmount)}</span>
                            </div>
                        </div>

                        {errorMsg && (
                            <div className="mb-4 bg-error-container border border-error/20 p-3 rounded-xl text-sm text-on-error-container font-bold relative z-10 flex items-start gap-2">
                                <span className="material-symbols-outlined text-[18px]">error</span> {errorMsg}
                            </div>
                        )}

                        {/* Input & Call to action */}
                        <div className="space-y-4 relative z-10">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                                    <span className="material-symbols-outlined text-[14px]">pin</span>
                                    Mã Sinh Viên Nộp Tiền <span className="text-error">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={studentCodeInput}
                                    onChange={(e) => setStudentCodeInput(e.target.value.toUpperCase())}
                                    disabled={role === 'student'}
                                    className="w-full rounded-2xl border border-outline-variant/50 focus:border-primary px-4 py-4 font-black font-mono text-lg text-center tracking-widest bg-surface text-on-surface outline-none transition-colors shadow-inner uppercase disabled:bg-surface-variant disabled:text-slate-400"
                                    placeholder="Vd: 20216000"
                                />
                                {role === 'student' && <p className="text-[11px] text-center text-slate-500 font-medium mt-1">Đại diện đóng thay cả phòng</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                                    <span className="material-symbols-outlined text-[14px]">payments</span>
                                    Hình thức thanh toán
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {([
                                        { v: 'VNPAY', label: 'VNPay', icon: 'account_balance_wallet' },
                                        { v: 'CASH', label: 'Tiền mặt', icon: 'payments' },
                                        { v: 'BANK_TRANSFER', label: 'Chuyển khoản', icon: 'account_balance' },
                                    ] as const).map((opt) => {
                                        const active = paymentMethod === opt.v;
                                        const disabled = role === 'student' && opt.v !== 'VNPAY';
                                        return (
                                            <button
                                                key={opt.v}
                                                type="button"
                                                disabled={disabled}
                                                onClick={() => setPaymentMethod(opt.v)}
                                                className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 transition-all text-xs font-bold ${
                                                    active
                                                        ? 'border-primary bg-primary/10 text-primary'
                                                        : 'border-outline-variant/30 bg-surface text-on-surface-variant hover:border-primary/40'
                                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                                            >
                                                <span className="material-symbols-outlined text-lg">{opt.icon}</span>
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                onClick={handleConfirmPayment}
                                disabled={isSubmitting}
                                className={`w-full text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none hover:-translate-y-0.5 ${isStaff ? 'bg-primary hover:bg-primary-container hover:text-primary-fixed-variant shadow-primary/20' : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'}`}
                            >
                                {isSubmitting ? (
                                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">
                                            {paymentMethod === 'VNPAY' ? 'qr_code_scanner' : 'paid'}
                                        </span>
                                        {paymentMethod === 'VNPAY'
                                            ? 'Tiếp tục với VNPay'
                                            : isStaff
                                                ? 'Đã thu khoản tiền này'
                                                : 'Xác nhận thanh toán'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ghost Toast System */}
            {toastMsg && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-surface-container-lowest/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl border border-surface-container-high animate-[bounce_1s_ease-in-out]">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-inner">
                        <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                    </div>
                    <p className="text-sm font-bold text-on-surface">{toastMsg}</p>
                </div>
            )}

        </div>
    );
}
