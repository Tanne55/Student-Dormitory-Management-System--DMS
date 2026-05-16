import { ReactNode } from 'react';
import Link from 'next/link';

type Props = {
  children: ReactNode;
  showRegister?: boolean;
};

export function AuthShell({ children, showRegister = true }: Props) {
  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary-fixed/30 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-secondary-container/20 blur-[120px]" />
      </div>

      <nav className="w-full px-6 py-4 flex items-center justify-between bg-surface/60 backdrop-blur-xl sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:-translate-y-0.5 transition-all">
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              domain
            </span>
          </div>
          <span className="font-bold text-primary tracking-tight">QLKTX</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors hidden sm:block"
          >
            Trang chủ
          </Link>
          {showRegister && (
            <Link
              href="/register-student"
              className="text-sm font-bold bg-primary-container text-primary-fixed-dim px-4 py-2 rounded-full hover:bg-primary hover:text-on-primary transition-all"
            >
              Đăng ký nội trú
            </Link>
          )}
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-4">{children}</main>

      <footer className="py-6 text-center text-[11px] text-on-surface-variant/70 tracking-wider">
        © 2024 SCHOLASTIC MONOLITH ARCHITECTURE · QLKTX
      </footer>
    </div>
  );
}
