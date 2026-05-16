import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Staff } from './entities/staff.entity';
import { StaffFloorScope } from './entities/staff-floor-scope.entity';
import { Floor } from '../buildings/entities/floor.entity';
import { Account, AccountRole, AccountStatus } from '../auth/entities/account.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import { generateRandomPassword } from '../../common/helpers/random-password';
import { SetStaffFloorScopesDto } from './dto/set-staff-floor-scopes.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StaffsService {
    constructor(
        @InjectRepository(Staff) private staffRepo: Repository<Staff>,
        @InjectRepository(StaffFloorScope) private scopeRepo: Repository<StaffFloorScope>,
        @InjectRepository(Floor) private floorRepo: Repository<Floor>,
        private dataSource: DataSource
    ) {}

    async create(dto: CreateStaffDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Check username duplicate in accounts
            const accountRepo = queryRunner.manager.getRepository(Account);
            const exists = await accountRepo.findOne({ where: { username: dto.username } });
            if (exists) {
                throw new ConflictException('Lỗi. Tài khoản đã tồn tại.');
            }

            // Check email or CCCD in staffs
            const staffRepoTx = queryRunner.manager.getRepository(Staff);
            const staffExists = await staffRepoTx.findOne({ 
                 where: [ { email: dto.email }, { idCardNumber: dto.idCardNumber } ] 
            });
            if (staffExists) {
                throw new ConflictException('Lỗi. Email hoặc số CCCD đã được đăng ký cho nhân viên khác.');
            }

            // Generate Password and StaffCode
            const generatedPassword = generateRandomPassword('Ktx@', 12);
            const hashedPassword = await bcrypt.hash(generatedPassword, 10);

            const codeSuffix = generateRandomPassword('', 4);
            const staffCode = `NV${Date.now().toString().slice(-6)}${codeSuffix}`;

            // Create Account
            const newAccount = accountRepo.create({
                username: dto.username,
                passwordHash: hashedPassword,
                role: AccountRole.STAFF,
                status: AccountStatus.ACTIVE
            });
            const savedAccount = await accountRepo.save(newAccount);

            // Create Staff Profile
            const newStaff = staffRepoTx.create({
                accountId: savedAccount.accountId,
                staffCode: staffCode,
                fullName: dto.fullName,
                phone: dto.phone,
                email: dto.email,
                idCardNumber: dto.idCardNumber
            });
            await staffRepoTx.save(newStaff);

            await queryRunner.commitTransaction();

            return {
                message: 'Thêm nhân viên thành công',
                data: {
                    username: dto.username,
                    staffCode: staffCode,
                    password: generatedPassword,
                    fullName: dto.fullName
                }
            };

        } catch (error) {
            await queryRunner.rollbackTransaction();
            // Re-throw handled errors
            if (error instanceof ConflictException) {
                 throw error;
            }
            console.error('Add Staff Error:', error);
            throw new InternalServerErrorException('Lỗi kết nối CSDL');
        } finally {
            await queryRunner.release();
        }
    }

    async findAll() {
        return await this.staffRepo.find({ order: { createdAt: 'DESC' } });
    }

    async getFloorScopesByAccountId(accountId: number) {
        const staff = await this.staffRepo.findOne({ where: { accountId } });
        if (!staff) throw new NotFoundException('Không tìm thấy nhân viên với tài khoản này.');
        return this.scopeRepo.find({
            where: { staffId: staff.id },
            relations: ['floor', 'floor.building'],
            order: { floorId: 'ASC' },
        });
    }

    async replaceFloorScopesByAccountId(accountId: number, dto: SetStaffFloorScopesDto) {
        const staff = await this.staffRepo.findOne({ where: { accountId } });
        if (!staff) throw new NotFoundException('Không tìm thấy nhân viên với tài khoản này.');
        const distinct = [...new Set(dto.floorIds)];
        for (const fid of distinct) {
            const f = await this.floorRepo.findOne({ where: { id: fid } });
            if (!f) throw new BadRequestException(`Tầng không tồn tại: ${fid}`);
        }
        await this.scopeRepo.delete({ staffId: staff.id });
        if (distinct.length) {
            await this.scopeRepo.save(
                distinct.map((floorId) => this.scopeRepo.create({ staffId: staff.id, floorId })),
            );
        }
        return this.getFloorScopesByAccountId(accountId);
    }
}
