import { Controller, Get, Post, Query, Body, Req, UnauthorizedException } from '@nestjs/common';
import { UtilityReadingsService } from './utility-readings.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { AccessActor } from '../staffs/scope.service';

@ApiTags('utility-readings')
@Controller('utility-readings')
@Roles('staff', 'admin')
export class UtilityReadingsController {
  constructor(private readonly utilityReadingsService: UtilityReadingsService) {}

  private actor(req: { user?: { accountId?: number; role?: string } }): AccessActor {
    return { accountId: Number(req.user?.accountId), role: String(req.user?.role ?? '') };
  }

  @ApiBearerAuth()
  @Get('unrecorded')
  async getUnrecordedRooms(@Query('month') month: string, @Req() req: any) {
    return this.utilityReadingsService.getUnrecordedRooms(month, this.actor(req));
  }

  @ApiBearerAuth()
  @Post('mass-record')
  async massRecord(@Body() body: { month: string; data: any[] }, @Req() req: any) {
    const staffId = req.user?.accountId;
    if (!staffId) throw new UnauthorizedException();
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
    return this.utilityReadingsService.massRecordAndGenerateInvoices(body, staffId, this.actor(req), ip);
  }
}
