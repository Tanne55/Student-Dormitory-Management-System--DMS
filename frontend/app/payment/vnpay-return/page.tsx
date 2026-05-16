'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE, apiFetch } from '@/lib/api';
import { Button } from '@/components/ui';

type VerifyResult = {
  valid: boolean;
  success: boolean;
  transactionRef: string | null;
};

type ScreenState = 'loading' | 'success' | 'failed' | 'invalid';

const screens: Record<Exclude<ScreenState, 'loading'>, {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
}> = {
  success: {
    icon: 'check_circle',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    title: 'Thanh toán thành công!',
  },
  failed: {
    icon: 'cancel',
    iconBg: 'bg-error-container',
    iconColor: 'text-error',
    title: 'Giao dịch không thành công',
  },
  invalid: {
    icon: 'warning',
    iconBg: 'bg-tertiary-fixed',
    iconColor: 'text-on-tertiary-container',
    title: 'Không xác thực được giao dịch',
  },
};

function VnpayReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ScreenState>('loading');
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
        setState(!data.valid ? 'invalid' : data.success ? 'success' : 'failed');
      } catch {
        setState('invalid');
      }
    })();
  }, [searchParams]);

  const responseCode = searchParams.get('vnp_ResponseCode');

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-fixed/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary-container/20 blur-[120px]" />
      </div>
      <div className="w-full max-w-md bg-surface-container-lowest rounded-[28px] shadow-[0_30px_60px_-15px_rgba(26,27,33,0.08)] p-10 text-center">
        {state === 'loading' ? (
          <>
            <div className="w-16 h-16 mx-auto border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6" />
            <h2 className="text-xl font-bold text-on-surface">Đang xác thực giao dịch...</h2>
            <p className="text-sm text-on-surface-variant mt-2">Vui lòng đợi trong giây lát.</p>
          </>
        ) : (
          <>
            <div
              className={`w-20 h-20 mx-auto rounded-full ${screens[state].iconBg} flex items-center justify-center mb-6`}
            >
              <span
                className={`material-symbols-outlined text-5xl ${screens[state].iconColor}`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {screens[state].icon}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-2">{screens[state].title}</h2>

            {state === 'success' && (
              <>
                <p className="text-sm text-on-surface-variant mb-2">
                  Hóa đơn của bạn đã được ghi nhận thanh toán.
                </p>
                {result?.transactionRef && (
                  <p className="text-xs text-on-surface-variant/70 font-mono mb-6">
                    Mã GD: {result.transactionRef}
                  </p>
                )}
              </>
            )}

            {state === 'failed' && (
              <>
                <p className="text-sm text-on-surface-variant mb-1">
                  VNPay trả về mã lỗi:{' '}
                  <span className="font-mono font-bold">{responseCode ?? 'unknown'}</span>
                </p>
                <p className="text-xs text-on-surface-variant/70 mb-6">
                  Vui lòng thử lại hoặc chọn hình thức thanh toán khác.
                </p>
              </>
            )}

            {state === 'invalid' && (
              <p className="text-sm text-on-surface-variant mb-6">
                Chữ ký không hợp lệ hoặc thiếu thông tin. Trạng thái thanh toán sẽ được cập nhật sau khi VNPay xác nhận với hệ thống.
              </p>
            )}

            <div className="flex gap-3 justify-center">
              <Link href="/dashboard/invoices">
                <Button variant="gradient">Về danh sách hóa đơn</Button>
              </Link>
              <Button variant="secondary" onClick={() => router.push('/dashboard')}>
                Dashboard
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VnpayReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <VnpayReturnContent />
    </Suspense>
  );
}
