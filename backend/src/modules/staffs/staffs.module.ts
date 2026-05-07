import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffsController } from './staffs.controller';
import { StaffsService } from './staffs.service';
import { Staff } from './entities/staff.entity';
import { Account } from '../auth/entities/account.entity';
import { StaffFloorScope } from './entities/staff-floor-scope.entity';
import { ScopeService } from './scope.service';
import { BuildingsModule } from '../buildings/buildings.module';

@Module({
  imports: [TypeOrmModule.forFeature([Staff, Account, StaffFloorScope]), BuildingsModule],
  controllers: [StaffsController],
  providers: [StaffsService, ScopeService],
  exports: [StaffsService, ScopeService, TypeOrmModule],
})
export class StaffsModule {}
