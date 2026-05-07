import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { UtilityReading } from './entities/utility-reading.entity';
import { Room, RoomStatus } from '../rooms/entities/room.entity';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { SystemSetting } from '../system/entities/system-setting.entity';
import { DormRegistration, DormRegistrationStatus } from '../dorm-registrations/entities/dorm-registration.entity';
import { Student } from '../students/entities/student.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { ScopeService, AccessActor } from '../staffs/scope.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UtilityReadingsService {
    constructor(
        @InjectRepository(UtilityReading) private readonly utilityRepo: Repository<UtilityReading>,
        @InjectRepository(Room) private readonly roomRepo: Repository<Room>,
        @InjectRepository(SystemSetting) private readonly settingRepo: Repository<SystemSetting>,
        @InjectRepository(DormRegistration) private readonly dormRegRepo: Repository<DormRegistration>,
        @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
        private readonly dataSource: DataSource,
        private readonly notificationsService: NotificationsService,
        private readonly scopeService: ScopeService,
        private readonly auditService: AuditService,
    ) { }

    private async getAccountIdsByRoomId(roomId: string): Promise<number[]> {
        const regs = await this.dormRegRepo.find({
            where: {
                roomId,
                status: In([DormRegistrationStatus.APPROVED, DormRegistrationStatus.COMPLETED]),
            },
            select: ['studentCode'],
        });
        const codes = [...new Set(regs.map((r) => r.studentCode))];
        if (!codes.length) return [];
        const students = await this.studentRepo.find({
            where: { studentCode: In(codes) },
            select: ['accountId'],
        });
        return students.map((s) => s.accountId);
    }

    async getUnrecordedRooms(month: string, actor: AccessActor) {
        if (!month) throw new BadRequestException('Vui lòng cung cấp tháng (yyyy-MM).');

        const scope = await this.scopeService.getFloorScope(actor);
        const qb = this.roomRepo
            .createQueryBuilder('r')
            .where('r.status IN (:...statuses)', { statuses: [RoomStatus.FULL, RoomStatus.AVAILABLE] })
            .andWhere('r.currentOccupancy > 0');
        if (scope !== 'all') {
            qb.andWhere('r.floor_id IN (:...fids)', { fids: scope });
        }
        const occupiedRooms = await qb.getMany();

        if (occupiedRooms.length === 0) return [];

        const results: any[] = [];

        for (const room of occupiedRooms) {
            // Kiểm tra xem phòng này đã chốt số cho tháng `month` chưa
            const recorded = await this.utilityRepo.findOne({
                where: { roomId: room.id, month }
            });

            // Lấy số điện nước gần nhất (tháng trước)
            const lastReading = await this.utilityRepo.findOne({
                where: { roomId: room.id },
                order: { month: 'DESC' }
            });

            results.push({
                roomId: room.id,
                roomNumber: room.roomNumber,
                isRecorded: !!recorded,
                prevElectric: lastReading ? lastReading.electricReading : 0,
                prevWater: lastReading ? lastReading.waterReading : 0,
                currentElectric: recorded ? recorded.electricReading : (lastReading ? lastReading.electricReading : 0),
                currentWater: recorded ? recorded.waterReading : (lastReading ? lastReading.waterReading : 0)
            });
        }

        return results;
    }

    async massRecordAndGenerateInvoices(payload: { month: string; data: any[] }, staffId: number, actor: AccessActor, ip?: string | null) {
        const { month, data } = payload;
        if (!month || !data || !data.length) throw new BadRequestException('Dữ liệu không hợp lệ.');

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction('SERIALIZABLE');

        let roomsRecorded = 0;
        let invoicesCreated = 0;
        const invoiceNotifyQueue: { roomId: string; month: string; totalAmount: number }[] = [];

        try {
            const utilityRepo = queryRunner.manager.getRepository(UtilityReading);
            const invoiceRepo = queryRunner.manager.getRepository(Invoice);

            for (const item of data) {
                const { roomId, electricReading, waterReading, prevElectric, prevWater } = item;

                const roomCheck = await this.roomRepo.findOne({ where: { id: roomId } });
                if (!roomCheck) throw new BadRequestException(`Phòng ${roomId} không tồn tại.`);
                await this.scopeService.assertRoomFloorInScope(actor, roomCheck.floorId);

                // Validate
                if (electricReading < prevElectric || waterReading < prevWater) {
                    throw new BadRequestException(`Chỉ số mới của phòng không được nhỏ hơn chỉ số cũ.`);
                }

                // Check if already recorded logic inside transaction
                const existing = await utilityRepo.findOne({ where: { roomId, month }, lock: { mode: 'pessimistic_write' } });
                if (existing) continue; // Bỏ qua nếu đã lưu

                // Save reading
                const newReading = utilityRepo.create({
                    roomId,
                    month,
                    electricReading,
                    waterReading,
                    recordedBy: staffId
                });
                await utilityRepo.save(newReading);

                // Check if invoice already exists
                const existingInvoice = await invoiceRepo.findOne({
                    where: { room: { id: roomId }, month },
                    lock: { mode: 'pessimistic_write' },
                });
                if (!existingInvoice) {
                    let electricPrice = 3500;
                    let waterPrice = 25000;
                    const eSetting = await this.settingRepo.findOne({ where: { key: 'ELECTRIC_PRICE_PER_KWH' } });
                    const wSetting = await this.settingRepo.findOne({ where: { key: 'WATER_PRICE_PER_M3' } });
                    if (eSetting) electricPrice = parseInt(eSetting.value, 10);
                    if (wSetting) waterPrice = parseInt(wSetting.value, 10);

                    const electricFee = (electricReading - prevElectric) * electricPrice;
                    const waterFee = (waterReading - prevWater) * waterPrice;
                    const totalAmount = electricFee + waterFee;

                    const [year, m] = month.split('-');
                    const dueDate = new Date(parseInt(year), parseInt(m), 5);

                    const newInvoice = invoiceRepo.create({
                        room: { id: roomId } as Room,
                        month,
                        electricFee,
                        waterFee,
                        totalAmount,
                        status: InvoiceStatus.UNPAID,
                        dueDate
                    });
                    await invoiceRepo.save(newInvoice);
                    invoiceNotifyQueue.push({ roomId, month, totalAmount });
                    invoicesCreated++;
                }

                roomsRecorded++;
            }

            await queryRunner.commitTransaction();

            await this.auditService.log({
                actorAccountId: staffId,
                action: 'utility.mass_record',
                entityType: 'utility_reading',
                entityId: month,
                metadata: { roomsRecorded, invoicesCreated, month },
                ip: ip ?? null,
            });

            for (const n of invoiceNotifyQueue) {
                const room = await this.roomRepo.findOne({ where: { id: n.roomId } });
                const accountIds = await this.getAccountIdsByRoomId(n.roomId);
                if (accountIds.length) {
                    const formatted = new Intl.NumberFormat('vi-VN').format(n.totalAmount);
                    await this.notificationsService.createForMultipleAccounts(
                        accountIds,
                        'Hóa đơn điện nước mới',
                        `Phòng ${room?.roomNumber ?? n.roomId} có hóa đơn kỳ ${n.month}. Tổng ${formatted} VND. Vui lòng xem mục Hóa đơn.`,
                        NotificationType.INFO,
                    );
                }
            }

            return {
                message:
                    invoicesCreated > 0
                        ? `Đã chốt sổ ${roomsRecorded} phòng; tạo mới ${invoicesCreated} hóa đơn điện nước.`
                        : `Đã chốt sổ ${roomsRecorded} phòng (các hóa đơn kỳ này đã tồn tại hoặc không phát sinh thêm).`,
                roomsRecorded,
                invoicesCreated,
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
