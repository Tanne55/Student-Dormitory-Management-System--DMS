import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(Notification)
        private notifRepo: Repository<Notification>,
    ) {}

    async create(accountId: number, title: string, message: string, type: NotificationType = NotificationType.INFO) {
        const notif = this.notifRepo.create({ accountId, title, message, type });
        return this.notifRepo.save(notif);
    }

    async createForMultipleAccounts(accountIds: number[], title: string, message: string, type: NotificationType = NotificationType.INFO) {
        const notifs = accountIds.map(accountId =>
            this.notifRepo.create({ accountId, title, message, type })
        );
        return this.notifRepo.save(notifs);
    }

    async getMyNotifications(accountId: number) {
        return this.notifRepo.find({
            where: { accountId },
            order: { createdAt: 'DESC' },
            take: 30,
        });
    }

    async getUnreadCount(accountId: number) {
        return this.notifRepo.count({
            where: { accountId, isRead: false }
        });
    }

    async markAsRead(id: string, accountId: number) {
        const notif = await this.notifRepo.findOne({ where: { id, accountId } });
        if (notif) {
            notif.isRead = true;
            await this.notifRepo.save(notif);
        }
        return { success: true };
    }

    async markAllAsRead(accountId: number) {
        await this.notifRepo.update({ accountId, isRead: false }, { isRead: true });
        return { success: true };
    }
}
