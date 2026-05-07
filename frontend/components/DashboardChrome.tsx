'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUserFromToken } from '@/lib/auth';
import { NotificationBell } from '@/components/NotificationBell';

export function DashboardChrome({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('student');

  useEffect(() => {
    const u = getUserFromToken();
    if (u) {
      setUsername(u.username);
      setRole(u.role || 'student');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const getRoleText = (r: string) => {
    switch (r) {
      case 'admin': return 'Quản trị hệ thống';
      case 'staff': return 'Cán bộ BQL';
      default: return 'Sinh viên nội trú';
    }
  };

  // Helper cho active link
  const linkClass = (href: string) => {
    const isActive = pathname === href;
    if (isActive) {
      return "flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#00236f] to-[#1e3a8a] text-white rounded-xl font-bold transition-all duration-200 shadow-md";
    }
    return "flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-[#e3e1e9] dark:hover:bg-slate-800 rounded-xl transition-all duration-200 font-medium text-sm";
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans">
      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 h-screen w-[260px] bg-[#f4f3fa] dark:bg-slate-900 flex flex-col p-4 z-50 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              apartment
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1E3A8A] dark:text-blue-400 leading-none">QLKTX</h1>
            <p className="text-[10px] uppercase tracking-wider text-primary font-bold mt-1 opacity-80">
              Hệ thống Điều hành
            </p>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar pb-6">
          
          <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] px-4 py-2 mt-2 opacity-60">
            Tổng quan bảng điều khiển
          </div>
          <Link href="/dashboard" className={linkClass("/dashboard")}>
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span>Trang chủ</span>
          </Link>

          {/* DÀNH CHO SINH VIÊN */}
          {role === 'student' && (
            <>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] px-4 py-2 mt-4 opacity-60">
                Thủ tục lưu trú
              </div>
              <Link href="/dashboard/profile" className={linkClass("/dashboard/profile")}>
                <span className="material-symbols-outlined text-[20px]">person</span>
                <span>Hồ sơ Nội trú</span>
              </Link>
              <Link href="/dashboard/dorm-extensions" className={linkClass("/dashboard/dorm-extensions")}>
                <span className="material-symbols-outlined text-[20px]">history_edu</span>
                <span>Gia hạn hợp đồng</span>
              </Link>

              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] px-4 py-2 mt-4 opacity-60">
                Dịch vụ ktx
              </div>
              <Link href="/dashboard/repair-requests" className={linkClass("/dashboard/repair-requests")}>
                <span className="material-symbols-outlined text-[20px]">engineering</span>
                <span>Báo cáo sự cố</span>
              </Link>
              <Link href="/dashboard/invoices" className={linkClass("/dashboard/invoices")}>
                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                <span>Hóa đơn phòng & Dịch vụ</span>
              </Link>
            </>
          )}

          {/* DÀNH CHO ADMIN VÀ STAFF */}
          {(role === 'staff' || role === 'admin') && (
            <>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] px-4 py-2 mt-4 opacity-60">
                Quản lý Lưu trú
              </div>
              {role === 'admin' && (
                <>
                  <Link href="/dashboard/campus" className={linkClass("/dashboard/campus")}>
                    <span className="material-symbols-outlined text-[20px]">domain</span>
                    <span>Hệ thống Tòa & Tầng</span>
                  </Link>
                  <Link href="/dashboard/rooms" className={linkClass("/dashboard/rooms")}>
                    <span className="material-symbols-outlined text-[20px]">bed</span>
                    <span>Quản lý Phòng</span>
                  </Link>
                </>
              )}
              
              <Link href="/staff/dorm-approvals" className={linkClass("/staff/dorm-approvals")}>
                <span className="material-symbols-outlined text-[20px]">rule_folder</span>
                <span>Duyệt Tiền kiểm KTX</span>
              </Link>
              <Link href="/dashboard/manage-extensions" className={linkClass("/dashboard/manage-extensions")}>
                <span className="material-symbols-outlined text-[20px]">history</span>
                <span>Duyệt Gia hạn lưu trú</span>
              </Link>
              
              <div className="h-px bg-outline-variant/15 mx-4 my-2"></div>
              
              <Link href="/dashboard/checkins" className={linkClass("/dashboard/checkins")}>
                <span className="material-symbols-outlined text-[20px]">login</span>
                <span>Xếp phòng & Check-in</span>
              </Link>
              <Link href="/dashboard/checkouts" className={linkClass("/dashboard/checkouts")}>
                <span className="material-symbols-outlined text-[20px]">logout</span>
                <span>Thanh lý & Check-out</span>
              </Link>

              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] px-4 py-2 mt-4 opacity-60">
                Vận hành & Cơ sở VC
              </div>
              <Link href="/dashboard/maintenance" className={linkClass("/dashboard/maintenance")}>
                <span className="material-symbols-outlined text-[20px]">build_circle</span>
                <span>Quản lý Sự cố</span>
              </Link>
              <Link href="/dashboard/utility-readings" className={linkClass("/dashboard/utility-readings")}>
                <span className="material-symbols-outlined text-[20px]">bolt</span>
                <span>Chỉ số Điện / Nước</span>
              </Link>

              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] px-4 py-2 mt-4 opacity-60">
                Tài chính
              </div>
              <Link href="/dashboard/invoices" className={linkClass("/dashboard/invoices")}>
                <span className="material-symbols-outlined text-[20px]">payments</span>
                <span>Hóa đơn Thu ngân</span>
              </Link>

              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] px-4 py-2 mt-4 opacity-60">
                Kiểm soát ra vào
              </div>
              <Link href="/dashboard/face-enrollment" className={linkClass("/dashboard/face-enrollment")}>
                <span className="material-symbols-outlined text-[20px]">face</span>
                <span>Đăng ký khuôn mặt</span>
              </Link>
              <Link href="/dashboard/access-logs" className={linkClass("/dashboard/access-logs")}>
                <span className="material-symbols-outlined text-[20px]">door_sensor</span>
                <span>Nhật ký cổng ra vào</span>
              </Link>
              <a
                href="/kiosk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-[#e3e1e9] dark:hover:bg-slate-800 rounded-xl transition-all duration-200 font-medium text-sm"
              >
                <span className="material-symbols-outlined text-[20px]">photo_camera_front</span>
                <span>Mở cổng kiosk ↗</span>
              </a>
            </>
          )}

          {/* DÀNH RIÊNG CHO CẤP ADMIN QUẢN TRỊ */}
          {role === 'admin' && (
            <>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] px-4 py-2 mt-4 opacity-60">
                Hệ thống & Cài đặt
              </div>
              <Link href="/dashboard/manage-staffs" className={linkClass("/dashboard/manage-staffs")}>
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                <span>Phân quyền Nhân sự</span>
              </Link>
              <Link href="/dashboard/audit-logs" className={linkClass("/dashboard/audit-logs")}>
                <span className="material-symbols-outlined text-[20px]">manage_search</span>
                <span>Log Truy vết thao tác</span>
              </Link>
              <Link href="/dashboard/system-settings" className={linkClass("/dashboard/system-settings")}>
                <span className="material-symbols-outlined text-[20px]">settings</span>
                <span>Cấu hình tham số Hệ thống</span>
              </Link>
            </>
          )}
        </nav>

        <div className="mt-4 pt-4 border-t border-outline-variant/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-error font-semibold hover:bg-error-container rounded-xl transition-all"
          >
            <span className="material-symbols-outlined">exit_to_app</span>
            <span className="font-be-vietnam text-sm">Đăng xuất hệ thống</span>
          </button>
        </div>
      </aside>

      {/* TopNavBar */}
      <header className="fixed top-0 right-0 w-[calc(100%-260px)] h-16 z-40 bg-surface/80 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-8 border-b border-surface-container">
        <div className="flex items-center gap-2">
          {/* Optionally show current page title here later based on pathname */}
        </div>
        <div className="flex items-center gap-6">
          <NotificationBell />
          <div className="flex items-center gap-3 pl-6 border-l border-outline-variant/20">
            <div className="text-right">
              <p className="text-sm font-bold text-on-surface leading-none">{username || 'Đang tải...'}</p>
              <p className="text-[10px] text-primary font-bold mt-1 uppercase tracking-widest">{getRoleText(role)}</p>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-primary-container/20 overflow-hidden bg-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="ml-[260px] pt-[72px] px-8 pb-12 min-h-screen">
        {children}
      </main>
      
      {/* Hide scrollbar for the aside cleanly via injected styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 35, 111, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(0, 35, 111, 0.3);
        }
      `}} />
    </div>
  );
}
