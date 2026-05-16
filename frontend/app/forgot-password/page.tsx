'use client';

import { useState } from 'react';
import Link from 'next/link';
import { API_BASE, apiFetch } from '@/lib/api';
import { AuthShell, Button, Field, Input } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const res = await apiFetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Có lỗi xảy ra.');

      setMessage(data.message);
      setSent(true);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="w-full max-w-md">
        <div className="bg-surface-container-lowest rounded-[28px] shadow-[0_30px_60px_-15px_rgba(26,27,33,0.08)] p-8 md:p-10">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
              <span
                className="material-symbols-outlined text-on-primary text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {sent ? 'mark_email_read' : 'mail'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-on-surface tracking-tight">
              {sent ? 'Đã gửi yêu cầu' : 'Quên mật khẩu?'}
            </h1>
            <p className="text-on-surface-variant text-sm mt-2 px-4">
              {sent
                ? 'Kiểm tra email của bạn để nhận liên kết đặt lại mật khẩu. Link hết hạn sau 1 giờ.'
                : 'Nhập tên đăng nhập, chúng tôi sẽ gửi liên kết đặt lại mật khẩu qua email.'}
            </p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <div className="bg-primary-fixed/40 text-on-primary-fixed text-sm p-4 rounded-2xl text-center font-medium">
                {message}
              </div>
              <Link href="/login" className="block">
                <Button variant="primary" size="lg" fullWidth>
                  Quay lại đăng nhập
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleForgot} className="space-y-5">
              {message && (
                <div className="bg-error-container/40 text-on-error-container text-xs font-semibold p-3 rounded-xl">
                  {message}
                </div>
              )}
              <Field label="Tên đăng nhập">
                <Input
                  type="text"
                  required
                  placeholder="Ví dụ: admin hoặc MSSV"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  icon={<span className="material-symbols-outlined text-[20px]">person</span>}
                />
              </Field>
              <Button
                type="submit"
                variant="gradient"
                size="lg"
                fullWidth
                loading={isLoading}
                icon={!isLoading ? <span className="material-symbols-outlined text-[18px]">send</span> : undefined}
              >
                {isLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Trở lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
