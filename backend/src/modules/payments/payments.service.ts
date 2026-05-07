import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    private readonly auditService: AuditService,
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

  async getByInvoice(invoiceId: string) {
    return this.paymentRepo.find({
      where: { invoice: { id: invoiceId } },
      order: { createdAt: 'DESC' },
      relations: ['invoice'],
    });
  }
}
