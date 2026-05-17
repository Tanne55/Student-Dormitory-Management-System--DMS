'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';
import { Badge, Button, Card, EmptyState, PageHeader, Table } from '@/components/ui';

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  ELECTRIC: { label: 'Hệ thống Điện', icon: 'bolt' },
  WATER: { label: 'Hệ thống Nước', icon: 'water_drop' },
  FURNITURE: { label: 'Nội thất', icon: 'chair' },
  OTHER: { label: 'Khác', icon: 'help' },
};

const STATUS_META: Record<string, { tone: 'pending' | 'in-progress' | 'approved'; label: string }> = {
  PENDING: { tone: 'pending', label: 'Chờ tiếp nhận' },
  PROCESSING: { tone: 'in-progress', label: 'Đang xử lý' },
  RESOLVED: { tone: 'approved', label: 'Đã khắc phục' },
};

export default function RepairRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!requireAuth(router)) return;
    void fetchInitialData();
  }, [router]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const roomRes = await apiFetch(`${API_BASE}/repair-requests/my-current-room`, {
        headers: authHeaders(),
      });
      if (roomRes.ok) {
        const roomData = await roomRes.json();
        setCurrentRoom(roomData.error ? null : roomData);
      }
      await fetchHistory();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    const res = await apiFetch(`${API_BASE}/repair-requests/my-requests`, { headers: authHeaders() });
    if (res.ok) setRequests(await res.json());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentRoom) {
      setErrorMsg('Bạn chưa được xếp phòng, không thể gửi yêu cầu sự cố.');
      return;
    }
    if (!category || !description.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Loại sự cố và Mô tả.');
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('category', category);
    formData.append('description', description);
    if (file) formData.append('attachment_file', file);

    try {
      const res = await apiFetch(`${API_BASE}/repair-requests`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể gửi yêu cầu lúc này.');

      setSuccessMsg('Gửi yêu cầu thành công!');
      setCategory('');
      setDescription('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setIsFormOpen(false);
      await fetchHistory();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Hỗ trợ Kỹ thuật & Sửa chữa"
        description={
          isLoading
            ? 'Đang tải thông tin phòng...'
            : currentRoom
              ? `Phòng hiện tại: ${currentRoom.roomNumber}`
              : 'Bạn chưa gắn liền với phòng nào.'
        }
        icon={<span className="material-symbols-outlined">construction</span>}
        action={
          currentRoom && (
            <Button
              variant={isFormOpen ? 'secondary' : 'gradient'}
              onClick={() => setIsFormOpen(!isFormOpen)}
              icon={
                <span className="material-symbols-outlined text-[18px]">
                  {isFormOpen ? 'close' : 'add'}
                </span>
              }
            >
              {isFormOpen ? 'Hủy' : 'Báo cáo Sự cố'}
            </Button>
          )
        }
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

      {isFormOpen && currentRoom && (
        <Card padding="lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-fixed text-primary rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined">add_box</span>
            </div>
            <h2 className="text-lg font-bold text-on-surface">Phiếu Báo Hư Hỏng</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Loại sự cố <span className="text-error">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-12 rounded-2xl bg-surface-container-lowest border-2 border-outline-variant/20 focus:border-primary/40 focus:shadow-[0_0_0_4px_rgb(0,35,111,0.08)] px-4 text-sm font-medium text-on-surface outline-none transition-all"
                  required
                >
                  <option value="">— Chọn danh mục —</option>
                  <option value="ELECTRIC">⚡ Sự cố Điện</option>
                  <option value="WATER">💧 Sự cố Nước</option>
                  <option value="FURNITURE">🛏️ Sự cố Nội thất</option>
                  <option value="OTHER">📋 Sự cố Khác</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Ảnh hiện trường
                </label>
                <label className="flex flex-col items-center justify-center w-full h-12 border-2 border-dashed border-outline-variant/40 rounded-2xl cursor-pointer bg-surface-container-lowest hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
                    <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                    {file ? <span className="font-bold text-primary">{file.name}</span> : 'Nhấp để tải lên (JPG/PNG)'}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    ref={fileRef}
                    accept="image/png, image/jpeg"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Mô tả sự cố <span className="text-error">*</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-2xl bg-surface-container-lowest border-2 border-outline-variant/20 focus:border-primary/40 focus:shadow-[0_0_0_4px_rgb(0,35,111,0.08)] px-4 py-3 text-sm text-on-surface outline-none resize-none transition-all"
                placeholder="Ví dụ: Bóng đèn ở giường số 1 không sáng..."
                required
              />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                variant="gradient"
                loading={isSubmitting}
                icon={!isSubmitting ? <span className="material-symbols-outlined text-[18px]">send</span> : undefined}
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card padding="sm">
        <div className="flex items-center justify-between px-2 py-3 mb-2">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-on-surface-variant">history</span>
            <h2 className="text-base font-bold text-on-surface">Lịch sử Yêu cầu</h2>
          </div>
          <span className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full text-xs font-bold">
            {requests.length} báo cáo
          </span>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <Table
            rows={requests}
            getRowKey={(r) => r.id}
            empty={
              <EmptyState
                icon="check_circle"
                title="Tuyệt vời!"
                description="Phòng của bạn chưa có báo cáo sự cố nào."
              />
            }
            columns={[
              {
                key: 'date',
                header: 'Ngày',
                render: (r) => (
                  <span className="text-on-surface-variant font-medium">
                    {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                ),
              },
              {
                key: 'id',
                header: 'Mã',
                render: (r) => (
                  <span className="text-xs font-mono text-on-surface-variant/70">#{r.id.substring(0, 8)}</span>
                ),
              },
              {
                key: 'category',
                header: 'Danh mục',
                render: (r) => {
                  const meta = CATEGORY_META[r.category] ?? CATEGORY_META.OTHER;
                  return (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary">{meta.icon}</span>
                      <span className="font-bold text-on-surface">{meta.label}</span>
                    </div>
                  );
                },
              },
              {
                key: 'desc',
                header: 'Mô tả',
                render: (r) => (
                  <span className="text-on-surface-variant block max-w-xs truncate">{r.description}</span>
                ),
              },
              {
                key: 'attachment',
                header: 'Đính kèm',
                align: 'center',
                render: (r) =>
                  r.attachmentUrl ? (
                    <a
                      href={`${API_BASE}${r.attachmentUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline text-xs font-bold"
                    >
                      Xem ảnh
                    </a>
                  ) : (
                    <span className="text-on-surface-variant/40">—</span>
                  ),
              },
              {
                key: 'status',
                header: 'Trạng thái',
                align: 'right',
                render: (r) => {
                  const meta = STATUS_META[r.status];
                  return meta ? <Badge tone={meta.tone}>{meta.label}</Badge> : <Badge>{r.status}</Badge>;
                },
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
