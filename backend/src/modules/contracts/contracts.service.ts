import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Contract, ContractStatus } from './entities/contract.entity';
import { Room } from '../rooms/entities/room.entity';
import { ScopeService, AccessActor } from '../staffs/scope.service';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract) private readonly contractRepo: Repository<Contract>,
    @InjectRepository(Room) private readonly roomRepo: Repository<Room>,
    private readonly scopeService: ScopeService,
  ) {}

  async findAll(status: string | undefined, actor: AccessActor) {
    const where: { status?: ContractStatus } = {};
    if (status && Object.values(ContractStatus).includes(status as ContractStatus)) {
      where.status = status as ContractStatus;
    }

    let contracts = await this.contractRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    const scope = await this.scopeService.getFloorScope(actor);
    if (scope !== 'all') {
      const rooms = await this.roomRepo.find({
        where: { floorId: In(scope) },
        select: ['id'],
      });
      const allowed = new Set(rooms.map((r) => r.id));
      contracts = contracts.filter((c) => allowed.has(c.roomId));
    }

    return contracts;
  }
}
