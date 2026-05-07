'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE, apiFetch } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await apiFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error('Sai tài khoản hoặc mật khẩu. Vui lòng thử lại.');
      }
      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface font-sans text-on-surface relative">
      <nav className="w-full px-6 py-4 flex items-center justify-between border-b border-outline-variant/10 bg-surface/60 backdrop-blur-xl sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 group-hover:-translate-y-0.5 transition-all">
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>domain</span>
          </div>
          <span className="font-bold text-primary tracking-tight">QLKTX</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors hidden sm:block">
            Trang chủ
          </Link>
          <Link href="/register-student" className="text-sm font-bold bg-primary-container text-primary-fixed-variant px-4 py-2 rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm">
            Đăng ký nội trú
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
      {/* Auth Background Decor */}
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary-fixed/30 blur-[120px]"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-secondary-container/20 blur-[120px]"></div>
      </div>

      {/* Login Container */}
      <main className="w-full max-w-md">
        {/* Brand Identity Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4 shadow-xl shadow-primary/10">
            <span className="material-symbols-outlined text-on-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              account_balance
            </span>
          </div>
          <h1 className="text-primary text-3xl font-bold tracking-tight mb-1">Quản lý Ký túc xá</h1>
          <p className="text-on-surface-variant font-medium text-sm">Hệ thống Quản lý Ký túc xá Hiện đại</p>
        </div>

        {/* Login Card */}
        <div className="bg-surface-container-lowest rounded-xl shadow-[0_30px_60px_-15px_rgba(26,27,33,0.08)] overflow-hidden transition-all border border-outline-variant/10">
          {/* Alert Section */}
          {error && (
            <div className="bg-error-container/40 px-6 py-4 flex items-center gap-3 border-b border-error-container/30">
              <span className="material-symbols-outlined text-error text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                error
              </span>
              <span className="text-on-error-container text-xs font-medium">{error}</span>
            </div>
          )}

          <div className="p-8 md:p-10">
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Identity Input */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-on-surface-variant tracking-wider uppercase" htmlFor="identity">
                  Tên đăng nhập hoặc Email
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline group-focus-within:text-primary transition-colors text-[20px]">
                    person
                  </span>
                  <input
                    id="identity"
                    type="text"
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-on-surface text-sm placeholder:text-outline/60 transition-all font-body outline-none"
                    placeholder="MSSV hoặc email của bạn"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-on-surface-variant tracking-wider uppercase" htmlFor="password">
                    Mật khẩu
                  </label>
                  <Link href="/forgot-password" className="text-xs font-semibold text-primary-container hover:text-primary transition-colors">
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline group-focus-within:text-primary transition-colors text-[20px]">
                    lock
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full pl-11 pr-12 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-on-surface text-sm placeholder:text-outline/60 transition-all font-body outline-none"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded-lg border-outline-variant text-primary focus:ring-primary/20 bg-surface-container-low transition-all cursor-pointer"
                  />
                  <span className="text-sm text-on-surface-variant font-medium select-none group-hover:text-on-surface transition-colors">
                    Ghi nhớ đăng nhập
                  </span>
                </label>
              </div>

              {/* Primary Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-on-primary rounded-xl font-semibold text-sm hover:bg-primary-container active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all shadow-lg shadow-primary/20"
                >
                  {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
                  {!isLoading && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                </button>
              </div>
            </form>
          </div>

          {/* Footer / Secondary Actions */}
          <div className="px-8 py-6 bg-surface-container-low text-center">
            <p className="text-sm text-on-surface-variant font-medium">
              Bạn là sinh viên mới?{' '}
              <Link href="/register-student" className="ml-1 text-primary-container font-bold hover:underline">
                Đăng ký nội trú
              </Link>
            </p>
          </div>
        </div>

        {/* Support Info */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex justify-center gap-6">
            <a href="#" className="text-xs font-semibold text-outline hover:text-primary transition-colors flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">help</span>
              Trợ giúp
            </a>
            <a href="#" className="text-xs font-semibold text-outline hover:text-primary transition-colors flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              Bảo mật
            </a>
            <a href="#" className="text-xs font-semibold text-outline hover:text-primary transition-colors flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">contact_support</span>
              Liên hệ
            </a>
          </div>
          <p className="text-[10px] text-outline/50 uppercase tracking-[0.2em] font-bold">
            © 2024 Cung cấp bởi Ban Quản Lý KTX
          </p>
        </div>
      </main>
      </div>
    </div>
  );
}
