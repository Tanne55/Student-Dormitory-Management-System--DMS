import { PaymentsService } from './payments.service';
import { PaymentStatus } from './entities/payment.entity';
import { InvoiceStatus } from '../invoices/entities/invoice.entity';

function mockRepo() {
  return { findOne: jest.fn(), find: jest.fn(), save: jest.fn(), create: jest.fn((x) => x) };
}

describe('PaymentsService.handleVnpayIpn', () => {
  let svc: PaymentsService;
  let paymentRepo: any;
  let invoiceRepo: any;
  let auditService: any;
  let vnpayService: any;
  let dataSource: any;

  beforeEach(() => {
    paymentRepo = mockRepo();
    invoiceRepo = mockRepo();
    auditService = { log: jest.fn() };
    vnpayService = { verifyChecksum: jest.fn(), isConfigured: jest.fn(() => true), buildPaymentUrl: jest.fn() };

    const txPaymentRepo = mockRepo();
    const txInvoiceRepo = mockRepo();
    dataSource = {
      transaction: jest.fn(async (fn: any) => fn({
        getRepository: (entity: any) => {
          if (entity?.name === 'Payment' || entity === 'Payment') return txPaymentRepo;
          return txInvoiceRepo;
        },
      })),
      _txPaymentRepo: txPaymentRepo,
      _txInvoiceRepo: txInvoiceRepo,
    };

    svc = new PaymentsService(
      paymentRepo,
      invoiceRepo,
      mockRepo() as any,
      mockRepo() as any,
      auditService,
      vnpayService,
      dataSource,
    );
  });

  it('returns RspCode 97 khi checksum sai', async () => {
    vnpayService.verifyChecksum.mockReturnValue(false);
    const r = await svc.handleVnpayIpn({ vnp_SecureHash: 'bad' });
    expect(r.RspCode).toBe('97');
  });

  it('returns 01 khi thieu vnp_TxnRef', async () => {
    vnpayService.verifyChecksum.mockReturnValue(true);
    const r = await svc.handleVnpayIpn({ vnp_SecureHash: 'ok' });
    expect(r.RspCode).toBe('01');
  });

  it('returns 01 khi khong tim thay payment', async () => {
    vnpayService.verifyChecksum.mockReturnValue(true);
    dataSource._txPaymentRepo.findOne.mockResolvedValue(null);
    const r = await svc.handleVnpayIpn({ vnp_SecureHash: 'ok', vnp_TxnRef: 'tx1' });
    expect(r.RspCode).toBe('01');
  });

  it('returns 04 khi amount khong khop', async () => {
    vnpayService.verifyChecksum.mockReturnValue(true);
    dataSource._txPaymentRepo.findOne.mockResolvedValue({
      id: 'p1', status: PaymentStatus.PENDING, amount: 100, invoice: {},
    });
    const r = await svc.handleVnpayIpn({
      vnp_SecureHash: 'ok',
      vnp_TxnRef: 'tx1',
      vnp_Amount: '999999',
    });
    expect(r.RspCode).toBe('04');
  });

  it('returns 02 (idempotent) khi payment da SUCCESS', async () => {
    vnpayService.verifyChecksum.mockReturnValue(true);
    dataSource._txPaymentRepo.findOne.mockResolvedValue({
      id: 'p1',
      status: PaymentStatus.SUCCESS,
      amount: 100,
      invoice: {},
    });
    const r = await svc.handleVnpayIpn({
      vnp_SecureHash: 'ok',
      vnp_TxnRef: 'tx1',
      vnp_Amount: '10000',
    });
    expect(r.RspCode).toBe('02');
  });

  it('update payment + invoice khi thanh cong', async () => {
    vnpayService.verifyChecksum.mockReturnValue(true);
    const payment: any = {
      id: 'p1',
      status: PaymentStatus.PENDING,
      amount: 100,
      payerStudentCode: '20216000',
      invoice: { id: 'inv1', status: InvoiceStatus.UNPAID },
    };
    dataSource._txPaymentRepo.findOne.mockResolvedValue(payment);

    const r = await svc.handleVnpayIpn({
      vnp_SecureHash: 'ok',
      vnp_TxnRef: 'tx1',
      vnp_Amount: '10000',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TransactionNo: 'V123',
    });

    expect(r.RspCode).toBe('00');
    expect(payment.status).toBe(PaymentStatus.SUCCESS);
    expect(payment.invoice.status).toBe(InvoiceStatus.PAID);
    expect(dataSource._txPaymentRepo.save).toHaveBeenCalled();
    expect(dataSource._txInvoiceRepo.save).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'payment.vnpay.success' }));
  });

  it('update payment FAILED khi response code != 00 va KHONG update invoice', async () => {
    vnpayService.verifyChecksum.mockReturnValue(true);
    const payment: any = {
      id: 'p1',
      status: PaymentStatus.PENDING,
      amount: 100,
      invoice: { id: 'inv1', status: InvoiceStatus.UNPAID },
    };
    dataSource._txPaymentRepo.findOne.mockResolvedValue(payment);

    await svc.handleVnpayIpn({
      vnp_SecureHash: 'ok',
      vnp_TxnRef: 'tx1',
      vnp_Amount: '10000',
      vnp_ResponseCode: '24',
      vnp_TransactionStatus: '02',
    });

    expect(payment.status).toBe(PaymentStatus.FAILED);
    expect(payment.invoice.status).toBe(InvoiceStatus.UNPAID);
    expect(dataSource._txInvoiceRepo.save).not.toHaveBeenCalled();
  });
});
