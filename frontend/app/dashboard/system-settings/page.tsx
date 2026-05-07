'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';

export default function SystemSettingsPage() {
    const router = useRouter();
    const [settings, setSettings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const user = requireAuth(router);
        if (!user) return;
        if (user.role !== 'admin') {
            router.replace('/dashboard');
            return;
        }
        fetchSettings();
    }, [router]);

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const res = await apiFetch(`${API_BASE}/system/settings`, { headers: authHeaders() });
            if (res.ok) {
                setSettings(await res.json());
            } else {
                setErrorMsg('Lỗi tải cấu hình.');
            }
        } catch {
            setErrorMsg('Lỗi kết nối máy chủ.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setErrorMsg('');
        setSuccessMsg('');
        try {
            const res = await apiFetch(`${API_BASE}/system/settings`, {
                method: 'PATCH',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ settings: settings.map(s => ({ key: s.key, value: s.value })) })
            });
            if (res.ok) {
                setSuccessMsg('Đã lưu cấu hình hệ thống thành công!');
                setTimeout(() => setSuccessMsg(''), 4000);
                fetchSettings();
            } else {
                setErrorMsg('Không thể lưu cấu hình.');
            }
        } catch {
            setErrorMsg('Lỗi kết nối máy chủ.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (key: string, value: string) => {
         setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/10 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-2xl">settings</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-on-surface tracking-tight">Cấu hình Hệ thống</h1>
                        <p className="text-sm text-on-surface-variant font-medium">Thay đổi đơn giá và các tham số vận hành KTX.</p>
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

            {/* Settings form */}
            <div className="bg-surface-container-lowest rounded-[24px] border border-outline-variant/10 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <form onSubmit={handleSave}>
                        <div className="p-6 space-y-5">
                            {settings.map(st => (
                                <div key={st.key} className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="font-bold text-on-surface text-sm">{st.description || st.key}</label>
                                        <span className="text-[10px] font-mono text-outline bg-surface-container-high px-2 py-1 rounded-lg">{st.key}</span>
                                    </div>
                                    <div className="flex rounded-xl shadow-sm overflow-hidden border border-outline-variant/30">
                                        <input
                                            type="text"
                                            value={st.value}
                                            onChange={(e) => handleChange(st.key, e.target.value)}
                                            className="flex-1 min-w-0 bg-surface outline-none px-4 py-3 text-sm font-black text-primary focus:bg-primary-fixed/10 transition-colors"
                                        />
                                        <span className="inline-flex items-center px-4 bg-surface-container-high text-on-surface-variant text-xs font-bold border-l border-outline-variant/30">
                                            {st.key.includes('PRICE') ? 'VNĐ' : 'Value'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            
                            {settings.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-48 text-on-surface-variant">
                                    <span className="material-symbols-outlined text-5xl opacity-20 mb-3">settings_suggest</span>
                                    <p className="font-bold">Hệ thống chưa tạo Seed cấu hình tham số.</p>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-surface-container-low border-t border-surface-container-high flex justify-end">
                            <button type="submit" disabled={isSaving || settings.length === 0}
                                className="flex items-center gap-2 px-8 py-3 bg-primary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
