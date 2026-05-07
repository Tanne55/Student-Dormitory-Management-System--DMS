import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actor_account_id', type: 'int', nullable: true })
  actorAccountId: number | null;

  @Column({ type: 'varchar', length: 120 })
  action: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 80 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 64 })
  entityId: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
