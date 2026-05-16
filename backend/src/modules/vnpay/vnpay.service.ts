import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * VNPay sandbox v2 integration.
 * Required env:
 * - VNPAY_TMN_CODE
 * - VNPAY_HASH_SECRET
 * - VNPAY_URL (https://sandbox.vnpayment.vn/paymentv2/vpcpay.html)
 * - VNPAY_RETURN_URL (frontend page xu ly ket qua)
 * - VNPAY_IPN_URL (kong dung khi build URL, chi de tham khao)
 */
export type VnpayCreateParams = {
  amount: number;
  orderId: string;
  orderInfo: string;
  ipAddress: string;
  bankCode?: string;
  locale?: 'vn' | 'en';
};

@Injectable()
export class VnpayService {
  private readonly logger = new Logger(VnpayService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    const tmn = this.config.get<string>('VNPAY_TMN_CODE')?.trim();
    const secret = this.config.get<string>('VNPAY_HASH_SECRET')?.trim();
    const url = this.config.get<string>('VNPAY_URL')?.trim();
    return !!(tmn && secret && url);
  }

  buildPaymentUrl(params: VnpayCreateParams): string {
    if (!this.isConfigured()) {
      throw new Error('VNPay chua cau hinh day du (VNPAY_TMN_CODE / VNPAY_HASH_SECRET / VNPAY_URL).');
    }

    const tmnCode = this.config.get<string>('VNPAY_TMN_CODE')!.trim();
    const secret = this.config.get<string>('VNPAY_HASH_SECRET')!.trim();
    const baseUrl = this.config.get<string>('VNPAY_URL')!.trim();
    const returnUrl = this.config.get<string>('VNPAY_RETURN_URL')?.trim() || '';

    const createDate = formatVnpDate(new Date());
    const expireDate = formatVnpDate(new Date(Date.now() + 15 * 60 * 1000));

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: params.locale ?? 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: params.orderId,
      vnp_OrderInfo: params.orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: String(Math.round(params.amount * 100)),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: params.ipAddress,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };
    if (params.bankCode) {
      vnpParams.vnp_BankCode = params.bankCode;
    }

    const signData = buildSignData(vnpParams);
    const secureHash = crypto.createHmac('sha512', secret).update(signData, 'utf-8').digest('hex');

    return `${baseUrl}?${signData}&vnp_SecureHash=${secureHash}`;
  }

  /** Verify chu ky tra ve tu VNPay (Return URL hoac IPN). */
  verifyChecksum(query: Record<string, string>): boolean {
    if (!this.isConfigured()) return false;
    const secret = this.config.get<string>('VNPAY_HASH_SECRET')!.trim();

    const received = query['vnp_SecureHash'];
    if (!received) return false;

    const clone: Record<string, string> = {};
    for (const [k, v] of Object.entries(query)) {
      if (k === 'vnp_SecureHash' || k === 'vnp_SecureHashType') continue;
      if (v == null) continue;
      clone[k] = v;
    }

    const signData = buildSignData(clone);
    const expected = crypto.createHmac('sha512', secret).update(signData, 'utf-8').digest('hex');

    return timingSafeEqualHex(expected, received);
  }
}

function buildSignData(params: Record<string, string>): string {
  const keys = Object.keys(params).sort();
  const pairs: string[] = [];
  for (const k of keys) {
    const v = params[k];
    if (v === '' || v == null) continue;
    pairs.push(`${encodeRfc3986(k)}=${encodeRfc3986(v)}`);
  }
  return pairs.join('&');
}

function encodeRfc3986(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

function formatVnpDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
