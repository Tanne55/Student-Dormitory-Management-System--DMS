import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './entities/room.entity';
import { RoomType } from './entities/room-type.entity';
import { Floor } from '../buildings/entities/floor.entity';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { BuildingsModule } from '../buildings/buildings.module';
import { StaffsModule } from '../staffs/staffs.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Room, RoomType, Floor]), BuildingsModule, StaffsModule, AuditModule],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [TypeOrmModule, RoomsService],
})
export class RoomsModule {}
