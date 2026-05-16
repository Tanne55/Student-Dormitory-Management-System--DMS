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
import { Card, StatCard } from '@/components/ui';

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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Chào buổi sáng';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState('student');
  const [username, setUsername] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);

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
        .catch(() => {});
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
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const inUsePercent = stats?.occupancy.totalRooms
    ? ((stats.occupancy.totalRooms - stats.occupancy.availableRooms) / stats.occupancy.totalRooms) * 100
    : 0;
  const maintenancePercent = stats?.occupancy.totalRooms
    ? (stats.occupancy.maintenanceRooms / stats.occupancy.totalRooms) * 100
    : 0;

  return (
    <>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-primary tracking-tight">
          {getGreeting()}, {username}
        </h1>
        <p className="text-on-surface-variant mt-2">
          Đây là số liệu thống kê vận hành KTX tổng quan.
        </p>
      </div>

      {showAnalytics && stats && (
        <>
          {/* Bento grid 2x4 stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard
              label="Đang ở / Sức chứa"
              value={`${stats.occupancy.totalOccupied} / ${stats.occupancy.totalCapacity}`}
              icon={<span className="material-symbols-outlined">group</span>}
              accent="primary"
              meta={`Lấp ${stats.occupancy.occupancyRate}%`}
            />
            <StatCard
              label="Tổng số phòng KTX"
              value={stats.occupancy.totalRooms}
              icon={<span className="material-symbols-outlined">bed</span>}
              accent="info"
              meta={`Trống: ${stats.occupancy.availableRooms}`}
            />
            <StatCard
              label="Đơn chờ duyệt"
              value={stats.operations.pendingExtensions}
              icon={<span className="material-symbols-outlined">rule</span>}
              accent="warning"
            />
            <StatCard
              label="Sự cố chờ SC"
              value={stats.operations.pendingRepairs}
              icon={<span className="material-symbols-outlined">warning</span>}
              accent="danger"
            />
            <StatCard
              label={`Hóa đơn nợ (${stats.financial.invoiceCount - stats.financial.paidCount})`}
              value={formatVnd(stats.financial.unpaidRevenue)}
              icon={<span className="material-symbols-outlined">receipt_long</span>}
              meta={stats.financial.currentMonth}
            />
            <StatCard
              label="Doanh thu thu được"
              value={formatVnd(stats.financial.paidRevenue)}
              icon={<span className="material-symbols-outlined">account_balance</span>}
              accent="success"
            />
            <StatCard
              label="Hợp đồng hiệu lực"
              value={stats.operations.activeContracts}
              icon={<span className="material-symbols-outlined">history_edu</span>}
              accent="info"
            />
            <StatCard
              label="Phân quyền"
              value="Active"
              icon={<span className="material-symbols-outlined">badge</span>}
              accent="primary"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            <Card padding="lg" className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Doanh thu hàng tháng</h2>
                  <p className="text-xs text-on-surface-variant font-medium">
                    Tổng hợp từ phí phòng, điện & nước
                  </p>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-surface-container-high" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}tr`}
                    />
                    <Tooltip
                      formatter={(value) => formatVnd(Number(value ?? 0))}
                      labelFormatter={(l) => `Tháng ${l}`}
                      cursor={{ fill: 'var(--color-surface-container-highest)', opacity: 0.4 }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="Đã_thu" fill="var(--color-primary)" name="Đã thu" radius={[6, 6, 0, 0]} />
                    <Bar
                      dataKey="Còn_nợ"
                      fill="var(--color-on-tertiary-container)"
                      name="Còn nợ"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 pt-6 border-t border-outline-variant/10 flex justify-between items-center">
                <p className="text-sm font-medium text-on-surface-variant">Tổng thu dự kiến kỳ này:</p>
                <p className="text-xl font-bold text-primary">{formatVnd(stats.financial.totalRevenue)}</p>
              </div>
            </Card>

            <Card padding="lg" className="flex flex-col">
              <h2 className="text-lg font-bold text-on-surface mb-1">Trạng thái phòng</h2>
              <p className="text-xs text-on-surface-variant font-medium mb-6">Phân bổ sử dụng thực tế</p>

              <div className="relative w-48 h-48 mx-auto mb-6">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle className="stroke-surface-container" cx="18" cy="18" fill="none" r="16" strokeWidth="3.5" />
                  <circle
                    className="stroke-primary transition-all duration-1000 ease-out"
                    cx="18"
                    cy="18"
                    fill="none"
                    r="16"
                    strokeDasharray={`${inUsePercent}, 100`}
                    strokeWidth="3.5"
                  />
                  {maintenancePercent > 0 && (
                    <circle
                      className="stroke-on-tertiary-container transition-all duration-1000 ease-out"
                      cx="18"
                      cy="18"
                      fill="none"
                      r="16"
                      strokeDasharray={`${maintenancePercent}, 100`}
                      strokeDashoffset={`-${inUsePercent}`}
                      strokeWidth="3.5"
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-on-surface">{stats.occupancy.totalRooms}</span>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    Tổng phòng
                  </span>
                </div>
              </div>

              <div className="space-y-3 mt-auto">
                {[
                  { color: 'bg-primary', label: 'Đang dùng', value: stats.occupancy.totalRooms - stats.occupancy.availableRooms },
                  { color: 'bg-on-tertiary-container', label: 'Đang bảo trì', value: stats.occupancy.maintenanceRooms },
                  { color: 'bg-surface-container', label: 'Phòng trống', value: stats.occupancy.availableRooms },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${row.color}`} />
                      <span className="text-on-surface-variant font-medium">{row.label}</span>
                    </div>
                    <span className="font-bold">{row.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      <h2 className="text-xl font-bold text-on-surface mb-6">Tiện ích & Tính năng</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            prefetch={false}
            className="group bg-surface-container-lowest rounded-3xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-on-primary transition-colors">
              <span className="material-symbols-outlined">{card.icon}</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface leading-tight mb-2 group-hover:text-primary transition-colors">
              {card.title}
            </h3>
            <p className="text-on-surface-variant text-sm">{card.desc}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
