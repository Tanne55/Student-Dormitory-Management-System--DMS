'use client';

import { useState } from 'react';
import Link from 'next/link';
import { API_BASE, apiFetch } from '@/lib/api';

export default function ForgotPasswordPage() {
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [tokenReceived, setTokenReceived] = useState('');

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setTokenReceived('');

        try {
            const res = await apiFetch(`${API_BASE}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Có lỗi xảy ra.');
            }

            setMessage(data.message);
            if (data.resetToken) {
                setTokenReceived(data.resetToken);
            }
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setIsLoading(false);
        }
    };

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
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary rounded-full opacity-10 blur-[120px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-tertiary-container rounded-full opacity-10 blur-[100px]"></div>

            <div className="flex flex-1 items-center justify-center pt-16 px-4">
                <div className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant/20 p-8 rounded-[32px] shadow-2xl z-10">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-primary-fixed rounded-2xl mx-auto flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-primary text-3xl">mail</span>
                        </div>
                        <h2 className="text-2xl font-bold text-on-surface tracking-tight">Quên mật khẩu?</h2>
                        <p className="text-on-surface-variant mt-2 text-sm px-4">
                            Nhập tên đăng nhập của bạn và chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.
                        </p>
                    </div>

                    {message && (
                        <div className={`mb-5 border text-sm p-4 rounded-xl text-center ${tokenReceived ? 'bg-primary-fixed/30 border-primary-fixed text-primary' : 'bg-green-50 border-green-200 text-green-700'}`}>
                            <p className="font-bold">{message}</p>
                            {tokenReceived && (
                                <div className="mt-3 p-3 bg-surface rounded-xl border border-outline-variant/20 font-mono text-xs break-all">
                                    <span className="block mb-1 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Mã đặt lại (Mô phỏng Email)</span>
                                    {tokenReceived}
                                </div>
                            )}
                            {tokenReceived && (
                                <Link href={`/reset-password?token=${tokenReceived}`}
                                    className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition">
                                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                    Vào trang đặt lại mật khẩu ngay
                                </Link>
                            )}
                        </div>
                    )}

                    {!tokenReceived && (
                        <form onSubmit={handleForgot} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Tên đăng nhập</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">person</span>
                                    <input type="text" required
                                        className="block w-full pl-10 pr-4 py-3 bg-surface outline-none border border-outline-variant/50 focus:border-primary rounded-xl text-sm font-medium transition-colors"
                                        placeholder="Ví dụ: admin"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button type="submit" disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60">
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">send</span>
                                        Gửi yêu cầu
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <Link href="/login" className="inline-flex items-center text-sm font-bold text-on-surface-variant hover:text-primary transition-colors gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                            Trở lại đăng nhập
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
