import { ConfigService } from '@nestjs/config';
import { VnpayService } from './vnpay.service';

function makeConfig(map: Record<string, string>): ConfigService {
  return {
    get: (key: string) => map[key],
  } as unknown as ConfigService;
}

const TMN = 'TEST_TMN';
const SECRET = 'TESTSECRETKEYTESTSECRETKEYTEST00';
const URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

describe('VnpayService', () => {
  describe('isConfigured', () => {
    it('returns true khi du 3 keys', () => {
      const svc = new VnpayService(makeConfig({
        VNPAY_TMN_CODE: TMN,
        VNPAY_HASH_SECRET: SECRET,
        VNPAY_URL: URL,
      }));
      expect(svc.isConfigured()).toBe(true);
    });

    it('returns false khi thieu key', () => {
      const svc = new VnpayService(makeConfig({ VNPAY_TMN_CODE: TMN }));
      expect(svc.isConfigured()).toBe(false);
    });
  });

  describe('buildPaymentUrl', () => {
    const svc = new VnpayService(makeConfig({
      VNPAY_TMN_CODE: TMN,
      VNPAY_HASH_SECRET: SECRET,
      VNPAY_URL: URL,
      VNPAY_RETURN_URL: 'http://localhost:3000/return',
    }));

    it('throws neu chua cau hinh', () => {
      const empty = new VnpayService(makeConfig({}));
      expect(() => empty.buildPaymentUrl({
        amount: 100000,
        orderId: 'order1',
        orderInfo: 'test',
        ipAddress: '127.0.0.1',
      })).toThrow();
    });

    it('build URL co vnp_SecureHash va param can thiet', () => {
      const url = svc.buildPaymentUrl({
        amount: 100000,
        orderId: 'order1',
        orderInfo: 'test',
        ipAddress: '127.0.0.1',
      });
      expect(url).toContain(URL);
      expect(url).toContain('vnp_TmnCode=' + TMN);
      expect(url).toContain('vnp_Amount=10000000'); // amount * 100
      expect(url).toContain('vnp_TxnRef=order1');
      expect(url).toContain('vnp_SecureHash=');
    });
  });

  describe('verifyChecksum', () => {
    const svc = new VnpayService(makeConfig({
      VNPAY_TMN_CODE: TMN,
      VNPAY_HASH_SECRET: SECRET,
      VNPAY_URL: URL,
    }));

    function extractQuery(url: string): Record<string, string> {
      const qs = url.split('?')[1];
      const out: Record<string, string> = {};
      for (const part of qs.split('&')) {
        const [k, v] = part.split('=');
        out[decodeURIComponent(k)] = decodeURIComponent(v);
      }
      return out;
    }

    it('returns true cho hash hop le', () => {
      const url = svc.buildPaymentUrl({
        amount: 50000,
        orderId: 'tx100',
        orderInfo: 'verify-test',
        ipAddress: '10.0.0.1',
      });
      const q = extractQuery(url);
      expect(svc.verifyChecksum(q)).toBe(true);
    });

    it('returns false neu tampered param', () => {
      const url = svc.buildPaymentUrl({
        amount: 50000,
        orderId: 'tx101',
        orderInfo: 'tamper',
        ipAddress: '10.0.0.1',
      });
      const q = extractQuery(url);
      q.vnp_Amount = '999999';
      expect(svc.verifyChecksum(q)).toBe(false);
    });

    it('returns false neu thieu vnp_SecureHash', () => {
      expect(svc.verifyChecksum({ vnp_TxnRef: 'x' })).toBe(false);
    });

    it('returns false neu chua cau hinh', () => {
      const empty = new VnpayService(makeConfig({}));
      expect(empty.verifyChecksum({ vnp_SecureHash: 'abc' })).toBe(false);
    });
  });
});
