import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from './entities/staff.entity';
import { StaffFloorScope } from './entities/staff-floor-scope.entity';

/** Người thao tác từ JWT (staff/admin). */
export type AccessActor = { accountId: number; role: string };

@Injectable()
export class ScopeService {
  constructor(
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
    @InjectRepository(StaffFloorScope) private readonly scopeRepo: Repository<StaffFloorScope>,
  ) {}

  /** admin → toàn bộ; staff → danh sách floorId; ném 403 nếu staff chưa có phạm vi. */
  async getFloorScope(actor: AccessActor): Promise<'all' | string[]> {
    if (!actor?.accountId) throw new ForbiddenException('Thiếu thông tin đăng nhập.');
    if (actor.role === 'admin') return 'all';
    if (actor.role !== 'staff') return 'all';

    const staff = await this.staffRepo.findOne({ where: { accountId: actor.accountId } });
    if (!staff) throw new ForbiddenException('Tài khoản không có hồ sơ nhân viên.');
    const rows = await this.scopeRepo.find({ where: { staffId: staff.id } });
    if (rows.length === 0) {
      throw new ForbiddenException('Tài khoản chưa được gán phạm vi tòa/tầng. Liên hệ quản trị.');
    }
    return rows.map((r) => r.floorId);
  }

  async assertFloorInScope(actor: AccessActor, floorId: string): Promise<void> {
    const scope = await this.getFloorScope(actor);
    if (scope === 'all') return;
    if (!scope.includes(floorId)) {
      throw new ForbiddenException('Bạn không có quyền thao tác với tầng/phòng này.');
    }
  }

  async assertRoomFloorInScope(actor: AccessActor, roomFloorId: string | undefined | null): Promise<void> {
    if (!roomFloorId) throw new ForbiddenException('Phòng chưa gán tầng.');
    await this.assertFloorInScope(actor, roomFloorId);
  }
}
