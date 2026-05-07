import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contract } from './entities/contract.entity';
import { Room } from '../rooms/entities/room.entity';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { StaffsModule } from '../staffs/staffs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Contract, Room]), StaffsModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [TypeOrmModule, ContractsService],
})
export class ContractsModule {}
