'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';
import { Badge, Button, Card, EmptyState, Modal, PageHeader, StatCard, Table } from '@/components/ui';

const CATEGORY_LABELS: Record<string, string> = {
  ELECTRIC: 'Điện & Ánh sáng',
  WATER: 'Nước & Cấp thoát',
  FURNITURE: 'Nội thất & Không gian',
  OTHER: 'Yêu cầu Khác',
};

const STATUS_META: Record<string, { tone: 'rejected' | 'in-progress' | 'approved'; label: string }> = {
  PENDING: { tone: 'rejected', label: 'Chờ thợ' },
  PROCESSING: { tone: 'in-progress', label: 'Đang sửa' },
  RESOLVED: { tone: 'approved', label: 'Hoàn tất' },
};

export default function MaintenancePage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, processing: 0, resolved: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

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
    void fetchTickets();
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
      const res = await apiFetch(`${API_BASE}/repair-requests/all?${params}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets);
        setSummary(data.summary);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.message || 'Lỗi tải dữ liệu');
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ.');
    } finally {
      setIsLoading(false);
    }
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
        body: JSON.stringify({ status: modalAction, staffNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi xử lý vận hành.');
      showToast(modalAction === 'PROCESSING' ? 'Đã tiếp nhận ticket!' : 'Đã nghiệm thu và đóng ticket!');
      setModalTicket(null);
      await fetchTickets();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Quản lý Báo cáo Sự cố"
        description="Điều phối thợ, tiếp nhận yêu cầu và đóng ticket nghiệm thu."
        icon={<span className="material-symbols-outlined">build</span>}
      />

      {errorMsg && !modalTicket && (
        <div className="bg-error-container text-on-error-container px-6 py-4 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
            error
          </span>
          <span className="text-sm font-bold">{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng sự cố"
          value={summary.total}
          icon={<span className="material-symbols-outlined">list_alt</span>}
          accent="primary"
        />
        <StatCard
          label="Chờ tiếp nhận"
          value={summary.pending}
          icon={<span className="material-symbols-outlined">warning</span>}
          accent="danger"
        />
        <StatCard
          label="Đang thi công"
          value={summary.processing}
          icon={<span className="material-symbols-outlined">handyman</span>}
          accent="info"
        />
        <StatCard
          label="Đã nghiệm thu"
          value={summary.resolved}
          icon={<span className="material-symbols-outlined">check_circle</span>}
          accent="success"
        />
      </div>

      <Card padding="lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-surface-container-high/40">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant">tune</span>
            <h2 className="font-bold text-on-surface">Bộ lọc:</h2>
            <span className="bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded-full text-xs font-bold">
              {tickets.length} Phiếu
            </span>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-11 rounded-full bg-surface-container-lowest border-2 border-outline-variant/20 focus:border-primary/40 px-5 text-sm font-medium text-on-surface outline-none w-full md:w-auto"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING">Chờ lệnh</option>
              <option value="PROCESSING">Đang sửa</option>
              <option value="RESOLVED">Hoàn tất</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-11 rounded-full bg-surface-container-lowest border-2 border-outline-variant/20 focus:border-primary/40 px-5 text-sm font-medium text-on-surface outline-none w-full md:w-auto"
            >
              <option value="">Tất cả loại</option>
              <option value="ELECTRIC">Điện</option>
              <option value="WATER">Nước</option>
              <option value="FURNITURE">Nội thất</option>
              <option value="OTHER">Khác</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <Table
            rows={tickets}
            getRowKey={(r) => r.id}
            empty={
              <EmptyState
                icon="check_circle"
                title="Không có yêu cầu nào"
                description="Trạm bảo trì hiện đang sạch việc."
              />
            }
            columns={[
              {
                key: 'time',
                header: 'Timeline',
                render: (r) => (
                  <span className="text-on-surface-variant font-medium">
                    {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                    <br />
                    <span className="text-xs">{new Date(r.createdAt).toLocaleTimeString('vi-VN')}</span>
                  </span>
                ),
              },
              {
                key: 'room',
                header: 'Toạ độ',
                render: (r) => (
                  <div>
                    <div className="font-black text-primary text-lg">{r.roomNumber}</div>
                    <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">
                      MSSV: {r.studentCode}
                    </div>
                  </div>
                ),
              },
              {
                key: 'category',
                header: 'Phân loại',
                render: (r) => (
                  <Badge tone="info">{CATEGORY_LABELS[r.category] || r.category}</Badge>
                ),
              },
              {
                key: 'desc',
                header: 'Mô tả',
                render: (r) => (
                  <p
                    className="text-sm font-medium text-on-surface-variant line-clamp-2 max-w-[250px]"
                    title={r.description}
                  >
                    {r.description}
                  </p>
                ),
              },
              {
                key: 'attachment',
                header: 'Ảnh',
                align: 'center',
                render: (r) =>
                  r.attachmentUrl ? (
                    <a
                      href={`${API_BASE}${r.attachmentUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-8 h-8 items-center justify-center bg-primary-fixed text-primary hover:bg-primary hover:text-on-primary rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                    </a>
                  ) : (
                    <span className="material-symbols-outlined text-on-surface-variant/30">
                      hide_image
                    </span>
                  ),
              },
              {
                key: 'status',
                header: 'Trạng thái',
                align: 'center',
                render: (r) => {
                  const meta = STATUS_META[r.status];
                  return meta ? <Badge tone={meta.tone}>{meta.label}</Badge> : <Badge>{r.status}</Badge>;
                },
              },
              {
                key: 'actions',
                header: 'Điều động',
                align: 'right',
                render: (r) => {
                  if (r.status === 'PENDING') {
                    return (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openModal(r, 'PROCESSING')}
                        icon={<span className="material-symbols-outlined text-[16px]">directions_run</span>}
                      >
                        Cử thợ
                      </Button>
                    );
                  }
                  if (r.status === 'PROCESSING') {
                    return (
                      <Button
                        size="sm"
                        variant="gradient"
                        onClick={() => openModal(r, 'RESOLVED')}
                        icon={<span className="material-symbols-outlined text-[16px]">inventory</span>}
                      >
                        Nghiệm thu
                      </Button>
                    );
                  }
                  return (
                    <span className="text-xs font-bold text-on-surface-variant/70 bg-surface-container-high px-3 py-1.5 rounded-full">
                      Lưu kho
                    </span>
                  );
                },
              },
            ]}
          />
        )}
      </Card>

      <Modal
        open={!!modalTicket}
        onClose={() => setModalTicket(null)}
        title={modalAction === 'PROCESSING' ? 'Điều thợ tới' : 'Ký nghiệm thu'}
        description={modalAction === 'PROCESSING' ? 'Phát lệnh cho đội bảo trì.' : 'Đóng ticket sau khi hoàn tất.'}
        icon={
          <span className="material-symbols-outlined">
            {modalAction === 'PROCESSING' ? 'construction' : 'fact_check'}
          </span>
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalTicket(null)}>
              Quay lại
            </Button>
            <Button
              variant="gradient"
              loading={isSubmitting}
              disabled={isSubmitting || (modalAction === 'RESOLVED' && !staffNote.trim())}
              onClick={handleUpdateStatus}
              icon={
                !isSubmitting ? (
                  <span className="material-symbols-outlined text-[18px]">
                    {modalAction === 'PROCESSING' ? 'send' : 'task'}
                  </span>
                ) : undefined
              }
            >
              {isSubmitting ? 'Đang gửi...' : modalAction === 'PROCESSING' ? 'Phát lệnh' : 'Chốt biên bản'}
            </Button>
          </>
        }
      >
        {modalTicket && (
          <>
            <div className="bg-surface-container-low rounded-2xl p-5 mb-6 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-surface-container-high">
                <span className="font-bold text-on-surface-variant uppercase tracking-widest text-[10px]">
                  Mã sự cố
                </span>
                <span className="font-mono font-bold text-primary">
                  #{modalTicket.id.substring(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-on-surface-variant font-medium">Phòng</span>
                <span className="font-black text-lg bg-surface-container-lowest px-3 py-0.5 rounded-lg">
                  {modalTicket.roomNumber}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-on-surface-variant font-medium">Hạng mục</span>
                <span className="font-bold text-on-surface">{CATEGORY_LABELS[modalTicket.category]}</span>
              </div>
              <div className="text-sm bg-surface-container-lowest p-3 rounded-xl italic text-on-surface-variant">
                "{modalTicket.description}"
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                Ghi chú BQL {modalAction === 'RESOLVED' && <span className="text-error">*Bắt buộc</span>}
              </label>
              <textarea
                rows={3}
                value={staffNote}
                onChange={(e) => setStaffNote(e.target.value)}
                placeholder={
                  modalAction === 'PROCESSING'
                    ? 'VD: Cử chú Tuấn lên kiểm tra trong chiều nay...'
                    : 'VD: Đã thay 1 vòi nước inox...'
                }
                className="w-full rounded-2xl bg-surface-container-lowest border-2 border-outline-variant/20 focus:border-primary/40 focus:shadow-[0_0_0_4px_rgb(0,35,111,0.08)] px-4 py-3 text-sm text-on-surface outline-none transition-all resize-none"
              />
            </div>

            {errorMsg && (
              <div className="mt-4 bg-error-container px-3 py-2 rounded-xl text-sm text-on-error-container font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span> {errorMsg}
              </div>
            )}
          </>
        )}
      </Modal>

      {toastMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-surface-container-lowest/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              check
            </span>
          </div>
          <p className="text-sm font-bold text-on-surface">{toastMsg}</p>
        </div>
      )}
    </div>
  );
}
