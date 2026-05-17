import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DormExtension, DormExtensionStatus } from './entities/dorm-extension.entity';
import { DormRegistration, DormRegistrationStatus } from '../dorm-registrations/entities/dorm-registration.entity';
import { Room, RoomStatus } from '../rooms/entities/room.entity';
import { Student } from '../students/entities/student.entity';
import { RegistrationPeriod } from '../system/entities/registration-period.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { ScopeService, AccessActor } from '../staffs/scope.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DormExtensionsService {
    constructor(
        @InjectRepository(DormExtension)
        private extensionRepo: Repository<DormExtension>,
        @InjectRepository(DormRegistration)
        private dormRegRepo: Repository<DormRegistration>,
        @InjectRepository(Room)
        private roomRepo: Repository<Room>,
        @InjectRepository(Student)
        private studentRepo: Repository<Student>,
        @InjectRepository(RegistrationPeriod)
        private periodRepo: Repository<RegistrationPeriod>,
        @InjectRepository(Invoice)
        private invoiceRepo: Repository<Invoice>,
        private notificationsService: NotificationsService,
        private readonly scopeService: ScopeService,
        private readonly auditService: AuditService,
    ) {}

    // ================== STUDENT APIs ==================

    async getEligibility(accountId: number) {
        // 1. Check Active Period
        const activePeriod = await this.periodRepo.findOne({ where: { isActive: true } });
        if (!activePeriod) {
            return { isEligible: false, error: 'Hiện tại hệ thống không trong đợt cho phép gia hạn nội trú.' };
        }

        // 2. Check Student Profile
        const student = await this.studentRepo.findOne({ where: { accountId } });
        if (!student || !student.studentCode) {
            return { isEligible: false, error: 'Hồ sơ sinh viên chưa được cập nhật.' };
        }

        // 3. Find current registered room
        const activeReg = await this.dormRegRepo.findOne({
            where: {
                studentCode: student.studentCode,
                status: In([DormRegistrationStatus.APPROVED, DormRegistrationStatus.COMPLETED]),
            },
            order: { createdAt: 'DESC' },
        });

        if (!activeReg || !activeReg.roomId) {
            return { isEligible: false, error: 'Bạn hiện không lưu trú tại bất kỳ phòng nào, không thể gia hạn.' };
        }

        // 4. Validate Room Maintenance
        const room = await this.roomRepo.findOne({ where: { id: activeReg.roomId } });
        if (!room) {
            return { isEligible: false, error: 'Không tìm thấy dữ liệu phòng.' };
        }

        if (room.status === RoomStatus.MAINTENANCE) {
             return { isEligible: false, error: `Phòng ${room.roomNumber} hiện tại không được phép gia hạn do đang trong kế hoạch sửa chữa/bảo trì ở Học kỳ tới.` };
        }

        // 5. Check if already extended for this period
        const existingExtension = await this.extensionRepo.findOne({
            where: { accountId, semester: activePeriod.semester }
        });

        if (existingExtension) {
             return { isEligible: false, error: `Bạn đã nộp đơn gia hạn cho đợt ${activePeriod.semester} rồi.` };
        }

        const unpaidInvoice = await this.invoiceRepo.findOne({
            where: {
                room: { id: room.id },
                status: In([InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE]),
            },
            order: { dueDate: 'ASC' },
        });
        if (unpaidInvoice) {
            return {
                isEligible: false,
                error: `Bạn còn công nợ điện nước kỳ ${unpaidInvoice.month}. Vui lòng thanh toán trước khi gửi gia hạn.`,
            };
        }

        return {
             isEligible: true,
             data: {
                 studentCode: student.studentCode,
                 roomId: room.id,
                 roomNumber: room.roomNumber,
                 semester: activePeriod.semester
             }
        };
    }

    async createExtension(accountId: number) {
        const eligibility = await this.getEligibility(accountId);
        if (!eligibility.isEligible || !eligibility.data) {
             throw new BadRequestException(eligibility.error);
        }

        const ext = this.extensionRepo.create({
             accountId,
             studentCode: eligibility.data.studentCode,
             roomId: eligibility.data.roomId,
             roomNumber: eligibility.data.roomNumber,
             semester: eligibility.data.semester
        });

        return await this.extensionRepo.save(ext);
    }

    async getHistory(accountId: number) {
        return this.extensionRepo.find({
            where: { accountId },
            order: { createdAt: 'DESC' }
        });
    }

    // ================== STAFF APIs ==================

    async findAll(status?: string, semester?: string, actor?: AccessActor) {
        const scope = actor ? await this.scopeService.getFloorScope(actor) : 'all';
        const query = this.extensionRepo.createQueryBuilder('e').leftJoin(Room, 'r', 'r.id = e.room_id');

        if (status) query.andWhere('e.status = :status', { status });
        if (semester) query.andWhere('e.semester = :semester', { semester });
        if (scope !== 'all') {
            query.andWhere('r.floor_id IN (:...fids)', { fids: scope });
        }

        query.orderBy('e.createdAt', 'DESC');
        return query.getMany();
    }

    async updateStatus(id: string, newStatus: string, actor: AccessActor, ip?: string | null) {
        const extension = await this.extensionRepo.findOne({ where: { id } });
        if (!extension) throw new NotFoundException('Không tìm thấy đơn gia hạn.');

        const room = await this.roomRepo.findOne({ where: { id: extension.roomId } });
        if (!room) throw new NotFoundException('Không tìm thấy phòng của đơn gia hạn.');
        await this.scopeService.assertRoomFloorInScope(actor, room.floorId);

        if (extension.status !== DormExtensionStatus.PENDING) {
             throw new BadRequestException('Chỉ có thể duyệt các đơn đang ở trạng thái chờ.');
        }

        const prevStatus = extension.status;
        extension.status = newStatus as DormExtensionStatus;
        await this.extensionRepo.save(extension);

        // NẾU APPROVED -> Tạo sẵn một phiếu DormRegistration APPROVED để sau này sinh viên làm Check-in/Ký hợp đồng
        if (extension.status === DormExtensionStatus.APPROVED) {
            const unpaidInvoice = await this.invoiceRepo.findOne({
                where: {
                    room: { id: extension.roomId },
                    status: In([InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE]),
                },
            });
            if (unpaidInvoice) {
                throw new BadRequestException(`Không thể duyệt gia hạn vì phòng còn công nợ kỳ ${unpaidInvoice.month}.`);
            }
            const room = await this.roomRepo.findOne({ where: { id: extension.roomId } });
            if (room) {
                const reg = this.dormRegRepo.create({
                    studentCode: extension.studentCode,
                    roomType: room.roomTypeId,
                    semester: extension.semester,
                    status: DormRegistrationStatus.APPROVED,
                    roomId: room.id,
                    applicationData: {
                        note: "Gia hạn tự động từ học kỳ trước"
                    }
                });
                await this.dormRegRepo.save(reg);
            }
        }

        // Push notification to student
        const isApproved = extension.status === DormExtensionStatus.APPROVED;
        await this.notificationsService.create(
            extension.accountId,
            isApproved ? '✅ Đơn gia hạn được duyệt!' : '❌ Đơn gia hạn bị từ chối',
            isApproved
                ? `Yêu cầu gia hạn phòng ${extension.roomNumber} cho kỳ ${extension.semester} đã được phê duyệt.`
                : `Yêu cầu gia hạn phòng ${extension.roomNumber} cho kỳ ${extension.semester} đã bị từ chối.`,
            isApproved ? NotificationType.SUCCESS : NotificationType.WARNING
        );

        await this.auditService.log({
            actorAccountId: actor.accountId,
            action: 'dorm_extension.status_change',
            entityType: 'dorm_extension',
            entityId: id,
            metadata: { fromStatus: prevStatus, toStatus: extension.status },
            ip: ip ?? null,
        });

        return extension;
    }
}
