'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { API_BASE, apiFetch, authHeaders } from '@/lib/api';

type Building = { id: string; code: string; name: string; address?: string | null };
type Floor = { id: string; buildingId: string; floorNumber: number; label?: string | null };

export default function CampusAdminPage() {
    const router = useRouter();
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
    const [floors, setFloors] = useState<Floor[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [toastMsg, setToastMsg] = useState('');
    
    // Forms
    const [isAddBuildingMode, setIsAddBuildingMode] = useState(false);
    const [newBuilding, setNewBuilding] = useState({ code: '', name: '', address: '' });
    const [newFloor, setNewFloor] = useState({ floorNumber: 1, label: '' });

    useEffect(() => {
        const user = requireAuth(router);
        if (!user) return;
        if (user.role !== 'admin') {
            router.replace('/dashboard');
            return;
        }
        void loadBuildings();
    }, [router]);

    useEffect(() => {
        if (!selectedBuildingId) {
            setFloors([]);
            return;
        }
        void loadFloors(selectedBuildingId);
    }, [selectedBuildingId]);

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 4000);
    };

    async function loadBuildings() {
        setLoading(true);
        setErrorMsg('');
        try {
            const res = await apiFetch(`${API_BASE}/buildings`, { headers: authHeaders() });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Hệ thống từ chối tải danh sách tòa.');
            const list = Array.isArray(data) ? data : [];
            setBuildings(list);
            setSelectedBuildingId((prev) => {
                if (list.length === 0) return '';
                if (prev && list.some((b: Building) => b.id === prev)) return prev;
                return list[0].id;
            });
        } catch (e: any) {
            setErrorMsg(e.message || 'Lỗi truy xuất cơ sở dữ liệu.');
        } finally {
            setLoading(false);
        }
    }

    async function loadFloors(buildingId: string) {
        try {
            const res = await apiFetch(`${API_BASE}/buildings/${buildingId}/floors`, { headers: authHeaders() });
            const data = await res.json();
            if (!res.ok) throw new Error('Không phân giải được tầng.');
            setFloors(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setErrorMsg(e.message || 'Lỗi tải liên kết tầng');
        }
    }

    async function submitBuilding(e: FormEvent) {
        e.preventDefault();
        setErrorMsg('');
        try {
            const res = await apiFetch(`${API_BASE}/buildings`, {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    code: newBuilding.code.trim(),
                    name: newBuilding.name.trim(),
                    address: newBuilding.address.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Xung đột khi tạo tòa nhà.');
            showToast(`Khởi tạo Cụm ${data.code} thành công.`);
            setNewBuilding({ code: '', name: '', address: '' });
            setIsAddBuildingMode(false);
            await loadBuildings();
            setSelectedBuildingId(data.id);
        } catch (e: any) {
            setErrorMsg(e.message || 'Lỗi phát sinh');
        }
    }

    async function submitFloor(e: FormEvent) {
        e.preventDefault();
        if (!selectedBuildingId) return;
        setErrorMsg('');
        try {
            const res = await apiFetch(`${API_BASE}/buildings/${selectedBuildingId}/floors`, {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    floorNumber: Number(newFloor.floorNumber),
                    label: newFloor.label.trim() || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Hệ thống báo chối khi tạo tầng.');
            showToast(`Tích hợp Tầng số ${data.floorNumber} hoàn thiện.`);
            setNewFloor({ floorNumber: 1, label: '' });
            await loadFloors(selectedBuildingId);
        } catch (e: any) {
            setErrorMsg(e.message || 'Lỗi khai báo');
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header Content */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/10 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>corporate_fare</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-on-surface tracking-tight">Khai báo Cơ sở KTX</h1>
                        <p className="text-sm text-on-surface-variant font-medium">Thiết lập cấu trúc vật lý Tòa nhà & Tầng phục vụ điều đồ hệ thống.</p>
                    </div>
                </div>
                {!isAddBuildingMode && (
                    <button 
                        onClick={() => setIsAddBuildingMode(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-secondary text-on-secondary rounded-xl font-bold text-sm shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
                        Thêm Cụm/Tòa nhà
                    </button>
                )}
            </div>

            {errorMsg && (
                <div className="bg-error-container text-on-error-container px-6 py-4 rounded-xl flex items-start gap-4 border border-error/20">
                    <span className="material-symbols-outlined text-error mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                    <span className="text-sm font-bold leading-relaxed">{errorMsg}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Panel: Buildings List */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <div className="bg-surface-container-lowest rounded-[24px] shadow-sm border border-surface-container-highest p-6 min-h-[500px]">
                        <h2 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500">apartment</span>
                            Danh mục Tòa
                        </h2>
                        
                        {loading ? (
                            <div className="flex justify-center items-center h-48 opacity-60">
                                <span className="material-symbols-outlined animate-spin text-3xl">rotate_right</span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {buildings.map((b) => (
                                    <div 
                                        key={b.id} 
                                        onClick={() => setSelectedBuildingId(b.id)}
                                        className={`p-4 rounded-2xl border cursor-pointer transition-all group relative overflow-hidden ${selectedBuildingId === b.id ? 'bg-orange-50 border-orange-400 shadow-sm' : 'bg-surface border-outline-variant/30 hover:border-orange-300 hover:shadow-sm'}`}
                                    >
                                        {selectedBuildingId === b.id && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500 rounded-l-2xl"></div>}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className={`font-black text-lg ${selectedBuildingId === b.id ? 'text-orange-700' : 'text-on-surface group-hover:text-orange-600'}`}>
                                                    {b.code}
                                                </h3>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{b.name}</p>
                                            </div>
                                            <span className={`material-symbols-outlined ${selectedBuildingId === b.id ? 'text-orange-500' : 'text-outline-variant'}`}>
                                                chevron_right
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {buildings.length === 0 && (
                                    <div className="text-center p-6 border-2 border-dashed border-outline-variant/50 rounded-2xl text-slate-400">
                                        <span className="material-symbols-outlined text-4xl mb-2">location_off</span>
                                        <p className="font-bold text-sm">Chưa có cơ sở dữ liệu tòa nhà</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Floors or Add Building */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    {/* Mode: Add new Building */}
                    {isAddBuildingMode && (
                        <div className="bg-surface-container-lowest rounded-[24px] shadow-sm border border-orange-500/30 p-8 animate-in fade-in slide-in-from-right-8 relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none">
                                <span className="material-symbols-outlined text-[15rem]" style={{ fontVariationSettings: "'FILL' 1" }}>domain_add</span>
                            </div>
                            
                            <div className="flex justify-between items-center mb-6 border-b border-surface-container-high pb-4 relative z-10">
                                <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                                    <span className="material-symbols-outlined text-orange-500">add_business</span>
                                    Đăng ký Tòa KTX Mới
                                </h2>
                                <button onClick={() => setIsAddBuildingMode(false)} className="text-slate-400 hover:text-slate-600 bg-surface-variant p-2 rounded-full transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>

                            <form onSubmit={submitBuilding} className="space-y-6 relative z-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Mã Tòa (ID định danh)</label>
                                        <input className="w-full bg-surface border border-outline-variant/50 rounded-xl px-4 py-3 font-black text-orange-700 outline-none focus:border-orange-500 transition-colors uppercase" placeholder="Vd: T1, A1, VIP..." value={newBuilding.code} onChange={(e) => setNewBuilding({ ...newBuilding, code: e.target.value.toUpperCase() })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tên hiển thị</label>
                                        <input className="w-full bg-surface border border-outline-variant/50 rounded-xl px-4 py-3 font-bold text-on-surface outline-none focus:border-orange-500 transition-colors" placeholder="Vd: Tòa A1 Chất lượng cao" value={newBuilding.name} onChange={(e) => setNewBuilding({ ...newBuilding, name: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Địa chỉ thực tế (Tùy chọn)</label>
                                    <input className="w-full bg-surface border border-outline-variant/50 rounded-xl px-4 py-3 font-medium text-sm outline-none focus:border-orange-500 transition-colors" placeholder="Vd: Cơ sở 1 - Đường ABC..." value={newBuilding.address} onChange={(e) => setNewBuilding({ ...newBuilding, address: e.target.value })} />
                                </div>
                                
                                <div className="pt-4 flex justify-end">
                                    <button type="submit" className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold px-8 py-3.5 rounded-xl hover:shadow-lg shadow-orange-500/20 hover:-translate-y-0.5 transition-all">
                                        <span className="material-symbols-outlined">save</span> Khởi tạo Cơ sở
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Mode: View Floors (Only if a building is selected) */}
                    {!isAddBuildingMode && selectedBuildingId && (
                        <>
                            {/* Khai báo Tầng Box */}
                            <div className="bg-surface-container-lowest rounded-[24px] shadow-sm border border-surface-container-highest p-8">
                                <h2 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">layers</span>
                                    Mở rộng Tầng cho tòa
                                    <span className="bg-primary/10 text-primary-fixed-variant px-3 py-1 rounded-full text-xs font-black ml-2 uppercase">
                                        {buildings.find(b => b.id === selectedBuildingId)?.code}
                                    </span>
                                </h2>
                                <form onSubmit={submitFloor} className="flex flex-col sm:flex-row gap-4 items-end">
                                    <div className="flex-1 space-y-2">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đánh số Tầng</label>
                                        <input type="number" min={0} className="w-full bg-surface border border-outline-variant/50 rounded-xl px-4 py-3 font-black text-primary text-lg text-center outline-none focus:border-primary transition-colors" value={newFloor.floorNumber} onChange={(e) => setNewFloor({ ...newFloor, floorNumber: Number(e.target.value) })} required />
                                    </div>
                                    <div className="flex-[2] space-y-2">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nhãn phụ (Option)</label>
                                        <input className="w-full bg-surface border border-outline-variant/50 rounded-xl px-4 py-3 font-medium outline-none focus:border-primary transition-colors text-sm" placeholder="Vd: Tầng trệt, Tầng sinh hoạt chung..." value={newFloor.label} onChange={(e) => setNewFloor({ ...newFloor, label: e.target.value })} />
                                    </div>
                                    <button type="submit" className="bg-primary hover:bg-primary-container text-white hover:text-primary-fixed-variant font-bold px-6 py-3.5 rounded-xl transition-all shadow-md flex items-center gap-2">
                                        <span className="material-symbols-outlined">add_to_photos</span> Thêm Tầng
                                    </button>
                                </form>
                            </div>

                            {/* Danh sách Tầng List Box */}
                            <div className="bg-surface-container-lowest rounded-[24px] shadow-sm border border-surface-container-highest overflow-hidden p-6 lg:p-8">
                                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-surface-container-high pb-4">
                                    Bản đồ Cấp Tầng ({floors.length})
                                </h2>
                                
                                {floors.length === 0 ? (
                                    <div className="text-center p-8 bg-surface-container border border-dashed border-outline-variant/30 rounded-2xl text-slate-400">
                                        <p className="font-bold">Tòa nhà này hiện đang trống biên chế tầng.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {floors.map((f) => (
                                            <div key={f.id} className="bg-surface border border-outline-variant/30 rounded-2xl p-4 flex items-center gap-4 hover:border-primary/50 transition-colors group">
                                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                    <span className="font-black text-xl">{f.floorNumber}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-on-surface text-sm uppercase tracking-wider text-primary">Tầng số {f.floorNumber}</h3>
                                                    <p className="text-xs font-medium text-slate-500 mt-0.5 max-w-[200px] truncate" title={f.label || ''}>{f.label || 'Không có nhãn riêng'}</p>
                                                </div>
                                                <div className="text-[9px] font-mono font-bold text-slate-300 rotate-90 origin-right ml-auto">
                                                    ID:{f.id.slice(0,4)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Ghost Toast */}
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
