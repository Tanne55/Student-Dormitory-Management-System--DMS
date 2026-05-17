'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';
import { Button, Card, EmptyState, PageHeader } from '@/components/ui';

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
    void fetchSettings();
  }, [router]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/system/settings`, { headers: authHeaders() });
      if (res.ok) setSettings(await res.json());
      else setErrorMsg('Lỗi tải cấu hình.');
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
        body: JSON.stringify({ settings: settings.map((s) => ({ key: s.key, value: s.value })) }),
      });
      if (res.ok) {
        setSuccessMsg('Đã lưu cấu hình thành công!');
        setTimeout(() => setSuccessMsg(''), 4000);
        await fetchSettings();
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
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Cấu hình hệ thống"
        description="Thay đổi đơn giá và các tham số vận hành KTX."
        icon={<span className="material-symbols-outlined">settings</span>}
      />

      {errorMsg && (
        <div className="bg-error-container text-on-error-container px-6 py-4 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
            error
          </span>
          <span className="text-sm font-bold">{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 text-green-800 px-6 py-4 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
          <span className="text-sm font-bold">{successMsg}</span>
        </div>
      )}

      <Card padding="lg">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : settings.length === 0 ? (
          <EmptyState
            icon="settings_suggest"
            title="Chưa có cấu hình"
            description="Hệ thống chưa tạo seed cấu hình tham số."
          />
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {settings.map((st) => (
              <div key={st.key} className="bg-surface-container-low p-5 rounded-2xl">
                <div className="flex justify-between items-center mb-3">
                  <label className="font-bold text-on-surface text-sm">{st.description || st.key}</label>
                  <span className="text-[10px] font-mono text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-lg">
                    {st.key}
                  </span>
                </div>
                <div className="flex rounded-2xl overflow-hidden border-2 border-outline-variant/20 focus-within:border-primary/40 focus-within:shadow-[0_0_0_4px_rgb(0,35,111,0.08)] transition-all">
                  <input
                    type="text"
                    value={st.value}
                    onChange={(e) => handleChange(st.key, e.target.value)}
                    className="flex-1 min-w-0 bg-surface-container-lowest outline-none px-4 py-3 text-sm font-black text-primary"
                  />
                  <span className="inline-flex items-center px-4 bg-surface-container-high text-on-surface-variant text-xs font-bold">
                    {st.key.includes('PRICE') ? 'VNĐ' : 'Value'}
                  </span>
                </div>
              </div>
            ))}

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                variant="gradient"
                loading={isSaving}
                disabled={isSaving || settings.length === 0}
                icon={!isSaving ? <span className="material-symbols-outlined text-[18px]">save</span> : undefined}
              >
                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
