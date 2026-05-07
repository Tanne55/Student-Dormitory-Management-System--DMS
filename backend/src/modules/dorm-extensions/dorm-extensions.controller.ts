import { Controller, Get, Post, Patch, Param, Body, Req, Query, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { DormExtensionsService } from './dorm-extensions.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { AccessActor } from '../staffs/scope.service';

@ApiTags('dorm-extensions')
@Controller('dorm-extensions')
export class DormExtensionsController {
    constructor(private readonly extensionsService: DormExtensionsService) {}

    private actor(req: { user?: { accountId?: number; role?: string } }): AccessActor {
        return { accountId: Number(req.user?.accountId), role: String(req.user?.role ?? '') };
    }

    @ApiBearerAuth()
    @Roles('staff', 'admin')
    @Get('all')
    async findAll(@Query('status') status?: string, @Query('semester') semester?: string, @Req() req?: any) {
        return this.extensionsService.findAll(status, semester, this.actor(req));
    }

    @ApiBearerAuth()
    @Roles('staff', 'admin')
    @Patch(':id/status')
    async updateStatus(@Param('id') id: string, @Body('status') status: string, @Req() req: any) {
        if (!status) throw new BadRequestException('Vui lòng chọn trạng thái (APPROVED/REJECTED)');
        const ip =
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
        return this.extensionsService.updateStatus(id, status, this.actor(req), ip);
    }

    @ApiBearerAuth()
    @Roles('student', 'staff', 'admin')
    @Get('eligibility')
    async getEligibility(@Req() req: any) {
        const accountId = req.user?.accountId;
        if (!accountId) throw new UnauthorizedException();
        return this.extensionsService.getEligibility(accountId);
    }

    @ApiBearerAuth()
    @Roles('student', 'staff', 'admin')
    @Get('my-requests')
    async getHistory(@Req() req: any) {
        const accountId = req.user?.accountId;
        if (!accountId) throw new UnauthorizedException();
        return this.extensionsService.getHistory(accountId);
    }

    @ApiBearerAuth()
    @Roles('student', 'staff', 'admin')
    @Post()
    async createExtension(@Req() req: any) {
        const accountId = req.user?.accountId;
        if (!accountId) throw new UnauthorizedException();
        return this.extensionsService.createExtension(accountId);
    }
}
