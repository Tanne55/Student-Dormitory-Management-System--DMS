import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Room } from '../rooms/entities/room.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { RepairRequest } from '../repair-requests/entities/repair-request.entity';
import { DormExtension } from '../dorm-extensions/entities/dorm-extension.entity';
import { Contract } from '../contracts/entities/contract.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Room, Invoice, RepairRequest, DormExtension, Contract])],
    controllers: [AnalyticsController],
    providers: [AnalyticsService],
})
export class AnalyticsModule {}
