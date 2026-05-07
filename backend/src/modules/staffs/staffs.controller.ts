import { Body, Controller, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { StaffsService } from './staffs.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { SetStaffFloorScopesDto } from './dto/set-staff-floor-scopes.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';

@ApiTags('staffs')
@Controller('staffs')
@Roles('admin')
export class StaffsController {
    constructor(private readonly staffsService: StaffsService) {}

    @ApiBearerAuth()
    @Get()
    async findAll() {
        return this.staffsService.findAll();
    }

    @ApiBearerAuth()
    @Post()
    async create(@Body() dto: CreateStaffDto) {
        return this.staffsService.create(dto);
    }

    @ApiBearerAuth()
    @Get(':accountId/scopes/floors')
    async getFloorScopes(@Param('accountId', ParseIntPipe) accountId: number) {
        return this.staffsService.getFloorScopesByAccountId(accountId);
    }

    @ApiBearerAuth()
    @Put(':accountId/scopes/floors')
    async setFloorScopes(
        @Param('accountId', ParseIntPipe) accountId: number,
        @Body() dto: SetStaffFloorScopesDto,
    ) {
        return this.staffsService.replaceFloorScopesByAccountId(accountId, dto);
    }
}
