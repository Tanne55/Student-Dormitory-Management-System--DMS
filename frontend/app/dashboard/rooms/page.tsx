'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE, apiFetch, authHeaders } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { loadAllFloorOptions, type FloorOption } from '@/lib/floors';

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
  floorLabel?: string | null;
};

const initialForm = { floorId: '', roomNumber: '', roomTypeId: 0, gender: 'Mixed' };

type RoomTypeOption = {
  roomTypeId: number;
  name: string;
  capacity: number;
  monthlyPrice: string;
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
      setErrorMsg(e.message || 'Không tải được danh sách tầng. Hãy khai báo Tòa & Tầng trước.');
    }
  }

  async function loadRoomTypes() {
    try {
      const res = await apiFetch(`${API_BASE}/rooms/room-types`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) {
        setRoomTypeOptions(data);
        if (data.length > 0) {
          setForm(prev => ({ ...prev, roomTypeId: data[0].roomTypeId }));
        }
      }
    } catch {}
  }

  async function loadRooms() {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiFetch(`${API_BASE}/rooms`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể tải danh sách phòng.');
      setRooms(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErrorMsg(e.message || 'Lỗi kết nối máy chủ.');
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
      if (!res.ok) throw new Error(data.message || 'Không thể tạo phòng.');
      showSuccess(`Đã tạo phòng ${data.roomNumber}.`);
      setForm({ ...initialForm, floorId: form.floorId });
      setIsModalOpen(false);
      await loadRooms();
    } catch (e: any) {
      setErrorMsg(e.message || 'Lỗi kết nối máy chủ.');
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
      if (!res.ok) throw new Error(data.message || 'Không thể cập nhật phòng.');
      showSuccess(`Đã cập nhật phòng ${data.roomNumber}.`);
      setEditing(null);
      await loadRooms();
    } catch (e: any) {
      setErrorMsg(e.message || 'Lỗi kết nối máy chủ.');
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
      if (!res.ok) throw new Error(data.message || 'Không thể đổi trạng thái phòng.');
      showSuccess(`Đã cập nhật trạng thái phòng ${data.roomNumber}.`);
      await loadRooms();
    } catch (e: any) {
      setErrorMsg(e.message || 'Lỗi cập nhật trạng thái.');
    }
  }

  async function softDelete(roomId: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa phòng này khỏi danh sách quản lý?')) return;
    setErrorMsg('');
    try {
      const res = await apiFetch(`${API_BASE}/rooms/${roomId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể xóa phòng.');
      showSuccess('Đã xóa phòng thành công.');
      await loadRooms();
    } catch (e: any) {
      setErrorMsg(e.message || 'Lỗi kết nối máy chủ.');
    }
  }

  // Tiện ích UI
  const getStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-800 border border-green-200"><span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>Trống</span>;
      case 'FULL':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-800 border border-red-200"><span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>Đã Đầy</span>;
      case 'MAINTENANCE':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200"><span className="w-1.5 h-1.5 rounded-full bg-orange-600"></span>Bảo trì</span>;
      default:
        return <span className="px-3 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getGenderBadge = (gender: string) => {
    switch (gender) {
      case 'Male': case 'Nam': return <span className="text-blue-600 font-bold text-xs bg-blue-50 px-2 py-0.5 rounded">Nam</span>;
      case 'Female': case 'Nữ': return <span className="text-pink-600 font-bold text-xs bg-pink-50 px-2 py-0.5 rounded">Nữ</span>;
      default: return <span className="text-purple-600 font-bold text-xs bg-purple-50 px-2 py-0.5 rounded">Mixed</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header H1 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest p-6 rounded-[24px] border border-outline-variant/10 shadow-sm">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-2xl">bed</span>
            </div>
            <div>
                <h1 className="text-2xl font-bold text-on-surface tracking-tight">Quản lý Phòng KTX</h1>
                <p className="text-sm text-on-surface-variant font-medium">Theo dõi tình trạng, sửa chữa và thiết lập phòng mới.</p>
            </div>
        </div>
        <button 
            onClick={() => { setForm(initialForm); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5"
        >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Thêm Phòng Mới
        </button>
      </div>

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

      {/* Main Table Content */}
      <div className="bg-surface-container-lowest rounded-[24px] border border-surface-container-highest overflow-hidden shadow-sm">
        {loading ? (
            <div className="flex justify-center items-center h-48">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant">
                <span className="material-symbols-outlined text-6xl opacity-20 mb-4">night_shelter</span>
                <p className="font-bold text-lg">Chưa có phòng nào</p>
                <p className="text-sm opacity-80">Hãy thêm phòng mới vào tầng của tòa nhà.</p>
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-surface-container-low text-on-surface-variant text-[11px] uppercase tracking-wider font-bold">
                        <tr>
                            <th className="px-6 py-4 rounded-tl-[24px]">Tòa nhà</th>
                            <th className="px-6 py-4">Tầng</th>
                            <th className="px-6 py-4">Số Phòng</th>
                            <th className="px-6 py-4">Sức chứa</th>
                            <th className="px-6 py-4 text-center">Đang ở</th>
                            <th className="px-6 py-4">Đối tượng</th>
                            <th className="px-6 py-4 text-center">Trạng thái</th>
                            <th className="px-6 py-4 text-right rounded-tr-[24px]">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-highest">
                        {rooms.map((room) => (
                            <tr key={room.id} className="hover:bg-surface-container-low/50 transition-colors group">
                                <td className="px-6 py-4 font-bold text-on-surface">{room.buildingCode ?? '—'}</td>
                                <td className="px-6 py-4 text-on-surface-variant">
                                    {room.floorNumber != null ? `Tầng ${room.floorNumber}` : '—'}
                                </td>
                                <td className="px-6 py-4 font-black text-primary text-base">
                                    {room.roomNumber}
                                </td>
                                <td className="px-6 py-4 text-on-surface-variant font-medium">
                                    {room.capacity} Giường
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center font-bold">
                                        <span className={room.currentOccupancy >= room.capacity ? "text-error" : "text-primary"}>
                                            {room.currentOccupancy}
                                        </span>
                                        <span className="text-on-surface-variant opacity-50 mx-1">/</span>
                                        <span className="text-on-surface-variant">{room.capacity}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {getGenderBadge(room.gender)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {/* Action Dropdown for Status on Hover or Click */}
                                    <select 
                                        value={room.status}
                                        onChange={(e) => changeStatus(room.id, e.target.value as RoomStatus)}
                                        className={`appearance-none bg-transparent font-bold text-xs cursor-pointer outline-none ${
                                            room.status === 'AVAILABLE' ? 'text-green-700' :
                                            room.status === 'FULL' ? 'text-red-700' : 'text-orange-700'
                                        }`}
                                    >
                                        <option value="AVAILABLE" className="text-black">AVAILABLE (Trống)</option>
                                        <option value="FULL" className="text-black">FULL (Đầy)</option>
                                        <option value="MAINTENANCE" className="text-black">MAINTENANCE (Bảo trì)</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 hidden"></div>
                                    <br />
                                    <div className="mt-1">{getStatusBadge(room.status)}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => setEditing(room)}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                            title="Sửa phòng"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </button>
                                        <button 
                                            onClick={() => softDelete(room.id)}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                            title="Xóa phòng"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {/* Modal Overlay (Add & Edit combined beautifully) */}
      {(isModalOpen || editing) && (
        <div className="fixed inset-0 bg-secondary-fixed-variant/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-surface-container-highest animate-out">
                {/* Modal Header */}
                <div className="bg-surface-container-low px-8 py-6 border-b border-surface-container-high flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined">{editing ? 'edit_square' : 'add_box'}</span>
                        </div>
                        <h2 className="text-xl font-bold text-on-surface">
                            {editing ? `Cập nhật Phòng ${editing.roomNumber}` : 'Thêm Phòng Mới'}
                        </h2>
                    </div>
                    <button 
                        onClick={() => { setIsModalOpen(false); setEditing(null); }}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Modal Form */}
                <form onSubmit={editing ? saveEdit : submitCreate} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tầng trực thuộc</label>
                        <select 
                            className="w-full bg-surface outline-none border border-outline-variant/50 focus:border-primary px-4 py-3 rounded-xl transition-colors font-medium text-sm text-on-surface"
                            value={editing ? editing.floorId : form.floorId}
                            onChange={(e) => editing ? setEditing({...editing, floorId: e.target.value}) : setForm({...form, floorId: e.target.value})}
                            required
                        >
                            <option value="">— Chọn Tầng —</option>
                            {floorOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tên Số Phòng</label>
                        <input 
                            required autoFocus
                            placeholder="vd: 402, 101, VIP-1..."
                            className="w-full bg-surface outline-none border border-outline-variant/50 focus:border-primary px-4 py-3 rounded-xl transition-colors font-black text-primary text-xl"
                            value={editing ? editing.roomNumber : form.roomNumber}
                            onChange={(e) => editing ? setEditing({...editing, roomNumber: e.target.value}) : setForm({...form, roomNumber: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Loại Phòng</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">hotel_class</span>
                                <select 
                                    required
                                    className="w-full pl-10 bg-surface outline-none border border-outline-variant/50 focus:border-primary px-4 py-3 rounded-xl transition-colors font-medium text-sm text-on-surface"
                                    value={editing ? editing.roomTypeId : form.roomTypeId}
                                    onChange={(e) => editing ? setEditing({...editing, roomTypeId: Number(e.target.value)}) : setForm({...form, roomTypeId: Number(e.target.value)})}
                                >
                                    <option value="">— Chọn Loại Phòng —</option>
                                    {roomTypeOptions.map(t => (
                                        <option key={t.roomTypeId} value={t.roomTypeId}>
                                            {t.name} (Sức chứa: {t.capacity}) - {Number(t.monthlyPrice).toLocaleString()} vnđ/tháng
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Đối tượng giới tính</label>
                            <select 
                                className="w-full bg-surface outline-none border border-outline-variant/50 focus:border-primary px-4 py-3 rounded-xl transition-colors font-medium text-sm"
                                value={editing ? editing.gender : form.gender}
                                onChange={(e) => editing ? setEditing({...editing, gender: e.target.value}) : setForm({...form, gender: e.target.value})}
                            >
                                <option value="Mixed">Mixed (Hỗn hợp)</option>
                                <option value="Nam">Nam</option>
                                <option value="Nữ">Nữ</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-surface-container-high flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={() => { setIsModalOpen(false); setEditing(null); }}
                            className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors text-sm"
                        >
                            Hủy bỏ
                        </button>
                        <button 
                            type="submit" 
                            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-xl hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all text-sm"
                        >
                            <span className="material-symbols-outlined text-[18px]">save</span>
                            {editing ? 'Lưu thay đổi' : 'Tạo phòng'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}
