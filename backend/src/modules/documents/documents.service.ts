import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Contract, ContractStatus } from '../contracts/entities/contract.entity';
import { Room } from '../rooms/entities/room.entity';
import { Student } from '../students/entities/student.entity';
import { DormRegistration, DormRegistrationStatus } from '../dorm-registrations/entities/dorm-registration.entity';
import { AccessActor, ScopeService } from '../staffs/scope.service';

/* eslint-disable @typescript-eslint/no-require-imports */
const getPdfMake = () => {
  const pdfMake = require('pdfmake');
  const vfsFonts = require('pdfmake/build/vfs_fonts');
  pdfMake.vfs = vfsFonts.pdfMake.vfs;
  return pdfMake;
};

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Contract) private readonly contractRepo: Repository<Contract>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(DormRegistration) private readonly dormRegRepo: Repository<DormRegistration>,
    @InjectRepository(Room) private readonly roomRepo: Repository<Room>,
    private readonly scopeService: ScopeService,
  ) {}

  private renderPdf(docDefinition: object): Promise<Buffer> {
    const pdfMake = getPdfMake();
    return new Promise((resolve, reject) => {
      try {
        pdfMake.createPdf(docDefinition).getBuffer((buf: Buffer) => resolve(buf));
      } catch (e) {
        reject(e);
      }
    });
  }

  private locationLine(room: Room | null | undefined): string {
    if (!room?.floor?.building) return room?.roomNumber ?? '';
    const b = room.floor.building;
    return `${b.code} — ${b.name} — Tầng ${room.floor.floorNumber} — Phòng ${room.roomNumber}`;
  }

  async buildInvoicePdf(invoiceId: string, actor: AccessActor): Promise<Buffer> {
    const inv = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
      relations: ['room', 'room.floor', 'room.floor.building', 'payments'],
    });
    if (!inv?.room) throw new NotFoundException('Không tìm thấy hóa đơn.');
    await this.scopeService.assertRoomFloorInScope(actor, inv.room.floorId);

    const doc = {
      defaultStyle: { font: 'Roboto', fontSize: 11 },
      content: [
        { text: 'HÓA ĐƠN ĐIỆN NƯỚC / KTX', style: 'header' },
        { text: `Kỳ: ${inv.month}`, margin: [0, 6, 0, 2] },
        { text: this.locationLine(inv.room), margin: [0, 0, 0, 8] },
        {
          table: {
            widths: ['*', 120],
            body: [
              ['Tiền điện', `${Number(inv.electricFee ?? 0).toLocaleString('vi-VN')} đ`],
              ['Tiền nước', `${Number(inv.waterFee ?? 0).toLocaleString('vi-VN')} đ`],
              ['Tổng cộng', { text: `${Number(inv.totalAmount ?? 0).toLocaleString('vi-VN')} đ`, bold: true }],
              ['Trạng thái', inv.status],
              ['Hạn thanh toán', new Date(inv.dueDate).toLocaleString('vi-VN')],
            ],
          },
        },
      ],
      styles: {
        header: { fontSize: 16, bold: true },
      },
    };
    return this.renderPdf(doc);
  }

  async buildCheckinReceiptPdf(contractId: string, actor: AccessActor): Promise<Buffer> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng.');
    const room = await this.roomRepo.findOne({
      where: { id: contract.roomId },
      relations: ['floor', 'floor.building'],
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng.');
    await this.scopeService.assertRoomFloorInScope(actor, room.floorId);

    const student = await this.studentRepo.findOne({ where: { studentCode: contract.studentCode } });
    const reg = await this.dormRegRepo.findOne({
      where: { studentCode: contract.studentCode, status: DormRegistrationStatus.COMPLETED },
      order: { createdAt: 'DESC' },
    });

    const doc = {
      defaultStyle: { font: 'Roboto', fontSize: 11 },
      content: [
        { text: 'BIÊN BẢN NHẬN PHÒNG (CHECK-IN)', style: 'header' },
        { text: `Số HĐ: ${contract.contractCode}`, margin: [0, 8, 0, 2] },
        { text: `Mã SV: ${contract.studentCode}`, margin: [0, 0, 0, 2] },
        { text: `Họ tên: ${student?.fullName ?? contract.studentCode}`, margin: [0, 0, 0, 2] },
        { text: this.locationLine(room), margin: [0, 0, 0, 2] },
        {
          text: `Thời hạn: ${new Date(contract.startDate).toLocaleDateString('vi-VN')} — ${new Date(contract.endDate).toLocaleDateString('vi-VN')}`,
          margin: [0, 0, 0, 2],
        },
        { text: `Tổng giá trị HĐ: ${Number(contract.totalAmount).toLocaleString('vi-VN')} đ`, margin: [0, 0, 0, 8] },
        { text: `Phiếu đăng ký hoàn tất: ${reg ? 'Có' : 'Không tìm thấy bản ghi COMPLETED'}`, fontSize: 9, italics: true },
      ],
      styles: { header: { fontSize: 15, bold: true } },
    };
    return this.renderPdf(doc);
  }

  async buildCheckoutReceiptPdf(contractId: string, actor: AccessActor): Promise<Buffer> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng.');
    if (contract.status !== ContractStatus.CHECKED_OUT) {
      throw new BadRequestException('Chỉ xuất biên bản trả phòng khi hợp đồng đã CHECKED_OUT.');
    }
    const room = await this.roomRepo.findOne({
      where: { id: contract.roomId },
      relations: ['floor', 'floor.building'],
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng.');
    await this.scopeService.assertRoomFloorInScope(actor, room.floorId);

    const student = await this.studentRepo.findOne({ where: { studentCode: contract.studentCode } });

    const doc = {
      defaultStyle: { font: 'Roboto', fontSize: 11 },
      content: [
        { text: 'BIÊN BẢN TRẢ PHÒNG (CHECK-OUT)', style: 'header' },
        { text: `Số HĐ: ${contract.contractCode}`, margin: [0, 8, 0, 2] },
        { text: `Mã SV: ${contract.studentCode}`, margin: [0, 0, 0, 2] },
        { text: `Họ tên: ${student?.fullName ?? contract.studentCode}`, margin: [0, 0, 0, 2] },
        { text: this.locationLine(room), margin: [0, 0, 0, 8] },
        {
          table: {
            widths: ['*', 120],
            body: [
              ['Ngày trả thực tế', contract.actualEndDate ? new Date(contract.actualEndDate).toLocaleDateString('vi-VN') : '—'],
              ['Phí điện nước cuối', `${Number(contract.utilityFee ?? 0).toLocaleString('vi-VN')} đ`],
              ['Phí hư hỏng', `${Number(contract.damageFee ?? 0).toLocaleString('vi-VN')} đ`],
              ['Hoàn cọc', `${Number(contract.depositRefund ?? 0).toLocaleString('vi-VN')} đ`],
              ['Quyết toán cuối', { text: `${Number(contract.finalSettlement ?? 0).toLocaleString('vi-VN')} đ`, bold: true }],
            ],
          },
        },
      ],
      styles: { header: { fontSize: 15, bold: true } },
    };
    return this.renderPdf(doc);
  }
}
