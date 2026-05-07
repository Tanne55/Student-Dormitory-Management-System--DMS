'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';

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
        const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setMonth(m);
    }, [router]);

    const handleSearch = async () => {
        if (!month) return;
        setIsLoading(true);
        setErrorMsg('');
        setSuccessMsg('');
        try {
            const res = await apiFetch(`${API_BASE}/utility-readings/unrecorded?month=${encodeURIComponent(month)}`, {
                headers: authHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                setRooms(data);
                if (data.length === 0) {
                    setErrorMsg('Không có phòng nào cần ghi số điện nước trong kỳ này (có thể KTX hiện đang trống).');
                }
            } else {
                const err = await res.json();
                setErrorMsg(err.message || 'Lỗi truy xuất dữ liệu định mức.');
            }
        } catch {
            setErrorMsg('Lỗi kết nối máy chủ dữ liệu trung tâm.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (roomId: string, field: 'currentElectric' | 'currentWater', value: string) => {
        const numVal = parseInt(value, 10);
        if (isNaN(numVal) && value !== '') return;
        
        setRooms(prev => prev.map(r => r.roomId === roomId ? { ...r, [field]: value === '' ? '' : numVal } : r));
    };

    const handleSubmit = async () => {
        // Validate
        const unrecordedRooms = rooms.filter(r => !r.isRecorded);
        
        const invalidRoom = unrecordedRooms.find(r => 
            r.currentElectric === '' || r.currentWater === '' ||
            r.currentElectric < r.prevElectric || r.currentWater < r.prevWater
        );

        if (invalidRoom) {
            setErrorMsg(`Khóa dữ liệu thất bại tại phòng ${invalidRoom.roomNumber}. Chỉ số mới không được bỏ trống và phải LỚN HƠN hoặc BẰNG chỉ số cũ.`);
            return;
        }

        if (unrecordedRooms.length === 0) {
            setErrorMsg('Toàn bộ hệ thống phòng nội trú đã hoàn tất chốt số tháng này.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');
        try {
            const payload = unrecordedRooms.map(r => ({
                roomId: r.roomId,
                electricReading: Number(r.currentElectric),
                waterReading: Number(r.currentWater),
                prevElectric: r.prevElectric,
                prevWater: r.prevWater
            }));

            const res = await apiFetch(`${API_BASE}/utility-readings/mass-record`, {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ month, data: payload })
            });

            const data = await res.json();
            if (res.ok) {
                setSuccessMsg(data.message || 'Chốt số đồng hồ & Tự động sinh Hóa đơn thành công!');
                // Reload dữ liệu
                handleSearch();
            } else {
                setErrorMsg(data.message || 'Hệ thống gián đoạn khi lưu trữ.');
            }
        } catch {
            setErrorMsg('Lỗi kết nối bộ định tuyến trung tâm.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header Content */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/10 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>speed</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-on-surface tracking-tight">Kê khai Chỉ số Điện Nước</h1>
                        <p className="text-sm text-on-surface-variant font-medium">Đối soát đồng hồ thông minh và tạo mã hóa đơn định kỳ phòng KTX.</p>
                    </div>
                </div>
            </div>

            {errorMsg && (
                <div className="bg-error-container text-on-error-container px-6 py-4 rounded-xl flex items-start gap-4 border border-error/20">
                    <span className="material-symbols-outlined text-error mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                    <span className="text-sm font-bold leading-relaxed">{errorMsg}</span>
                </div>
            )}
            
            {successMsg && (
                <div className="bg-primary/10 text-primary-fixed-variant px-6 py-4 rounded-xl flex items-center gap-4 border border-primary/20">
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="text-sm font-bold">{successMsg}</span>
                </div>
            )}

            {/* Top Control Bar */}
            <div className="bg-surface-container-lowest px-8 py-6 rounded-[24px] shadow-sm border border-surface-container-highest flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="w-full md:w-[350px] space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Chọn Kỳ Thu Thập (Tháng/Năm)
                    </label>
                    <input 
                        type="month" 
                        value={month} 
                        onChange={(e) => setMonth(e.target.value)}
                        className="w-full bg-surface border border-outline-variant/30 rounded-xl px-4 py-3.5 font-bold text-lg text-primary outline-none focus:border-orange-500 transition-colors shadow-inner" 
                    />
                </div>
                
                <div className="flex flex-col md:flex-row w-full md:w-auto items-stretch gap-4">
                    <button 
                        onClick={handleSearch} 
                        disabled={isLoading || !month}
                        className="bg-orange-600 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20"
                    >
                        {isLoading ? (
                            <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <><span className="material-symbols-outlined">wifi_tethering</span> Quét lưới phòng</>
                        )}
                    </button>
                    <Link 
                        href="/dashboard/invoices" 
                        className="bg-surface border border-outline-variant/30 text-on-surface font-bold px-6 py-3.5 rounded-xl hover:bg-surface-container-low hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                    >
                        Trở về Bảng Hóa đơn <span className="material-symbols-outlined">arrow_forward</span>
                    </Link>
                </div>
            </div>

            {/* Input Data Table */}
            {rooms.length > 0 && (
                <div className="bg-surface-container-lowest rounded-[24px] shadow-sm border border-surface-container-highest overflow-hidden p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between mb-6 pb-6 border-b border-surface-container-high">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">dataset</span>
                            </div>
                            <h2 className="text-xl font-bold text-on-surface">Form Cập nhật Chỉ số Đồng hồ</h2>
                        </div>
                        <div className="flex items-center gap-2 bg-surface-variant px-4 py-2 rounded-full">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
                            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{rooms.length} Đồng hồ (Phòng đang ở)</span>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto pb-4">
                        <table className="w-full text-left text-sm whitespace-nowrap border-separate border-spacing-y-2">
                            <thead className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                                <tr>
                                    <th className="px-4 py-2">Biển Phòng</th>
                                    <th className="px-4 py-2 text-right">Điện cũ LK</th>
                                    <th className="px-4 py-2 text-primary w-48">
                                        <span className="material-symbols-outlined align-middle text-[14px] mr-1">bolt</span> Điệm Tăng Thêm
                                    </th>
                                    <th className="px-4 py-2 text-right">Nước cũ LK</th>
                                    <th className="px-4 py-2 text-cyan-600 w-48">
                                        <span className="material-symbols-outlined align-middle text-[14px] mr-1">water_drop</span> Nước Xả Lượng
                                    </th>
                                    <th className="px-4 py-2 text-center">Niêm Phong</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rooms.map(r => (
                                    <tr key={r.roomId} className={`group ${r.isRecorded ? 'opacity-50 grayscale' : ''}`}>
                                        <td className={`px-4 py-4 rounded-l-xl border-y border-l ${r.isRecorded ? 'bg-surface border-outline-variant/20' : 'bg-surface hover:bg-surface-container-low border-surface-container-highest'}`}>
                                            <span className="font-black text-on-surface text-lg">{r.roomNumber}</span>
                                        </td>
                                        <td className={`px-4 py-4 border-y ${r.isRecorded ? 'bg-surface border-outline-variant/20' : 'bg-orange-50/20 border-surface-container-highest'} text-right`}>
                                            <span className="font-mono font-bold text-slate-400 text-base">{r.prevElectric}</span>
                                        </td>
                                        <td className={`px-4 py-4 border-y ${r.isRecorded ? 'bg-surface border-outline-variant/20' : 'bg-orange-50/20 border-surface-container-highest'}`}>
                                            <input
                                                type="number"
                                                disabled={r.isRecorded || isSubmitting}
                                                value={r.currentElectric ?? ''}
                                                onChange={e => handleInputChange(r.roomId, 'currentElectric', e.target.value)}
                                                className={`w-full rounded-xl border px-3 py-2 font-mono font-bold text-lg outline-none transition-all ${r.isRecorded ? 'border-transparent bg-transparent text-center' : 'border-orange-200 focus:border-orange-500 bg-white shadow-sm text-orange-700'}`}
                                                placeholder="..."
                                                min={r.prevElectric}
                                            />
                                        </td>
                                        <td className={`px-4 py-4 border-y ${r.isRecorded ? 'bg-surface border-outline-variant/20' : 'bg-cyan-50/20 border-surface-container-highest'} text-right`}>
                                            <span className="font-mono font-bold text-slate-400 text-base">{r.prevWater}</span>
                                        </td>
                                        <td className={`px-4 py-4 border-y ${r.isRecorded ? 'bg-surface border-outline-variant/20' : 'bg-cyan-50/20 border-surface-container-highest'}`}>
                                            <input
                                                type="number"
                                                disabled={r.isRecorded || isSubmitting}
                                                value={r.currentWater ?? ''}
                                                onChange={e => handleInputChange(r.roomId, 'currentWater', e.target.value)}
                                                className={`w-full rounded-xl border px-3 py-2 font-mono font-bold text-lg outline-none transition-all ${r.isRecorded ? 'border-transparent bg-transparent text-center' : 'border-cyan-200 focus:border-cyan-500 bg-white shadow-sm text-cyan-700'}`}
                                                placeholder="..."
                                                min={r.prevWater}
                                            />
                                        </td>
                                        <td className={`px-4 py-4 rounded-r-xl border-y border-r text-center ${r.isRecorded ? 'bg-surface border-outline-variant/20' : 'bg-surface hover:bg-surface-container-low border-surface-container-highest'}`}>
                                            {r.isRecorded ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-800 text-[10px] font-bold tracking-widest uppercase">
                                                    <span className="material-symbols-outlined text-[14px]">lock</span> Đã Khóa
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-[10px] font-bold tracking-widest uppercase">
                                                    <span className="material-symbols-outlined text-[14px]">edit_note</span> Nhập số
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="pt-8 border-t border-surface-container-high mt-4">
                        <button 
                            onClick={handleSubmit} 
                            disabled={isSubmitting || rooms.every(r => r.isRecorded)}
                            className="w-full md:w-auto ml-auto bg-gradient-to-r from-primary to-primary-fixed border-0 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:shadow-none hover:-translate-y-0.5 transition-all flex justify-center items-center gap-3 group"
                        >
                            {isSubmitting ? (
                                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[24px] group-hover:scale-110 transition-transform">receipt_long</span> 
                                    Niêm phong & Sinh Bill tự động
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
