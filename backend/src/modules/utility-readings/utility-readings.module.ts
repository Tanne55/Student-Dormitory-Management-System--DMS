import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UtilityReading } from './entities/utility-reading.entity';
import { Room } from '../rooms/entities/room.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { UtilityReadingsService } from './utility-readings.service';
import { UtilityReadingsController } from './utility-readings.controller';
import { SystemModule } from '../system/system.module';
import { DormRegistration } from '../dorm-registrations/entities/dorm-registration.entity';
import { Student } from '../students/entities/student.entity';
import { StaffsModule } from '../staffs/staffs.module';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([UtilityReading, Room, Invoice, DormRegistration, Student]),
        SystemModule,
        StaffsModule,
        AuditModule,
    ],
    controllers: [UtilityReadingsController],
    providers: [UtilityReadingsService],
    exports: [TypeOrmModule]
})
export class UtilityReadingsModule {}
