import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DormExtensionsController } from './dorm-extensions.controller';
import { DormExtensionsService } from './dorm-extensions.service';
import { DormExtension } from './entities/dorm-extension.entity';
import { DormRegistration } from '../dorm-registrations/entities/dorm-registration.entity';
import { Room } from '../rooms/entities/room.entity';
import { Student } from '../students/entities/student.entity';
import { RegistrationPeriod } from '../system/entities/registration-period.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { StaffsModule } from '../staffs/staffs.module';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([DormExtension, DormRegistration, Room, Student, RegistrationPeriod, Invoice]),
        StaffsModule,
        AuditModule,
    ],
    controllers: [DormExtensionsController],
    providers: [DormExtensionsService],
})
export class DormExtensionsModule {}
