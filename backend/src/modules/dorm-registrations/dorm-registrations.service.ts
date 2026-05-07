import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DormRegistration, DormRegistrationStatus } from './entities/dorm-registration.entity';
import { Room } from '../rooms/entities/room.entity';
import { ScopeService, AccessActor } from '../staffs/scope.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DormRegistrationsService {
    constructor(
        @InjectRepository(DormRegistration)
        private dormRegistrationRepository: Repository<DormRegistration>,
        @InjectRepository(Room)
        private roomRepository: Repository<Room>,
        private dataSource: DataSource,
        private readonly scopeService: ScopeService,
        private readonly auditService: AuditService,
    ) { }

    async createPublicRegistration(data: Partial<DormRegistration>) {
        // Validate if registration already exists for same student and same semester
        const existing = await this.dormRegistrationRepository.findOne({
            where: { studentCode: data.studentCode, semester: data.semester }
        });

        if (existing) {
            throw new BadRequestException(`Sinh viên ${data.studentCode} đã nộp đơn đăng ký cho học kỳ ${data.semester}.`);
        }

        const registration = this.dormRegistrationRepository.create(data);
        const saved = await this.dormRegistrationRepository.save(registration);
        return { message: 'Đăng ký nhận phòng thành công', registrationId: saved.id };
    }

    async getPendingRegistrations() {
        return this.dormRegistrationRepository.find({
            where: { status: DormRegistrationStatus.PENDING },
            order: { createdAt: 'DESC' }
        });
    }

    async getRegistrationDetails(id: string) {
        const reg = await this.dormRegistrationRepository.findOne({ where: { id } });
        if (!reg) throw new NotFoundException('Registration not found');
        return reg;
    }

    async getSuggestedRooms(id: string, actor: AccessActor) {
        const reg = await this.getRegistrationDetails(id);
        
        let appData: any = reg.applicationData;
        if (typeof appData === 'string') {
            try { appData = JSON.parse(appData); } catch(e) {}
        }
        
        const gender = appData?.basic?.gender || 'Mixed';
        const roomType = reg.roomType;

        const scope = await this.scopeService.getFloorScope(actor);
        const qb = this.roomRepository.createQueryBuilder('room')
           .where('room.roomType = :roomType', { roomType })
           .andWhere('room.gender IN (:...genders)', { genders: [gender, 'Mixed'] })
           .andWhere('room.capacity > room.currentOccupancy');
        if (scope !== 'all') {
            qb.andWhere('room.floor_id IN (:...fids)', { fids: scope });
        }
        const rooms = await qb.getMany();
           
        return rooms.map(room => ({
            ...room,
            availableSlots: room.capacity - room.currentOccupancy
        }));
    }

    async approveRegistration(id: string, actorAccountId: number, ip?: string | null) {
        const meta = await this.dataSource.transaction(async (manager) => {
            const reg = await manager.findOne(DormRegistration, { where: { id }, lock: { mode: 'pessimistic_write' } });
            if (!reg) throw new NotFoundException('Registration not found');
            if (reg.status !== DormRegistrationStatus.PENDING) throw new BadRequestException('Application already processed');

            const existingApproved = await manager.findOne(DormRegistration, {
                where: { studentCode: reg.studentCode, semester: reg.semester, status: DormRegistrationStatus.APPROVED },
            });
            if (existingApproved) {
                throw new BadRequestException('Sinh viên này đã được duyệt lưu trú trong đợt này.');
            }

            reg.status = DormRegistrationStatus.APPROVED;
            await manager.save(DormRegistration, reg);

            return { studentCode: reg.studentCode, semester: reg.semester };
        });

        await this.auditService.log({
            actorAccountId,
            action: 'dorm_registration.approve',
            entityType: 'dorm_registration',
            entityId: id,
            metadata: meta,
            ip: ip ?? null,
        });

        return {
            message: `Phê duyệt yêu cầu thành công. Sinh viên đã có thể nhận thông báo chuẩn bị Check-in.`,
        };
    }
}
