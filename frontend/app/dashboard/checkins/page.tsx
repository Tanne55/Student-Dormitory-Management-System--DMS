'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';
import { downloadAuthenticatedPdf } from '@/lib/pdfDownload';

export default function CheckinPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [availableRooms, setAvailableRooms] = useState<any[]>([]);
    
    // Workflow State
    const [selectedReg, setSelectedReg] = useState<any>(null);
    const [selectedRoom, setSelectedRoom] = useState<any>(null);
    
    // Contract Form State
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    // 6 months default
    const defaultEnd = new Date();
    defaultEnd.setMonth(defaultEnd.getMonth() + 6);
    const [endDate, setEndDate] = useState(defaultEnd.toISOString().split('T')[0]);
    const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
    
    // Status
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successData, setSuccessData] = useState<any>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfErr, setPdfErr] = useState('');

    useEffect(() => {
        const user = requireAuth(router);
        if (!user) return;
        if (!['staff', 'admin'].includes(user.role)) {
            router.replace('/dashboard');
        }
    }, [router]);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');
        try {
            const res = await apiFetch(`${API_BASE}/checkins/registrations?q=${encodeURIComponent(searchQuery)}`, {
                headers: authHeaders(),
            });
            if (res.ok) {
                const data = await res.json();
                setRegistrations(data);
                if (data.length === 0 && searchQuery) {
                    setErrorMsg('Không tìm thấy hồ sơ được duyệt nào khớp với từ khóa.');
                }
            }
        } catch (err) {
            setErrorMsg('Lỗi kết nối máy chủ.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectReg = async (reg: any) => {
        setSelectedReg(reg);
        setSelectedRoom(null); // reset room
        setErrorMsg('');
        
        // Fetch rooms compatible
        const parsedApp = typeof reg.applicationData === 'string' ? JSON.parse(reg.applicationData) : reg.applicationData;
        const reqGender = parsedApp.basic?.gender || 'Male'; // gender is in basic sub-object
        const reqRoomType = reg.roomType;

        try {
            const r = await apiFetch(`${API_BASE}/checkins/available-rooms?gender=${encodeURIComponent(reqGender)}&type=${reqRoomType}`, {
                headers: authHeaders(),
            });
            if (r.ok) {
                const rooms = await r.json();
                if (rooms.length === 0) {
                     setErrorMsg(`Chú ý: Quỹ phòng ${reqRoomType} người dành cho ${reqGender} hiện đã hết chỗ. Vui lòng sắp xếp nguyện vọng khác.`);
                }
                setAvailableRooms(rooms);
            }
        } catch (err) {
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
                    isPaymentConfirmed
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || "Lỗi hệ thống trong phiên giao dịch.");
            }

            setPdfErr('');
            setSuccessData(data.data);
            setSelectedReg(null);
            setSelectedRoom(null);
            setSearchQuery('');
            setIsPaymentConfirmed(false);
            setRegistrations([]); // clear search
        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Header Title */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/10 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-on-surface tracking-tight">Thủ tục Xếp phòng (Check-in)</h1>
                        <p className="text-sm text-on-surface-variant font-medium">Bố trí phòng, lập hợp đồng và kích hoạt tài khoản nội trú.</p>
                    </div>
                </div>
            </div>

            {errorMsg && (
                <div className="bg-error-container text-on-error-container px-6 py-4 rounded-xl flex items-start gap-4 border border-error/20">
                    <span className="material-symbols-outlined text-error mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                    <span className="text-sm font-bold leading-relaxed">{errorMsg}</span>
                </div>
            )}

            {/* Dialog Success Overlay */}
            {successData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-fixed-variant/40 backdrop-blur-md">
                    <div className="bg-surface-container-lowest rounded-[32px] shadow-2xl max-w-lg w-full p-8 border border-surface-container-highest animate-out relative overflow-hidden">
                        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-100/40 via-transparent to-transparent -z-10 pointer-events-none"></div>
                        
                        <div className="flex flex-col items-center text-center relative z-10">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-[24px] flex items-center justify-center mb-6 shadow-sm border border-green-200">
                                <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            </div>
                            <h3 className="text-2xl font-black text-on-surface mb-2">Check-in Hoàn tất!</h3>
                            
                            {successData.warning && (
                                <div className="w-full bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-2xl flex items-start gap-3 mt-4 mb-6 text-left">
                                    <span className="material-symbols-outlined text-orange-600 mt-0.5">mail</span>
                                    <span className="text-sm font-medium">{successData.warning}</span>
                                </div>
                            )}

                            <div className="w-full bg-surface-container-low rounded-2xl p-6 mb-6 space-y-4 text-left border border-surface-container">
                                <div className="flex justify-between items-center border-b border-surface-container-high pb-4">
                                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Mã Hợp Đồng</span>
                                    <strong className="text-primary font-black text-lg font-mono">{successData.contractCode}</strong>
                                </div>
                                
                                {successData.password ? (
                                    <div className="space-y-4 pt-2">
                                        <p className="text-xs font-bold text-primary-fixed-variant uppercase tracking-wider">Tài khoản Cổng SV (Cấp mới)</p>
                                        <div className="flex justify-between items-center bg-surface px-4 py-3 rounded-xl border border-outline-variant/30">
                                            <span className="text-sm font-medium text-slate-500">MSSV (User)</span>
                                            <span className="font-mono font-bold text-on-surface">{successData.username}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-surface px-4 py-3 rounded-xl border border-outline-variant/30">
                                            <span className="text-sm font-medium text-slate-500">Mật khẩu</span>
                                            <span className="font-mono font-bold text-error">{successData.password}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pt-2 text-center">
                                        <span className="inline-block bg-primary-container/20 text-primary-fixed-variant text-xs font-bold px-3 py-1 rounded-full mb-2">Đã có Tài khoản</span>
                                        <p className="text-sm font-medium text-slate-600">Hệ thống phát hiện sinh viên đã có tài khoản. Vui lòng yêu cầu sinh viên dùng tài khoản cũ để đăng nhập.</p>
                                    </div>
                                )}
                            </div>

                            {successData.contractId && (
                                <div className="w-full space-y-3">
                                    {pdfErr && <p className="text-sm text-error font-bold mb-1 text-left">{pdfErr}</p>}
                                    <button
                                        type="button"
                                        disabled={pdfLoading}
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
                                        className="w-full flex justify-center items-center gap-2 bg-surface border-2 border-primary text-primary hover:bg-primary-container/10 font-bold py-4 rounded-xl transition-all disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined">print</span>
                                        {pdfLoading ? 'Đang trích xuất PDF...' : 'In file Biên bản & Hợp đồng'}
                                    </button>
                                </div>
                            )}
                            <button 
                                onClick={() => setSuccessData(null)} 
                                className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:opacity-90 hover:shadow-lg shadow-primary/20 transition-all mt-3"
                            >
                                Đóng & Hoàn thành
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 1: Search */}
            <div className="bg-surface-container-lowest rounded-[24px] shadow-sm border border-surface-container p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-md">1</div>
                    <h2 className="text-lg font-bold text-on-surface tracking-tight">
                        Truy vấn Hồ sơ phê duyệt
                    </h2>
                </div>
                
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">search</span>
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Nhập MSSV, CCCD hoặc quét mã vạch..."
                            className="w-full pl-12 pr-4 py-4 rounded-xl border border-outline-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-surface outline-none transition-all font-medium"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="bg-primary text-white px-8 py-4 rounded-xl font-bold hover:bg-primary-container transition-colors shadow-lg shadow-primary/20 flex flex-shrink-0 items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <><span className="material-symbols-outlined text-[20px]">manage_search</span> Quét hồ sơ</>
                        )}
                    </button>
                </form>

                {/* Results List */}
                {registrations.length > 0 && !selectedReg && (
                    <div className="mt-8 border border-surface-container-highest rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-surface-container-low text-on-surface-variant text-[11px] uppercase tracking-wider font-bold">
                                <tr>
                                    <th className="px-6 py-4">Mã số / Nhu cầu</th>
                                    <th className="px-6 py-4">Nghiệp vụ Nhân sự</th>
                                    <th className="px-6 py-4 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface-container-lowest divide-y divide-surface-container-highest">
                                {registrations.map(r => {
                                    const appData = typeof r.applicationData === 'string' ? JSON.parse(r.applicationData) : r.applicationData;
                                    const basic = appData?.basic ?? {};
                                    const profile = appData?.profile ?? {};
                                    const fullName = basic.fullName ?? appData?.fullName ?? r.studentCode;
                                    const gender = basic.gender ?? appData?.gender ?? '—';
                                    const idCard = profile.idCardNumber ?? appData?.idCardNumber ?? '—';
                                    return (
                                        <tr key={r.id} className="hover:bg-primary-container/5 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="font-black text-primary text-base">{r.studentCode}</div>
                                                <div className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Phòng {r.roomType} Giường</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="font-bold text-on-surface text-sm uppercase">{fullName}</div>
                                                <div className="flex items-center gap-3 mt-1.5 opacity-80">
                                                    <span className="text-xs font-medium text-slate-600 bg-surface-variant px-2 py-0.5 rounded-md">Giới tính: {gender}</span>
                                                    <span className="text-xs font-medium text-slate-600 bg-surface-variant px-2 py-0.5 rounded-md">CCCD: {idCard}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button 
                                                    onClick={() => handleSelectReg(r)} 
                                                    className="inline-flex items-center gap-2 bg-primary-container/20 text-primary-fixed-variant px-4 py-2 rounded-xl font-bold hover:bg-primary-container/40 transition-colors shadow-sm text-sm"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">verified</span>
                                                    Thực thi
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Flow Wizard Steps */}
            {selectedReg && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-out">
                    {/* Step 2: Choose Room/Bed */}
                    <div className="bg-surface-container-lowest rounded-[24px] shadow-sm border border-surface-container p-8 flex flex-col min-h-[500px]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-full bg-tertiary text-white flex items-center justify-center font-bold text-sm shadow-md">2</div>
                            <h2 className="text-lg font-bold text-on-surface tracking-tight">
                                Gán phòng ({selectedReg.roomType} giường)
                            </h2>
                        </div>
                        
                        {selectedRoom ? (
                            <div className="flex-1 bg-tertiary-container/5 border-2 border-tertiary/20 rounded-2xl p-6 relative flex flex-col items-center justify-center text-center">
                                <span className="material-symbols-outlined text-5xl text-tertiary opacity-80 mb-4">meeting_room</span>
                                <h3 className="font-black text-tertiary text-3xl mb-2">{selectedRoom.roomNumber}</h3>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full text-sm font-bold text-tertiary shadow-sm mb-6">
                                    <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                                    Sức chứa: {selectedRoom.currentOccupancy}/{selectedRoom.capacity}
                                </div>
                                <button 
                                    onClick={() => setSelectedRoom(null)} 
                                    className="px-6 py-2.5 text-sm font-bold text-surface-variant bg-tertiary border border-tertiary/20 shadow-sm rounded-xl hover:bg-tertiary/90 transition-colors"
                                >
                                    Đổi phòng khác
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
                                {availableRooms.map((room) => (
                                    <div key={room.id} className="border border-outline-variant/30 p-5 rounded-2xl flex justify-between items-center bg-surface hover:border-tertiary/50 hover:shadow-md transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-slate-400 group-hover:bg-tertiary/10 group-hover:text-tertiary transition-colors">
                                                <span className="material-symbols-outlined">bed</span>
                                            </div>
                                            <div>
                                                <p className="font-black text-on-surface text-lg">{room.roomNumber}</p>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Đang ở: {room.currentOccupancy}/{room.capacity} • {room.gender}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedRoom(room)} 
                                            className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center hover:bg-tertiary hover:text-white transition-colors shadow-sm"
                                        >
                                            <span className="material-symbols-outlined">arrow_forward</span>
                                        </button>
                                    </div>
                                ))}
                                {availableRooms.length === 0 && (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-60">
                                        <span className="material-symbols-outlined text-5xl mb-2">hotel_class</span>
                                        <p className="font-bold">Hết phòng trống thuộc hệ này</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Step 3: Contract formulation */}
                    <div className={`bg-surface-container-lowest rounded-[24px] shadow-sm border p-8 flex flex-col transition-all duration-300 min-h-[500px] ${selectedRoom ? 'border-primary/30 ring-4 ring-primary/5' : 'border-surface-container opacity-50 grayscale pointer-events-none'}`}>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-md">3</div>
                            <h2 className="text-lg font-bold text-on-surface tracking-tight">
                                Quyết toán & Hợp đồng
                            </h2>
                        </div>
                        
                        <div className="space-y-6 flex-1 flex flex-col">
                            {/* Dates Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Ngày Bắt đầu
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">calendar_today</span>
                                        <input 
                                            type="date" value={startDate} onChange={e => setStartDate(e.target.value)} 
                                            className="w-full pl-10 pr-3 py-3 bg-surface border border-outline-variant/30 rounded-xl font-bold text-sm focus:border-primary outline-none" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Ngày Kết thúc
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">event</span>
                                        <input 
                                            type="date" value={endDate} onChange={e => setEndDate(e.target.value)} 
                                            className="w-full pl-10 pr-3 py-3 bg-surface border border-outline-variant/30 rounded-xl font-bold text-sm focus:border-primary outline-none" 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Billing Summary */}
                            <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                                <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Hoạch toán tạm tính</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium text-slate-600">Loại quỹ phòng</span>
                                        <span className="font-bold text-on-surface">{selectedRoom?.roomTypeName || `${selectedReg.roomType} giường`}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium text-slate-600">Đơn giá định mức</span>
                                        <span className="font-black font-mono text-on-surface">{(selectedRoom?.monthlyPrice || 0).toLocaleString('vi-VN')} ₫/th</span>
                                    </div>
                                    {(() => {
                                        const m = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)));
                                        const total = m * (selectedRoom?.monthlyPrice || 0);
                                        return (
                                            <>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-medium text-slate-600">Chu kỳ lưu trú</span>
                                                    <span className="font-bold text-on-surface">{m} tháng</span>
                                                </div>
                                                <div className="flex justify-between items-center font-black text-primary text-xl border-t border-primary/20 pt-4 mt-2">
                                                    <span>Tổng Thu Lần 1</span>
                                                    <span className="font-mono">{total.toLocaleString('vi-VN')} ₫</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                            
                            <div className="flex-1"></div>

                            {/* Payment Checkbox */}
                            <label className={`flex items-center gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all ${isPaymentConfirmed ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:border-primary/50'}`}>
                                <div className={`relative w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors ${isPaymentConfirmed ? 'bg-primary border-primary' : 'bg-transparent border-outline'}`}>
                                    <input type="checkbox" className="sr-only" checked={isPaymentConfirmed} onChange={(e) => setIsPaymentConfirmed(e.target.checked)} />
                                    {isPaymentConfirmed && <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-on-surface">Xác nhận đã Hoàn tất Bán vé</p>
                                    <p className="text-xs font-medium text-slate-500 mt-0.5">Tiền đã vào két/chuyển khoản đối soát</p>
                                </div>
                            </label>

                            <button 
                                onClick={handleProcessCheckin}
                                disabled={!isPaymentConfirmed || isLoading}
                                className="w-full bg-gradient-to-r from-primary to-primary-fixed border-0 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:shadow-none hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2 group"
                            >
                                {isLoading ? (
                                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    <><span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform">task</span> Ký duyệt & Lưu trữ</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
             <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
            `}} />
        </div>
    );
}
