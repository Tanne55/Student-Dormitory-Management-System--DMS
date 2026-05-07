import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckinsController } from './checkins.controller';
import { CheckinsService } from './checkins.service';
import { DormRegistration } from '../dorm-registrations/entities/dorm-registration.entity';
import { Room } from '../rooms/entities/room.entity';
import { RoomType } from '../rooms/entities/room-type.entity';
import { Student } from '../students/entities/student.entity';
import { StudentProfile } from '../students/entities/student-profile.entity';
import { EmergencyContact } from '../students/entities/emergency-contact.entity';
import { Contract } from '../contracts/entities/contract.entity';
import { Account } from '../auth/entities/account.entity';
import { StaffsModule } from '../staffs/staffs.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DormRegistration,
      Room,
      RoomType,
      Student,
      StudentProfile,
      EmergencyContact,
      Contract,
      Account,
    ]),
    StaffsModule,
    AuditModule,
  ],
  controllers: [CheckinsController],
  providers: [CheckinsService],
})
export class CheckinsModule {}
