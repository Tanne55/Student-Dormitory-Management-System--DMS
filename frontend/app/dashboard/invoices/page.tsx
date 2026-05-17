'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';
import { downloadAuthenticatedPdf } from '@/lib/pdfDownload';
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, Table } from '@/components/ui';

const PAYMENT_OPTIONS = [
  { v: 'VNPAY' as const, label: 'VNPay', icon: 'account_balance_wallet' },
  { v: 'CASH' as const, label: 'Tiền mặt', icon: 'payments' },
  { v: 'BANK_TRANSFER' as const, label: 'Chuyển khoản', icon: 'account_balance' },
];

export default function InvoicesPage() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [userCode, setUserCode] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [studentCodeInput, setStudentCodeInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'VNPAY'>('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const user = requireAuth(router);
    if (!user) return;
    setRole(user.role);
    setUserCode(user.username);
    void fetchInvoices(user.role);
  }, [router, filterStatus, filterMonth]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const fetchInvoices = async (currentRole: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      let url = `${API_BASE}/invoices/my-room`;
      if (['staff', 'admin'].includes(currentRole)) {
        const params = new URLSearchParams();
        if (filterStatus) params.set('status', filterStatus);
        if (filterMonth) params.set('month', filterMonth);
        url = `${API_BASE}/invoices/all?${params}`;
      }
      const res = await apiFetch(url, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setInvoices(Array.isArray(data) ? data : []);
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Lỗi tải dữ liệu.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPayModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setStudentCodeInput(role === 'student' ? userCode : '');
    setPaymentMethod(role === 'student' ? 'VNPAY' : 'CASH');
    setIsPayModalOpen(true);
    setErrorMsg('');
  };

  const handleConfirmPayment = async () => {
    if (!selectedInvoice) return;
    if (!studentCodeInput.trim()) {
      setErrorMsg('Vui lòng cung cấp mã sinh viên người thanh toán.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      if (paymentMethod === 'VNPAY') {
        const res = await apiFetch(`${API_BASE}/vnpay/create-payment-url`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            invoiceId: selectedInvoice.id,
            payerStudentCode: studentCodeInput,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.paymentUrl) {
            window.location.href = data.paymentUrl;
            return;
          }
          setErrorMsg('Không nhận được URL thanh toán từ VNPay.');
        } else {
          const err = await res.json();
          setErrorMsg(err.message || 'Không khởi tạo được thanh toán VNPay.');
        }
      } else {
        const res = await apiFetch(`${API_BASE}/payments`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            invoiceId: selectedInvoice.id,
            payerStudentCode: studentCodeInput,
            method: paymentMethod,
          }),
        });
        if (res.ok) {
          showToast('Đã xác nhận thanh toán hóa đơn thành công!');
          setIsPayModalOpen(false);
          await fetchInvoices(role);
        } else {
          const err = await res.json();
          setErrorMsg(err.message || 'Lỗi xác thực thanh toán.');
        }
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatVND = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const handleDownloadInvoicePdf = async (invoiceId: string) => {
    setPdfLoadingId(invoiceId);
    setErrorMsg('');
    try {
      await downloadAuthenticatedPdf(`/documents/invoices/${invoiceId}/pdf`, `hoadon-${invoiceId}.pdf`);
    } catch (e: any) {
      setErrorMsg(e.message || 'Lỗi kết xuất PDF.');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const isStaff = ['staff', 'admin'].includes(role);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title={isStaff ? 'Quản lý hóa đơn thu ngân' : 'Hóa đơn điện nước phòng'}
        description={
          isStaff
            ? 'Quản lý công nợ, đối soát và xuất phiếu thu dịch vụ nội trú.'
            : 'Một người đại diện thanh toán, cả phòng hoàn tất nghĩa vụ.'
        }
        icon={<span className="material-symbols-outlined">payments</span>}
        action={
          isStaff && (
            <Link href="/dashboard/utility-readings">
              <Button
                variant="secondary"
                icon={<span className="material-symbols-outlined text-[18px]">electric_meter</span>}
              >
                Chốt số kỳ mới
              </Button>
            </Link>
          )
        }
      />

      {errorMsg && !isPayModalOpen && (
        <div className="bg-error-container text-on-error-container px-6 py-4 rounded-2xl flex items-start gap-3">
          <span className="material-symbols-outlined text-error mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
            error
          </span>
          <span className="text-sm font-bold leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {isStaff && (
        <Card padding="lg">
          <div className="flex gap-4">
            <div className="flex-1">
              <Field label="Lọc theo kỳ (Tháng/Năm)">
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full h-12 rounded-2xl bg-surface-container-lowest border-2 border-outline-variant/20 focus:border-primary/40 px-4 text-sm font-bold text-on-surface outline-none transition-all"
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Trạng thái nợ">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full h-12 rounded-2xl bg-surface-container-lowest border-2 border-outline-variant/20 focus:border-primary/40 px-4 text-sm font-bold text-on-surface outline-none transition-all"
                >
                  <option value="">— Tất cả —</option>
                  <option value="UNPAID">Chưa thu (nợ tồn)</option>
                  <option value="PAID">Đã quyết toán</option>
                </select>
              </Field>
            </div>
          </div>
        </Card>
      )}

      <Card padding="lg">
        <div className="flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-on-surface-variant">list</span>
          <h2 className="font-bold text-on-surface">Biên lai khấu trừ</h2>
          <span className="bg-primary-fixed text-on-primary-fixed px-3 py-0.5 rounded-full text-xs font-bold">
            {invoices.length} mục
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <Table
            rows={invoices}
            getRowKey={(r) => r.id}
            empty={
              <EmptyState
                icon="task_alt"
                title="Không có hóa đơn"
                description={
                  isStaff
                    ? 'Đổi bộ lọc để tra cứu dòng tiền quá khứ.'
                    : 'Tài chính phòng bạn tháng này đang trắng tinh!'
                }
              />
            }
            columns={[
              {
                key: 'month',
                header: 'Kỳ báo cáo',
                render: (r) => <span className="font-bold text-on-surface">{r.month}</span>,
              },
              ...(isStaff
                ? [
                    {
                      key: 'room',
                      header: 'Phòng',
                      render: (r: any) => (
                        <span className="font-black text-primary">{r.room?.roomNumber || '—'}</span>
                      ),
                    },
                  ]
                : []),
              {
                key: 'electric',
                header: 'Điện năng',
                align: 'right' as const,
                render: (r) => (
                  <span className="text-on-surface-variant font-medium">{formatVND(r.electricFee)}</span>
                ),
              },
              {
                key: 'water',
                header: 'Nước',
                align: 'right' as const,
                render: (r) => (
                  <span className="text-on-surface-variant font-medium">{formatVND(r.waterFee)}</span>
                ),
              },
              {
                key: 'total',
                header: 'Tổng (VND)',
                align: 'right' as const,
                render: (r) => (
                  <span className="font-black text-error text-base tracking-tight">
                    {formatVND(r.totalAmount)}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Tình trạng',
                align: 'center' as const,
                render: (r) =>
                  r.status === 'PAID' ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <Badge tone="approved" icon={<span className="material-symbols-outlined text-[14px]">verified</span>}>
                        Đã thu
                      </Badge>
                      {r.paidBy && (
                        <span className="text-[9px] font-bold text-on-surface-variant/70">bởi {r.paidBy}</span>
                      )}
                    </div>
                  ) : (
                    <Badge tone="rejected">Báo nợ</Badge>
                  ),
              },
              {
                key: 'actions',
                header: 'Xử lý',
                align: 'right' as const,
                render: (r) => (
                  <div className="flex justify-end items-center gap-2">
                    {isStaff && (
                      <button
                        type="button"
                        disabled={pdfLoadingId === r.id}
                        onClick={() => void handleDownloadInvoicePdf(r.id)}
                        className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary-fixed transition-all"
                        title="Tải PDF biên lai"
                      >
                        {pdfLoadingId === r.id ? (
                          <span className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                        ) : (
                          <span className="material-symbols-outlined text-[18px]">file_download</span>
                        )}
                      </button>
                    )}
                    {r.status === 'UNPAID' && (
                      <Button
                        size="sm"
                        variant="gradient"
                        onClick={() => handleOpenPayModal(r)}
                        icon={
                          <span className="material-symbols-outlined text-[16px]">
                            {isStaff ? 'request_quote' : 'qr_code_scanner'}
                          </span>
                        }
                      >
                        {isStaff ? 'Thu lệ phí' : 'Thanh toán'}
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        open={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title={selectedInvoice ? `Phiếu tính tiền ${selectedInvoice.month}` : ''}
        icon={
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isStaff ? 'point_of_sale' : 'contactless'}
          </span>
        }
        size="md"
      >
        {selectedInvoice && (
          <div className="space-y-5">
            <div className="bg-surface-container-low rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center pb-3 mb-1 border-b border-surface-container-high">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  Nguồn truy thu
                </span>
                <span className="font-black text-primary text-xl px-3 py-0.5 bg-surface-container-lowest rounded-lg">
                  {isStaff ? selectedInvoice.room?.roomNumber : 'Phòng bạn'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant font-medium">Chi số điện năng</span>
                <span className="font-bold font-mono text-on-surface">{formatVND(selectedInvoice.electricFee)}</span>
              </div>
              <div className="flex justify-between text-sm pb-3 border-b border-dashed border-outline-variant/30">
                <span className="text-on-surface-variant font-medium">Chi số nước</span>
                <span className="font-bold font-mono text-on-surface">{formatVND(selectedInvoice.waterFee)}</span>
              </div>
              <div className="flex justify-between items-end pt-1">
                <span className="text-xs font-bold text-error uppercase tracking-widest">Tổng tiền</span>
                <span className="font-black font-mono text-error text-3xl tracking-tight">
                  {formatVND(selectedInvoice.totalAmount)}
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-error-container text-on-error-container px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span> {errorMsg}
              </div>
            )}

            <Field label="Mã sinh viên nộp tiền" required>
              <input
                type="text"
                value={studentCodeInput}
                onChange={(e) => setStudentCodeInput(e.target.value.toUpperCase())}
                disabled={role === 'student'}
                className="w-full rounded-2xl bg-surface-container-lowest border-2 border-outline-variant/20 focus:border-primary/40 px-4 py-4 font-black font-mono text-lg text-center tracking-widest text-on-surface outline-none transition-all uppercase disabled:bg-surface-container-low disabled:text-on-surface-variant"
                placeholder="VD: 20216000"
              />
            </Field>

            <Field label="Hình thức thanh toán">
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_OPTIONS.map((opt) => {
                  const active = paymentMethod === opt.v;
                  const disabled = role === 'student' && opt.v !== 'VNPAY';
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      disabled={disabled}
                      onClick={() => setPaymentMethod(opt.v)}
                      className={`flex flex-col items-center gap-1 px-2 py-3 rounded-2xl border-2 transition-all text-xs font-bold ${
                        active
                          ? 'border-primary bg-primary-fixed text-primary'
                          : 'border-outline-variant/20 bg-surface-container-lowest text-on-surface-variant hover:border-primary/40'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <span className="material-symbols-outlined text-lg">{opt.icon}</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Button
              variant="gradient"
              size="lg"
              fullWidth
              loading={isSubmitting}
              onClick={handleConfirmPayment}
              icon={
                !isSubmitting ? (
                  <span className="material-symbols-outlined">
                    {paymentMethod === 'VNPAY' ? 'qr_code_scanner' : 'paid'}
                  </span>
                ) : undefined
              }
            >
              {isSubmitting
                ? 'Đang xử lý...'
                : paymentMethod === 'VNPAY'
                  ? 'Tiếp tục với VNPay'
                  : isStaff
                    ? 'Đã thu khoản này'
                    : 'Xác nhận thanh toán'}
            </Button>
          </div>
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
