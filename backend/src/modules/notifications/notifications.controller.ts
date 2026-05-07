import { Controller, Get, Patch, Param, Req, UnauthorizedException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @ApiBearerAuth()
    @Get('my')
    async getMyNotifications(@Req() req: any) {
        const accountId = req.user?.accountId;
        if (!accountId) throw new UnauthorizedException();
        return this.notificationsService.getMyNotifications(accountId);
    }

    @ApiBearerAuth()
    @Get('unread-count')
    async getUnreadCount(@Req() req: any) {
        const accountId = req.user?.accountId;
        if (!accountId) throw new UnauthorizedException();
        const count = await this.notificationsService.getUnreadCount(accountId);
        return { count };
    }

    @ApiBearerAuth()
    @Patch(':id/read')
    async markAsRead(@Param('id') id: string, @Req() req: any) {
        const accountId = req.user?.accountId;
        if (!accountId) throw new UnauthorizedException();
        return this.notificationsService.markAsRead(id, accountId);
    }

    @ApiBearerAuth()
    @Patch('mark-all-read')
    async markAllAsRead(@Req() req: any) {
        const accountId = req.user?.accountId;
        if (!accountId) throw new UnauthorizedException();
        return this.notificationsService.markAllAsRead(accountId);
    }
}
