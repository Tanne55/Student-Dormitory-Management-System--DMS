'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';
import { loadAllFloorOptions, type FloorOption } from '@/lib/floors';

type StaffRow = {
  id: string;
  accountId: number;
  staffCode: string;
  fullName: string;
  phone: string;
  email: string;
  idCardNumber: string;
};

export default function ManageStaffsPage() {
    const router = useRouter();
    const [staffs, setStaffs] = useState<StaffRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successData, setSuccessData] = useState<any>(null);

    const [formData, setFormData] = useState({
        username: '',
        fullName: '',
        phone: '',
        email: '',
        idCardNumber: ''
    });

    const [scopeAccountId, setScopeAccountId] = useState<number | null>(null);
    const [scopeStaffName, setScopeStaffName] = useState('');
    const [scopeFloorOptions, setScopeFloorOptions] = useState<FloorOption[]>([]);
    const [scopeSelectedIds, setScopeSelectedIds] = useState<Set<string>>(new Set());
    const [scopeLoading, setScopeLoading] = useState(false);
    const [scopeError, setScopeError] = useState('');
    const [scopeSaving, setScopeSaving] = useState(false);

    useEffect(() => {
        const user = requireAuth(router);
        if (!user) return;
        if (user.role !== 'admin') {
            router.replace('/dashboard');
            return;
        }
        fetchStaffs();
    }, [router]);

    const fetchStaffs = async () => {
        setIsLoading(true);
        try {
            const res = await apiFetch(`${API_BASE}/staffs`, {
                headers: authHeaders(),
            });
            if (res.ok) {
                setStaffs(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch staffs', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessData(null);
        setIsSubmitting(true);

        try {
            const res = await apiFetch(`${API_BASE}/staffs`, {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) {
                const msg = Array.isArray(data.message) ? data.message[0] : data.message;
                throw new Error(msg || 'Xung đột khi tạo tài khoản nhân sự');
            }

            setSuccessData(data.data);
            setIsFormOpen(false);
            setFormData({ username: '', fullName: '', phone: '', email: '', idCardNumber: '' });
            await fetchStaffs();

        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openScopeModal = async (st: StaffRow) => {
        setScopeAccountId(st.accountId);
        setScopeStaffName(st.fullName);
        setScopeError('');
        setScopeLoading(true);
        try {
            const [opts, res] = await Promise.all([
                loadAllFloorOptions(),
                apiFetch(`${API_BASE}/staffs/${st.accountId}/scopes/floors`, { headers: authHeaders() }),
            ]);
            setScopeFloorOptions(opts);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Lỗi truy xuất hệ điều hành máy chủ.');
            }
            const scopes: { floorId?: string; floor?: { id: string } }[] = await res.json();
            const ids = new Set<string>();
            for (const s of scopes) {
                const id = s.floorId ?? s.floor?.id;
                if (id) ids.add(id);
            }
            setScopeSelectedIds(ids);
        } catch (e: any) {
            setScopeError(e.message || 'Lỗi đường truyền');
            setScopeFloorOptions([]);
            setScopeSelectedIds(new Set());
        } finally {
            setScopeLoading(false);
        }
    };

    const toggleScopeFloor = (floorId: string) => {
        setScopeSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(floorId)) next.delete(floorId);
            else next.add(floorId);
            return next;
        });
    };

    const saveScopes = async () => {
        if (scopeAccountId == null) return;
        setScopeSaving(true);
        setScopeError('');
        try {
            const res = await apiFetch(`${API_BASE}/staffs/${scopeAccountId}/scopes/floors`, {
                method: 'PUT',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ floorIds: Array.from(scopeSelectedIds) }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error((data as { message?: string }).message || 'Lỗi khóa ghi đè.');
            setScopeAccountId(null);
        } catch (e: any) {
            setScopeError(e.message || 'Lỗi lưu trữ DB');
        } finally {
            setScopeSaving(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header Content */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/10 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-on-surface tracking-tight">Hệ thống Nhân sự Quản lý</h1>
                        <p className="text-sm text-on-surface-variant font-medium">Cấp phát tài khoản nghiệp vụ, định danh và phân quyền thao tác.</p>
                    </div>
                </div>
                
                <button 
                    onClick={() => setIsFormOpen(!isFormOpen)} 
                    className={`flex items-center gap-2 px-6 py-3 font-bold rounded-xl shadow-sm transition-all text-sm ${isFormOpen ? 'bg-surface border border-outline-variant/50 hover:bg-surface-variant text-slate-500' : 'bg-primary text-white hover:bg-primary-container hover:text-primary-fixed-variant shadow-primary/20 hover:-translate-y-0.5'}`}
                >
                    {isFormOpen ? (
                        <><span className="material-symbols-outlined text-[18px]">close</span> Tạm ngưng nhập liệu</>
                    ) : (
                        <><span className="material-symbols-outlined text-[18px]">person_add</span> Kết nạp Staff mới</>
                    )}
                </button>
            </div>

            {/* Dialog Success Overlay (Khi tạo mới xong) */}
            {successData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-fixed/50 backdrop-blur-md animate-in fade-in">
                    <div className="bg-surface-container-lowest rounded-[32px] shadow-2xl max-w-md w-full p-8 border border-surface-container-highest relative overflow-hidden">
                        
                        {/* Decorative Background Icon */}
                        <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none">
                            <span className="material-symbols-outlined text-[15rem]" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
                        </div>

                        <div className="flex flex-col items-center text-center relative z-10">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-[24px] flex items-center justify-center mb-6 shadow-sm border border-green-200">
                                <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            </div>
                            <h3 className="text-2xl font-black text-on-surface mb-2">Thẻ Kiosk Khởi tạo!</h3>
                            <p className="text-sm text-slate-500 font-medium mb-6">Tài khoản nghiệp vụ <span className="font-bold text-primary">{successData.fullName}</span> đã hoạt động.</p>
                            
                            <div className="w-full bg-surface-container-low rounded-2xl p-6 mb-6 space-y-4 text-left border border-surface-container-high border-dashed">
                                <div className="space-y-4 pt-2">
                                    <div className="flex justify-between items-center bg-white px-4 py-3 rounded-xl border border-outline-variant/30">
                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">ID Nghiệp vụ (Staff Code)</span>
                                        <span className="font-mono font-black text-blue-600 text-lg uppercase">{successData.staffCode}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 px-1">
                                        <span className="text-sm font-bold text-slate-500">Tên truy cập</span>
                                        <span className="font-black text-on-surface bg-surface-container px-3 py-1 rounded-lg">{successData.username}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 px-1">
                                        <span className="text-sm font-bold text-slate-500">Pass mặc định</span>
                                        <span className="font-mono font-bold text-error bg-error-container/30 border border-error/20 px-3 py-1 rounded-lg">{successData.password}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <button onClick={() => setSuccessData(null)} className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:opacity-90 hover:shadow-lg shadow-primary/20 transition-all flex justify-center items-center gap-2">
                                <span className="material-symbols-outlined">how_to_reg</span> Tôi đã lưu Mật khẩu & Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Form Container */}
            {isFormOpen && (
                <div className="bg-surface-container-lowest rounded-[24px] shadow-sm border border-primary/20 p-8 animate-in slide-in-from-top-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-primary"></div>
                    
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-surface-container-high">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined">person_add</span>
                        </div>
                        <h2 className="text-xl font-bold text-on-surface tracking-tight">Hồ sơ Cán bộ mới</h2>
                    </div>

                    {errorMsg && (
                        <div className="mb-6 bg-error-container text-on-error-container border border-error/20 px-6 py-4 rounded-xl flex items-start gap-4">
                            <span className="material-symbols-outlined text-error mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                            <span className="text-sm font-bold">{errorMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Username đăng nhập hệ thống <span className="text-error">*</span></label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">account_circle</span>
                                    <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full pl-10 pr-4 py-3.5 bg-surface border border-outline-variant/30 rounded-xl font-bold text-sm text-on-surface outline-none focus:border-primary transition-colors focus:ring-4 focus:ring-primary/10" placeholder="vd: tung_admin" required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Họ và Tên Nhân sự <span className="text-error">*</span></label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">badge</span>
                                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full pl-10 pr-4 py-3.5 bg-surface border border-outline-variant/30 rounded-xl font-bold text-sm text-on-surface outline-none focus:border-primary transition-colors focus:ring-4 focus:ring-primary/10" placeholder="Nguyễn Văn A" required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">SĐT Cá nhân <span className="text-error">*</span></label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">phone_iphone</span>
                                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full pl-10 pr-4 py-3.5 bg-surface border border-outline-variant/30 rounded-xl font-bold font-mono text-sm text-on-surface outline-none focus:border-primary transition-colors focus:ring-4 focus:ring-primary/10" placeholder="098..." required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Email Cơ quan <span className="text-error">*</span></label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">mail</span>
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full pl-10 pr-4 py-3.5 bg-surface border border-outline-variant/30 rounded-xl font-bold text-sm text-on-surface outline-none focus:border-primary transition-colors focus:ring-4 focus:ring-primary/10" placeholder="staff@ktx.edu.vn" required />
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Số Căn Cước Công Dân (Định danh) <span className="text-error">*</span></label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">fingerprint</span>
                                    <input type="text" name="idCardNumber" value={formData.idCardNumber} onChange={handleChange} className="w-full pl-10 pr-4 py-3.5 bg-surface border border-outline-variant/30 rounded-xl font-black text-lg text-primary outline-none focus:border-primary transition-colors focus:ring-4 focus:ring-primary/10 tracking-widest" placeholder="001201..." required />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button type="submit" disabled={isSubmitting} className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-fixed border-0 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg hover:shadow-primary/30 disabled:opacity-50 hover:-translate-y-0.5 transition-all w-full md:w-auto">
                                {isSubmitting ? (
                                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    <><span className="material-symbols-outlined">how_to_reg</span> Xác nhận Kết nạp</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Scope Modal Workflow */}
            {scopeAccountId != null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-fixed/50 backdrop-blur-md animate-in fade-in">
                    <div className="bg-surface-container-lowest rounded-[32px] shadow-2xl max-w-lg w-full p-8 border border-surface-container-highest relative overflow-hidden">
                        
                        {/* Decorative Shield */}
                        <div className="absolute -top-8 -right-8 opacity-[0.03] pointer-events-none">
                            <span className="material-symbols-outlined text-[15rem]" style={{ fontVariationSettings: "'FILL' 1" }}>gpp_maybe</span>
                        </div>

                        <div className="flex justify-between items-center mb-6 relative z-10 border-b border-surface-container-high pb-4">
                            <div>
                                <h3 className="text-xl font-black text-on-surface flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>rule_folder</span>
                                    Phân Quyền Hành Động
                                </h3>
                                <p className="text-sm font-bold text-primary mt-1">{scopeStaffName}</p>
                            </div>
                            <button onClick={() => setScopeAccountId(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-slate-400 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="relative z-10">
                            <p className="text-xs font-medium text-slate-500 mb-4 bg-surface-variant p-3 rounded-xl border border-outline-variant/20 italic">
                                Chú ý: Chọn các Cụm Tầng mà nhân viên này được phép quản lý và xét duyệt. Nếu bỏ trống đồng nghĩa nhân sự Tạm Ngưng Quyền (Không thấy Data).
                            </p>
                            
                            {scopeError && (
                                <div className="mb-4 bg-error-container border border-error/20 p-3 rounded-xl text-sm text-on-error-container font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">error</span> {scopeError}
                                </div>
                            )}

                            {scopeLoading ? (
                                <div className="flex justify-center items-center py-10 opacity-50">
                                    <span className="material-symbols-outlined animate-spin text-4xl text-primary">autorenew</span>
                                </div>
                            ) : (
                                <div className="space-y-2 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {scopeFloorOptions.map((f) => (
                                        <label key={f.id} className={`flex items-center gap-4 p-4 border-2 rounded-2xl cursor-pointer transition-all ${scopeSelectedIds.has(f.id) ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:border-primary/50 bg-surface'}`}>
                                            <div className={`relative w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors ${scopeSelectedIds.has(f.id) ? 'bg-primary border-primary' : 'bg-transparent border-outline'}`}>
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only" 
                                                    checked={scopeSelectedIds.has(f.id)}
                                                    onChange={() => toggleScopeFloor(f.id)} 
                                                />
                                                {scopeSelectedIds.has(f.id) && <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>}
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm ${scopeSelectedIds.has(f.id) ? 'text-primary' : 'text-on-surface'}`}>{f.label}</p>
                                            </div>
                                        </label>
                                    ))}
                                    {scopeFloorOptions.length === 0 && (
                                        <div className="text-center p-8 border-2 border-dashed border-outline-variant/50 rounded-2xl text-slate-400 flex flex-col items-center">
                                            <span className="material-symbols-outlined text-3xl mb-2">location_off</span>
                                            <span className="font-bold text-sm">Chưa có Cụm/Tầng nào trong DB</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    className="w-[120px] font-bold text-slate-500 py-3.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-sm"
                                    onClick={() => setScopeAccountId(null)}
                                    disabled={scopeSaving}
                                >
                                    Đóng
                                </button>
                                <button
                                    type="button"
                                    className="flex-1 bg-primary hover:bg-primary-container text-white hover:text-primary-fixed-variant font-bold py-3.5 rounded-xl shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                                    onClick={() => void saveScopes()}
                                    disabled={scopeLoading || scopeSaving}
                                >
                                    {scopeSaving ? (
                                        <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                    ) : (
                                        <><span className="material-symbols-outlined">save_as</span> Lưu Phạm Vi Matrix</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* List Table Data */}
            <div className="bg-surface-container-lowest rounded-[24px] shadow-sm border border-surface-container-highest overflow-hidden p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6 pb-2 border-b border-surface-container-high">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                        Table DS Thành Viên
                    </h2>
                    <span className="bg-surface border border-outline-variant/30 text-slate-500 px-3 py-1 rounded-full text-xs font-black uppercase">
                        {staffs.length} Staffs
                    </span>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-48 opacity-60">
                        <span className="material-symbols-outlined animate-spin text-3xl">rotate_right</span>
                    </div>
                ) : staffs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <span className="material-symbols-outlined text-6xl opacity-30 mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>shield_locked</span>
                        <p className="font-bold text-lg text-on-surface">Cơ sở dữ liệu Nhân viên trống.</p>
                        <p className="text-sm">Vui lòng đăng ký nhân sự và bàn giao tài khoản.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-surface-container-low text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
                                <tr>
                                    <th className="px-5 py-4 rounded-tl-[16px]">Định Danh</th>
                                    <th className="px-5 py-4">Nhân sự</th>
                                    <th className="px-5 py-4">Liên hệ Trực tuyến</th>
                                    <th className="px-5 py-4">Bằng chứng CCCD</th>
                                    <th className="px-5 py-4 text-right rounded-tr-[16px]">Điều Khiển</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-container-highest">
                                {staffs.map(st => (
                                    <tr key={st.id} className="hover:bg-surface-container-low/50 transition-colors group">
                                        <td className="px-5 py-4">
                                            <div className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider">
                                                <span className="material-symbols-outlined text-[14px]">id_card</span> {st.staffCode}
                                            </div>
                                            <div className="text-[9px] font-mono text-slate-400 mt-1 uppercase tracking-widest ml-1">Uid:{st.accountId}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-on-surface text-base">{st.fullName}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-600"><span className="material-symbols-outlined text-[12px] text-slate-400">call</span> {st.phone}</span>
                                                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600"><span className="material-symbols-outlined text-[12px] text-slate-400">mail</span> {st.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="font-mono font-bold text-slate-500 bg-surface border border-outline-variant/20 px-3 py-1.5 rounded-lg tracking-widest">{st.idCardNumber}</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => void openScopeModal(st)}
                                                className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-surface border border-outline-variant/30 text-slate-500 hover:text-primary hover:border-primary shadow-sm hover:shadow-md transition-all group-hover:-translate-y-0.5"
                                                title="Cấu hình Quyền Hạn Quản lý"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">rule_settings</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
            `}} />
        </div>
    );
}
