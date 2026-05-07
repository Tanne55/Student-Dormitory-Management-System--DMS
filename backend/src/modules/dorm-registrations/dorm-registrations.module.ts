import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DormRegistrationsController } from './dorm-registrations.controller';
import { DormRegistrationsService } from './dorm-registrations.service';
import { DormRegistration } from './entities/dorm-registration.entity';
import { Room } from '../rooms/entities/room.entity';
import { StaffsModule } from '../staffs/staffs.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([DormRegistration, Room]), StaffsModule, AuditModule],
  controllers: [DormRegistrationsController],
  providers: [DormRegistrationsService],
  exports: [DormRegistrationsService]
})
export class DormRegistrationsModule {}
