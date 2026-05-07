'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';

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
        fetchInitialData();
    }, [router]);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const extRes = await apiFetch(`${API_BASE}/dorm-extensions/eligibility`, {
                headers: authHeaders(),
            });
            if (extRes.ok) {
                setEligibility(await extRes.json());
            }
            await fetchHistory();
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchHistory = async () => {
        const res = await apiFetch(`${API_BASE}/dorm-extensions/my-requests`, {
            headers: authHeaders(),
        });
        if (res.ok) {
            setRequests(await res.json());
        }
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

    const statusBadge = (st: string) => {
         switch (st) {
             case 'PENDING': return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>Chờ duyệt</span>;
             case 'APPROVED': return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-800 border border-green-200"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>Đã duyệt</span>;
             case 'REJECTED': return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-800 border border-red-200"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>Từ chối</span>;
             default: return <span className="px-3 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600">{st}</span>;
         }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/10 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-2xl">autorenew</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-on-surface tracking-tight">Gia hạn nội trú</h1>
                        <p className="text-sm text-on-surface-variant font-medium">Duy trì chỗ ở trong KTX cho học kỳ tiếp theo.</p>
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
            {successMsg && (
                <div className="bg-green-50 text-green-800 px-6 py-4 rounded-xl flex items-center gap-3 border border-green-200">
                    <span className="material-symbols-outlined text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="text-sm font-bold">{successMsg}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel: Eligibility / Form */}
                <div className="lg:col-span-1">
                    {isLoading ? (
                        <div className="bg-surface-container-lowest p-8 rounded-[24px] border border-outline-variant/10 shadow-sm flex justify-center">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        </div>
                    ) : eligibility?.isEligible ? (
                        <div className="bg-surface-container-lowest rounded-[24px] border border-outline-variant/10 shadow-sm overflow-hidden">
                            <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex items-center justify-between">
                                <h3 className="font-bold text-green-800 text-sm uppercase tracking-wider">Đủ điều kiện</h3>
                                <span className="material-symbols-outlined text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Phòng Hiện Tại</label>
                                    <div className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 font-black text-primary text-lg">
                                        {eligibility.data.roomNumber}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Học Kỳ Áp Dụng</label>
                                    <div className="w-full bg-primary-fixed/30 border border-primary-fixed rounded-xl px-4 py-3 font-bold text-primary text-sm">
                                        {eligibility.data.semester}
                                    </div>
                                </div>

                                <div className="flex items-start mt-4 pt-4 border-t border-surface-container-high gap-3">
                                    <input id="agreement" type="checkbox" checked={isAgreed} onChange={e => setIsAgreed(e.target.checked)}
                                        className="mt-0.5 w-5 h-5 rounded-lg text-primary focus:ring-primary/20 border-outline-variant cursor-pointer" required />
                                    <label htmlFor="agreement" className="text-sm text-on-surface-variant cursor-pointer select-none leading-relaxed">
                                        Tôi cam kết tiếp tục thực hiện đầy đủ nội quy của Ký túc xá.
                                    </label>
                                </div>

                                <button type="submit" disabled={!isAgreed || isSubmitting}
                                    className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20">
                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                    {isSubmitting ? 'Đang gửi...' : 'Gửi Yêu Cầu Gia Hạn'}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="bg-surface-container-lowest rounded-[24px] border border-error/20 shadow-sm overflow-hidden">
                            <div className="bg-error-container/40 px-6 py-4 border-b border-error/10 flex items-center justify-between">
                                <h3 className="font-bold text-on-error-container text-sm uppercase tracking-wider">Không đủ điều kiện</h3>
                                <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>block</span>
                            </div>
                            <div className="p-6 text-on-surface-variant text-sm leading-relaxed">
                                {eligibility?.error || 'Lỗi không xác định.'}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel: History */}
                <div className="lg:col-span-2">
                    <div className="bg-surface-container-lowest rounded-[24px] border border-surface-container-highest overflow-hidden shadow-sm h-full">
                        <div className="bg-surface-container-low px-6 py-4 border-b border-surface-container-high flex items-center gap-3">
                            <span className="material-symbols-outlined text-on-surface-variant">history</span>
                            <h3 className="text-base font-bold text-on-surface">Lịch sử giao dịch</h3>
                        </div>
                        
                        {isLoading ? (
                            <div className="flex justify-center items-center h-48">
                                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant">
                                <span className="material-symbols-outlined text-6xl opacity-20 mb-4">folder_off</span>
                                <p className="font-bold">Chưa có đơn gia hạn nào</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-surface-container-low text-on-surface-variant text-[11px] uppercase tracking-wider font-bold">
                                        <tr>
                                            <th className="px-6 py-4">Ngày nộp</th>
                                            <th className="px-6 py-4">Phòng</th>
                                            <th className="px-6 py-4">Học kỳ gia hạn</th>
                                            <th className="px-6 py-4 text-right">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-container-highest">
                                        {requests.map(req => (
                                            <tr key={req.id} className="hover:bg-surface-container-low/50 transition-colors">
                                                <td className="px-6 py-4 text-on-surface-variant font-medium">
                                                    {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                                                </td>
                                                <td className="px-6 py-4 font-black text-primary">
                                                    {req.roomNumber}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-on-surface">
                                                    {req.semester}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {statusBadge(req.status)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
