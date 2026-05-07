'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { API_BASE, apiFetch } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const urlToken = searchParams.get('token');
        if (urlToken) {
            setToken(urlToken);
        }
    }, [searchParams]);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setMessage('Mật khẩu xác nhận không khớp.');
            return;
        }

        if (password.length < 6) {
            setMessage('Mật khẩu phải chứa ít nhất 6 ký tự.');
            return;
        }

        setIsLoading(true);
        setMessage('');

        try {
            const res = await apiFetch(`${API_BASE}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Có lỗi xảy ra.');
            }

            setIsSuccess(true);
            setMessage('Tuyệt vời! Mật khẩu của bạn đã được cập nhật.');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="text-center py-6">
                <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-green-600 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <h3 className="text-2xl font-bold text-on-surface mb-2">Thành công!</h3>
                <p className="text-on-surface-variant mb-8 px-4 text-sm">{message}</p>
                <Link href="/login"
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-green-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-green-700 transition-colors">
                    Đăng nhập ngay
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
            </div>
        );
    }

    return (
        <>
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary-fixed rounded-2xl mx-auto flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-primary text-3xl">fingerprint</span>
                </div>
                <h2 className="text-2xl font-bold text-on-surface tracking-tight">Đặt lại mật khẩu</h2>
                <p className="text-on-surface-variant mt-2 text-sm px-4">
                    Nhập mã xác nhận và mật khẩu mới của bạn bên dưới.
                </p>
            </div>

            {message && (
                <div className="mb-5 bg-error-container/50 border border-error/20 text-error text-sm p-4 rounded-xl text-center font-bold">
                    {message}
                </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Mã xác nhận (Token)</label>
                    <input type="text" required
                        className="block w-full bg-surface outline-none border border-outline-variant/50 focus:border-primary px-4 py-3 rounded-xl text-sm font-mono text-xs text-on-surface-variant transition-colors"
                        placeholder="Dán mã token của bạn vào đây..."
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Mật khẩu mới</label>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">lock</span>
                        <input type="password" required
                            className="block w-full pl-10 pr-4 py-3 bg-surface outline-none border border-outline-variant/50 focus:border-primary rounded-xl text-sm font-medium transition-colors"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Xác nhận mật khẩu</label>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">lock</span>
                        <input type="password" required
                            className="block w-full pl-10 pr-4 py-3 bg-surface outline-none border border-outline-variant/50 focus:border-primary rounded-xl text-sm font-medium transition-colors"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                </div>

                <button type="submit" disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 mt-6 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60">
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-[18px]">save</span>
                            Lưu mật khẩu mới
                        </>
                    )}
                </button>
            </form>
        </>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex flex-col bg-surface text-on-surface relative overflow-hidden">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-outline-variant/10 bg-surface/80 px-8 backdrop-blur-md md:px-16">
                <Link href="/" className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-container">
                        <span className="material-symbols-outlined text-xl text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>domain</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-primary">QLKTX</span>
                </Link>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="rounded-full px-5 py-2.5 text-sm font-bold text-primary hover:bg-surface-container transition">Đăng nhập</Link>
                    <Link href="/register-student" className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 hover:opacity-90 transition">Đăng ký</Link>
                </div>
            </nav>

            {/* Background blobs */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary rounded-full opacity-10 blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-tertiary-container rounded-full opacity-10 blur-[100px]"></div>

            <div className="flex flex-1 items-center justify-center pt-16 px-4">
                <div className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant/20 p-8 rounded-[32px] shadow-2xl z-10">
                    <Suspense fallback={
                        <div className="flex justify-center items-center h-48">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        </div>
                    }>
                        <ResetPasswordForm />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
