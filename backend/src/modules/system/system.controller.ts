import { Controller, Get, Patch, Body } from '@nestjs/common';
import { SystemService } from './system.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';

@ApiTags('system')
@Controller('system/settings')
@Roles('admin')
export class SystemController {
    constructor(private readonly systemService: SystemService) {}

    @ApiBearerAuth()
    @Get()
    async getSettings() {
        return this.systemService.getAllSettings();
    }

    @ApiBearerAuth()
    @Patch()
    async updateSettings(@Body('settings') settings: { key: string; value: string }[]) {
        return this.systemService.updateSettings(settings);
    }
}
