import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

@ApiTags('buildings')
@ApiBearerAuth()
@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  @Roles('staff', 'admin')
  findAll() {
    return this.buildingsService.findAllBuildings();
  }

  @Get(':buildingId/floors')
  @Roles('staff', 'admin')
  listFloors(@Param('buildingId') buildingId: string) {
    return this.buildingsService.listFloors(buildingId);
  }

  @Get(':id')
  @Roles('staff', 'admin')
  findOne(@Param('id') id: string) {
    return this.buildingsService.findOneBuilding(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateBuildingDto) {
    return this.buildingsService.createBuilding(dto);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateBuildingDto) {
    return this.buildingsService.updateBuilding(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.buildingsService.deleteBuilding(id);
  }

  @Post(':buildingId/floors')
  @Roles('admin')
  createFloor(@Param('buildingId') buildingId: string, @Body() dto: CreateFloorDto) {
    return this.buildingsService.createFloor(buildingId, dto);
  }
}
