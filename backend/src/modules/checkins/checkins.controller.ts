import { Controller, Get, Post, Body, Req, Query, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { CheckinsService } from './checkins.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { AccessActor } from '../staffs/scope.service';

@ApiTags('checkins')
@Controller('checkins')
@Roles('staff', 'admin')
export class CheckinsController {
  constructor(private readonly checkinsService: CheckinsService) {}

  private actor(req: { user?: { accountId?: number; role?: string } }): AccessActor {
    return { accountId: Number(req.user?.accountId), role: String(req.user?.role ?? '') };
  }

  @ApiBearerAuth()
  @Get('registrations')
  async searchRegistrations(@Query('q') q: string) {
    return this.checkinsService.searchApprovedRegistrations(q);
  }

  @ApiBearerAuth()
  @Get('available-rooms')
  async getAvailableRooms(@Query('gender') gender: string, @Query('type') type: string, @Req() req: any) {
    if (!gender || !type) throw new BadRequestException('Missing gender or type');
    return this.checkinsService.getAvailableRooms(gender, parseInt(type, 10), this.actor(req));
  }

  @ApiBearerAuth()
  @Post('process')
  async processCheckin(@Body() body: any, @Req() req: any) {
    if (!body.isPaymentConfirmed) {
      throw new BadRequestException('Vui lòng cập nhật thông tin thanh toán trước khi hoàn tất.');
    }
    const staffId = req.user?.accountId;
    if (!staffId) throw new UnauthorizedException();
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
    return this.checkinsService.processCheckin(body, staffId, this.actor(req), ip);
  }
}
