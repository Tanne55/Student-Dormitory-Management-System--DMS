'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';

export default function ManageExtensionsPage() {
    const router = useRouter();
    const [extensions, setExtensions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const user = requireAuth(router);
        if (!user) return;
        if (!['staff', 'admin'].includes(user.role)) {
            router.replace('/dashboard');
            return;
        }
        fetchExtensions();
    }, [router, filterStatus]);

    const fetchExtensions = async () => {
        setIsLoading(true);
        setErrorMsg('');
        try {
            const params = new URLSearchParams();
            if (filterStatus) params.set('status', filterStatus);
            const res = await apiFetch(`${API_BASE}/dorm-extensions/all?${params}`, { headers: authHeaders() });
            if (res.ok) {
                setExtensions(await res.json());
            } else {
                setErrorMsg('Không thể tải danh sách gia hạn.');
            }
        } catch {
            setErrorMsg('Lỗi kết nối máy chủ.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        setIsSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');
        try {
            const res = await apiFetch(`${API_BASE}/dorm-extensions/${id}/status`, {
                method: 'PATCH',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                setSuccessMsg(`Đã ${status === 'APPROVED' ? 'duyệt' : 'từ chối'} đơn gia hạn thành công!`);
                setTimeout(() => setSuccessMsg(''), 3000);
                fetchExtensions();
            } else {
                const data = await res.json();
                setErrorMsg(data.message || 'Lỗi xử lý hệ thống.');
            }
        } catch {
            setErrorMsg('Lỗi kết nối.');
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
                        <span className="material-symbols-outlined text-2xl">history</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-on-surface tracking-tight">Duyệt Gia hạn Lưu trú</h1>
                        <p className="text-sm text-on-surface-variant font-medium">Xem xét các yêu cầu ở lại KTX cho học kỳ mới.</p>
                    </div>
                </div>
                {/* Filter */}
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-surface outline-none border border-outline-variant/50 focus:border-primary px-4 py-2.5 rounded-xl transition-colors font-bold text-sm text-on-surface min-w-[180px]">
                    <option value="">Tất cả trạng thái</option>
                    <option value="PENDING">Chờ duyệt</option>
                    <option value="APPROVED">Đã duyệt</option>
                    <option value="REJECTED">Bị từ chối</option>
                </select>
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

            {/* Data Table */}
            <div className="bg-surface-container-lowest rounded-[24px] border border-surface-container-highest overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    </div>
                ) : extensions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant">
                        <span className="material-symbols-outlined text-6xl opacity-20 mb-4">folder_off</span>
                        <p className="font-bold text-lg">Không có đơn gia hạn nào</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-surface-container-low text-on-surface-variant text-[11px] uppercase tracking-wider font-bold">
                                <tr>
                                    <th className="px-6 py-4">Ngày nộp</th>
                                    <th className="px-6 py-4">MSSV</th>
                                    <th className="px-6 py-4">Phòng</th>
                                    <th className="px-6 py-4 text-center">Học kỳ</th>
                                    <th className="px-6 py-4 text-center">Trạng thái</th>
                                    <th className="px-6 py-4 text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-container-highest">
                                {extensions.map((ext) => (
                                    <tr key={ext.id} className="hover:bg-surface-container-low/50 transition-colors group">
                                        <td className="px-6 py-4 text-on-surface-variant font-medium">
                                            {new Date(ext.createdAt).toLocaleString('vi-VN')}
                                        </td>
                                        <td className="px-6 py-4 font-black text-primary font-mono">
                                            {ext.studentCode}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-on-surface">
                                            {ext.roomNumber}
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-primary">
                                            {ext.semester}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {statusBadge(ext.status)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {ext.status === 'PENDING' ? (
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleUpdateStatus(ext.id, 'APPROVED')}
                                                        disabled={isSubmitting}
                                                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition disabled:opacity-50 shadow-sm">
                                                        Duyệt
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(ext.id, 'REJECTED')}
                                                        disabled={isSubmitting}
                                                        className="px-4 py-2 bg-error-container text-on-error-container rounded-lg text-xs font-bold hover:bg-error/10 transition disabled:opacity-50 border border-error/20">
                                                        Từ chối
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-outline text-xs italic">Đã xử lý</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
