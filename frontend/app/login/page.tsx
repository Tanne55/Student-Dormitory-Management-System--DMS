'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE, apiFetch } from '@/lib/api';
import { AuthShell, Button, Field, Input } from '@/components/ui';

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
    <AuthShell>
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-container mb-5 shadow-xl shadow-primary/20">
            <span
              className="material-symbols-outlined text-on-primary text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_balance
            </span>
          </div>
          <h1 className="text-on-surface text-3xl font-bold tracking-tight mb-1">Quản lý Ký túc xá</h1>
          <p className="text-on-surface-variant font-medium text-sm">
            Hệ thống Quản lý Ký túc xá Hiện đại
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest rounded-[28px] shadow-[0_30px_60px_-15px_rgba(26,27,33,0.08)] overflow-hidden">
          {error && (
            <div className="bg-error-container/40 px-6 py-3 flex items-center gap-2">
              <span
                className="material-symbols-outlined text-error text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                error
              </span>
              <span className="text-on-error-container text-xs font-semibold">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="p-8 md:p-10 space-y-5">
            <Field label="Tên đăng nhập hoặc Email">
              <Input
                type="text"
                required
                placeholder="MSSV hoặc email của bạn"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                icon={<span className="material-symbols-outlined text-[20px]">person</span>}
              />
            </Field>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Mật khẩu
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-bold text-primary hover:text-primary-container transition-colors"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<span className="material-symbols-outlined text-[20px]">lock</span>}
                iconRight={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                }
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                className="w-5 h-5 rounded-md border-outline-variant text-primary focus:ring-primary/20 bg-surface-container-low cursor-pointer"
              />
              <span className="text-sm text-on-surface-variant font-medium select-none group-hover:text-on-surface transition-colors">
                Ghi nhớ đăng nhập
              </span>
            </label>

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              fullWidth
              loading={isLoading}
              iconRight={<span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
            >
              {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
            </Button>
          </form>

          <div className="px-8 py-5 bg-surface-container-low text-center">
            <p className="text-sm text-on-surface-variant font-medium">
              Bạn là sinh viên mới?{' '}
              <Link
                href="/register-student"
                className="ml-1 text-primary font-bold hover:underline"
              >
                Đăng ký nội trú
              </Link>
            </p>
          </div>
        </div>

        {/* Support links */}
        <div className="mt-8 flex justify-center gap-6">
          {[
            { icon: 'help', label: 'Trợ giúp' },
            { icon: 'verified_user', label: 'Bảo mật' },
            { icon: 'contact_support', label: 'Liên hệ' },
          ].map((item) => (
            <a
              key={item.label}
              href="#"
              className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}
