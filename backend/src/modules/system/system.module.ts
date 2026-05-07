import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationPeriod } from './entities/registration-period.entity';
import { SystemSetting } from './entities/system-setting.entity';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  imports: [TypeOrmModule.forFeature([RegistrationPeriod, SystemSetting])],
  controllers: [SystemController],
  providers: [SystemService],
  exports: [TypeOrmModule, SystemService]
})
export class SystemModule {}
