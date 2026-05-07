'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { requireAuth } from '@/lib/auth';
import { API_BASE, authHeaders, apiFetch } from '@/lib/api';

const ALL_CARDS = [
  { href: '/dashboard/profile', title: 'Hồ sơ Sinh viên', desc: 'Xem và rà soát thông tin cơ bản, tình trạng lưu trú và liên lạc.', roles: ['student'], icon: 'person' },
  { href: '/dashboard/repair-requests', title: 'Báo cáo sự cố', desc: 'Gửi báo cáo sự cố điện nước, nội thất cho BQL xử lý.', roles: ['student', 'staff'], icon: 'build' },
  { href: '/dashboard/invoices', title: 'Hóa đơn Điện Nước', desc: 'Xem và thanh toán hóa đơn tiêu thụ hàng tháng của phòng.', roles: ['student'], icon: 'receipt_long' },
  { href: '/dashboard/dorm-extensions', title: 'Gia hạn phòng', desc: 'Đăng ký ở tiếp phòng hiện tại.', roles: ['student'], icon: 'autorenew' },
  { href: '/staff/dorm-approvals', title: 'Duyệt Đơn KTX', desc: 'Rà soát và phê duyệt các đơn xin vào lưu trú.', roles: ['staff', 'admin'], icon: 'rule' },
  { href: '/dashboard/manage-extensions', title: 'Duyệt Gia Hạn', desc: 'Quyết định duyệt hoặc từ chối đơn gia hạn.', roles: ['staff', 'admin'], icon: 'history' },
  { href: '/dashboard/checkins', title: 'Xếp phòng (Check-in)', desc: 'Làm thủ tục gán phòng, lập hợp đồng.', roles: ['staff', 'admin'], icon: 'login' },
  { href: '/dashboard/checkouts', title: 'Trả phòng (Check-out)', desc: 'Thanh lý hợp đồng và giải phóng phòng.', roles: ['staff', 'admin'], icon: 'logout' },
  { href: '/dashboard/maintenance', title: 'Quản lý Sự cố', desc: 'Xử lý ticket báo hỏng từ sinh viên.', roles: ['staff', 'admin'], icon: 'engineering' },
  { href: '/dashboard/utility-readings', title: 'Gửi Chỉ số Điện/Nước', desc: 'Quét phòng và nhập chỉ số hàng loạt.', roles: ['staff', 'admin'], icon: 'bolt' },
  { href: '/dashboard/invoices', title: 'Hóa đơn Thu ngân', desc: 'Thu tiền và xuất hóa đơn.', roles: ['staff', 'admin'], icon: 'payments' },
  { href: '/dashboard/campus', title: 'Tòa & Tầng', desc: 'Khai báo hệ thống tòa nhà.', roles: ['admin'], icon: 'domain' },
  { href: '/dashboard/rooms', title: 'Quản lý Phòng', desc: 'Quản lý thiết lập và cấu hình phòng.', roles: ['admin'], icon: 'bed' },
  { href: '/dashboard/manage-staffs', title: 'Quản lý Nhân viên', desc: 'Phân quyền Cán bộ BQL.', roles: ['admin'], icon: 'group' },
  { href: '/dashboard/audit-logs', title: 'Nhật ký thao tác', desc: 'Theo dõi lịch sử rủi ro hệ thống.', roles: ['admin'], icon: 'manage_search' },
  { href: '/dashboard/system-settings', title: 'Cấu hình Hệ thống', desc: 'Thay đổi tham số phí dịch vụ.', roles: ['admin'], icon: 'settings' },
];

type DashboardStats = {
  occupancy: {
    totalRooms: number;
    totalCapacity: number;
    totalOccupied: number;
    occupancyRate: number;
    availableRooms: number;
    fullRooms: number;
    maintenanceRooms: number;
  };
  financial: {
    currentMonth: string;
    invoiceCount: number;
    paidCount: number;
    totalRevenue: number;
    paidRevenue: number;
    unpaidRevenue: number;
    monthlyRevenue: { month: string; paid: number; unpaid: number; total: number }[];
  };
  operations: {
    pendingRepairs: number;
    processingRepairs: number;
    resolvedRepairs: number;
    pendingExtensions: number;
    activeContracts: number;
  };
};

function formatVnd(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState('student');
  const [username, setUsername] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    const user = requireAuth(router);
    if (!user) return;
    setUserRole(user.role);
    setUsername(user.username);
    setIsLoading(false);

    if (user.role === 'staff' || user.role === 'admin') {
      apiFetch(`${API_BASE}/analytics/dashboard-stats`, { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Không tải được thống kê'))))
        .then((d) => setStats(d))
        .catch(() => setStatsError('Không tải được dữ liệu thống kê.'));
    }
  }, [router]);

  const visibleCards = ALL_CARDS.filter((c) => c.roles.includes(userRole));
  const showAnalytics = userRole === 'staff' || userRole === 'admin';

  const chartData =
    stats?.financial.monthlyRevenue.map((row) => ({
      label: row.month.replace(/^(\d{4})-(\d{2})$/, '$2/$1'),
      Đã_thu: row.paid,
      Còn_nợ: row.unpaid,
    })) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin h-10 w-10 text-primary">
          <svg fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    );
  }

  const inUsePercent = stats?.occupancy.totalRooms ? (stats.occupancy.totalRooms - stats.occupancy.availableRooms) / stats.occupancy.totalRooms * 100 : 0;
  const maintenancePercent = stats?.occupancy.totalRooms ? (stats.occupancy.maintenanceRooms / stats.occupancy.totalRooms) * 100 : 0;

  return (
    <>
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-primary tracking-tight font-headline">Chào buổi sáng, {username}</h2>
        <p className="text-on-surface-variant mt-2 font-body">Đây là số liệu thống kê vận hành KTX tổng quan.</p>
      </div>

      {showAnalytics && stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {/* Total Students */}
            <div className="bg-surface-container-lowest p-6 rounded-[24px] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-primary-fixed text-primary rounded-xl">
                  <span className="material-symbols-outlined">group</span>
                </div>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">Đã lấp đầy {stats.occupancy.occupancyRate}%</span>
              </div>
              <div className="mt-4">
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Đang ở / Sức chứa</p>
                <h3 className="text-3xl font-bold text-on-surface mt-1 tracking-tight">{stats.occupancy.totalOccupied} / {stats.occupancy.totalCapacity}</h3>
              </div>
            </div>

            {/* Rooms Occupancy */}
            <div className="bg-surface-container-lowest p-6 rounded-[24px] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-secondary-fixed text-secondary rounded-xl">
                  <span className="material-symbols-outlined">bed</span>
                </div>
                <span className="text-xs font-bold text-on-surface-variant">Trống: {stats.occupancy.availableRooms}</span>
              </div>
              <div className="mt-4">
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Tổng số phòng KTX</p>
                <h3 className="text-3xl font-bold text-on-surface mt-1 tracking-tight">{stats.occupancy.totalRooms}</h3>
              </div>
            </div>

            {/* Pending Approvals (Amber) */}
            <div className="bg-surface-container-lowest p-6 rounded-[24px] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow border-l-4 border-on-tertiary-container">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-tertiary-fixed text-on-tertiary-fixed-variant rounded-xl">
                  <span className="material-symbols-outlined">rule</span>
                </div>
                {stats.operations.pendingExtensions > 0 && <div className="w-2 h-2 bg-on-tertiary-container rounded-full animate-pulse"></div>}
              </div>
              <div className="mt-4">
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Đơn chờ duyệt</p>
                <h3 className="text-3xl font-bold text-on-tertiary-container mt-1 tracking-tight">{stats.operations.pendingExtensions}</h3>
              </div>
            </div>

            {/* Active Issues (Red) */}
            <div className="bg-surface-container-lowest p-6 rounded-[24px] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow border-l-4 border-error">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-error-container text-on-error-container rounded-xl">
                  <span className="material-symbols-outlined">warning</span>
                </div>
                {stats.operations.pendingRepairs > 0 && <span className="text-xs font-bold text-error px-2 py-1 bg-error-container rounded-lg">Khẩn cấp</span>}
              </div>
              <div className="mt-4">
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Sự cố chờ SC</p>
                <h3 className="text-3xl font-bold text-error mt-1 tracking-tight">{stats.operations.pendingRepairs}</h3>
              </div>
            </div>

            {/* Unpaid Invoices */}
            <div className="bg-surface-container-lowest p-6 rounded-[24px] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-surface-container-high text-on-surface-variant rounded-xl">
                  <span className="material-symbols-outlined">receipt_long</span>
                </div>
                <span className="text-xs font-bold text-on-surface-variant">{stats.financial.currentMonth}</span>
              </div>
              <div className="mt-4">
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Hóa đơn nợ ({stats.financial.invoiceCount - stats.financial.paidCount})</p>
                <h3 className="text-2xl font-bold text-on-surface mt-1 tracking-tight">{formatVnd(stats.financial.unpaidRevenue)}</h3>
              </div>
            </div>

            {/* Revenue */}
            <div className="bg-surface-container-lowest p-6 rounded-[24px] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-green-100 text-green-700 rounded-xl">
                  <span className="material-symbols-outlined">account_balance</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Doanh thu thu được</p>
                <h3 className="text-2xl font-bold text-green-700 mt-1 tracking-tight">{formatVnd(stats.financial.paidRevenue)}</h3>
              </div>
            </div>
            
            {/* Active Contracts */}
            <div className="bg-surface-container-lowest p-6 rounded-[24px] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow border-l-4 border-blue-400">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
                  <span className="material-symbols-outlined">history_edu</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Hợp đồng HHL</p>
                <h3 className="text-3xl font-bold text-blue-700 mt-1 tracking-tight">{stats.operations.activeContracts}</h3>
              </div>
            </div>

            {/* Active Staff */}
            <div className="bg-surface-container-lowest p-6 rounded-[24px] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-primary-fixed text-primary rounded-xl">
                  <span className="material-symbols-outlined">badge</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Phân quyền</p>
                <h3 className="text-3xl font-bold text-primary mt-1 tracking-tight">Active</h3>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            {/* Monthly Revenue Bar Chart */}
            <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-[32px] shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="text-lg font-bold text-on-surface font-headline">Doanh thu hàng tháng</h4>
                  <p className="text-xs text-on-surface-variant font-medium">Tổng hợp từ phí phòng, điện & nước</p>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-surface-container-high" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}tr`} />
                    <Tooltip formatter={(value) => formatVnd(Number(value ?? 0))} labelFormatter={(l) => `Tháng ${l}`} cursor={{ fill: 'var(--color-surface-container-highest)', opacity: 0.4 }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="Đã_thu" fill="var(--color-primary)" name="Đã thu" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Còn_nợ" fill="var(--color-on-tertiary-container)" name="Còn nợ" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 pt-6 border-t border-outline-variant/10 flex justify-between items-center">
                <p className="text-sm font-medium text-on-surface-variant">Tổng thu dự kiến kỳ này:</p>
                <p className="text-xl font-bold text-primary">{formatVnd(stats.financial.totalRevenue)}</p>
              </div>
            </div>

            {/* Room Occupancy Donut Chart */}
            <div className="bg-surface-container-lowest p-8 rounded-[32px] shadow-sm flex flex-col">
              <h4 className="text-lg font-bold text-on-surface font-headline mb-2">Trạng thái phòng</h4>
              <p className="text-xs text-on-surface-variant font-medium mb-8">Phân bổ sử dụng thực tế</p>
              
              <div className="relative w-48 h-48 mx-auto mb-8">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle className="stroke-surface-container" cx="18" cy="18" fill="none" r="16" strokeWidth="3.5" />
                  <circle className="stroke-primary transition-all duration-1000 ease-out" cx="18" cy="18" fill="none" r="16" strokeDasharray={`${inUsePercent}, 100`} strokeWidth="3.5" />
                  {maintenancePercent > 0 && (
                    <circle className="stroke-on-tertiary-container transition-all duration-1000 ease-out" cx="18" cy="18" fill="none" r="16" strokeDasharray={`${maintenancePercent}, 100`} strokeDashoffset={`-${inUsePercent}`} strokeWidth="3.5" />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-on-surface">{stats.occupancy.totalRooms}</span>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Tổng phòng</span>
                </div>
              </div>

              <div className="space-y-3 mt-auto">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <span className="text-on-surface-variant font-medium">Phòng đang dùng</span>
                  </div>
                  <span className="font-bold">{stats.occupancy.totalRooms - stats.occupancy.availableRooms}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-on-tertiary-container"></div>
                    <span className="text-on-surface-variant font-medium">Đang bảo trì</span>
                  </div>
                  <span className="font-bold">{stats.occupancy.maintenanceRooms}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-surface-container"></div>
                    <span className="text-on-surface-variant font-medium">Phòng trống</span>
                  </div>
                  <span className="font-bold">{stats.occupancy.availableRooms}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Utilities Array Panel */}
      <h3 className="text-xl font-bold font-headline mb-6">Tiện ích & Tính năng</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            prefetch={false}
            className="flex flex-col p-6 bg-surface-container-lowest border border-outline-variant/20 rounded-[20px] transition-all hover:shadow-lg hover:-translate-y-1 group"
          >
            <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined">{card.icon}</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface leading-tight mb-2 group-hover:text-primary">{card.title}</h3>
            <p className="text-on-surface-variant text-sm flex-1">{card.desc}</p>
          </Link>
        ))}
      </div>

      {/* FAB: Contextual Action */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-primary to-primary-container text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
      </button>
    </>
  );
}
