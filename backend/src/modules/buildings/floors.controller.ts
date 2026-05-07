import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { BuildingsService } from './buildings.service';
import { UpdateFloorDto } from './dto/update-floor.dto';

@ApiTags('floors')
@ApiBearerAuth()
@Controller('floors')
export class FloorsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get(':id')
  @Roles('staff', 'admin')
  findOne(@Param('id') id: string) {
    return this.buildingsService.findFloor(id);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateFloorDto) {
    return this.buildingsService.updateFloor(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.buildingsService.deleteFloor(id);
  }
}
