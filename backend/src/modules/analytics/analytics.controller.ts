import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';

@ApiTags('analytics')
@Controller('analytics')
@Roles('staff', 'admin')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    @ApiBearerAuth()
    @Get('dashboard-stats')
    async getDashboardStats() {
        return this.analyticsService.getDashboardStats();
    }
}
