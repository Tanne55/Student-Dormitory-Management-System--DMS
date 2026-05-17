'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { API_BASE, apiFetch, authHeaders } from '@/lib/api';
import { Button, Card, EmptyState, Field, Input, PageHeader } from '@/components/ui';

type Building = { id: string; code: string; name: string; address?: string | null };
type Floor = { id: string; buildingId: string; floorNumber: number; label?: string | null };

export default function CampusAdminPage() {
  const router = useRouter();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const [isAddBuildingMode, setIsAddBuildingMode] = useState(false);
  const [newBuilding, setNewBuilding] = useState({ code: '', name: '', address: '' });
  const [newFloor, setNewFloor] = useState({ floorNumber: 1, label: '' });

  useEffect(() => {
    const user = requireAuth(router);
    if (!user) return;
    if (user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    void loadBuildings();
  }, [router]);

  useEffect(() => {
    if (!selectedBuildingId) {
      setFloors([]);
      return;
    }
    void loadFloors(selectedBuildingId);
  }, [selectedBuildingId]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  async function loadBuildings() {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiFetch(`${API_BASE}/buildings`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tải danh sách tòa.');
      const list = Array.isArray(data) ? data : [];
      setBuildings(list);
      setSelectedBuildingId((prev) => {
        if (list.length === 0) return '';
        if (prev && list.some((b: Building) => b.id === prev)) return prev;
        return list[0].id;
      });
    } catch (e: any) {
      setErrorMsg(e.message || 'Lỗi truy xuất.');
    } finally {
      setLoading(false);
    }
  }

  async function loadFloors(buildingId: string) {
    try {
      const res = await apiFetch(`${API_BASE}/buildings/${buildingId}/floors`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error('Không tải được tầng.');
      setFloors(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  }

  async function submitBuilding(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await apiFetch(`${API_BASE}/buildings`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          code: newBuilding.code.trim(),
          name: newBuilding.name.trim(),
          address: newBuilding.address.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tạo tòa.');
      showToast(`Đã tạo tòa ${data.code}.`);
      setNewBuilding({ code: '', name: '', address: '' });
      setIsAddBuildingMode(false);
      await loadBuildings();
      setSelectedBuildingId(data.id);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  }

  async function submitFloor(e: FormEvent) {
    e.preventDefault();
    if (!selectedBuildingId) return;
    setErrorMsg('');
    try {
      const res = await apiFetch(`${API_BASE}/buildings/${selectedBuildingId}/floors`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          floorNumber: Number(newFloor.floorNumber),
          label: newFloor.label.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tạo tầng.');
      showToast(`Đã thêm tầng ${data.floorNumber}.`);
      setNewFloor({ floorNumber: 1, label: '' });
      await loadFloors(selectedBuildingId);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  }

  const currentBuilding = buildings.find((b) => b.id === selectedBuildingId);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Khai báo Cơ sở KTX"
        description="Thiết lập cấu trúc Tòa nhà & Tầng phục vụ điều phối hệ thống."
        icon={<span className="material-symbols-outlined">corporate_fare</span>}
        action={
          !isAddBuildingMode && (
            <Button
              variant="gradient"
              onClick={() => setIsAddBuildingMode(true)}
              icon={<span className="material-symbols-outlined text-[18px]">add_location_alt</span>}
            >
              Thêm tòa nhà
            </Button>
          )
        }
      />

      {errorMsg && (
        <div className="bg-error-container text-on-error-container px-6 py-4 rounded-2xl flex items-start gap-3">
          <span className="material-symbols-outlined text-error mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
            error
          </span>
          <span className="text-sm font-bold leading-relaxed">{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <Card padding="lg" className="min-h-[500px]">
            <h2 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">apartment</span>
              Danh mục tòa
            </h2>

            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : buildings.length === 0 ? (
              <EmptyState icon="location_off" title="Chưa có tòa nhà nào" />
            ) : (
              <div className="space-y-3">
                {buildings.map((b) => {
                  const active = selectedBuildingId === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBuildingId(b.id)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all relative overflow-hidden ${
                        active
                          ? 'bg-primary-fixed text-on-primary-fixed shadow-sm'
                          : 'bg-surface-container-low hover:bg-surface-container-high'
                      }`}
                    >
                      {active && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-l-2xl" />}
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`font-black text-lg ${active ? 'text-primary' : 'text-on-surface'}`}>
                            {b.code}
                          </h3>
                          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">
                            {b.name}
                          </p>
                        </div>
                        <span className={`material-symbols-outlined ${active ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                          chevron_right
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {isAddBuildingMode && (
            <Card padding="lg">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-surface-container-high/40">
                <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">add_business</span>
                  Đăng ký tòa KTX mới
                </h2>
                <button
                  onClick={() => setIsAddBuildingMode(false)}
                  className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <form onSubmit={submitBuilding} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Mã tòa (định danh)" required>
                    <Input
                      value={newBuilding.code}
                      onChange={(e) => setNewBuilding({ ...newBuilding, code: e.target.value.toUpperCase() })}
                      placeholder="VD: T1, A1..."
                      className="uppercase font-black"
                      required
                    />
                  </Field>
                  <Field label="Tên hiển thị" required>
                    <Input
                      value={newBuilding.name}
                      onChange={(e) => setNewBuilding({ ...newBuilding, name: e.target.value })}
                      placeholder="VD: Tòa A1 chất lượng cao"
                      required
                    />
                  </Field>
                </div>
                <Field label="Địa chỉ (tùy chọn)">
                  <Input
                    value={newBuilding.address}
                    onChange={(e) => setNewBuilding({ ...newBuilding, address: e.target.value })}
                    placeholder="Cơ sở 1 - Đường ABC..."
                  />
                </Field>
                <div className="pt-4 flex justify-end">
                  <Button
                    type="submit"
                    variant="gradient"
                    icon={<span className="material-symbols-outlined text-[18px]">save</span>}
                  >
                    Khởi tạo cơ sở
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {!isAddBuildingMode && selectedBuildingId && (
            <>
              <Card padding="lg">
                <h2 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">layers</span>
                  Mở rộng tầng
                  <span className="bg-primary-fixed text-on-primary-fixed px-3 py-1 rounded-full text-xs font-black uppercase">
                    {currentBuilding?.code}
                  </span>
                </h2>
                <form onSubmit={submitFloor} className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <Field label="Đánh số tầng">
                      <Input
                        type="number"
                        min={0}
                        value={newFloor.floorNumber}
                        onChange={(e) => setNewFloor({ ...newFloor, floorNumber: Number(e.target.value) })}
                        className="text-center font-black text-primary text-lg"
                        required
                      />
                    </Field>
                  </div>
                  <div className="flex-[2]">
                    <Field label="Nhãn phụ (option)">
                      <Input
                        value={newFloor.label}
                        onChange={(e) => setNewFloor({ ...newFloor, label: e.target.value })}
                        placeholder="VD: Tầng trệt, sinh hoạt chung..."
                      />
                    </Field>
                  </div>
                  <Button
                    type="submit"
                    variant="gradient"
                    icon={<span className="material-symbols-outlined">add_to_photos</span>}
                  >
                    Thêm tầng
                  </Button>
                </form>
              </Card>

              <Card padding="lg">
                <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-4 pb-4 border-b border-surface-container-high/40">
                  Bản đồ cấp tầng ({floors.length})
                </h2>
                {floors.length === 0 ? (
                  <EmptyState icon="layers_clear" title="Tòa nhà này chưa có tầng nào" />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {floors.map((f) => (
                      <div
                        key={f.id}
                        className="bg-surface-container-low rounded-2xl p-4 flex items-center gap-4 hover:bg-surface-container-high transition-colors"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
                          <span className="font-black text-xl">{f.floorNumber}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-primary text-sm uppercase tracking-wider">
                            Tầng {f.floorNumber}
                          </h3>
                          <p className="text-xs font-medium text-on-surface-variant mt-0.5 truncate" title={f.label || ''}>
                            {f.label || 'Không có nhãn riêng'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

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
