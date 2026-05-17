'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';
import { loadAllFloorOptions, type FloorOption } from '@/lib/floors';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Table } from '@/components/ui';

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
    idCardNumber: '',
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
    void fetchStaffs();
  }, [router]);

  const fetchStaffs = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/staffs`, { headers: authHeaders() });
      if (res.ok) setStaffs(await res.json());
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(msg || 'Không tạo được tài khoản.');
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
        throw new Error(err.message || 'Lỗi truy xuất.');
      }
      const scopes: { floorId?: string; floor?: { id: string } }[] = await res.json();
      const ids = new Set<string>();
      for (const s of scopes) {
        const id = s.floorId ?? s.floor?.id;
        if (id) ids.add(id);
      }
      setScopeSelectedIds(ids);
    } catch (e: any) {
      setScopeError(e.message);
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
      if (!res.ok) throw new Error((data as any).message || 'Lỗi lưu phạm vi.');
      setScopeAccountId(null);
    } catch (e: any) {
      setScopeError(e.message);
    } finally {
      setScopeSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Hệ thống nhân sự quản lý"
        description="Cấp phát tài khoản nghiệp vụ, định danh và phân quyền thao tác."
        icon={<span className="material-symbols-outlined">admin_panel_settings</span>}
        action={
          <Button
            variant={isFormOpen ? 'secondary' : 'gradient'}
            onClick={() => setIsFormOpen(!isFormOpen)}
            icon={
              <span className="material-symbols-outlined text-[18px]">
                {isFormOpen ? 'close' : 'person_add'}
              </span>
            }
          >
            {isFormOpen ? 'Đóng' : 'Thêm staff'}
          </Button>
        }
      />

      {isFormOpen && (
        <Card padding="lg">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-surface-container-high/40">
            <div className="w-10 h-10 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
              <span className="material-symbols-outlined">person_add</span>
            </div>
            <h2 className="text-lg font-bold text-on-surface">Hồ sơ cán bộ mới</h2>
          </div>

          {errorMsg && (
            <div className="mb-5 bg-error-container text-on-error-container px-4 py-3 rounded-2xl text-sm font-bold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Username đăng nhập" required>
                <Input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="vd: tung_admin"
                  icon={<span className="material-symbols-outlined text-[20px]">account_circle</span>}
                  required
                />
              </Field>
              <Field label="Họ và tên" required>
                <Input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                  icon={<span className="material-symbols-outlined text-[20px]">badge</span>}
                  required
                />
              </Field>
              <Field label="Số điện thoại" required>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="098..."
                  icon={<span className="material-symbols-outlined text-[20px]">phone_iphone</span>}
                  required
                />
              </Field>
              <Field label="Email cơ quan" required>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="staff@ktx.edu.vn"
                  icon={<span className="material-symbols-outlined text-[20px]">mail</span>}
                  required
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Số căn cước công dân" required>
                  <Input
                    name="idCardNumber"
                    value={formData.idCardNumber}
                    onChange={handleChange}
                    placeholder="001201..."
                    icon={<span className="material-symbols-outlined text-[20px]">fingerprint</span>}
                    className="font-black text-primary tracking-widest"
                    required
                  />
                </Field>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                variant="gradient"
                loading={isSubmitting}
                icon={!isSubmitting ? <span className="material-symbols-outlined">how_to_reg</span> : undefined}
              >
                {isSubmitting ? 'Đang tạo...' : 'Xác nhận kết nạp'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card padding="sm">
        <div className="flex items-center justify-between px-2 py-3 mb-2">
          <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">
            Danh sách thành viên
          </h2>
          <span className="bg-primary-fixed text-on-primary-fixed px-3 py-0.5 rounded-full text-xs font-bold uppercase">
            {staffs.length} staffs
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <Table
            rows={staffs}
            getRowKey={(r) => r.id}
            empty={
              <EmptyState
                icon="shield_locked"
                title="Chưa có nhân viên nào"
                description="Đăng ký nhân sự để cấp tài khoản truy cập hệ thống."
              />
            }
            columns={[
              {
                key: 'code',
                header: 'Định danh',
                render: (r) => (
                  <div>
                    <div className="inline-flex items-center gap-1 bg-primary-fixed text-on-primary-fixed px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[14px]">id_card</span> {r.staffCode}
                    </div>
                    <div className="text-[9px] font-mono text-on-surface-variant/70 mt-1 uppercase tracking-widest ml-1">
                      UID:{r.accountId}
                    </div>
                  </div>
                ),
              },
              {
                key: 'name',
                header: 'Họ tên',
                render: (r) => <span className="font-bold text-on-surface text-base">{r.fullName}</span>,
              },
              {
                key: 'contact',
                header: 'Liên hệ',
                render: (r) => (
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs font-mono text-on-surface-variant">
                      <span className="material-symbols-outlined text-[12px]">call</span> {r.phone}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-[12px]">mail</span> {r.email}
                    </span>
                  </div>
                ),
              },
              {
                key: 'idCard',
                header: 'CCCD',
                render: (r) => (
                  <span className="font-mono font-bold text-on-surface-variant bg-surface-container-low px-3 py-1.5 rounded-lg tracking-widest">
                    {r.idCardNumber}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Quyền',
                align: 'right',
                render: (r) => (
                  <button
                    onClick={() => void openScopeModal(r)}
                    className="w-10 h-10 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-primary hover:text-on-primary flex items-center justify-center transition-colors"
                    title="Cấu hình quyền"
                  >
                    <span className="material-symbols-outlined text-[18px]">rule_settings</span>
                  </button>
                ),
              },
            ]}
          />
        )}
      </Card>

      {/* Success Modal */}
      <Modal
        open={!!successData}
        onClose={() => setSuccessData(null)}
        title="Tài khoản nhân sự đã tạo!"
        icon={
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
        }
        footer={
          <Button
            variant="gradient"
            onClick={() => setSuccessData(null)}
            icon={<span className="material-symbols-outlined">how_to_reg</span>}
          >
            Đã lưu mật khẩu & đóng
          </Button>
        }
      >
        {successData && (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant text-center">
              Tài khoản nghiệp vụ <span className="font-bold text-primary">{successData.fullName}</span> đã hoạt động.
            </p>
            <div className="bg-surface-container-low rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center bg-surface-container-lowest px-4 py-3 rounded-xl">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Staff Code
                </span>
                <span className="font-mono font-black text-primary text-lg uppercase">{successData.staffCode}</span>
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-sm font-bold text-on-surface-variant">Username</span>
                <span className="font-black text-on-surface bg-surface-container px-3 py-1 rounded-lg">
                  {successData.username}
                </span>
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-sm font-bold text-on-surface-variant">Mật khẩu mặc định</span>
                <span className="font-mono font-bold text-error bg-error-container/40 px-3 py-1 rounded-lg">
                  {successData.password}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Scope Modal */}
      <Modal
        open={scopeAccountId != null}
        onClose={() => setScopeAccountId(null)}
        title="Phân quyền tầng"
        description={scopeStaffName}
        icon={<span className="material-symbols-outlined">rule_folder</span>}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setScopeAccountId(null)} disabled={scopeSaving}>
              Đóng
            </Button>
            <Button
              variant="gradient"
              loading={scopeSaving}
              disabled={scopeLoading || scopeSaving}
              onClick={() => void saveScopes()}
              icon={!scopeSaving ? <span className="material-symbols-outlined">save_as</span> : undefined}
            >
              {scopeSaving ? 'Đang lưu...' : 'Lưu phạm vi'}
            </Button>
          </>
        }
      >
        <p className="text-xs font-medium text-on-surface-variant mb-4 bg-surface-container-low p-3 rounded-2xl italic">
          Chọn các tầng mà nhân viên được phép quản lý. Bỏ trống = tạm ngưng quyền.
        </p>

        {scopeError && (
          <div className="mb-4 bg-error-container text-on-error-container p-3 rounded-2xl text-sm font-bold">
            {scopeError}
          </div>
        )}

        {scopeLoading ? (
          <div className="flex justify-center items-center py-10">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : scopeFloorOptions.length === 0 ? (
          <EmptyState icon="location_off" title="Chưa có tầng nào trong DB" />
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {scopeFloorOptions.map((f) => {
              const checked = scopeSelectedIds.has(f.id);
              return (
                <label
                  key={f.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all ${
                    checked
                      ? 'bg-primary-fixed text-on-primary-fixed ring-2 ring-primary/20'
                      : 'bg-surface-container-low hover:bg-surface-container-high'
                  }`}
                >
                  <div
                    className={`relative w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                      checked ? 'bg-primary' : 'bg-surface-container-lowest border-2 border-outline-variant/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleScopeFloor(f.id)}
                    />
                    {checked && (
                      <span
                        className="material-symbols-outlined text-on-primary text-[16px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check
                      </span>
                    )}
                  </div>
                  <p className={`font-bold text-sm ${checked ? 'text-primary' : 'text-on-surface'}`}>{f.label}</p>
                </label>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
