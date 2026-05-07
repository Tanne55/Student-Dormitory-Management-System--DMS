import { Injectable, BadRequestException, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DormRegistration, DormRegistrationStatus } from '../dorm-registrations/entities/dorm-registration.entity';
import { Room, RoomStatus } from '../rooms/entities/room.entity';
import { RoomType } from '../rooms/entities/room-type.entity';
import { Student, StudentLivingStatus } from '../students/entities/student.entity';
import { StudentProfile } from '../students/entities/student-profile.entity';
import { EmergencyContact } from '../students/entities/emergency-contact.entity';
import { Contract } from '../contracts/entities/contract.entity';
import { Account, AccountRole, AccountStatus } from '../auth/entities/account.entity';
import { ScopeService, AccessActor } from '../staffs/scope.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CheckinsService {
  constructor(
    @InjectRepository(DormRegistration) private regRepo: Repository<DormRegistration>,
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    @InjectRepository(RoomType) private roomTypeRepo: Repository<RoomType>,
    private dataSource: DataSource,
    private readonly scopeService: ScopeService,
    private readonly auditService: AuditService,
  ) {}

  async searchApprovedRegistrations(query: string) {
    const registrations = await this.regRepo.find({
      where: { status: DormRegistrationStatus.APPROVED },
    });

    if (!query) return registrations;

    return registrations.filter((r) => {
      const data = typeof r.applicationData === 'string' ? JSON.parse(r.applicationData) : r.applicationData;
      return r.studentCode.includes(query) || (data && data.idCardNumber && data.idCardNumber.includes(query));
    });
  }

  async getAvailableRooms(gender: string, roomTypeId: number, actor: AccessActor) {
    const genderMap: Record<string, string[]> = {
      Nam: ['Male', 'Mixed'],
      Male: ['Male', 'Mixed'],
      Nữ: ['Female', 'Mixed'],
      Female: ['Female', 'Mixed'],
    };
    const allowedGenders = genderMap[gender] ?? ['Male', 'Female', 'Mixed'];

    const scope = await this.scopeService.getFloorScope(actor);
    const qb = this.roomRepo
      .createQueryBuilder('room')
      .where('room.status != :status', { status: RoomStatus.MAINTENANCE })
      .andWhere('room.gender IN (:...allowedGenders)', { allowedGenders })
      .andWhere('room.roomTypeId = :roomTypeId', { roomTypeId })
      .andWhere('room.currentOccupancy < room.capacity');

    if (scope !== 'all') {
      qb.andWhere('room.floor_id IN (:...fids)', { fids: scope });
    }

    const rooms = await qb.getMany();

    const roomTypeInfo = await this.roomTypeRepo.findOne({ where: { roomTypeId: roomTypeId } });
    const monthlyPrice = roomTypeInfo ? Number(roomTypeInfo.monthlyPrice) : 0;
    const roomTypeName = roomTypeInfo ? roomTypeInfo.name : `Loại phòng ${roomTypeId}`;

    return rooms.map((room) => ({
      ...room,
      monthlyPrice,
      roomTypeName,
    }));
  }

  async processCheckin(payload: any, staffId: number, actor: AccessActor, ip?: string | null) {
    const { registrationId, roomId, startDate, endDate } = payload;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    let contractIdForAudit: string | null = null;
    let studentCodeForAudit: string | null = null;

    try {
      const regRepoTx = queryRunner.manager.getRepository(DormRegistration);
      const registration = await regRepoTx.findOne({ where: { id: registrationId } });
      if (!registration || registration.status !== DormRegistrationStatus.APPROVED) {
        throw new BadRequestException('Hồ sơ đăng ký không hợp lệ hoặc không ở trạng thái Đã Duyệt.');
      }
      studentCodeForAudit = registration.studentCode;

      const roomRepoTx = queryRunner.manager.getRepository(Room);
      const room = await roomRepoTx.findOne({ where: { id: roomId }, lock: { mode: 'pessimistic_write' } });
      if (!room) throw new BadRequestException('Không tìm thấy phòng.');
      await this.scopeService.assertRoomFloorInScope(actor, room.floorId);

      if (room.currentOccupancy >= room.capacity) {
        throw new ConflictException('Giường này vừa được xếp cho người khác. Vui lòng chọn loại phòng/giường khác.');
      }

      room.currentOccupancy += 1;
      if (room.currentOccupancy === room.capacity) {
        room.status = RoomStatus.FULL;
      }
      await roomRepoTx.save(room);

      registration.status = DormRegistrationStatus.COMPLETED;
      registration.roomId = room.id;
      await regRepoTx.save(registration);

      let appData = registration.applicationData;
      if (typeof appData === 'string') {
        try {
          appData = JSON.parse(appData);
        } catch {
          appData = {};
        }
      }
      const { basic = {}, profile = {}, contacts = [] } = appData as any;

      const accountRepoTx = queryRunner.manager.getRepository(Account);
      let targetAccount = await accountRepoTx.findOne({ where: { username: registration.studentCode } });

      let generatedPassword: string | null = null;
      if (!targetAccount) {
        generatedPassword = `SV${Math.floor(1000 + Math.random() * 9000)}`;
        const passwordHash = await bcrypt.hash(generatedPassword, 10);
        targetAccount = accountRepoTx.create({
          username: registration.studentCode,
          passwordHash,
          role: AccountRole.STUDENT,
          status: AccountStatus.ACTIVE,
        });
        await accountRepoTx.save(targetAccount);
      }

      const studentRepoTx = queryRunner.manager.getRepository(Student);
      let student = await studentRepoTx.findOne({ where: { studentCode: registration.studentCode } });
      if (!student) {
        student = studentRepoTx.create({
          accountId: targetAccount.accountId,
          studentCode: registration.studentCode,
          fullName: basic.fullName || registration.studentCode,
          dob: basic.dob ? new Date(basic.dob) : new Date(),
          gender: basic.gender || 'Male',
          phone: basic.phone || '',
          emailPersonal: basic.emailPersonal || '',
          emailSchool: basic.emailSchool || '',
          cohort: basic.cohort || '',
          faculty: basic.faculty || '',
          major: basic.major || '',
          className: basic.className || '',
          livingStatus: StudentLivingStatus.LIVING,
        });
        await studentRepoTx.save(student);
      } else {
        student.livingStatus = StudentLivingStatus.LIVING;
        if (!student.accountId) student.accountId = targetAccount.accountId;
        await studentRepoTx.save(student);
      }

      const profileRepoTx = queryRunner.manager.getRepository(StudentProfile);
      const existingProfile = await profileRepoTx.findOne({ where: { studentId: student.id } });
      if (!existingProfile && profile) {
        const newProfile = profileRepoTx.create({
          studentId: student.id,
          idCardNumber: profile.idCardNumber || '',
          idCardIssuedDate: profile.idCardIssuedDate ? new Date(profile.idCardIssuedDate) : new Date(),
          nation: profile.nation || 'Vietnam',
          birthPlace: profile.birthPlace || '',
          ethnicity: profile.ethnicity || '',
          religion: profile.religion || 'None',
          province: profile.province || '',
          district: profile.district || '',
          ward: profile.ward || '',
          addressDetail: profile.addressDetail || '',
          priorityGroup: profile.priorityGroup || 'None',
        });
        await profileRepoTx.save(newProfile);
      }

      const contactRepoTx = queryRunner.manager.getRepository(EmergencyContact);
      const existingContacts = await contactRepoTx.find({ where: { studentId: student.id } });
      if (existingContacts.length === 0 && Array.isArray(contacts)) {
        for (const c of contacts) {
          const contact = contactRepoTx.create({
            studentId: student.id,
            fullName: c.fullName || '',
            relationship: c.relationship || '',
            phone: c.phone || '',
            address: c.address || '',
            isPrimary: c.isPrimary || false,
          });
          await contactRepoTx.save(contact);
        }
      }

      const roomTypeInfo = await queryRunner.manager.getRepository(RoomType).findOne({ where: { roomTypeId: room.roomTypeId } });
      const monthlyPrice = roomTypeInfo ? Number(roomTypeInfo.monthlyPrice) : 0;
      const months = Math.max(
        1,
        Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)),
      );
      const totalAmount = months * monthlyPrice;

      const contractRepoTx = queryRunner.manager.getRepository(Contract);
      const contract = contractRepoTx.create({
        contractCode: `HD${Date.now()}`,
        studentCode: registration.studentCode,
        roomId: room.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalAmount,
        createdByStaff: staffId.toString(),
      });
      await contractRepoTx.save(contract);
      contractIdForAudit = contract.id;

      await queryRunner.commitTransaction();

      console.log(`[EXTERNAL API] Đồng bộ thẻ từ ra vào cho Sinh viên ${registration.studentCode} thành công.`);
      console.log(`[EXTERNAL API] Gửi Email chứa tài khoản cho Sinh viên ${registration.studentCode} thành công.`);

      let warning = '';
      if (Math.random() > 0.9)
        warning =
          'Thủ tục hoàn tất nhưng hệ thống kiểm soát cửa đang gián đoạn. Vui lòng đồng bộ quyền ra vào thủ công sau.';

      if (contractIdForAudit) {
        await this.auditService.log({
          actorAccountId: staffId,
          action: 'checkin.process',
          entityType: 'contract',
          entityId: contractIdForAudit,
          metadata: { registrationId, roomId, studentCode: studentCodeForAudit },
          ip: ip ?? null,
        });
      }

      return {
        message: warning || 'Làm thủ tục nhận phòng và tạo hợp đồng thành công',
        data: {
          username: targetAccount.username,
          password: generatedPassword,
          contractCode: contract.contractCode,
          contractId: contract.id,
          warning,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Checkin Error:', error);
      throw new InternalServerErrorException('Có lỗi xảy ra trong quá trình ghi dữ liệu. Vui lòng thử lại.');
    } finally {
      await queryRunner.release();
    }
  }
}
