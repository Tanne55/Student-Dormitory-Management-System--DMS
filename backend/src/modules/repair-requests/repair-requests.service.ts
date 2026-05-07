import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RepairRequest, RepairCategory, RepairStatus } from './entities/repair-request.entity';
import { DormRegistration, DormRegistrationStatus } from '../dorm-registrations/entities/dorm-registration.entity';
import { Room } from '../rooms/entities/room.entity';
import { Student } from '../students/entities/student.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { ScopeService, AccessActor } from '../staffs/scope.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RepairRequestsService {
    constructor(
        @InjectRepository(RepairRequest)
        private repairRepo: Repository<RepairRequest>,
        @InjectRepository(DormRegistration)
        private dormRegRepo: Repository<DormRegistration>,
        @InjectRepository(Room)
        private roomRepo: Repository<Room>,
        @InjectRepository(Student)
        private studentRepo: Repository<Student>,
        private readonly notificationsService: NotificationsService,
        private readonly scopeService: ScopeService,
        private readonly auditService: AuditService,
    ) { }

    // ==================== STUDENT APIs ====================

    async getCurrentRoom(accountId: number) {
        const student = await this.studentRepo.findOne({ where: { accountId } });
        if (!student || !student.studentCode) {
            throw new BadRequestException('Hồ sơ sinh viên chưa được cấu hình.');
        }

        const activeReg = await this.dormRegRepo.findOne({
            where: {
                studentCode: student.studentCode,
                status: In([DormRegistrationStatus.APPROVED, DormRegistrationStatus.COMPLETED]),
            },
            order: { createdAt: 'DESC' },
        });

        if (!activeReg || !activeReg.roomId) {
            return { error: 'Sinh viên chưa được cấp phòng lưu trú hợp lệ.' };
        }

        const room = await this.roomRepo.findOne({ where: { id: activeReg.roomId } });
        if (!room) return { error: 'Không tìm thấy phòng hiện tại.' };

        return {
            studentCode: student.studentCode,
            roomNumber: room.roomNumber,
            roomId: room.id,
        };
    }

    async createRequest(accountId: number, data: any) {
        if (!data.category || !data.description) {
            throw new BadRequestException('Vui lòng nhập đầy đủ các thông tin bắt buộc');
        }

        const location = await this.getCurrentRoom(accountId);
        if (location && 'error' in location) {
            throw new BadRequestException(location.error);
        }

        const req = this.repairRepo.create({
            accountId,
            studentCode: (location as any).studentCode,
            roomNumber: (location as any).roomNumber,
            roomId: (location as any).roomId ?? null,
            category: data.category,
            description: data.description,
            attachmentUrl: data.attachmentUrl
        });

        return await this.repairRepo.save(req);
    }

    async getMyRequests(accountId: number) {
        return this.repairRepo.find({
            where: { accountId },
            order: { createdAt: 'DESC' }
        });
    }

    // ==================== STAFF APIs ====================

    async findAll(filters: { status?: string; category?: string }, actor: AccessActor) {
        const scope = await this.scopeService.getFloorScope(actor);
        const query = this.repairRepo.createQueryBuilder('r').leftJoin(Room, 'room', 'room.id = r.room_id');

        if (filters.status && Object.values(RepairStatus).includes(filters.status as RepairStatus)) {
            query.andWhere('r.status = :status', { status: filters.status });
        }

        if (filters.category && Object.values(RepairCategory).includes(filters.category as RepairCategory)) {
            query.andWhere('r.category = :category', { category: filters.category });
        }

        if (scope !== 'all') {
            query.andWhere('(r.room_id IS NULL OR room.floor_id IN (:...fids))', { fids: scope });
        }

        query.orderBy('r.createdAt', 'DESC');

        const tickets = await query.getMany();

        const summary = {
            total: tickets.length,
            pending: tickets.filter((t) => t.status === RepairStatus.PENDING).length,
            processing: tickets.filter((t) => t.status === RepairStatus.PROCESSING).length,
            resolved: tickets.filter((t) => t.status === RepairStatus.RESOLVED).length,
        };

        return { tickets, summary };
    }

    async updateStatus(id: string, newStatus: string, staffNote: string, staffId: number, actor: AccessActor, ip?: string | null) {
        const ticket = await this.repairRepo.findOne({ where: { id } });
        if (!ticket) {
            throw new NotFoundException('Không tìm thấy ticket sự cố.');
        }
        if (ticket.roomId) {
            const room = await this.roomRepo.findOne({ where: { id: ticket.roomId } });
            if (room) await this.scopeService.assertRoomFloorInScope(actor, room.floorId);
        }

        // Validate status transition
        const validTransitions: Record<string, string[]> = {
            [RepairStatus.PENDING]: [RepairStatus.PROCESSING],
            [RepairStatus.PROCESSING]: [RepairStatus.RESOLVED],
        };

        const allowed = validTransitions[ticket.status];
        if (!allowed || !allowed.includes(newStatus)) {
            throw new BadRequestException(
                `Không thể chuyển từ "${ticket.status}" sang "${newStatus}". Chỉ cho phép: ${allowed?.join(', ') || 'không có'}.`
            );
        }

        const prevStatus = ticket.status;
        ticket.status = newStatus as RepairStatus;
        ticket.staffNote = staffNote || ticket.staffNote;
        ticket.resolvedBy = staffId;

        if (newStatus === RepairStatus.RESOLVED) {
            ticket.resolvedAt = new Date();
        }

        const saved = await this.repairRepo.save(ticket);

        await this.auditService.log({
            actorAccountId: staffId,
            action: 'repair_request.status_change',
            entityType: 'repair_request',
            entityId: id,
            metadata: { fromStatus: prevStatus, toStatus: newStatus, staffNote },
            ip: ip ?? null,
        });

        if (newStatus === RepairStatus.PROCESSING) {
            await this.notificationsService.create(
                saved.accountId,
                'Đang xử lý sự cố',
                `BQL đang xử lý yêu cầu sửa chữa tại phòng ${saved.roomNumber}.`,
                NotificationType.INFO,
            );
        } else if (newStatus === RepairStatus.RESOLVED) {
            await this.notificationsService.create(
                saved.accountId,
                'Sự cố đã được xử lý',
                `Yêu cầu sửa chữa phòng ${saved.roomNumber} đã hoàn tất.${staffNote ? ` Ghi chú: ${staffNote}` : ''}`,
                NotificationType.SUCCESS,
            );
        }

        return saved;
    }
}
