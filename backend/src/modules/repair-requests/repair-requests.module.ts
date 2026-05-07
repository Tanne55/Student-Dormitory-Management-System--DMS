import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepairRequestsController } from './repair-requests.controller';
import { RepairRequestsService } from './repair-requests.service';
import { RepairRequest } from './entities/repair-request.entity';
import { DormRegistration } from '../dorm-registrations/entities/dorm-registration.entity';
import { Room } from '../rooms/entities/room.entity';
import { Student } from '../students/entities/student.entity';
import { StaffsModule } from '../staffs/staffs.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([RepairRequest, DormRegistration, Room, Student]), StaffsModule, AuditModule],
  controllers: [RepairRequestsController],
  providers: [RepairRequestsService]
})
export class RepairRequestsModule {}
