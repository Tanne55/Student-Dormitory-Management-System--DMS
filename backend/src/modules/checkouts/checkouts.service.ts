import { Injectable, BadRequestException, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Contract, ContractStatus } from '../contracts/entities/contract.entity';
import { Room, RoomStatus } from '../rooms/entities/room.entity';
import { Student, StudentLivingStatus } from '../students/entities/student.entity';
import { UtilityReading } from '../utility-readings/entities/utility-reading.entity';
import { SystemSetting } from '../system/entities/system-setting.entity';
import { ScopeService, AccessActor } from '../staffs/scope.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CheckoutsService {
    constructor(
        @InjectRepository(Contract) private contractRepo: Repository<Contract>,
        @InjectRepository(Student) private studentRepo: Repository<Student>,
        @InjectRepository(Room) private roomRepo: Repository<Room>,
        @InjectRepository(UtilityReading) private utilityRepo: Repository<UtilityReading>,
        @InjectRepository(SystemSetting) private settingRepo: Repository<SystemSetting>,
        private dataSource: DataSource,
        private readonly scopeService: ScopeService,
        private readonly auditService: AuditService,
    ) {}

    private async readUtilityPrices(): Promise<{ electricPricePerKwh: number; waterPricePerM3: number }> {
        let electricPricePerKwh = 3500;
        let waterPricePerM3 = 25000;
        const eSetting = await this.settingRepo.findOne({ where: { key: 'ELECTRIC_PRICE_PER_KWH' } });
        const wSetting = await this.settingRepo.findOne({ where: { key: 'WATER_PRICE_PER_M3' } });
        if (eSetting) electricPricePerKwh = parseInt(eSetting.value, 10);
        if (wSetting) waterPricePerM3 = parseInt(wSetting.value, 10);
        return { electricPricePerKwh, waterPricePerM3 };
    }

    async searchLivingStudents(query: string, actor: AccessActor) {
        const pricing = await this.readUtilityPrices();
        if (!query) {
            return { results: [], ...pricing };
        }

        const scope = await this.scopeService.getFloorScope(actor);

        const activeContracts = await this.contractRepo.find({
            where: { status: ContractStatus.ACTIVE }
        });

        const matched = activeContracts.filter(c =>
            c.studentCode?.includes(query)
        );

        const results: any[] = [];
        for (const contract of matched) {
            const room = await this.roomRepo.findOne({ where: { id: contract.roomId } });
            if (room && scope !== 'all' && !scope.includes(room.floorId)) {
                continue;
            }

            // Try to find student record (may or may not exist)
            const student = await this.studentRepo.findOne({
                where: { studentCode: contract.studentCode }
            });

            // Get latest utility reading for this room
            const lastReading = await this.utilityRepo.findOne({
                where: { roomId: contract.roomId },
                order: { month: 'DESC' }
            });

            results.push({
                student: {
                    studentCode: contract.studentCode,
                    fullName: student?.fullName || contract.studentCode,
                    phone: student?.phone || 'N/A'
                },
                contract: {
                    id: contract.id,
                    contractCode: contract.contractCode,
                    startDate: contract.startDate,
                    endDate: contract.endDate,
                    totalAmount: Number(contract.totalAmount)
                },
                room: room ? {
                    id: room.id,
                    roomNumber: room.roomNumber,
                    roomType: room.roomType,
                    currentOccupancy: room.currentOccupancy,
                    capacity: room.capacity
                } : null,
                lastReading: lastReading ? {
                    month: lastReading.month,
                    electricReading: lastReading.electricReading,
                    waterReading: lastReading.waterReading
                } : { month: 'Chưa ghi nhận', electricReading: 0, waterReading: 0 }
            });
        }

        return { results, ...pricing };
    }

    async processCheckout(payload: any, staffId: number, actor: AccessActor, ip?: string | null) {
        const {
            contractId,
            electricReadingFinal,
            waterReadingFinal,
            assetCondition,
            damageFee = 0,
            depositAmount = 0,
            isPaymentConfirmed,
            isForceCheckout
        } = payload;

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction('SERIALIZABLE');

        try {
            // 1. Lock & validate contract
            const contractRepo = queryRunner.manager.getRepository(Contract);
            const contract = await contractRepo.findOne({
                where: { id: contractId },
                lock: { mode: 'pessimistic_write' }
            });
            if (!contract || contract.status !== ContractStatus.ACTIVE) {
                throw new BadRequestException('Hợp đồng không hợp lệ hoặc đã được xử lý.');
            }

            const roomScope = await this.roomRepo.findOne({ where: { id: contract.roomId } });
            if (roomScope) await this.scopeService.assertRoomFloorInScope(actor, roomScope.floorId);

            // 2. Get last utility reading
            const utilityRepo = queryRunner.manager.getRepository(UtilityReading);
            const lastReading = await utilityRepo.findOne({
                where: { roomId: contract.roomId },
                order: { month: 'DESC' }
            });
            const prevElectric = lastReading?.electricReading ?? 0;
            const prevWater = lastReading?.waterReading ?? 0;

            // Validate readings
            if (electricReadingFinal < prevElectric) {
                throw new BadRequestException(`Chỉ số điện cuối (${electricReadingFinal}) phải >= chỉ số tháng trước (${prevElectric}).`);
            }
            if (waterReadingFinal < prevWater) {
                throw new BadRequestException(`Chỉ số nước cuối (${waterReadingFinal}) phải >= chỉ số tháng trước (${prevWater}).`);
            }

            // 3. Calculate utility fee
            const settingRepo = queryRunner.manager.getRepository(SystemSetting);
            let electricPricePerKwh = 3500;
            let waterPricePerM3 = 25000;
            const eSetting = await settingRepo.findOne({ where: { key: 'ELECTRIC_PRICE_PER_KWH' } });
            const wSetting = await settingRepo.findOne({ where: { key: 'WATER_PRICE_PER_M3' } });
            if (eSetting) electricPricePerKwh = parseInt(eSetting.value, 10);
            if (wSetting) waterPricePerM3 = parseInt(wSetting.value, 10);

            const electricFee = (electricReadingFinal - prevElectric) * electricPricePerKwh;
            const waterFee = (waterReadingFinal - prevWater) * waterPricePerM3;
            const utilityFee = electricFee + waterFee;

            // 4. Calculate final settlement
            const actualDamageFee = assetCondition === 'DAMAGED' ? Number(damageFee) : 0;
            const finalSettlement = utilityFee + actualDamageFee - Number(depositAmount);

            // 5. Save final utility reading
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const newReading = utilityRepo.create({
                roomId: contract.roomId,
                month: currentMonth,
                electricReading: electricReadingFinal,
                waterReading: waterReadingFinal,
                recordedBy: staffId
            });
            await utilityRepo.save(newReading);

            // 6. Determine checkout type
            if (isForceCheckout) {
                // Force checkout — bad debt
                contract.status = ContractStatus.BAD_DEBT;
            } else {
                // Normal checkout
                if (!isPaymentConfirmed) {
                    throw new BadRequestException('Vui lòng hoàn tất thanh toán công nợ và tick xác nhận trước khi chốt trả phòng.');
                }
                contract.status = ContractStatus.CHECKED_OUT;
            }

            // 7. Update contract settlement fields
            contract.actualEndDate = now;
            contract.utilityFee = utilityFee;
            contract.damageFee = actualDamageFee;
            contract.depositRefund = Number(depositAmount);
            contract.finalSettlement = finalSettlement;
            await contractRepo.save(contract);

            // 8. Update Room — decrease occupancy
            const roomRepo = queryRunner.manager.getRepository(Room);
            const room = await roomRepo.findOne({
                where: { id: contract.roomId },
                lock: { mode: 'pessimistic_write' }
            });
            if (room) {
                room.currentOccupancy = Math.max(0, room.currentOccupancy - 1);
                if (room.status === RoomStatus.FULL) {
                    room.status = RoomStatus.AVAILABLE;
                }
                await roomRepo.save(room);
            }

            // 9. Update Student
            const studentRepo = queryRunner.manager.getRepository(Student);
            const student = await studentRepo.findOne({ where: { studentCode: contract.studentCode } });
            if (student) {
                student.livingStatus = StudentLivingStatus.LEFT;
                await studentRepo.save(student);
            }

            await queryRunner.commitTransaction();

            await this.auditService.log({
                actorAccountId: staffId,
                action: 'checkout.process',
                entityType: 'contract',
                entityId: contract.id,
                metadata: {
                    studentCode: contract.studentCode,
                    status: contract.status,
                    utilityFee,
                    finalSettlement,
                },
                ip: ip ?? null,
            });

            // 10. Mock Access Control
            console.log(`[ACCESS CONTROL] Thu hồi thẻ từ, vân tay, FaceID cho SV ${contract.studentCode}`);

            const isForced = isForceCheckout;
            return {
                message: isForced
                    ? 'Đã hoàn tất thanh lý vắng mặt cưỡng chế. Hồ sơ lưu trữ được chuyển vào danh sách Nợ xấu.'
                    : 'Trả phòng thành công. Hợp đồng đã được thanh lý.',
                data: {
                    contractId: contract.id,
                    contractCode: contract.contractCode,
                    studentCode: contract.studentCode,
                    utilityFee,
                    damageFee: actualDamageFee,
                    depositRefund: Number(depositAmount),
                    finalSettlement,
                    status: contract.status,
                    electricUsed: electricReadingFinal - prevElectric,
                    waterUsed: waterReadingFinal - prevWater,
                    electricPricePerKwh,
                    waterPricePerM3,
                }
            };

        } catch (error) {
            await queryRunner.rollbackTransaction();
            if (error instanceof BadRequestException || error instanceof ConflictException) {
                throw error;
            }
            console.error('Checkout Error:', error);
            throw new InternalServerErrorException('Có lỗi xảy ra trong quá trình ghi dữ liệu. Vui lòng thử lại.');
        } finally {
            await queryRunner.release();
        }
    }
}
