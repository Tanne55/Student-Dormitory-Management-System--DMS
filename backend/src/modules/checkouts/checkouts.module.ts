import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckoutsController } from './checkouts.controller';
import { CheckoutsService } from './checkouts.service';
import { Contract } from '../contracts/entities/contract.entity';
import { Room } from '../rooms/entities/room.entity';
import { Student } from '../students/entities/student.entity';
import { UtilityReading } from '../utility-readings/entities/utility-reading.entity';
import { SystemModule } from '../system/system.module';
import { StaffsModule } from '../staffs/staffs.module';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Contract, Room, Student, UtilityReading]),
        SystemModule,
        StaffsModule,
        AuditModule,
    ],
    controllers: [CheckoutsController],
    providers: [CheckoutsService],
})
export class CheckoutsModule {}
