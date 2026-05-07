import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Building } from './entities/building.entity';
import { Floor } from './entities/floor.entity';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';
import { FloorsController } from './floors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Building, Floor])],
  controllers: [BuildingsController, FloorsController],
  providers: [BuildingsService],
  exports: [TypeOrmModule, BuildingsService],
})
export class BuildingsModule {}
