import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * VNPay scaffold (phase 1). No HTTP routes yet. Configure in .env for phase 2:
 * - VNPAY_TMN_CODE: terminal / merchant id
 * - VNPAY_HASH_SECRET: HMAC key
 * - VNPAY_URL: payment gateway base (sandbox or production)
 * - VNPAY_RETURN_URL: browser return (frontend)
 * - VNPAY_IPN_URL: server IPN callback (backend, public HTTPS in production)
 */
@Injectable()
export class VnpayService {
  private readonly logger = new Logger(VnpayService.name);

  constructor(private readonly config: ConfigService) {}

  /** True when minimal keys exist (does not validate with VNPay). */
  isConfigured(): boolean {
    const tmn = this.config.get<string>('VNPAY_TMN_CODE')?.trim();
    const secret = this.config.get<string>('VNPAY_HASH_SECRET')?.trim();
    const url = this.config.get<string>('VNPAY_URL')?.trim();
    return !!(tmn && secret && url);
  }

  buildPaymentUrl(_payload: Record<string, unknown>): string {
    this.logger.warn('VnpayService.buildPaymentUrl: not implemented (phase 2)');
    throw new Error('VNPay buildPaymentUrl is not implemented yet.');
  }

  verifyIpn(_query: Record<string, string>): never {
    throw new Error('VNPay verifyIpn is not implemented yet.');
  }
}
