import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';

export const DEFAULT_SETTINGS = [
    { key: 'ELECTRIC_PRICE_PER_KWH', value: '3500', description: 'Đơn giá Điện (VND/kWh)' },
    { key: 'WATER_PRICE_PER_M3', value: '25000', description: 'Đơn giá Nước (VND/m3)' }
];

@Injectable()
export class SystemService implements OnModuleInit {
    constructor(
        @InjectRepository(SystemSetting)
        private settingRepo: Repository<SystemSetting>
    ) {}

    async onModuleInit() {
        for (const defaultSetting of DEFAULT_SETTINGS) {
            const exists = await this.settingRepo.findOne({ where: { key: defaultSetting.key } });
            if (!exists) {
                const newSetting = this.settingRepo.create(defaultSetting);
                await this.settingRepo.save(newSetting);
            }
        }
    }

    async getAllSettings() {
        return this.settingRepo.find({ order: { key: 'ASC' } });
    }

    async updateSettings(settings: { key: string; value: string }[]) {
        for (const s of settings) {
            const existing = await this.settingRepo.findOne({ where: { key: s.key } });
            if (existing) {
                existing.value = s.value;
                await this.settingRepo.save(existing);
            }
        }
        return { message: 'Cập nhật cấu hình thành công.' };
    }
}
