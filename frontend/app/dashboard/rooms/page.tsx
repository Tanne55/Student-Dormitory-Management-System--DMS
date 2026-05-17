'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE, apiFetch, authHeaders } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { loadAllFloorOptions, type FloorOption } from '@/lib/floors';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Table } from '@/components/ui';

type RoomStatus = 'AVAILABLE' | 'FULL' | 'MAINTENANCE';
type RoomRow = {
  id: string;
  floorId: string;
  roomNumber: string;
  roomTypeId: number;
  gender: string;
  capacity: number;
  currentOccupancy: number;
  status: RoomStatus;
  monthlyPrice: number | null;
  buildingCode?: string | null;
  buildingName?: string | null;
  floorNumber?: number | null;
};

const initialForm = { floorId: '', roomNumber: '', roomTypeId: 0, gender: 'Mixed' };

type RoomTypeOption = {
  roomTypeId: number;
  name: string;
  capacity: number;
  monthlyPrice: string;
};

const STATUS_META: Record<RoomStatus, { tone: 'approved' | 'rejected' | 'pending'; label: string }> = {
  AVAILABLE: { tone: 'approved', label: 'Trống' },
  FULL: { tone: 'rejected', label: 'Đã đầy' },
  MAINTENANCE: { tone: 'pending', label: 'Bảo trì' },
};

export default function RoomsAdminPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [floorOptions, setFloorOptions] = useState<FloorOption[]>([]);
  const [roomTypeOptions, setRoomTypeOptions] = useState<RoomTypeOption[]>([]);
  const [form, setForm] = useState(initialForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<RoomRow | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = requireAuth(router);
    if (!user) return;
    if (user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    void loadRoomTypes();
    void loadFloors();
    void loadRooms();
  }, [router]);

  async function loadFloors() {
    try {
      const opts = await loadAllFloorOptions();
      setFloorOptions(opts);
      setForm((prev) => (prev.floorId ? prev : { ...prev, floorId: opts[0]?.id ?? '' }));
    } catch (e: any) {
      setErrorMsg(e.message || 'Không tải được danh sách tầng.');
    }
  }

  async function loadRoomTypes() {
    try {
      const res = await apiFetch(`${API_BASE}/rooms/room-types`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) {
        setRoomTypeOptions(data);
        if (data.length > 0) setForm((p) => ({ ...p, roomTypeId: data[0].roomTypeId }));
      }
    } catch {}
  }

  async function loadRooms() {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiFetch(`${API_BASE}/rooms`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không tải được phòng.');
      setRooms(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (!form.floorId) {
      setErrorMsg('Vui lòng chọn tầng.');
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE}/rooms`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          floorId: form.floorId,
          roomNumber: form.roomNumber,
          roomTypeId: Number(form.roomTypeId),
          gender: form.gender,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không tạo được phòng.');
      showSuccess(`Đã tạo phòng ${data.roomNumber}.`);
      setForm({ ...initialForm, floorId: form.floorId });
      setIsModalOpen(false);
      await loadRooms();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setErrorMsg('');
    try {
      const res = await apiFetch(`${API_BASE}/rooms/${editing.id}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          floorId: editing.floorId,
          roomNumber: editing.roomNumber,
          roomTypeId: Number(editing.roomTypeId),
          gender: editing.gender,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không cập nhật được phòng.');
      showSuccess(`Đã cập nhật phòng ${data.roomNumber}.`);
      setEditing(null);
      await loadRooms();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  }

  async function changeStatus(roomId: string, status: RoomStatus) {
    setErrorMsg('');
    try {
      const res = await apiFetch(`${API_BASE}/rooms/${roomId}/status`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không đổi được trạng thái.');
      showSuccess(`Đã cập nhật trạng thái phòng ${data.roomNumber}.`);
      await loadRooms();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  }

  async function softDelete(roomId: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa phòng này?')) return;
    setErrorMsg('');
    try {
      const res = await apiFetch(`${API_BASE}/rooms/${roomId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không xóa được phòng.');
      showSuccess('Đã xóa phòng.');
      await loadRooms();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  }

  const isFormOpen = isModalOpen || !!editing;
  const formData = editing || form;
  const onFormChange = (field: keyof typeof initialForm, value: any) => {
    if (editing) setEditing({ ...editing, [field]: value } as any);
    else setForm({ ...form, [field]: value });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Quản lý phòng KTX"
        description="Theo dõi tình trạng, sửa chữa và thiết lập phòng mới."
        icon={<span className="material-symbols-outlined">bed</span>}
        action={
          <Button
            variant="gradient"
            onClick={() => {
              setForm(initialForm);
              setIsModalOpen(true);
            }}
            icon={<span className="material-symbols-outlined text-[18px]">add</span>}
          >
            Thêm phòng
          </Button>
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

      <Card padding="sm">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <Table
            rows={rooms}
            getRowKey={(r) => r.id}
            empty={
              <EmptyState
                icon="night_shelter"
                title="Chưa có phòng nào"
                description="Hãy thêm phòng mới vào tầng của tòa nhà."
              />
            }
            columns={[
              {
                key: 'building',
                header: 'Tòa',
                render: (r) => <span className="font-bold text-on-surface">{r.buildingCode ?? '—'}</span>,
              },
              {
                key: 'floor',
                header: 'Tầng',
                render: (r) => (
                  <span className="text-on-surface-variant">
                    {r.floorNumber != null ? `Tầng ${r.floorNumber}` : '—'}
                  </span>
                ),
              },
              {
                key: 'roomNo',
                header: 'Số phòng',
                render: (r) => <span className="font-black text-primary text-base">{r.roomNumber}</span>,
              },
              {
                key: 'capacity',
                header: 'Sức chứa',
                render: (r) => <span className="text-on-surface-variant font-medium">{r.capacity} giường</span>,
              },
              {
                key: 'occupancy',
                header: 'Đang ở',
                align: 'center',
                render: (r) => (
                  <div className="flex items-center justify-center font-bold">
                    <span className={r.currentOccupancy >= r.capacity ? 'text-error' : 'text-primary'}>
                      {r.currentOccupancy}
                    </span>
                    <span className="text-on-surface-variant/50 mx-1">/</span>
                    <span className="text-on-surface-variant">{r.capacity}</span>
                  </div>
                ),
              },
              {
                key: 'gender',
                header: 'Giới tính',
                render: (r) => {
                  const tone = r.gender === 'Nam' || r.gender === 'Male' ? 'in-progress' : r.gender === 'Nữ' || r.gender === 'Female' ? 'rejected' : 'info';
                  return <Badge tone={tone as any}>{r.gender}</Badge>;
                },
              },
              {
                key: 'status',
                header: 'Trạng thái',
                align: 'center',
                render: (r) => (
                  <select
                    value={r.status}
                    onChange={(e) => changeStatus(r.id, e.target.value as RoomStatus)}
                    className="appearance-none bg-transparent font-bold text-xs cursor-pointer outline-none px-2 py-1 rounded-lg hover:bg-surface-container-high"
                  >
                    {(['AVAILABLE', 'FULL', 'MAINTENANCE'] as RoomStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                ),
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (r) => (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditing(r)}
                      className="w-9 h-9 rounded-xl bg-primary-fixed text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors"
                      title="Sửa phòng"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={() => softDelete(r.id)}
                      className="w-9 h-9 rounded-xl bg-error-container text-error flex items-center justify-center hover:bg-error hover:text-on-error transition-colors"
                      title="Xóa phòng"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        open={isFormOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditing(null);
        }}
        title={editing ? `Cập nhật phòng ${editing.roomNumber}` : 'Thêm phòng mới'}
        icon={
          <span className="material-symbols-outlined">{editing ? 'edit_square' : 'add_box'}</span>
        }
        size="md"
      >
        <form onSubmit={editing ? saveEdit : submitCreate} className="space-y-5">
          <Field label="Tầng trực thuộc" required>
            <select
              className="w-full h-12 rounded-2xl bg-surface-container-lowest border-2 border-outline-variant/20 focus:border-primary/40 px-4 text-sm font-medium text-on-surface outline-none transition-all"
              value={formData.floorId}
              onChange={(e) => onFormChange('floorId', e.target.value)}
              required
            >
              <option value="">— Chọn tầng —</option>
              {floorOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Số phòng" required>
            <Input
              required
              autoFocus
              placeholder="VD: 402, VIP-1..."
              value={formData.roomNumber}
              onChange={(e) => onFormChange('roomNumber', e.target.value)}
              className="font-black text-primary text-lg"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Loại phòng" required>
              <select
                required
                className="w-full h-12 rounded-2xl bg-surface-container-lowest border-2 border-outline-variant/20 focus:border-primary/40 px-4 text-sm font-medium text-on-surface outline-none transition-all"
                value={formData.roomTypeId}
                onChange={(e) => onFormChange('roomTypeId', Number(e.target.value))}
              >
                <option value="">— Chọn loại —</option>
                {roomTypeOptions.map((t) => (
                  <option key={t.roomTypeId} value={t.roomTypeId}>
                    {t.name} ({t.capacity} người) - {Number(t.monthlyPrice).toLocaleString()}₫/tháng
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Giới tính">
              <select
                className="w-full h-12 rounded-2xl bg-surface-container-lowest border-2 border-outline-variant/20 focus:border-primary/40 px-4 text-sm font-medium text-on-surface outline-none transition-all"
                value={formData.gender}
                onChange={(e) => onFormChange('gender', e.target.value)}
              >
                <option value="Mixed">Mixed</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </Field>
          </div>

          <div className="pt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsModalOpen(false);
                setEditing(null);
              }}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="gradient"
              icon={<span className="material-symbols-outlined text-[18px]">save</span>}
            >
              {editing ? 'Lưu thay đổi' : 'Tạo phòng'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
