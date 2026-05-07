import { Controller, Get, Post, Body, Query, Req, UnauthorizedException } from '@nestjs/common';
import { CheckoutsService } from './checkouts.service';
import { Roles } from '../auth/roles.decorator';
import { AccessActor } from '../staffs/scope.service';

@Controller('checkouts')
@Roles('staff', 'admin')
export class CheckoutsController {
  constructor(private readonly checkoutsService: CheckoutsService) {}

  private actor(req: { user?: { accountId?: number; role?: string } }): AccessActor {
    return { accountId: Number(req.user?.accountId), role: String(req.user?.role ?? '') };
  }

  @Get('search')
  searchLivingStudents(@Query('q') query: string, @Req() req: any) {
    return this.checkoutsService.searchLivingStudents(query || '', this.actor(req));
  }

  @Post('process')
  processCheckout(@Body() body: any, @Req() req: any) {
    const staffId = req.user?.accountId;
    if (!staffId) throw new UnauthorizedException();
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
    return this.checkoutsService.processCheckout(body, staffId, this.actor(req), ip);
  }
}
