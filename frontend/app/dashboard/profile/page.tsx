'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';

export default function StudentProfilePage() {
    const router = useRouter();
    const [profileData, setProfileData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [toastMessage, setToastMessage] = useState('');

    // Password reset state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    useEffect(() => {
        if (!requireAuth(router)) return;
        fetchProfile();
    }, [router]);

    const fetchProfile = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await apiFetch(`${API_BASE}/students/profile`, {
                method: 'GET',
                headers: authHeaders(),
            });
            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.message || 'Không thể tải thông tin hồ sơ lúc này');
            }

            setProfileData(result.data);
            
            // Show toast briefly on initial successful load
            setToastMessage('Hồ sơ đã được đồng bộ với hệ thống!');
            setTimeout(() => setToastMessage(''), 4000);
            
        } catch (err: any) {
            setError(err.message || 'Lỗi truy xuất dữ liệu từ máy chủ.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('Vui lòng điền đầy đủ các trường mật khẩu.');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('Mật khẩu mới không khớp.');
            return;
        }
        setIsChangingPassword(true);
        try {
            // Note: Update this endpoint based on your backend auth structure
            const res = await apiFetch(`${API_BASE}/auth/change-password`, {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword: currentPassword, newPassword }),
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Không thể đổi mật khẩu.');
            }
            
            setToastMessage('Đổi mật khẩu thành công!');
            setTimeout(() => setToastMessage(''), 4000);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-error-container/20 border border-error/20 rounded-3xl p-8 text-center">
                <span className="material-symbols-outlined text-error text-4xl mb-4">error</span>
                <h2 className="text-xl font-bold text-on-surface mb-2">Truy xuất dữ liệu thất bại</h2>
                <p className="text-on-surface-variant mb-6">{error}</p>
                <button onClick={fetchProfile} className="px-6 py-2 bg-error text-white font-bold rounded-xl shadow-lg hover:bg-error/90 transition-colors">
                    Thử lại
                </button>
            </div>
        );
    }

    const pd = profileData || {};
    const detail = pd.profile || {};
    
    // Compute address string beautifully
    const addressStr = [detail.addressDetail, detail.ward, detail.district, detail.province].filter(Boolean).join(', ');

    return (
        <div className="max-w-6xl mx-auto space-y-8 font-sans">
            {/* Hero Profile Header */}
            <section className="relative bg-surface-container-lowest rounded-[2rem] p-8 shadow-sm border border-surface-container overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                
                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="relative">
                        {/* Placeholder Student Avatar */}
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-secondary-container flex items-center justify-center text-primary shadow-xl border-4 border-white">
                            <span className="material-symbols-outlined text-6xl">school</span>
                        </div>
                        <button className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg hover:scale-105 transition-transform" title="Chỉnh sửa ảnh (Coming soon)">
                            <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                    </div>
                    
                    <div className="text-center md:text-left space-y-2">
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                            <h1 className="text-3xl font-bold text-on-surface tracking-tight">{pd.fullName || 'Chưa cập nhật'}</h1>
                            <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full border border-primary/20 tracking-wider">
                                SINH VIÊN
                            </span>
                        </div>
                        <p className="text-slate-500 font-medium tracking-wide">MSSV: <span className="text-on-surface font-bold">{pd.studentCode || 'N/A'}</span></p>
                        
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-xl">
                                <span className="material-symbols-outlined text-primary text-lg">school</span>
                                <span className="text-sm font-semibold text-slate-600 line-clamp-1">{pd.faculty || 'Trường/Khoa (N/A)'}</span>
                            </div>
                            {pd.room ? (
                                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl border border-green-100">
                                    <span className="material-symbols-outlined text-green-600 text-lg">meeting_room</span>
                                    <span className="text-sm font-bold text-green-700">Phòng {pd.room.name || pd.room.id}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-xl">
                                    <span className="material-symbols-outlined text-slate-400 text-lg">meeting_room</span>
                                    <span className="text-sm font-medium text-slate-500">Chưa xếp phòng</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Bento Grid Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Thuộc tính CÁ NHÂN */}
                <div className="lg:col-span-2 bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-surface-container">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary-container/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary">person_outline</span>
                            </div>
                            <h3 className="text-xl font-bold text-on-surface tracking-tight">Thông tin cá nhân</h3>
                        </div>
                        <button className="flex items-center gap-2 text-primary font-bold text-sm hover:underline" title="Liên hệ BQL để sửa (Coming soon)">
                            <span className="material-symbols-outlined text-sm">edit</span>
                            Sửa
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Họ và tên</p>
                            <p className="font-bold text-on-surface">{pd.fullName || '---'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ngày sinh</p>
                            <p className="font-bold text-on-surface">{pd.dob || '---'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giới tính</p>
                            <p className="font-bold text-on-surface">{pd.gender || '---'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CCCD / Mã định danh</p>
                            <p className="font-bold text-on-surface tracking-wider">{detail.idCardNumber || '---'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Số điện thoại</p>
                            <p className="font-bold text-on-surface">{pd.phone || '---'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email liên lạc</p>
                            <p className="font-bold text-on-surface truncate">{pd.emailPersonal || '---'}</p>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Địa chỉ thường trú</p>
                            <p className="font-bold text-on-surface">{addressStr || '---'}</p>
                        </div>
                    </div>
                </div>

                {/* HỌC TẬP */}
                <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-surface-container flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-tertiary-fixed/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-tertiary-container">school</span>
                            </div>
                            <h3 className="text-xl font-bold text-on-surface tracking-tight">Học tập</h3>
                        </div>
                        <span className="material-symbols-outlined text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    </div>
                    
                    <div className="flex-1 space-y-6">
                        <div className="p-4 bg-surface-container-low rounded-2xl border border-surface-container-high">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Cơ sở Đào tạo</p>
                            <p className="font-bold text-on-surface tracking-tight">Trường ĐH / Viện chủ quản</p>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2 border-b border-surface-container-high">
                                <span className="text-sm font-medium text-slate-500">Khoa / Viện</span>
                                <span className="text-sm font-bold text-on-surface text-right max-w-[150px] truncate">{pd.faculty || '---'}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-surface-container-high">
                                <span className="text-sm font-medium text-slate-500">Ngành học</span>
                                <span className="text-sm font-bold text-on-surface text-right max-w-[150px] truncate">{pd.major || '---'}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-surface-container-high">
                                <span className="text-sm font-medium text-slate-500">Lớp định danh</span>
                                <span className="text-sm font-bold text-on-surface">{pd.className || '---'}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm font-medium text-slate-500">Khóa (Cohort)</span>
                                <div className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded-lg uppercase tracking-widest">{pd.cohort || 'K--'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PHÒNG Ở (DYNAMIC LOGIC MATCHING BENTO BOX) */}
                <div className="lg:col-span-3 bg-gradient-to-br from-[#1e3a8a] to-[#00164e] text-white rounded-[2.5rem] p-8 md:p-10 shadow-xl relative overflow-hidden">
                    {/* Background Decor */}
                    <div className="absolute right-[-10%] bottom-[-20%] opacity-5 pointer-events-none">
                        <span className="material-symbols-outlined text-[20rem]" style={{ fontVariationSettings: "'FILL' 1" }}>apartment</span>
                    </div>
                    
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 text-center md:text-left">
                        {/* Cột 1: Tên phòng lớn */}
                        <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-white/10 pb-8 md:pb-0 md:pr-8 flex flex-col justify-center">
                            <div className="flex items-center justify-center md:justify-start gap-3 mb-6 opacity-80">
                                <span className="material-symbols-outlined">meeting_room</span>
                                <h3 className="text-xl font-bold tracking-tight">Hợp đồng Nội trú</h3>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-5xl font-black tracking-tighter drop-shadow-md">
                                    {pd.room?.name ? pd.room.name : 'N/A'}
                                </h4>
                                <p className="text-on-primary-container font-semibold tracking-wide flex items-center justify-center md:justify-start gap-1">
                                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                                    {pd.room ? 'Tòa nhà KTX' : 'Vui lòng đăng ký xếp phòng'}
                                </p>
                            </div>
                        </div>
                        
                        {/* Cột 2 & 3: Chi tiết */}
                        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-8 items-center">
                            {/* Metadata phòng */}
                            {pd.room ? (
                                <div className="space-y-3 pt-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-primary-container">Dịch vụ (Sức chứa)</p>
                                    <div className="flex items-baseline justify-center md:justify-start gap-1">
                                        <span className="text-3xl font-black">{pd.room.capacity || 0}</span>
                                        <span className="text-sm font-medium opacity-80">Người/phòng</span>
                                    </div>
                                    <div className="flex gap-1.5 justify-center md:justify-start pt-1 opacity-80">
                                        {Array.from({length: Math.min(pd.room.capacity || 0, 8)}).map((_, i) => (
                                            <div key={i} className={`w-2 h-2 rounded-full ${i < (pd.room.occupied || 0) ? 'bg-white' : 'bg-white/30'}`}></div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3 pt-2 col-span-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-primary-container">Trạng thái</p>
                                    <p className="text-lg font-bold opacity-80">Không có hợp đồng lưu trú hiệu lực.</p>
                                </div>
                            )}
                            
                            {/* Timeline hợp đồng (Mocking data format if contract present) */}
                            {pd.room && (
                                <div className="space-y-3 pt-2 sm:col-span-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-primary-container">Thời hạn (VD)</p>
                                    <div className="space-y-2">
                                        <p className="text-lg font-bold tracking-tight">Tháng 9/2024</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                                <div className="h-full bg-tertiary-fixed w-[50%]"></div>
                                            </div>
                                            <span className="text-[10px] font-bold text-tertiary-fixed">Active</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Button */}
                            <div className="flex flex-col justify-end pt-4 sm:pt-0">
                                <button onClick={() => router.push('/dashboard/dorm-extensions')} className="w-full py-4 px-6 bg-white text-primary font-bold rounded-2xl shadow-lg shadow-black/10 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-95 group">
                                    <span className="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">history_edu</span>
                                    Yêu cầu gia hạn
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ĐỔI MẬT KHẨU ACCORDION (Details/Summary) */}
                <div className="lg:col-span-3">
                    {/* Note: using native <details> approach per the HTML design. Group utilities are provided by Tailwind */}
                    <details className="group bg-surface-container-lowest rounded-3xl border border-surface-container shadow-sm overflow-hidden transition-all duration-300">
                        <summary className="flex items-center justify-between p-6 cursor-pointer list-none hover:bg-surface-container-low transition-colors outline-none focus:ring-2 focus:ring-primary/20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-error-container/20 flex items-center justify-center group-open:bg-error-container group-open:text-on-error-container text-error transition-colors">
                                    <span className="material-symbols-outlined">lock_reset</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-on-surface text-lg">Bảo mật & Tài khoản</h3>
                                    <p className="text-xs text-slate-500 font-medium">Thay đổi mật khẩu đăng nhập hệ thống</p>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform bg-surface rounded-full p-1">expand_more</span>
                        </summary>
                        
                        <div className="p-6 md:p-8 pt-2">
                            <div className="border-t border-surface-container-high pt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Mật khẩu hiện tại</label>
                                    <input 
                                        type="password" 
                                        className="w-full h-12 px-4 bg-surface-container-low border-0 rounded-xl focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 font-mono text-sm outline-none transition-shadow" 
                                        placeholder="••••••••" 
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Mật khẩu mới</label>
                                    <input 
                                        type="password" 
                                        className="w-full h-12 px-4 bg-surface-container-low border-0 rounded-xl focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 font-mono text-sm outline-none transition-shadow" 
                                        placeholder="••••••••" 
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Xác nhận mật khẩu mới</label>
                                    <input 
                                        type="password" 
                                        className="w-full h-12 px-4 bg-surface-container-low border-0 rounded-xl focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 font-mono text-sm outline-none transition-shadow" 
                                        placeholder="••••••••" 
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                                <div className="md:col-span-3 flex justify-end gap-3 mt-4">
                                    <button 
                                        type="button" 
                                        onClick={() => {setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');}}
                                        className="px-6 py-3 text-slate-500 font-bold text-sm hover:bg-surface-container-low rounded-xl transition-colors"
                                    >
                                        Làm lại
                                    </button>
                                    <button 
                                        type="button" 
                                        disabled={isChangingPassword}
                                        onClick={handleChangePassword}
                                        className="px-8 py-3 bg-gradient-to-r from-primary to-primary-fixed-variant text-white font-bold text-sm rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {isChangingPassword ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </details>
                </div>

            </div>

             {/* Success Message Ghost Toast */}
             {toastMessage && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-surface-container-lowest/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl border border-surface-container-high z-50 animate-[bounce_1s_ease-in-out]">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-inner">
                        <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                    </div>
                    <p className="text-sm font-bold text-on-surface">{toastMessage}</p>
                </div>
            )}
        </div>
    );
}
