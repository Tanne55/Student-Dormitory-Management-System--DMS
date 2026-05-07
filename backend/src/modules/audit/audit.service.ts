import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export type AuditLogInput = {
  actorAccountId?: number | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
};

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.repo.save(
      this.repo.create({
        actorAccountId: input.actorAccountId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata ?? null,
        ip: input.ip ?? null,
      }),
    );
  }

  async findAll(filters: {
    entityType?: string;
    actorAccountId?: number;
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    const qb = this.repo.createQueryBuilder('a').orderBy('a.created_at', 'DESC').take(Math.min(filters.limit ?? 200, 500));
    if (filters.entityType) qb.andWhere('a.entity_type = :et', { et: filters.entityType });
    if (filters.actorAccountId != null) {
      qb.andWhere('a.actor_account_id = :aid', { aid: filters.actorAccountId });
    }
    if (filters.from) qb.andWhere('a.created_at >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('a.created_at <= :to', { to: filters.to });
    return qb.getMany();
  }
}
