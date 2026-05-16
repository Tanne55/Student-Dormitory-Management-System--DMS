'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE, apiFetch } from '@/lib/api';

type VerifyResult = {
  valid: boolean;
  success: boolean;
  transactionRef: string | null;
};

function VnpayReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<'loading' | 'success' | 'failed' | 'invalid'>('loading');
  const [result, setResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    const qs = searchParams.toString();
    if (!qs) {
      setState('invalid');
      return;
    }
    void (async () => {
      try {
        const res = await apiFetch(`${API_BASE}/vnpay/return?${qs}`);
        if (!res.ok) {
          setState('invalid');
          return;
        }
        const data: VerifyResult = await res.json();
        setResult(data);
        if (!data.valid) setState('invalid');
        else setState(data.success ? 'success' : 'failed');
      } catch {
        setState('invalid');
      }
    })();
  }, [searchParams]);

  const responseCode = searchParams.get('vnp_ResponseCode');

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-low p-4">
      <div className="max-w-md w-full bg-surface-container-lowest rounded-[32px] shadow-2xl p-8 border border-surface-container-highest text-center">
        {state === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-bold text-on-surface">Đang xác thực giao dịch...</h2>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-5xl text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <h2 className="text-2xl font-black text-on-surface mb-2">Thanh toán thành công!</h2>
            <p className="text-sm text-on-surface-variant mb-2">Hóa đơn của bạn đã được ghi nhận thanh toán.</p>
            {result?.transactionRef && (
              <p className="text-xs text-slate-400 font-mono mb-6">Mã GD: {result.transactionRef}</p>
            )}
          </>
        )}

        {state === 'failed' && (
          <>
            <div className="w-20 h-20 mx-auto rounded-full bg-error-container flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-5xl text-error" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
            </div>
            <h2 className="text-2xl font-black text-on-surface mb-2">Giao dịch không thành công</h2>
            <p className="text-sm text-on-surface-variant mb-2">
              VNPay trả về mã lỗi: <span className="font-mono font-bold">{responseCode ?? 'unknown'}</span>
            </p>
            <p className="text-xs text-slate-500 mb-6">Vui lòng thử lại hoặc chọn hình thức thanh toán khác.</p>
          </>
        )}

        {state === 'invalid' && (
          <>
            <div className="w-20 h-20 mx-auto rounded-full bg-yellow-100 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-5xl text-yellow-600" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            </div>
            <h2 className="text-2xl font-black text-on-surface mb-2">Không xác thực được giao dịch</h2>
            <p className="text-sm text-on-surface-variant mb-6">Chữ ký không hợp lệ hoặc thiếu thông tin. Trạng thái thanh toán sẽ được cập nhật sau khi VNPay xác nhận với hệ thống.</p>
          </>
        )}

        {state !== 'loading' && (
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard/invoices"
              className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-md hover:-translate-y-0.5 transition-all"
            >
              Về danh sách hóa đơn
            </Link>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-surface border border-outline-variant/30 text-on-surface font-bold rounded-xl hover:border-primary transition-all"
            >
              Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VnpayReturnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>}>
      <VnpayReturnContent />
    </Suspense>
  );
}
