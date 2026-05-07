import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../src/modules/invoices/entities/invoice.entity';
import { Payment } from '../src/modules/payments/entities/payment.entity';
import { PaymentsModule } from '../src/modules/payments/payments.module';
import { RoomType } from '../src/modules/rooms/entities/room-type.entity';
import { Room } from '../src/modules/rooms/entities/room.entity';
import { RoomsModule } from '../src/modules/rooms/rooms.module';
import { Building } from '../src/modules/buildings/entities/building.entity';
import { Floor } from '../src/modules/buildings/entities/floor.entity';
import { AuditLog } from '../src/modules/audit/entities/audit-log.entity';

/**
 * App tối giản cho e2e rooms + payments: SQLite in-memory, không cần MySQL.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [Room, RoomType, Invoice, Payment, Building, Floor, AuditLog],
      synchronize: true,
    }),
    RoomsModule,
    PaymentsModule,
  ],
})
export class E2eRoomsPaymentsModule {}
