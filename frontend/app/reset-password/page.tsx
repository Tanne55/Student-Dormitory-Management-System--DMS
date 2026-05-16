'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { API_BASE, apiFetch } from '@/lib/api';
import { AuthShell, Button, Field, Input } from '@/components/ui';

function ResetForm() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) setToken(urlToken);
  }, [searchParams]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Có lỗi xảy ra.');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <span
            className="material-symbols-outlined text-green-600 text-4xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-2">Thành công!</h2>
        <p className="text-on-surface-variant mb-8 px-4 text-sm">
          Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập với mật khẩu mới ngay.
        </p>
        <Link href="/login" className="block">
          <Button
            variant="gradient"
            size="lg"
            fullWidth
            iconRight={<span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
          >
            Đăng nhập ngay
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
          <span
            className="material-symbols-outlined text-on-primary text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            fingerprint
          </span>
        </div>
        <h1 className="text-2xl font-bold text-on-surface tracking-tight">Đặt lại mật khẩu</h1>
        <p className="text-on-surface-variant text-sm mt-2 px-4">
          Nhập mã xác nhận và mật khẩu mới của bạn.
        </p>
      </div>

      {error && (
        <div className="mb-5 bg-error-container/40 text-on-error-container text-xs font-semibold p-3 rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleReset} className="space-y-4">
        <Field label="Mã xác nhận (Token)">
          <Input
            type="text"
            required
            placeholder="Dán mã token của bạn vào đây..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="font-mono text-xs"
          />
        </Field>

        <Field label="Mật khẩu mới" helper="≥ 10 ký tự, có chữ hoa, chữ thường, số.">
          <Input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<span className="material-symbols-outlined text-[20px]">lock</span>}
          />
        </Field>

        <Field label="Xác nhận mật khẩu">
          <Input
            type="password"
            required
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={<span className="material-symbols-outlined text-[20px]">lock</span>}
          />
        </Field>

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          fullWidth
          loading={isLoading}
          icon={!isLoading ? <span className="material-symbols-outlined text-[18px]">save</span> : undefined}
        >
          {isLoading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <div className="w-full max-w-md">
        <div className="bg-surface-container-lowest rounded-[28px] shadow-[0_30px_60px_-15px_rgba(26,27,33,0.08)] p-8 md:p-10">
          <Suspense
            fallback={
              <div className="flex justify-center items-center h-48">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            }
          >
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </AuthShell>
  );
}
