'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';

const CATEGORY_LABELS: Record<string, string> = {
    ELECTRIC: 'Điện & Ánh sáng',
    WATER: 'Nước & Cấp thoát',
    FURNITURE: 'Nội thất & Không gian',
    OTHER: 'Yêu cầu Khác',
};

const CATEGORY_COLORS: Record<string, string> = {
    ELECTRIC: 'bg-orange-100 text-orange-800 border-orange-200',
    WATER: 'bg-blue-100 text-blue-800 border-blue-200',
    FURNITURE: 'bg-amber-100 text-amber-800 border-amber-200',
    OTHER: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function MaintenancePage() {
    const router = useRouter();
    const [tickets, setTickets] = useState<any[]>([]);
    const [summary, setSummary] = useState({ total: 0, pending: 0, processing: 0, resolved: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    // Modal state
    const [modalTicket, setModalTicket] = useState<any>(null);
    const [modalAction, setModalAction] = useState<'PROCESSING' | 'RESOLVED'>('PROCESSING');
    const [staffNote, setStaffNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [toastMsg, setToastMsg] = useState('');

    useEffect(() => {
        const user = requireAuth(router);
        if (!user) return;
        if (!['staff', 'admin'].includes(user.role)) {
            router.replace('/dashboard');
            return;
        }
        fetchTickets();
    }, [router, filterStatus, filterCategory]);

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 4000);
    };

    const fetchTickets = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterStatus) params.set('status', filterStatus);
            if (filterCategory) params.set('category', filterCategory);

            const res = await apiFetch(`${API_BASE}/repair-requests/all?${params}`, {
                headers: authHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                setTickets(data.tickets);
                setSummary(data.summary);
            } else {
                const err = await res.json().catch(() => ({}));
                setErrorMsg(err.message || 'Lỗi tải dữ liệu');
            }
        } catch { setErrorMsg('Lỗi kết nối bộ định tuyến.'); }
        finally { setIsLoading(false); }
    };

    const openModal = (ticket: any, action: 'PROCESSING' | 'RESOLVED') => {
        setModalTicket(ticket);
        setModalAction(action);
        setStaffNote('');
        setErrorMsg('');
    };

    const handleUpdateStatus = async () => {
        if (!modalTicket) return;
        setIsSubmitting(true);
        setErrorMsg('');
        try {
            const res = await apiFetch(`${API_BASE}/repair-requests/${modalTicket.id}/status`, {
                method: 'PATCH',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ status: modalAction, staffNote })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Lỗi xử lý luồng vận hành');
            showToast(modalAction === 'PROCESSING' ? 'Đã tiếp nhận ticket bảo trì!' : 'Đã nghiệm thu và đóng ticket!');
            setModalTicket(null);
            fetchTickets();
        } catch (err: any) { setErrorMsg(err.message); }
        finally { setIsSubmitting(false); }
    };

    const statusBadge = (st: string) => {
        switch (st) {
            case 'PENDING': 
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest bg-error-container text-on-error-container border border-error/20"><span className="w-1.5 h-1.5 rounded-full bg-error mr-1.5 animate-pulse"></span>Chờ thợ</span>;
            case 'PROCESSING': 
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest bg-primary-fixed text-primary-fixed-variant border border-primary/20"><span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 animate-ping mr-2"></span>Đang sửa...</span>;
            case 'RESOLVED': 
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest bg-green-100 text-green-800 border border-green-200"><span className="material-symbols-outlined text-[12px] mr-1">task_alt</span>Hoàn tất</span>;
            default: return <span>{st}</span>;
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header Title */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/10 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>build</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-on-surface tracking-tight">Quản lý Báo cáo Sự cố</h1>
                        <p className="text-sm text-on-surface-variant font-medium">Điều phối thợ, tiếp nhận yêu cầu và đóng ticket nghiệm thu.</p>
                    </div>
                </div>
            </div>

            {errorMsg && !modalTicket && (
                <div className="bg-error-container text-on-error-container px-6 py-4 rounded-xl flex items-start gap-4 border border-error/20">
                    <span className="material-symbols-outlined text-error mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                    <span className="text-sm font-bold leading-relaxed">{errorMsg}</span>
                </div>
            )}

            {/* Metrics Dashboard (Bento Format) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <span className="material-symbols-outlined absolute right-[-10px] bottom-[-10px] text-6xl text-slate-100">list_alt</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tổng sự cố</p>
                    <p className="text-4xl font-black text-on-surface">{summary.total}</p>
                </div>
                <div className="bg-error-container/20 border border-error/20 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <span className="material-symbols-outlined absolute right-[-10px] bottom-[-10px] text-6xl text-error/5">warning</span>
                    <p className="text-[10px] font-bold text-error uppercase tracking-widest mb-1">Chờ tiếp nhận (Urgent)</p>
                    <p className="text-4xl font-black text-error">{summary.pending}</p>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <span className="material-symbols-outlined absolute right-[-10px] bottom-[-10px] text-6xl text-primary/5">handyman</span>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Đang thi công sửa</p>
                    <p className="text-4xl font-black text-primary">{summary.processing}</p>
                </div>
                <div className="bg-green-50/50 border border-green-200 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <span className="material-symbols-outlined absolute right-[-10px] bottom-[-10px] text-6xl text-green-600/5">check_circle</span>
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">Đã nghiệm thu</p>
                    <p className="text-4xl font-black text-green-700">{summary.resolved}</p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-surface-container-lowest rounded-[24px] border border-surface-container-highest shadow-sm p-6 lg:p-8">
                
                {/* Filters */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-surface-container-high">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline">tune</span>
                        <h2 className="font-bold text-on-surface">Bộ lọc truy xuất:</h2>
                        <span className="bg-primary-fixed text-primary-fixed-variant px-2 py-0.5 rounded text-xs font-bold">{tickets.length} Phiếu</span>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <select 
                            value={filterStatus} onChange={e => setFilterStatus(e.target.value)} 
                            className="bg-surface border border-outline-variant/30 rounded-xl px-4 py-2 font-medium text-sm text-on-surface outline-none focus:border-primary w-full md:w-auto"
                        >
                            <option value="">(Xem tất cả trạng thái)</option>
                            <option value="PENDING">Chỉ báo mới (Chờ lệnh)</option>
                            <option value="PROCESSING">Đang được sửa</option>
                            <option value="RESOLVED">Đã hoàn thành</option>
                        </select>
                        <select 
                            value={filterCategory} onChange={e => setFilterCategory(e.target.value)} 
                            className="bg-surface border border-outline-variant/30 rounded-xl px-4 py-2 font-medium text-sm text-on-surface outline-none focus:border-primary w-full md:w-auto"
                        >
                            <option value="">(Tất cả thiết bị/vật tư)</option>
                            <option value="ELECTRIC">Lỗi Đèn / Điện lưới</option>
                            <option value="WATER">Lỗi Ống nước / Toilet</option>
                            <option value="FURNITURE">Hư hỏng Giường / Tủ</option>
                            <option value="OTHER">Phản ánh Tạp vụ / Khác</option>
                        </select>
                    </div>
                </div>

                {/* Data Table */}
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <span className="material-symbols-outlined text-6xl opacity-30 mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <p className="font-bold text-lg text-on-surface">Không tìm thấy yêu cầu trực nào.</p>
                        <p className="text-sm">Trạm Bảo trì hiện đang sạch việc.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-surface-container-low text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
                                <tr>
                                    <th className="px-5 py-4 rounded-tl-[16px]">Timeline</th>
                                    <th className="px-5 py-4">Tọa độ Sự cố</th>
                                    <th className="px-5 py-4">Phân loại Vật tư</th>
                                    <th className="px-5 py-4 w-1/3">Mô tả (Nguyên nhân)</th>
                                    <th className="px-5 py-4 text-center">Bằng chứng</th>
                                    <th className="px-5 py-4 text-center">Tình trạng</th>
                                    <th className="px-5 py-4 text-right rounded-tr-[16px]">Điều động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-container-highest">
                                {tickets.map(t => (
                                    <tr key={t.id} className="hover:bg-surface-container-low/50 transition-colors group">
                                        <td className="px-5 py-4 text-slate-500 font-medium">
                                            {new Date(t.createdAt).toLocaleDateString('vi-VN')} <br/>
                                            <span className="text-xs">{new Date(t.createdAt).toLocaleTimeString('vi-VN')}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-black text-primary text-lg">{t.roomNumber}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Từ SV: {t.studentCode}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${CATEGORY_COLORS[t.category] || 'bg-slate-100 text-slate-700'}`}>
                                                <span className="w-2 h-2 rounded-full bg-current opacity-70"></span>
                                                {CATEGORY_LABELS[t.category] || t.category}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-sm font-medium text-slate-600 whitespace-normal line-clamp-2 max-w-[250px]" title={t.description}>
                                                {t.description}
                                            </p>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {t.attachmentUrl ? (
                                                <a href={`${API_BASE}${t.attachmentUrl}`} target="_blank" rel="noreferrer"
                                                   className="inline-flex w-8 h-8 items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors shadow-sm">
                                                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                                                </a>
                                            ) : (
                                                <span className="material-symbols-outlined text-slate-300">hide_image</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {statusBadge(t.status)}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            {t.status === 'PENDING' && (
                                                <button onClick={() => openModal(t, 'PROCESSING')}
                                                    className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-xl font-bold hover:bg-orange-200 transition-colors text-xs border border-orange-200 shadow-sm"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">directions_run</span> Cử thợ
                                                </button>
                                            )}
                                            {t.status === 'PROCESSING' && (
                                                <button onClick={() => openModal(t, 'RESOLVED')}
                                                    className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-primary-container hover:text-primary-fixed-variant transition-colors text-xs shadow-md shadow-primary/20"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">inventory</span> Nghiệm thu
                                                </button>
                                            )}
                                            {t.status === 'RESOLVED' && (
                                                <span className="text-xs font-bold text-slate-400 bg-surface-container-highest px-3 py-1.5 rounded-lg border border-outline-variant/30">Lưu kho</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Workflow */}
            {modalTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-fixed/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-surface-container-lowest rounded-[32px] shadow-2xl max-w-lg w-full p-8 border border-surface-container-highest relative overflow-hidden">
                        
                        {/* Decorative Background Icon */}
                        <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none">
                            <span className="material-symbols-outlined text-[15rem]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                {modalAction === 'PROCESSING' ? 'handyman' : 'task_alt'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <h3 className="text-2xl font-black text-on-surface flex items-center gap-3 tracking-tight">
                                {modalAction === 'PROCESSING' ? (
                                    <><span className="material-symbols-outlined text-orange-500 text-3xl">construction</span> Điều thợ Tới</>
                                ) : (
                                    <><span className="material-symbols-outlined text-primary text-3xl text-3xl">fact_check</span> Ký Nghiệm thu</>
                                )}
                            </h3>
                            <button onClick={() => setModalTicket(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-slate-400 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Ticket Info Card */}
                        <div className="bg-surface-container-low rounded-2xl p-5 mb-6 border border-surface-container-high space-y-3 relative z-10">
                            <div className="flex justify-between text-sm items-center border-b border-surface-container-high pb-2">
                                <span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Định danh Sự cố</span>
                                <span className="font-mono font-bold text-primary">#{modalTicket.id.substring(0, 8).toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-slate-600 font-medium">Báo cáo từ phòng</span>
                                <span className="font-black text-lg bg-white px-2 py-0.5 rounded-lg border border-outline-variant/30">{modalTicket.roomNumber}</span>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-slate-600 font-medium">Sửa chữa hạng mục</span>
                                <span className="font-bold text-on-surface">{CATEGORY_LABELS[modalTicket.category]}</span>
                            </div>
                            <div className="text-sm bg-white p-3 rounded-xl border border-outline-variant/20 italic text-slate-600">
                                "{modalTicket.description}"
                            </div>
                        </div>

                        {/* Staff Note Form */}
                        <div className="mb-8 relative z-10">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                                Ghi chú Ban Quản Lý (Nhật ký xử lý)
                                {modalAction === 'RESOLVED' && <span className="text-error ml-1">*Bắt buộc</span>}
                            </label>
                            <textarea
                                rows={3}
                                value={staffNote}
                                onChange={e => setStaffNote(e.target.value)}
                                placeholder={modalAction === 'PROCESSING' ? 'VD: Cử chú Tuấn bảo vệ kiêm điện nước lên kiểm tra trong chiều nay...' : 'VD: Đã thay 1 vòi nước inox, hóa đơn gửi kèm quỹ phòng...'}
                                className="w-full rounded-2xl border border-outline-variant/50 focus:border-primary p-4 text-sm font-medium bg-surface text-on-surface outline-none transition-colors shadow-inner"
                            />
                        </div>

                        {errorMsg && (
                            <div className="mb-4 bg-error-container border border-error/20 p-3 rounded-xl text-sm text-on-error-container font-bold relative z-10 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">error</span> {errorMsg}
                            </div>
                        )}

                        <div className="flex gap-4 relative z-10">
                            <button onClick={() => setModalTicket(null)} className="w-[120px] font-bold text-slate-500 py-3.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-sm">
                                Quay lại
                            </button>
                            <button
                                onClick={handleUpdateStatus}
                                disabled={isSubmitting || (modalAction === 'RESOLVED' && !staffNote.trim())}
                                className={`flex-1 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none ${
                                    modalAction === 'PROCESSING' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20' : 'bg-primary hover:bg-primary-container shadow-primary/20 hover:text-primary-fixed-variant'
                                }`}
                            >
                                {isSubmitting ? (
                                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">
                                            {modalAction === 'PROCESSING' ? 'send' : 'task'}
                                        </span>
                                        {modalAction === 'PROCESSING' ? 'Phát Lệnh' : 'Chốt Biên Bản'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ghost Toast cho Success Message */}
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
