import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { DormRegistration, DormRegistrationStatus } from '../dorm-registrations/entities/dorm-registration.entity';
import { Student } from '../students/entities/student.entity';
import { Room } from '../rooms/entities/room.entity';
import { PaymentsService } from '../payments/payments.service';
import { PaymentStatus } from '../payments/entities/payment.entity';
import { ScopeService, AccessActor } from '../staffs/scope.service';

export type InvoiceListRow = {
  id: string;
  month: string;
  electricFee: number;
  waterFee: number;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate: Date;
  paidBy: string | null;
  paidAt: Date | null;
  room: Pick<Room, 'id' | 'roomNumber' | 'roomType' | 'capacity' | 'currentOccupancy' | 'gender' | 'status' | 'floorId'> | null;
  buildingCode?: string | null;
  buildingName?: string | null;
  floorNumber?: number | null;
  paymentSummary: {
    paidAmount: number;
    remainingAmount: number;
    paymentCount: number;
    latestPaymentAt: Date | null;
  };
};

export type InvoicePaymentHistoryRow = {
  id: string;
  amount: number;
  method: string;
  status: string;
  payerStudentCode: string | null;
  confirmedByAccountId: number | null;
  paidAt: Date;
  createdAt: Date;
};

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(DormRegistration) private dormRegRepo: Repository<DormRegistration>,
    @InjectRepository(Student) private studentRepo: Repository<Student>,
    private readonly paymentsService: PaymentsService,
    private readonly scopeService: ScopeService,
  ) {}

  private summarizePayments(inv: Invoice) {
    const success = (inv.payments || []).filter((p) => p.status === PaymentStatus.SUCCESS);
    const paidAmount = success.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const latestPaymentAt = success.length
      ? new Date(Math.max(...success.map((p) => new Date(p.paidAt).getTime())))
      : null;
    return {
      paidAmount,
      remainingAmount: Math.max(0, Number(inv.totalAmount || 0) - paidAmount),
      paymentCount: success.length,
      latestPaymentAt,
    };
  }

  private toListRow(inv: Invoice): InvoiceListRow {
    const r = inv.room;
    const floor = r?.floor;
    const building = floor?.building;
    return {
      id: inv.id,
      month: inv.month,
      electricFee: Number(inv.electricFee ?? 0),
      waterFee: Number(inv.waterFee ?? 0),
      totalAmount: Number(inv.totalAmount ?? 0),
      status: inv.status,
      dueDate: inv.dueDate,
      paidBy: inv.paidBy ?? null,
      paidAt: inv.paidAt ?? null,
      room: r
        ? {
            id: r.id,
            floorId: r.floorId,
            roomNumber: r.roomNumber,
            roomType: r.roomType,
            capacity: r.capacity,
            currentOccupancy: r.currentOccupancy,
            gender: r.gender,
            status: r.status,
          }
        : null,
      buildingCode: building?.code ?? null,
      buildingName: building?.name ?? null,
      floorNumber: floor?.floorNumber ?? null,
      paymentSummary: this.summarizePayments(inv),
    };
  }

  async findAll(actor: AccessActor, status?: string, month?: string): Promise<InvoiceListRow[]> {
    const scope = await this.scopeService.getFloorScope(actor);
    const query = this.invoiceRepo
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.room', 'room')
      .leftJoinAndSelect('room.floor', 'floor')
      .leftJoinAndSelect('floor.building', 'building')
      .leftJoinAndSelect('invoice.payments', 'payment');

    if (status) query.andWhere('invoice.status = :status', { status });
    if (month) query.andWhere('invoice.month = :month', { month });
    if (scope !== 'all') {
      query.andWhere('room.floor_id IN (:...fids)', { fids: scope });
    }

    query.orderBy('invoice.month', 'DESC').addOrderBy('building.code', 'ASC').addOrderBy('floor.floorNumber', 'ASC').addOrderBy('room.roomNumber', 'ASC');

    const rows = await query.getMany();
    return rows.map((inv) => this.toListRow(inv));
  }

  async markAsPaid(invoiceId: string, paidByCode: string, actorAccountId: number, actor: AccessActor) {
    const inv0 = await this.invoiceRepo.findOne({ where: { id: invoiceId }, relations: ['room'] });
    if (!inv0?.room) throw new NotFoundException('Không tìm thấy hóa đơn.');
    await this.scopeService.assertRoomFloorInScope(actor, inv0.room.floorId);

    await this.paymentsService.createFullPayment(
      {
        invoiceId,
        payerStudentCode: paidByCode,
      },
      actorAccountId,
    );
    const saved = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
      relations: ['room', 'room.floor', 'room.floor.building', 'payments'],
    });
    if (!saved) throw new NotFoundException('Không tìm thấy hóa đơn.');
    return this.toListRow(saved);
  }

  async findMyRoomInvoices(accountId: number) {
    const student = await this.studentRepo.findOne({ where: { accountId } });
    if (!student || !student.studentCode) {
      return [];
    }

    const activeReg = await this.dormRegRepo.findOne({
      where: {
        studentCode: student.studentCode,
        status: In([DormRegistrationStatus.APPROVED, DormRegistrationStatus.COMPLETED]),
      },
      order: { createdAt: 'DESC' },
    });

    if (!activeReg || !activeReg.roomId) return [];

    const invoices = await this.invoiceRepo.find({
      where: { room: { id: activeReg.roomId } },
      order: { month: 'DESC' },
      relations: ['room', 'room.floor', 'room.floor.building', 'payments'],
    });

    return invoices.map((inv) => this.toListRow(inv));
  }

  async getPaymentsByInvoice(invoiceId: string, actor: AccessActor) {
    const inv = await this.invoiceRepo.findOne({ where: { id: invoiceId }, relations: ['room'] });
    if (!inv?.room) throw new NotFoundException('Không tìm thấy hóa đơn.');
    await this.scopeService.assertRoomFloorInScope(actor, inv.room.floorId);

    const rows = await this.paymentsService.getByInvoice(invoiceId);
    const items: InvoicePaymentHistoryRow[] = rows.map((p) => ({
      id: p.id,
      amount: Number(p.amount || 0),
      method: p.method,
      status: p.status,
      payerStudentCode: p.payerStudentCode ?? null,
      confirmedByAccountId: p.confirmedByAccountId ?? null,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    }));
    const paidAmount = items.filter((i) => i.status === 'SUCCESS').reduce((sum, i) => sum + i.amount, 0);
    const invoiceTotal = items[0] ? Number(rows[0].invoice.totalAmount || 0) : 0;
    return {
      invoiceId,
      items,
      summary: {
        invoiceTotal,
        paidAmount,
        remainingAmount: Math.max(0, invoiceTotal - paidAmount),
      },
    };
  }
}
