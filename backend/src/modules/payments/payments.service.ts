import { BadRequestException, Inject, Injectable, Logger, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { AuditService } from '../audit/audit.service';
import { VnpayService } from '../vnpay/vnpay.service';

export type VnpayIpnResult = { RspCode: string; Message: string };

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => VnpayService)) private readonly vnpayService: VnpayService,
    private readonly dataSource: DataSource,
  ) {}

  async createFullPayment(dto: CreatePaymentDto, actorAccountId: number) {
    const invoice = await this.invoiceRepo.findOne({ where: { id: dto.invoiceId }, relations: ['room'] });
    if (!invoice) throw new NotFoundException('Không tìm thấy hóa đơn.');
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Hóa đơn đã được thanh toán.');
    }

    const amount = dto.amount ?? Number(invoice.totalAmount);
    if (amount !== Number(invoice.totalAmount)) {
      throw new BadRequestException('Giai đoạn này chỉ hỗ trợ thanh toán đủ 1 lần cho toàn bộ hóa đơn.');
    }

    const payment = this.paymentRepo.create({
      invoice,
      amount,
      method: dto.method ?? PaymentMethod.CASH,
      status: PaymentStatus.SUCCESS,
      payerStudentCode: dto.payerStudentCode ?? null,
      confirmedByAccountId: actorAccountId ?? null,
      paidAt: new Date(),
    });
    const saved = await this.paymentRepo.save(payment);

    invoice.status = InvoiceStatus.PAID;
    invoice.paidBy = dto.payerStudentCode ?? null;
    invoice.paidAt = saved.paidAt;
    await this.invoiceRepo.save(invoice);

    await this.auditService.log({
      actorAccountId,
      action: 'payment.recorded',
      entityType: 'invoice',
      entityId: invoice.id,
      metadata: { paymentId: saved.id, amount, method: saved.method },
    });

    return saved;
  }

  async createVnpayPayment(input: {
    invoiceId: string;
    payerStudentCode: string | null;
    ipAddress: string;
    bankCode?: string;
  }) {
    if (!this.vnpayService.isConfigured()) {
      throw new BadRequestException('VNPay chua duoc cau hinh tren server.');
    }

    const invoice = await this.invoiceRepo.findOne({ where: { id: input.invoiceId } });
    if (!invoice) throw new NotFoundException('Không tìm thấy hóa đơn.');
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Hóa đơn đã được thanh toán.');
    }

    const amount = Number(invoice.totalAmount);
    const transactionRef = buildTxnRef(invoice.id);

    const payment = this.paymentRepo.create({
      invoice,
      amount,
      method: PaymentMethod.VNPAY,
      status: PaymentStatus.PENDING,
      payerStudentCode: input.payerStudentCode,
      transactionRef,
      paidAt: null,
    });
    const saved = await this.paymentRepo.save(payment);

    const paymentUrl = this.vnpayService.buildPaymentUrl({
      amount,
      orderId: transactionRef,
      orderInfo: `Thanh toan hoa don ${invoice.id}`,
      ipAddress: input.ipAddress,
      bankCode: input.bankCode,
    });

    return { paymentId: saved.id, paymentUrl, transactionRef };
  }

  async handleVnpayIpn(query: Record<string, string>): Promise<VnpayIpnResult> {
    if (!this.vnpayService.verifyChecksum(query)) {
      return { RspCode: '97', Message: 'Invalid Checksum' };
    }

    const txnRef = query['vnp_TxnRef'];
    const responseCode = query['vnp_ResponseCode'];
    const transactionStatus = query['vnp_TransactionStatus'];
    const amountRaw = query['vnp_Amount'];
    const vnpayTxnNo = query['vnp_TransactionNo'];

    if (!txnRef) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    return this.dataSource.transaction(async (manager) => {
      const paymentRepo = manager.getRepository(Payment);
      const invoiceRepo = manager.getRepository(Invoice);

      const payment = await paymentRepo.findOne({
        where: { transactionRef: txnRef },
        relations: ['invoice'],
      });
      if (!payment) {
        return { RspCode: '01', Message: 'Order not found' };
      }

      const expectedAmount = Math.round(Number(payment.amount) * 100);
      if (amountRaw && Number(amountRaw) !== expectedAmount) {
        return { RspCode: '04', Message: 'Invalid amount' };
      }

      if (payment.status !== PaymentStatus.PENDING) {
        return { RspCode: '02', Message: 'Order already confirmed' };
      }

      const isSuccess = responseCode === '00' && transactionStatus === '00';
      payment.status = isSuccess ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
      payment.paidAt = isSuccess ? new Date() : null;
      if (vnpayTxnNo) {
        payment.transactionRef = `${txnRef}:${vnpayTxnNo}`;
      }
      await paymentRepo.save(payment);

      if (isSuccess) {
        const invoice = payment.invoice;
        invoice.status = InvoiceStatus.PAID;
        invoice.paidBy = payment.payerStudentCode ?? null;
        invoice.paidAt = payment.paidAt;
        await invoiceRepo.save(invoice);

        await this.auditService.log({
          action: 'payment.vnpay.success',
          entityType: 'invoice',
          entityId: invoice.id,
          metadata: { paymentId: payment.id, amount: payment.amount, vnpayTxnNo },
        });
      } else {
        this.logger.warn(`VNPay IPN failed for txnRef=${txnRef}, code=${responseCode}`);
      }

      return { RspCode: '00', Message: 'Confirm Success' };
    });
  }

  /** Verify nhanh tu Return URL de frontend hien thi (KHONG update DB). */
  verifyReturnUrl(query: Record<string, string>): { valid: boolean; success: boolean; transactionRef: string | null } {
    const valid = this.vnpayService.verifyChecksum(query);
    return {
      valid,
      success: valid && query['vnp_ResponseCode'] === '00' && query['vnp_TransactionStatus'] === '00',
      transactionRef: query['vnp_TxnRef'] ?? null,
    };
  }

  async getByInvoice(invoiceId: string) {
    return this.paymentRepo.find({
      where: { invoice: { id: invoiceId } },
      order: { createdAt: 'DESC' },
      relations: ['invoice'],
    });
  }
}

function buildTxnRef(invoiceId: string): string {
  const ts = Date.now();
  const compact = invoiceId.replace(/-/g, '').slice(0, 16);
  return `${compact}${ts}`;
}
